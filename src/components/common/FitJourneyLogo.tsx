import { motion } from "framer-motion";
import logoImg from "@/assets/logo.png";

interface FitJourneyLogoProps {
  collapsed?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: 44, text: "text-lg" },
  md: { icon: 52, text: "text-lg" },
  lg: { icon: 64, text: "text-2xl" },
};

export default function FitJourneyLogo({ collapsed = false, size = "md" }: FitJourneyLogoProps) {
  const s = sizes[size];

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex-shrink-0"
        style={{
          width: s.icon,
          height: s.icon,
          perspective: 600,
        }}
      >
        <motion.div
          style={{
            width: s.icon,
            height: s.icon,
            transformStyle: "preserve-3d",
          }}
          animate={{ rotateY: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        >
          {/* Front face */}
          <img
            src={logoImg}
            alt="FitJourney Logo"
            className="rounded-full object-cover absolute inset-0"
            style={{
              width: s.icon,
              height: s.icon,
              backfaceVisibility: "hidden",
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))",
            }}
          />
          {/* Back face */}
          <img
            src={logoImg}
            alt=""
            className="rounded-full object-cover absolute inset-0"
            style={{
              width: s.icon,
              height: s.icon,
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))",
            }}
          />
          {/* Edge / thickness layers */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-full"
              style={{
                width: s.icon,
                height: s.icon,
                background: "linear-gradient(180deg, hsl(152 30% 45%), hsl(0 0% 65%), hsl(152 30% 40%))",
                transform: `translateZ(${-1 - i * 0.6}px)`,
                opacity: 0.7,
              }}
            />
          ))}
        </motion.div>
      </div>

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
            }}
          >
            Fit
          </span>
          <span
            style={{
              background: "linear-gradient(180deg, hsl(152 58% 35%) 0%, hsl(152 58% 50%) 30%, hsl(170 60% 60%) 60%, hsl(152 58% 38%) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Journey
          </span>
        </motion.div>
      )}
    </div>
  );
}
