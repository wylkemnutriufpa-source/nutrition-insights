/**
 * GoldenParticleField – Canvas-based golden particle system
 * Particles converge to form a brain-like shape, then dissolve on exit.
 */
import { useRef, useEffect, useCallback } from "react";

interface Particle {
  x: number; y: number;
  targetX: number; targetY: number;
  originX: number; originY: number;
  vx: number; vy: number;
  size: number;
  alpha: number;
  hue: number;
  phase: "scatter" | "converge" | "pulse" | "dissolve";
}

interface Props {
  phase: "scatter" | "converge" | "pulse" | "dissolve";
  className?: string;
}

// Generate brain-like target positions (ellipse with neural connections)
function brainTargets(cx: number, cy: number, count: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const rx = Math.min(cx, cy) * 0.38;
  const ry = rx * 0.82;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
    const r = (0.3 + Math.random() * 0.7);
    // Brain shape: two hemispheres with a groove
    const groove = Math.abs(Math.cos(angle)) < 0.15 ? 0.6 : 1;
    pts.push({
      x: cx + Math.cos(angle) * rx * r * groove + (Math.random() - 0.5) * 12,
      y: cy + Math.sin(angle) * ry * r + (Math.random() - 0.5) * 12,
    });
  }
  return pts;
}

export default function GoldenParticleField({ phase, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
    const h = canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
    const cx = w / 2, cy = h / 2;
    const count = Math.min(180, Math.floor(w * h / 4000));
    const targets = brainTargets(cx, cy, count);

    particlesRef.current = targets.map((t, i) => ({
      x: cx + (Math.random() - 0.5) * w * 0.9,
      y: cy + (Math.random() - 0.5) * h * 0.9,
      targetX: t.x,
      targetY: t.y,
      originX: cx + (Math.random() - 0.5) * w,
      originY: cy + (Math.random() - 0.5) * h,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: 1.2 + Math.random() * 2,
      alpha: 0,
      hue: 35 + Math.random() * 15, // gold range
      phase: "scatter" as const,
    }));
  }, []);

  useEffect(() => {
    init();
    const handleResize = () => init();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [init]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;
    const tick = () => {
      if (!running) return;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const currentPhase = phaseRef.current;
      const particles = particlesRef.current;

      for (const p of particles) {
        p.phase = currentPhase;

        if (currentPhase === "scatter") {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha = Math.min(p.alpha + 0.008, 0.4);
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
        } else if (currentPhase === "converge") {
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          p.x += dx * 0.04;
          p.y += dy * 0.04;
          p.alpha = Math.min(p.alpha + 0.02, 0.9);
        } else if (currentPhase === "pulse") {
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          p.x += dx * 0.08;
          p.y += dy * 0.08;
          p.alpha = 0.7 + Math.sin(Date.now() * 0.003 + p.hue) * 0.3;
        } else if (currentPhase === "dissolve") {
          p.vy -= 0.15; // float up
          p.vx += (Math.random() - 0.5) * 0.3;
          p.x += p.vx;
          p.y += p.vy;
          p.alpha = Math.max(p.alpha - 0.015, 0);
          p.size *= 0.997;
        }

        // Draw particle
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        gradient.addColorStop(0, `hsla(${p.hue}, 70%, 60%, ${p.alpha})`);
        gradient.addColorStop(0.5, `hsla(${p.hue}, 65%, 55%, ${p.alpha * 0.4})`);
        gradient.addColorStop(1, `hsla(${p.hue}, 60%, 50%, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core bright dot
        ctx.fillStyle = `hsla(${p.hue}, 80%, 80%, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Energy pulses in converge/pulse (no straight lines)
      if (currentPhase === "converge" || currentPhase === "pulse") {
        const t = Date.now() * 0.001;
        for (let i = 0; i < particles.length; i += 8) {
          const p = particles[i];
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 4);
          const pulseAlpha = 0.3 + Math.sin(t * 2 + i) * 0.3;
          g.addColorStop(0, `hsla(45, 90%, 75%, ${pulseAlpha})`);
          g.addColorStop(1, `hsla(45, 90%, 75%, 0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
    />
  );
}
