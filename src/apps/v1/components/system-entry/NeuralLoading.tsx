import { useRef, useEffect, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import * as THREE from "three";
import logoPng from "@/assets/logo.png";

export type NeuralAnimationMode = "idle" | "converge" | "diverge";

interface NeuralLoadingProps {
  active: boolean;
  durationMultiplier?: number;
  /** Controls particle entrance/exit animation */
  animationMode?: NeuralAnimationMode;
  /** Duration in seconds for converge/diverge */
  transitionDuration?: number;
  /** Called when converge/diverge animation completes */
  onTransitionComplete?: () => void;
}

/**
 * 3D Neural Core — FitJourney clinical-tech aesthetic.
 * Now supports converge (particles assemble from edges) and diverge (particles scatter).
 */
function NeuralParticleCanvas({
  durationMultiplier,
  animationMode = "idle",
  transitionDuration = 3.5,
  onTransitionComplete,
}: {
  durationMultiplier: number;
  animationMode: NeuralAnimationMode;
  transitionDuration: number;
  onTransitionComplete?: () => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);
  const modeRef = useRef<NeuralAnimationMode>(animationMode);
  const transitionStartRef = useRef<number | null>(null);
  const transitionDone = useRef(false);
  const onCompleteRef = useRef(onTransitionComplete);

  // Keep refs in sync
  useEffect(() => {
    onCompleteRef.current = onTransitionComplete;
  }, [onTransitionComplete]);

  useEffect(() => {
    if (animationMode !== modeRef.current) {
      modeRef.current = animationMode;
      transitionStartRef.current = null; // will be set on next frame
      transitionDone.current = false;
    }
  }, [animationMode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const mouse = new THREE.Vector2(0, 0);
    const clock = new THREE.Clock();
    const isMobile = width < 500;
    if (isMobile) camera.position.z = 13.5;
    const aspect = width / height;
    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * camera.position.z;
    const visibleWidth = visibleHeight * aspect;

    const coreGroup = new THREE.Group();
    if (isMobile) coreGroup.position.y = -2.0;
    scene.add(coreGroup);

    // ─── 1. BRAIN CORE PARTICLES (TorusKnot shape) ───
    const coreCount = isMobile ? 2400 : 8000;
    const corePositions = new Float32Array(coreCount * 3);
    const coreOriginals = new Float32Array(coreCount * 3);
    const coreColors = new Float32Array(coreCount * 3);
    const coreVelocities = new Float32Array(coreCount * 3);
    // Scattered start positions for converge/diverge mode
    const coreScattered = new Float32Array(coreCount * 3);
    const coreScatterFlow = new Float32Array(coreCount * 3);

    const coreGeo = new THREE.BufferGeometry();
    const torusKnot = new THREE.TorusKnotGeometry(0.72, 0.25, 200, 32);

    const coreHues = [
      { h: 152 / 360, s: 0.7, lMin: 0.35, lMax: 0.6, w: 0.45 },
      { h: 160 / 360, s: 0.6, lMin: 0.4, lMax: 0.65, w: 0.3 },
      { h: 80 / 360, s: 0.5, lMin: 0.45, lMax: 0.6, w: 0.15 },
      { h: 180 / 360, s: 0.4, lMin: 0.55, lMax: 0.8, w: 0.1 },
    ];

    for (let i = 0; i < coreCount; i++) {
      const vi = i % torusKnot.attributes.position.count;
      const x = torusKnot.attributes.position.getX(vi);
      const y = torusKnot.attributes.position.getY(vi);
      const z = torusKnot.attributes.position.getZ(vi);
      const j = 0.04;
      const ox = x + (Math.random() - 0.5) * j;
      const oy = y + (Math.random() - 0.5) * j;
      const oz = z + (Math.random() - 0.5) * j;

      coreOriginals[i * 3] = ox;
      coreOriginals[i * 3 + 1] = oy;
      coreOriginals[i * 3 + 2] = oz;

      // Organic spawn lanes — use fixed radius relative to brain size (not viewport)
      const spawnRadius = 4.5; // slightly beyond the outermost ring (~3.6 radius)
      const laneRoll = Math.random();
      const laneCenter =
        laneRoll < 0.34
          ? Math.PI
          : laneRoll < 0.68
            ? 0
            : -Math.PI / 2;
      const laneSpread = laneRoll < 0.68 ? Math.PI * 0.34 : Math.PI * 0.46;
      const angle = laneCenter + (Math.random() - 0.5) * laneSpread;
      const radialDist = spawnRadius + Math.random() * 2.5;
      const sx = Math.cos(angle) * radialDist;
      const sy = Math.sin(angle) * radialDist;
      const depth = (Math.random() - 0.5) * 6;

      coreScattered[i * 3] = sx;
      coreScattered[i * 3 + 1] = sy;
      coreScattered[i * 3 + 2] = depth;

      const tangentAngle = angle + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
      const flowStrength = 0.25 + Math.random() * 1.15;
      coreScatterFlow[i * 3] = Math.cos(tangentAngle) * flowStrength;
      coreScatterFlow[i * 3 + 1] = Math.sin(tangentAngle) * flowStrength + (laneRoll >= 0.68 ? 0.5 + Math.random() * 0.9 : 0);
      coreScatterFlow[i * 3 + 2] = (Math.random() - 0.5) * 1.6;

      // Start position depends on initial mode
      if (modeRef.current === "converge") {
        corePositions[i * 3] = coreScattered[i * 3];
        corePositions[i * 3 + 1] = coreScattered[i * 3 + 1];
        corePositions[i * 3 + 2] = coreScattered[i * 3 + 2];
      } else {
        corePositions[i * 3] = ox;
        corePositions[i * 3 + 1] = oy;
        corePositions[i * 3 + 2] = oz;
      }

      let rand = Math.random(), cumW = 0, band = coreHues[0];
      for (const b of coreHues) { cumW += b.w; if (rand <= cumW) { band = b; break; } }
      const col = new THREE.Color();
      col.setHSL(band.h + (Math.random() - 0.5) * 0.02, band.s, band.lMin + Math.random() * (band.lMax - band.lMin));
      coreColors[i * 3] = col.r;
      coreColors[i * 3 + 1] = col.g;
      coreColors[i * 3 + 2] = col.b;
      coreVelocities[i * 3] = 0;
      coreVelocities[i * 3 + 1] = 0;
      coreVelocities[i * 3 + 2] = 0;
    }

    coreGeo.setAttribute("position", new THREE.BufferAttribute(corePositions, 3));
    coreGeo.setAttribute("color", new THREE.BufferAttribute(coreColors, 3));

    const coreMat = new THREE.PointsMaterial({
      size: isMobile ? 0.018 : 0.012,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: modeRef.current === "converge" ? 0.3 : 0.9,
      depthWrite: false,
    });
    const corePoints = new THREE.Points(coreGeo, coreMat);
    coreGroup.add(corePoints);

    // ─── 2. CONCENTRIC RINGS ───
    const ringCount = isMobile ? 3 : 5;
    const rings: THREE.Line[] = [];
    const ringMats: THREE.LineBasicMaterial[] = [];
    for (let r = 0; r < ringCount; r++) {
      const radius = 1.8 + r * 0.45;
      const segments = 128;
      const ringGeo = new THREE.BufferGeometry();
      const ringPos = new Float32Array(segments * 3);
      for (let s = 0; s < segments; s++) {
        const angle = (s / segments) * Math.PI * 2;
        ringPos[s * 3] = Math.cos(angle) * radius;
        ringPos[s * 3 + 1] = Math.sin(angle) * radius;
        ringPos[s * 3 + 2] = 0;
      }
      ringGeo.setAttribute("position", new THREE.BufferAttribute(ringPos, 3));
      const ringMat = new THREE.LineBasicMaterial({
        color: new THREE.Color().setHSL(152 / 360, 0.5, 0.3 + r * 0.08),
        transparent: true,
        opacity: modeRef.current === "converge" ? 0 : 0.15 + r * 0.05,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.LineLoop(ringGeo, ringMat);
      ring.rotation.x = Math.PI * 0.3 + r * 0.12;
      ring.rotation.y = r * 0.25;
      rings.push(ring);
      ringMats.push(ringMat);
      coreGroup.add(ring);
    }

    // ─── 3. ENERGY NODES ───
    const nodeCount = isMobile ? 6 : 12;
    const nodeGeo = new THREE.BufferGeometry();
    const nodePositions = new Float32Array(nodeCount * 3);
    const nodeColors = new Float32Array(nodeCount * 3);
    const nodeData: { ringIdx: number; angle: number; speed: number }[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const rIdx = Math.floor(Math.random() * ringCount);
      const radius = 1.8 + rIdx * 0.45;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.15 + Math.random() * 0.3;
      nodeData.push({ ringIdx: rIdx, angle, speed });
      nodePositions[i * 3] = Math.cos(angle) * radius;
      nodePositions[i * 3 + 1] = Math.sin(angle) * radius;
      nodePositions[i * 3 + 2] = 0;
      const col = new THREE.Color();
      col.setHSL(140 / 360 + Math.random() * 0.1, 0.8, 0.5 + Math.random() * 0.3);
      nodeColors[i * 3] = col.r;
      nodeColors[i * 3 + 1] = col.g;
      nodeColors[i * 3 + 2] = col.b;
    }
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));
    nodeGeo.setAttribute("color", new THREE.BufferAttribute(nodeColors, 3));

    const nodeMat = new THREE.PointsMaterial({
      size: isMobile ? 0.05 : 0.04,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: modeRef.current === "converge" ? 0 : 0.9,
      depthWrite: false,
    });
    const nodePoints = new THREE.Points(nodeGeo, nodeMat);
    coreGroup.add(nodePoints);

    // ─── 5. AMBIENT DUST ───
    const dustCount = isMobile ? 80 : 300;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    const dustCol = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 12;
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 6;
      const c = new THREE.Color();
      c.setHSL(152 / 360, 0.3, 0.2 + Math.random() * 0.15);
      dustCol[i * 3] = c.r;
      dustCol[i * 3 + 1] = c.g;
      dustCol[i * 3 + 2] = c.b;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    dustGeo.setAttribute("color", new THREE.BufferAttribute(dustCol, 3));
    const dustMat = new THREE.PointsMaterial({
      size: 0.015,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    scene.add(dustPoints);

    // ─── Mouse interaction ───
    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    const mouseWorld = new THREE.Vector3();
    const currentPos = new THREE.Vector3();
    const originalPos = new THREE.Vector3();
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const returnForce = new THREE.Vector3();

    // Easing
    const easeInOutCubic = (x: number) =>
      x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

    // ─── Animation loop ───
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const mode = modeRef.current;

      // Track transition progress
      if (mode === "converge" || mode === "diverge") {
        if (transitionStartRef.current === null) {
          transitionStartRef.current = t;
        }
        const elapsed = t - transitionStartRef.current;
        const progress = Math.min(elapsed / transitionDuration, 1);
        const eased = easeInOutCubic(progress);
        const curve = Math.sin(progress * Math.PI);

        if (mode === "converge") {
          // Lerp particles from scattered → original
          for (let i = 0; i < coreCount; i++) {
            const ix = i * 3, iy = ix + 1, iz = ix + 2;
            corePositions[ix] = coreScattered[ix] + (coreOriginals[ix] - coreScattered[ix]) * eased + coreScatterFlow[ix] * curve;
            corePositions[iy] = coreScattered[iy] + (coreOriginals[iy] - coreScattered[iy]) * eased + coreScatterFlow[iy] * curve;
            corePositions[iz] = coreScattered[iz] + (coreOriginals[iz] - coreScattered[iz]) * eased + coreScatterFlow[iz] * curve;
          }
          // Fade in opacity
          coreMat.opacity = 0.3 + eased * 0.6;
          // Fade in rings and nodes
          ringMats.forEach((rm, r) => {
            rm.opacity = eased * (0.15 + r * 0.05);
          });
          nodeMat.opacity = eased * 0.9;
        } else {
          // Diverge: lerp particles from original → scattered
          for (let i = 0; i < coreCount; i++) {
            const ix = i * 3, iy = ix + 1, iz = ix + 2;
            corePositions[ix] = coreOriginals[ix] + (coreScattered[ix] - coreOriginals[ix]) * eased + coreScatterFlow[ix] * curve;
            corePositions[iy] = coreOriginals[iy] + (coreScattered[iy] - coreOriginals[iy]) * eased + coreScatterFlow[iy] * curve;
            corePositions[iz] = coreOriginals[iz] + (coreScattered[iz] - coreOriginals[iz]) * eased + coreScatterFlow[iz] * curve;
          }
          // Fade out
          coreMat.opacity = 0.9 * (1 - eased);
          ringMats.forEach((rm, r) => {
            rm.opacity = (0.15 + r * 0.05) * (1 - eased);
          });
          nodeMat.opacity = 0.9 * (1 - eased);
        }

        coreGeo.attributes.position.needsUpdate = true;

        if (progress >= 1 && !transitionDone.current) {
          transitionDone.current = true;
          onCompleteRef.current?.();
        }
      } else {
        // ─── IDLE MODE: normal interactive behavior ───
        mouseWorld.set(mouse.x * 4, mouse.y * 4, 0);

        const batch = isMobile ? 2000 : 6000;
        const start = Math.floor((t * 2000) % coreCount);
        for (let k = 0; k < batch; k++) {
          const i = (start + k) % coreCount;
          const ix = i * 3, iy = ix + 1, iz = ix + 2;
          currentPos.set(corePositions[ix], corePositions[iy], corePositions[iz]);
          originalPos.set(coreOriginals[ix], coreOriginals[iy], coreOriginals[iz]);
          velocity.set(coreVelocities[ix], coreVelocities[iy], coreVelocities[iz]);

          const dist = currentPos.distanceTo(mouseWorld);
          if (dist < 2.0) {
            const force = (2.0 - dist) * 0.012;
            direction.subVectors(currentPos, mouseWorld).normalize();
            velocity.add(direction.multiplyScalar(force));
          }

          returnForce.subVectors(originalPos, currentPos).multiplyScalar(0.002);
          velocity.add(returnForce);
          velocity.multiplyScalar(0.93);

          corePositions[ix] += velocity.x;
          corePositions[iy] += velocity.y;
          corePositions[iz] += velocity.z;
          coreVelocities[ix] = velocity.x;
          coreVelocities[iy] = velocity.y;
          coreVelocities[iz] = velocity.z;
        }
        coreGeo.attributes.position.needsUpdate = true;
      }

      // Animate energy nodes orbiting along rings
      for (let i = 0; i < nodeCount; i++) {
        const nd = nodeData[i];
        nd.angle += nd.speed * 0.01;
        const radius = 1.8 + nd.ringIdx * 0.45;
        nodePositions[i * 3] = Math.cos(nd.angle) * radius;
        nodePositions[i * 3 + 1] = Math.sin(nd.angle) * radius;
        nodePositions[i * 3 + 2] = Math.sin(nd.angle * 2) * 0.15;
      }
      nodeGeo.attributes.position.needsUpdate = true;

      // Ring breathing
      rings.forEach((ring, r) => {
        const breath = 1 + Math.sin(t * 0.5 + r * 0.8) * 0.03;
        ring.scale.set(breath, breath, breath);
        ring.rotation.z = t * 0.02 * (r % 2 === 0 ? 1 : -1);
      });

      coreGroup.rotation.y = t * 0.15;
      coreGroup.rotation.x = Math.sin(t * 0.02) * 0.1;
      dustPoints.rotation.y = t * 0.005;
      dustPoints.rotation.x = t * 0.003;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      coreGeo.dispose();
      coreMat.dispose();
      torusKnot.dispose();
      nodeGeo.dispose();
      nodeMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      rings.forEach(r => { r.geometry.dispose(); (r.material as THREE.Material).dispose(); });
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [durationMultiplier, transitionDuration]);

  return (
    <div
      ref={mountRef}
      className="absolute left-1/2 top-1/2 h-[200vh] w-[200vw] -translate-x-1/2 -translate-y-1/2 overflow-visible pointer-events-none md:h-[250vh] md:w-[250vw]"
      style={{
        WebkitMaskImage: "radial-gradient(circle at center, black 0%, black 45%, transparent 72%)",
        maskImage: "radial-gradient(circle at center, black 0%, black 45%, transparent 72%)",
      }}
    />
  );
}

export default function NeuralLoading({
  active,
  durationMultiplier = 1,
  animationMode = "idle",
  transitionDuration = 3.5,
  onTransitionComplete,
}: NeuralLoadingProps) {
  const reduced = useReducedMotion();

  if (!active) return null;

  return (
    <div className="relative w-[min(68vw,480px)] h-[min(68vw,480px)] md:w-[750px] md:h-[750px] overflow-visible">
      {!reduced && (
        <NeuralParticleCanvas
          durationMultiplier={durationMultiplier}
          animationMode={animationMode}
          transitionDuration={transitionDuration}
          onTransitionComplete={onTransitionComplete}
        />
      )}

      {/* Outer ring glow */}
      <motion.div
        className="absolute inset-[-15%] rounded-full pointer-events-none"
        style={{
          border: "1px solid hsl(var(--primary) / 0.12)",
          boxShadow:
            "0 0 40px hsl(var(--primary) / 0.08), inset 0 0 60px hsl(var(--primary) / 0.04)",
        }}
        animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 6 * durationMultiplier, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute inset-[-8%] rounded-full pointer-events-none"
        style={{
          border: "1px solid hsl(var(--primary) / 0.08)",
          boxShadow: "0 0 30px hsl(var(--primary) / 0.05)",
        }}
        animate={{ scale: [1.02, 0.96, 1.02], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 5 * durationMultiplier, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute inset-[-25%] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, hsl(var(--primary) / 0.04) 35%, transparent 60%)",
        }}
        animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 5.5 * durationMultiplier, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.35) 0%, hsl(var(--primary) / 0.1) 40%, transparent 70%)",
        }}
        animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 3 * durationMultiplier, repeat: Infinity, ease: "easeInOut" }}
      />

      {reduced && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 60%)",
          }}
        />
      )}
    </div>
  );
}
