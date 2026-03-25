/**
 * BrainParticleEffect — Canvas-based golden particle system
 * 
 * "converge": particles spawn from screen edges and converge to center (brain entrance)
 * "diverge": particles explode outward from center (brain exit / vaporize)
 */
import { useRef, useEffect, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  size: number;
  alpha: number;
  maxAlpha: number;
  speed: number;
  progress: number;
  hue: number;
  lightness: number;
  trail: { x: number; y: number; alpha: number }[];
}

interface Props {
  mode: "converge" | "diverge";
  active: boolean;
  /** Duration in ms */
  duration?: number;
  particleCount?: number;
  onComplete?: () => void;
}

export default function BrainParticleEffect({
  mode,
  active,
  duration = 3500,
  particleCount = 280,
  onComplete,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const completedRef = useRef(false);

  const initParticles = useCallback(
    (w: number, h: number) => {
      const cx = w / 2;
      const cy = h * 0.42; // brain center position
      const particles: Particle[] = [];

      for (let i = 0; i < particleCount; i++) {
        // Random edge spawn point
        const edge = Math.random();
        let sx: number, sy: number;
        if (edge < 0.3) {
          // top
          sx = Math.random() * w;
          sy = -20 - Math.random() * 100;
        } else if (edge < 0.55) {
          // left
          sx = -20 - Math.random() * 100;
          sy = Math.random() * h;
        } else if (edge < 0.8) {
          // right
          sx = w + 20 + Math.random() * 100;
          sy = Math.random() * h;
        } else {
          // bottom
          sx = Math.random() * w;
          sy = h + 20 + Math.random() * 100;
        }

        // Target: spread around center in a circular area (brain zone)
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * Math.min(w, h) * 0.18;
        const tx = cx + Math.cos(angle) * radius;
        const ty = cy + Math.sin(angle) * radius;

        const hue = 35 + Math.random() * 15; // golden range
        const lightness = 50 + Math.random() * 30;

        if (mode === "converge") {
          particles.push({
            x: sx,
            y: sy,
            startX: sx,
            startY: sy,
            targetX: tx,
            targetY: ty,
            size: 1.5 + Math.random() * 2.5,
            alpha: 0,
            maxAlpha: 0.4 + Math.random() * 0.6,
            speed: 0.3 + Math.random() * 0.7,
            progress: -(Math.random() * 0.3), // stagger start
            hue,
            lightness,
            trail: [],
          });
        } else {
          // diverge: start from center, go to edges
          particles.push({
            x: tx,
            y: ty,
            startX: tx,
            startY: ty,
            targetX: sx,
            targetY: sy,
            size: 1.5 + Math.random() * 2.5,
            alpha: 0.5 + Math.random() * 0.5,
            maxAlpha: 0.5 + Math.random() * 0.5,
            speed: 0.3 + Math.random() * 0.7,
            progress: -(Math.random() * 0.15),
            hue,
            lightness,
            trail: [],
          });
        }
      }
      return particles;
    },
    [mode, particleCount]
  );

  useEffect(() => {
    if (!active) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    particlesRef.current = initParticles(w, h);
    startTimeRef.current = performance.now();
    completedRef.current = false;

    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const globalProgress = Math.min(elapsed / duration, 1);

      ctx.clearRect(0, 0, w, h);

      let allDone = true;

      for (const p of particlesRef.current) {
        // Each particle has its own staggered progress
        const rawP = globalProgress * (1 + p.speed) + p.progress;
        const t = Math.max(0, Math.min(1, rawP));

        if (t < 1) allDone = false;

        const eased = easeInOutCubic(t);

        p.x = p.startX + (p.targetX - p.startX) * eased;
        p.y = p.startY + (p.targetY - p.startY) * eased;

        // Store trail
        if (t > 0) {
          p.trail.push({ x: p.x, y: p.y, alpha: p.alpha * 0.3 });
          if (p.trail.length > 8) p.trail.shift();
        }

        if (mode === "converge") {
          // Fade in as they approach, slight pulse at arrival
          if (t < 0.7) {
            p.alpha = p.maxAlpha * (t / 0.7);
          } else {
            p.alpha = p.maxAlpha * (1 - (t - 0.7) / 0.3 * 0.5);
          }
        } else {
          // Diverge: start bright, fade out
          p.alpha = p.maxAlpha * (1 - eased);
        }

        // Draw trail
        for (const tr of p.trail) {
          tr.alpha *= 0.85;
          if (tr.alpha > 0.02) {
            ctx.beginPath();
            ctx.arc(tr.x, tr.y, p.size * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 80%, ${p.lightness}%, ${tr.alpha})`;
            ctx.fill();
          }
        }

        // Draw glow
        if (p.alpha > 0.02) {
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
          glow.addColorStop(0, `hsla(${p.hue}, 90%, ${p.lightness + 10}%, ${p.alpha * 0.4})`);
          glow.addColorStop(1, `hsla(${p.hue}, 90%, ${p.lightness}%, 0)`);
          ctx.fillStyle = glow;
          ctx.fillRect(p.x - p.size * 4, p.y - p.size * 4, p.size * 8, p.size * 8);

          // Core
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 95%, ${Math.min(p.lightness + 20, 95)}%, ${p.alpha})`;
          ctx.fill();
        }
      }

      if (allDone && !completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }

      if (globalProgress < 1 || !allDone) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [active, mode, duration, initParticles, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 2 }}
    />
  );
}
