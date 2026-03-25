import { motion, useReducedMotion, useMotionValue, useTransform } from "framer-motion";
import { Brain } from "lucide-react";
import { useMemo, useEffect, useCallback } from "react";

interface NeuralLoadingProps {
  active: boolean;
  durationMultiplier?: number;
}

/* ─── Neural network topology ─── */
const NODES = [
  // Core cluster
  { x: 50, y: 50, r: 3.5 },
  // Inner ring
  { x: 50, y: 28, r: 2.5 }, { x: 69, y: 37, r: 2.2 }, { x: 69, y: 63, r: 2.2 },
  { x: 50, y: 72, r: 2.5 }, { x: 31, y: 63, r: 2.2 }, { x: 31, y: 37, r: 2.2 },
  // Outer ring
  { x: 50, y: 16, r: 1.8 }, { x: 76, y: 26, r: 1.6 }, { x: 84, y: 50, r: 1.8 },
  { x: 76, y: 74, r: 1.6 }, { x: 50, y: 84, r: 1.8 }, { x: 24, y: 74, r: 1.6 },
  { x: 16, y: 50, r: 1.8 }, { x: 24, y: 26, r: 1.6 },
  // Micro detail nodes
  { x: 40, y: 38, r: 1.2 }, { x: 60, y: 38, r: 1.2 },
  { x: 60, y: 62, r: 1.2 }, { x: 40, y: 62, r: 1.2 },
];

const EDGES: [number, number][] = [
  // Core to inner
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
  // Inner ring
  [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1],
  // Inner to outer
  [1, 7], [1, 8], [2, 8], [2, 9], [3, 9], [3, 10],
  [4, 10], [4, 11], [5, 11], [5, 12], [6, 12], [6, 13], [1, 14], [6, 14],
  // Outer ring connections
  [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 7],
  // Micro detail
  [0, 15], [0, 16], [0, 17], [0, 18],
  [15, 1], [15, 6], [16, 1], [16, 2], [17, 3], [17, 4], [18, 5], [18, 4],
];

/* ─── Orbital particles ─── */
function OrbitWaves({ durationMultiplier }: { durationMultiplier: number }) {
  const orbits = useMemo(() => [
    { count: 6, radius: 38, speed: 14, size: 1.8, opacity: 0.5 },
    { count: 8, radius: 44, speed: 20, size: 1.2, opacity: 0.35 },
    { count: 4, radius: 30, speed: 10, size: 2.2, opacity: 0.6 },
  ], []);

  return (
    <g>
      {orbits.map((orbit, oi) =>
        Array.from({ length: orbit.count }, (_, i) => {
          const baseAngle = (i / orbit.count) * Math.PI * 2;
          const dur = orbit.speed * durationMultiplier;
          return (
            <motion.circle
              key={`o${oi}-${i}`}
              cx={50 + Math.cos(baseAngle) * orbit.radius}
              cy={50 + Math.sin(baseAngle) * orbit.radius}
              r={orbit.size}
              fill="hsl(var(--primary))"
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, orbit.opacity, orbit.opacity * 0.3, orbit.opacity, 0],
                cx: [
                  50 + Math.cos(baseAngle) * orbit.radius,
                  50 + Math.cos(baseAngle + Math.PI * 0.67) * orbit.radius,
                  50 + Math.cos(baseAngle + Math.PI * 1.33) * orbit.radius,
                  50 + Math.cos(baseAngle + Math.PI * 2) * orbit.radius,
                ],
                cy: [
                  50 + Math.sin(baseAngle) * orbit.radius,
                  50 + Math.sin(baseAngle + Math.PI * 0.67) * orbit.radius,
                  50 + Math.sin(baseAngle + Math.PI * 1.33) * orbit.radius,
                  50 + Math.sin(baseAngle + Math.PI * 2) * orbit.radius,
                ],
              }}
              transition={{
                duration: dur,
                repeat: Infinity,
                ease: "linear",
                delay: i * (dur / orbit.count) * 0.5,
              }}
            />
          );
        })
      )}
    </g>
  );
}

/* ─── Pulse ring that expands outward ─── */
function PulseRings() {
  return (
    <g>
      {[0, 2, 4].map((delay) => (
        <motion.circle
          key={delay}
          cx="50" cy="50"
          r="20"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="0.3"
          initial={{ opacity: 0, r: 20 }}
          animate={{ opacity: [0, 0.25, 0], r: [20, 46] }}
          transition={{ duration: 4, repeat: Infinity, delay, ease: "easeOut" }}
        />
      ))}
    </g>
  );
}

export default function NeuralLoading({ active, durationMultiplier = 1 }: NeuralLoadingProps) {
  const reduced = useReducedMotion();
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const glowX = useTransform(mouseX, [0, 1], [-12, 12]);
  const glowY = useTransform(mouseY, [0, 1], [-12, 12]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseX.set(e.clientX / window.innerWidth);
    mouseY.set(e.clientY / window.innerHeight);
  }, [mouseX, mouseY]);

  useEffect(() => {
    if (reduced || !active) return;
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [reduced, active, handleMouseMove]);

  if (!active) return null;

  return (
    <div className="relative w-[320px] h-[320px] md:w-[420px] md:h-[420px]">
      {/* Deep volumetric glow behind everything */}
      <motion.div
        className="absolute inset-[-40%] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, hsl(var(--primary) / 0.04) 35%, transparent 65%)",
          x: glowX,
          y: glowY,
        }}
        animate={{ scale: [0.9, 1.08, 0.9], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 5 * durationMultiplier, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Secondary warm glow */}
      <motion.div
        className="absolute inset-[-20%] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, hsl(var(--accent) / 0.06) 0%, transparent 55%)",
        }}
        animate={{ scale: [1.05, 0.92, 1.05], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 7 * durationMultiplier, repeat: Infinity, ease: "easeInOut" }}
      />

      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
        <defs>
          <filter id="ne-glow-v2">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="ne-halo-v2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.22" />
            <stop offset="60%" stopColor="hsl(var(--primary))" stopOpacity="0.06" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ne-edge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Deep breathing halo */}
        <motion.circle
          cx="50" cy="50" r="46"
          fill="url(#ne-halo-v2)"
          animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.92, 1.06, 0.92] }}
          transition={{ duration: 5 * durationMultiplier, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Pulse rings */}
        {!reduced && <PulseRings />}

        {/* Neural edges — staggered draw-in */}
        {EDGES.map(([a, b], i) => (
          <motion.line
            key={`e${i}`}
            x1={NODES[a].x} y1={NODES[a].y}
            x2={NODES[b].x} y2={NODES[b].y}
            stroke="url(#ne-edge-grad)"
            strokeWidth="0.35"
            filter="url(#ne-glow-v2)"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{
              opacity: [0.15, 0.4, 0.15],
              pathLength: 1,
            }}
            transition={{
              pathLength: { duration: 0.8, delay: i * 0.02, ease: "easeOut" },
              opacity: { duration: 3, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" },
            }}
          />
        ))}

        {/* Neural nodes — breathing pulse */}
        {NODES.map((n, i) => (
          <motion.circle
            key={`n${i}`}
            cx={n.x} cy={n.y} r={n.r}
            fill="hsl(var(--primary))"
            filter="url(#ne-glow-v2)"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0.25, 0.85, 0.25], scale: 1 }}
            transition={{
              opacity: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 },
              scale: { duration: 0.6, delay: i * 0.025, ease: "easeOut" },
            }}
          />
        ))}

        {/* Orbital wave particles */}
        {!reduced && <OrbitWaves durationMultiplier={durationMultiplier} />}
      </svg>

      {/* Brain icon — dominant hero element */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ perspective: 800 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: 1,
          scale: 1,
          rotateY: reduced ? 0 : [0, 6, -6, 0],
        }}
        transition={{
          opacity: { duration: 0.8 },
          scale: { duration: 1, ease: [0.22, 1, 0.36, 1] },
          rotateY: { duration: 8, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <Brain
          className="text-primary"
          style={{
            width: 72,
            height: 72,
            filter:
              "drop-shadow(0 0 24px hsl(var(--primary) / 0.5)) " +
              "drop-shadow(0 0 48px hsl(var(--primary) / 0.2)) " +
              "drop-shadow(0 0 80px hsl(var(--primary) / 0.1))",
          }}
        />
      </motion.div>
    </div>
  );
}
