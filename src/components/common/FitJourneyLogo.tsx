import { motion } from "framer-motion";
import { Leaf } from "lucide-react";

interface FitJourneyLogoProps {
  collapsed?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: "w-9 h-9", leaf: "w-4 h-4", text: "text-xl", ring: "-inset-[3px]" },
  md: { icon: "w-10 h-10", leaf: "w-5 h-5", text: "text-lg", ring: "-inset-[3px]" },
  lg: { icon: "w-12 h-12", leaf: "w-6 h-6", text: "text-2xl", ring: "-inset-[4px]" },
};

// Electric arc component
function ElectricArc({ delay, angle }: { delay: number; angle: number }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{
        transform: `rotate(${angle}deg)`,
      }}
    >
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] rounded-full"
        style={{
          height: "6px",
          background: "linear-gradient(to top, hsl(152 58% 42%), hsl(170 80% 65%), transparent)",
          boxShadow: "0 0 6px hsl(170 80% 65% / 0.8), 0 0 12px hsl(152 58% 42% / 0.4)",
          transformOrigin: "bottom center",
        }}
        animate={{
          opacity: [0, 1, 1, 0],
          scaleY: [0.3, 1.2, 0.8, 0],
          scaleX: [1, 1.5, 0.8, 1],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          delay,
          repeatDelay: 1.5 + Math.random() * 2,
          ease: "easeOut",
        }}
      />
    </motion.div>
  );
}

export default function FitJourneyLogo({ collapsed = false, size = "md" }: FitJourneyLogoProps) {
  const s = sizes[size];

  const arcs = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    angle: i * 45,
    delay: i * 0.15,
  }));

  return (
    <div className="flex items-center gap-3">
      {/* Icon with electric effect */}
      <div className="relative flex-shrink-0">
        {/* Outer glow pulse */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(152 58% 42% / 0.3) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Spinning conic gradient border */}
        <motion.div
          className={`absolute ${s.ring} rounded-full`}
          style={{
            background: "conic-gradient(from 0deg, hsl(152 58% 42%), transparent 40%, hsl(170 60% 45% / 0.8) 60%, transparent 80%, hsl(152 58% 42%))",
            opacity: 0.7,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />

        {/* Electric arcs */}
        <div className="absolute -inset-2 pointer-events-none z-20">
          {arcs.map((arc) => (
            <ElectricArc key={arc.id} delay={arc.delay} angle={arc.angle} />
          ))}
        </div>

        {/* Main icon container - CIRCLE */}
        <div
          className={`${s.icon} rounded-full flex items-center justify-center relative z-10`}
          style={{
            background: "linear-gradient(135deg, hsl(152 58% 42%), hsl(170 60% 45%), hsl(152 58% 48%))",
            boxShadow: "0 0 20px hsl(152 58% 42% / 0.3), inset 0 1px 1px rgba(255,255,255,0.3)",
          }}
        >
          {/* 3D spinning leaf */}
          <motion.div
            animate={{ rotateY: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            style={{ perspective: 200 }}
          >
            <Leaf
              className={`${s.leaf} text-primary-foreground`}
              style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.25))" }}
            />
          </motion.div>
        </div>
      </div>

      {/* Metallic 3D text */}
      {!collapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`font-display font-bold ${s.text} tracking-tight select-none`}
        >
          <span
            style={{
              background: "linear-gradient(180deg, hsl(220 25% 20%) 0%, hsl(220 20% 35%) 40%, hsl(220 15% 55%) 60%, hsl(220 25% 25%) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))",
            }}
          >
            Fit
          </span>
          <span
            style={{
              background: "linear-gradient(180deg, hsl(152 58% 35%) 0%, hsl(152 58% 50%) 30%, hsl(170 60% 60%) 60%, hsl(152 58% 38%) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.1))",
            }}
          >
            Journey
          </span>
        </motion.div>
      )}
    </div>
  );
}
