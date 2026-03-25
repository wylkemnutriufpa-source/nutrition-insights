import { useRef, useEffect, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Brain } from "lucide-react";
import * as THREE from "three";

interface NeuralLoadingProps {
  active: boolean;
  durationMultiplier?: number;
}

/**
 * 3D Neural Particle System — FitJourney clinical-tech aesthetic.
 * Uses a TorusKnot geometry as base shape, with particles in the
 * green → gold → teal palette. Mouse proximity creates expansion waves.
 */
function NeuralParticleCanvas({ durationMultiplier }: { durationMultiplier: number }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 4.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const mouse = new THREE.Vector2(0, 0);
    const clock = new THREE.Clock();

    // Particle count — reduce on mobile
    const isMobile = width < 500;
    const particleCount = isMobile ? 18000 : 40000;

    const positions = new Float32Array(particleCount * 3);
    const originalPositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    const geometry = new THREE.BufferGeometry();
    const torusKnot = new THREE.TorusKnotGeometry(1.4, 0.45, 200, 32);

    // FitJourney palette HSL ranges
    // Primary green: H=152 S=58% L=45-55%
    // Accent gold:   H=40  S=65% L=50-60%
    // Teal:          H=170 S=55% L=45-50%
    const paletteBands = [
      { h: 152 / 360, s: 0.6, lMin: 0.4, lMax: 0.6, weight: 0.5 },
      { h: 170 / 360, s: 0.5, lMin: 0.38, lMax: 0.55, weight: 0.3 },
      { h: 40 / 360, s: 0.65, lMin: 0.48, lMax: 0.62, weight: 0.2 },
    ];

    for (let i = 0; i < particleCount; i++) {
      const vertexIndex = i % torusKnot.attributes.position.count;
      const x = torusKnot.attributes.position.getX(vertexIndex);
      const y = torusKnot.attributes.position.getY(vertexIndex);
      const z = torusKnot.attributes.position.getZ(vertexIndex);

      // Small random offset for organic feel
      const jitter = 0.06;
      positions[i * 3] = x + (Math.random() - 0.5) * jitter;
      positions[i * 3 + 1] = y + (Math.random() - 0.5) * jitter;
      positions[i * 3 + 2] = z + (Math.random() - 0.5) * jitter;
      originalPositions[i * 3] = positions[i * 3];
      originalPositions[i * 3 + 1] = positions[i * 3 + 1];
      originalPositions[i * 3 + 2] = positions[i * 3 + 2];

      // Pick color from palette bands
      const rand = Math.random();
      let band = paletteBands[0];
      let cumWeight = 0;
      for (const b of paletteBands) {
        cumWeight += b.weight;
        if (rand <= cumWeight) { band = b; break; }
      }
      const color = new THREE.Color();
      const lightness = band.lMin + Math.random() * (band.lMax - band.lMin);
      color.setHSL(band.h + (Math.random() - 0.5) * 0.03, band.s, lightness);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      velocities[i * 3] = 0;
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = 0;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: isMobile ? 0.025 : 0.018,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Mouse interaction
    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      const rect = container.getBoundingClientRect();
      mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    // Animation loop
    const mouseWorld = new THREE.Vector3();
    const currentPos = new THREE.Vector3();
    const originalPos = new THREE.Vector3();
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const returnForce = new THREE.Vector3();

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      mouseWorld.set(mouse.x * 3, mouse.y * 3, 0);

      // Update only a portion of particles per frame for performance
      const batchSize = isMobile ? 6000 : 12000;
      const startIdx = Math.floor((elapsedTime * 2000) % particleCount);

      for (let k = 0; k < batchSize; k++) {
        const i = (startIdx + k) % particleCount;
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;

        currentPos.set(positions[ix], positions[iy], positions[iz]);
        originalPos.set(originalPositions[ix], originalPositions[iy], originalPositions[iz]);
        velocity.set(velocities[ix], velocities[iy], velocities[iz]);

        const dist = currentPos.distanceTo(mouseWorld);
        if (dist < 1.5) {
          const force = (1.5 - dist) * 0.008;
          direction.subVectors(currentPos, mouseWorld).normalize();
          velocity.add(direction.multiplyScalar(force));
        }

        // Return to original
        returnForce.subVectors(originalPos, currentPos).multiplyScalar(0.0015);
        velocity.add(returnForce);

        // Damping
        velocity.multiplyScalar(0.94);

        positions[ix] += velocity.x;
        positions[iy] += velocity.y;
        positions[iz] += velocity.z;

        velocities[ix] = velocity.x;
        velocities[iy] = velocity.y;
        velocities[iz] = velocity.z;
      }

      geometry.attributes.position.needsUpdate = true;

      // Slow elegant rotation
      points.rotation.y = elapsedTime * 0.04;
      points.rotation.x = Math.sin(elapsedTime * 0.02) * 0.1;

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
      geometry.dispose();
      material.dispose();
      torusKnot.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [durationMultiplier]);

  return <div ref={mountRef} className="absolute inset-0" />;
}

export default function NeuralLoading({ active, durationMultiplier = 1 }: NeuralLoadingProps) {
  const reduced = useReducedMotion();

  if (!active) return null;

  return (
    <div className="relative w-[320px] h-[320px] md:w-[420px] md:h-[420px]">
      {/* 3D particle canvas */}
      {!reduced && <NeuralParticleCanvas durationMultiplier={durationMultiplier} />}

      {/* Volumetric glow behind brain */}
      <motion.div
        className="absolute inset-[-30%] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, hsl(var(--primary) / 0.03) 40%, transparent 65%)",
        }}
        animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 5 * durationMultiplier, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Brain icon — hero center */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center z-10"
        style={{ perspective: 800 }}
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{
          opacity: 1,
          scale: 1,
          rotateY: reduced ? 0 : [0, 5, -5, 0],
        }}
        transition={{
          opacity: { duration: 1 },
          scale: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
          rotateY: { duration: 10, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <Brain
          className="text-primary"
          style={{
            width: 68,
            height: 68,
            filter:
              "drop-shadow(0 0 20px hsl(var(--primary) / 0.5)) " +
              "drop-shadow(0 0 50px hsl(var(--primary) / 0.2)) " +
              "drop-shadow(0 0 80px hsl(var(--primary) / 0.08))",
          }}
        />
      </motion.div>

      {/* Reduced motion fallback — static glow */}
      {reduced && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 60%)",
          }}
        />
      )}
    </div>
  );
}
