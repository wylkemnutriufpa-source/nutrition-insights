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

export default function FitJourneyLogo({ collapsed = false, size = "md" }: FitJourneyLogoProps) {
  const s = sizes[size];

  return (
    <div className="flex items-center gap-3">
      {/* Icon with spinning conic border like medals */}
      <div className="relative flex-shrink-0">
        {/* Outer glow pulse */}
        <motion.div
          className={`absolute inset-0 rounded-xl`}
          style={{
            background: "radial-gradient(circle, hsl(152 58% 42% / 0.3) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Spinning conic gradient border */}
        <motion.div
          className={`absolute ${s.ring} rounded-xl`}
          style={{
            background: "conic-gradient(from 0deg, hsl(152 58% 42%), transparent 40%, hsl(170 60% 45% / 0.8) 60%, transparent 80%, hsl(152 58% 42%))",
            opacity: 0.7,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />

        {/* Main icon container */}
        <div
          className={`${s.icon} rounded-xl flex items-center justify-center relative z-10`}
          style={{
            background: "linear-gradient(135deg, hsl(152 58% 42%), hsl(170 60% 45%), hsl(152 58% 48%))",
            boxShadow: "0 0 20px hsl(152 58% 42% / 0.3), inset 0 1px 1px rgba(255,255,255,0.3)",
          }}
        >
          {/* 3D spinning leaf on its own axis */}
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
