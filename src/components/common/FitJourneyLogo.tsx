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
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: s.icon,
          height: s.icon,
          perspective: 800,
        }}
      >
        <motion.div
          style={{
            width: s.icon,
            height: s.icon,
            transformStyle: "preserve-3d",
          }}
          animate={{ rotateY: [0, 80, 0, -80, 0] }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.25, 0.5, 0.75, 1],
          }}
        >
          {/* Front face */}
          <motion.img
            src={logoImg}
            alt="FitJourney Logo"
            className="rounded-full object-cover absolute inset-0"
            style={{
              width: s.icon,
              height: s.icon,
              backfaceVisibility: "hidden",
              filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.25))",
            }}
            animate={{ rotateY: [0, 80, 0, -80, 0] }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.25, 0.5, 0.75, 1],
            }}
            // Scale compensation: slightly scale up at side angles to counter perspective flattening
            whileHover={{ scale: 1.05 }}
          />

          {/* Edge / thickness layers for 3D depth */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-full"
              style={{
                width: s.icon,
                height: s.icon,
                background:
                  "linear-gradient(180deg, hsl(152 30% 50%), hsl(0 0% 72%), hsl(152 30% 42%))",
                transform: `translateZ(${-1 - i * 0.5}px)`,
                opacity: 0.55 - i * 0.04,
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
              background:
                "linear-gradient(180deg, hsl(220 25% 20%) 0%, hsl(220 20% 35%) 40%, hsl(220 15% 55%) 60%, hsl(220 25% 25%) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Fit
          </span>
          <span
            style={{
              background:
                "linear-gradient(180deg, hsl(152 58% 35%) 0%, hsl(152 58% 50%) 30%, hsl(170 60% 60%) 60%, hsl(152 58% 38%) 100%)",
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
