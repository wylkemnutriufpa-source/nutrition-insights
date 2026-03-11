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

// Flame particle component
function FlameParticle({ delay, angle, distance }: { delay: number; angle: number; distance: number }) {
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * distance;
  const y = Math.sin(rad) * distance;

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: 4,
        height: 6,
        left: "50%",
        top: "50%",
        marginLeft: -2,
        marginTop: -3,
        background: "radial-gradient(circle, hsl(45 100% 60%), hsl(25 100% 50%), hsl(152 58% 42%))",
        boxShadow: "0 0 4px hsl(45 100% 60% / 0.8), 0 0 8px hsl(25 100% 50% / 0.5)",
        borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
      }}
      animate={{
        x: [0, x * 0.5, x],
        y: [0, y * 0.5 - 4, y - 8],
        opacity: [0, 0.9, 0.7, 0],
        scale: [0.3, 1.2, 0.8, 0],
      }}
      transition={{
        duration: 1.2,
        repeat: Infinity,
        delay,
        ease: "easeOut",
      }}
    />
  );
}

export default function FitJourneyLogo({ collapsed = false, size = "md" }: FitJourneyLogoProps) {
  const s = sizes[size];

  const flames = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: i * 30 + (Math.random() - 0.5) * 15,
    delay: i * 0.1,
    distance: 14 + Math.random() * 8,
  }));

  return (
    <div className="flex items-center gap-3">
      {/* Icon with fire aura */}
      <div className="relative flex-shrink-0">
        {/* Warm outer glow */}
        <motion.div
          className="absolute -inset-1 rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(35 100% 55% / 0.25) 0%, hsl(152 58% 42% / 0.15) 50%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Inner heat halo */}
        <motion.div
          className="absolute -inset-[2px] rounded-full"
          style={{
            background: "conic-gradient(from 0deg, hsl(45 100% 55% / 0.6), hsl(25 100% 50% / 0.3), hsl(152 58% 42% / 0.5), hsl(45 100% 55% / 0.2), hsl(25 100% 50% / 0.6), hsl(152 58% 42% / 0.3), hsl(45 100% 55% / 0.6))",
            opacity: 0.6,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />

        {/* Flame particles */}
        <div className="absolute -inset-3 pointer-events-none z-20">
          {flames.map((f) => (
            <FlameParticle key={f.id} delay={f.delay} angle={f.angle} distance={f.distance} />
          ))}
        </div>

        {/* Main icon container - CIRCLE */}
        <div
          className={`${s.icon} rounded-full flex items-center justify-center relative z-10`}
          style={{
            background: "linear-gradient(135deg, hsl(152 58% 42%), hsl(170 60% 45%), hsl(152 58% 48%))",
            boxShadow: "0 0 16px hsl(45 100% 55% / 0.25), 0 0 24px hsl(152 58% 42% / 0.3), inset 0 1px 1px rgba(255,255,255,0.3)",
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