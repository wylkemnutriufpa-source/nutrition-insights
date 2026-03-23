import { motion, useReducedMotion } from "framer-motion";
import { Brain } from "lucide-react";
import { useMemo } from "react";

interface NeuralLoadingProps {
  active: boolean;
  durationMultiplier?: number;
}

// Deterministic neural network
const NODES = [
  { x: 50, y: 20, r: 2.5 }, { x: 30, y: 35, r: 2 }, { x: 70, y: 35, r: 2 },
  { x: 20, y: 50, r: 1.8 }, { x: 50, y: 50, r: 3 }, { x: 80, y: 50, r: 1.8 },
  { x: 30, y: 65, r: 2 }, { x: 70, y: 65, r: 2 }, { x: 50, y: 80, r: 2.5 },
  { x: 40, y: 42, r: 1.5 }, { x: 60, y: 42, r: 1.5 },
  { x: 40, y: 58, r: 1.5 }, { x: 60, y: 58, r: 1.5 },
];

const EDGES: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5],
  [3, 6], [4, 6], [4, 7], [5, 7], [6, 8], [7, 8],
  [0, 9], [0, 10], [9, 4], [10, 4], [4, 11], [4, 12], [11, 8], [12, 8],
  [1, 9], [2, 10], [6, 11], [7, 12], [3, 4], [5, 4],
];

function OrbitParticles() {
  const particles = useMemo(
    () => Array.from({ length: 5 }, (_, i) => ({
      angle: (i / 5) * Math.PI * 2,
      radius: 85 + (i % 3) * 18,
      size: 1.5 + (i % 2),
      duration: 7 + i * 0.9,
      delay: i * 0.4,
    })),
    []
  );

  return (
    <g>
      {particles.map((p, i) => (
        <motion.circle
          key={i}
          cx={50 + Math.cos(p.angle) * (p.radius / 2)}
          cy={50 + Math.sin(p.angle) * (p.radius / 2)}
          r={p.size / 2}
          fill="hsl(var(--primary))"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.4, 0.15, 0.4, 0],
            cx: [
              50 + Math.cos(p.angle) * (p.radius / 2),
              50 + Math.cos(p.angle + Math.PI) * (p.radius / 2),
              50 + Math.cos(p.angle + Math.PI * 2) * (p.radius / 2),
            ],
            cy: [
              50 + Math.sin(p.angle) * (p.radius / 2),
              50 + Math.sin(p.angle + Math.PI) * (p.radius / 2),
              50 + Math.sin(p.angle + Math.PI * 2) * (p.radius / 2),
            ],
          }}
          transition={{ duration: p.duration, repeat: Infinity, ease: "linear", delay: p.delay }}
        />
      ))}
    </g>
  );
}

export default function NeuralLoading({ active, durationMultiplier = 1 }: NeuralLoadingProps) {
  const reduced = useReducedMotion();

  if (!active) return null;

  return (
    <div className="relative w-[260px] h-[260px] md:w-[320px] md:h-[320px]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
        <defs>
          <filter id="ne-glow">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="ne-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.18" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Breathing halo */}
        <motion.circle
          cx="50" cy="50" r="44"
          fill="url(#ne-halo)"
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 4 * durationMultiplier, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Edges */}
        {EDGES.map(([a, b], i) => (
          <motion.line
            key={`e${i}`}
            x1={NODES[a].x} y1={NODES[a].y}
            x2={NODES[b].x} y2={NODES[b].y}
            stroke="hsl(var(--primary))"
            strokeWidth="0.3"
            filter="url(#ne-glow)"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: 0.35, pathLength: 1 }}
            transition={{ duration: 0.7, delay: i * 0.025, ease: "easeOut" }}
          />
        ))}

        {/* Nodes with pulse */}
        {NODES.map((n, i) => (
          <motion.circle
            key={`n${i}`}
            cx={n.x} cy={n.y} r={n.r}
            fill="hsl(var(--primary))"
            filter="url(#ne-glow)"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0.3, 0.8, 0.3], scale: 1 }}
            transition={{
              opacity: { duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 },
              scale: { duration: 0.5, delay: i * 0.03, ease: "easeOut" },
            }}
          />
        ))}

        {!reduced && <OrbitParticles />}
      </svg>

      {/* Brain icon — 3D Y-axis rotation */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ perspective: 600 }}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{
          opacity: 1,
          scale: 1,
          rotateY: reduced ? 0 : [0, 8, -8, 0],
        }}
        transition={{
          opacity: { duration: 0.6 },
          scale: { duration: 0.8, ease: "easeOut" },
          rotateY: { duration: 5, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <Brain
          className="text-primary"
          style={{
            width: 52, height: 52,
            filter: "drop-shadow(0 0 18px hsl(var(--primary) / 0.45)) drop-shadow(0 0 36px hsl(var(--primary) / 0.15))",
          }}
        />
      </motion.div>
    </div>
  );
}
