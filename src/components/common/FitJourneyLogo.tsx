import { motion } from "framer-motion";
import logoPng from "@/assets/logo.png";

interface FitJourneyLogoProps {
  collapsed?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: 80, text: "text-lg" },
  md: { icon: 96, text: "text-xl" },
  lg: { icon: 112, text: "text-2xl" },
};

export default function FitJourneyLogo({ collapsed = false, size = "md" }: FitJourneyLogoProps) {
  const s = sizes[size];

  return (
    <div className="flex items-center gap-2">
      <div
        className="relative flex-shrink-0 flex items-center justify-center"
        style={{ width: s.icon, height: s.icon }}
      >
        <motion.div
          className="pointer-events-none absolute -inset-2 rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(var(--primary) / 0.45) 0%, hsl(var(--primary) / 0.18) 45%, transparent 75%)",
            filter: "blur(8px)",
          }}
          animate={{ scale: [0.95, 1.15, 0.95], opacity: [0.45, 0.95, 0.45] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="pointer-events-none absolute -inset-3 rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(var(--accent) / 0.35) 0%, hsl(var(--accent) / 0.12) 50%, transparent 78%)",
            filter: "blur(12px)",
          }}
          animate={{ scale: [1, 1.22, 1], opacity: [0.3, 0.75, 0.3] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
        />

        <img
          src={logoPng}
          alt="FitJourney logo"
          width={s.icon}
          height={s.icon}
          draggable={false}
          className="relative z-10 object-cover select-none"
          style={{ imageRendering: "auto", willChange: "auto" }}
        />
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
