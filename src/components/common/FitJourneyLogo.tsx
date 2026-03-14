import { motion } from "framer-motion";
import logoPng from "@/assets/logo.png";

interface FitJourneyLogoProps {
  collapsed?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: 40, text: "text-lg" },
  md: { icon: 48, text: "text-lg" },
  lg: { icon: 60, text: "text-2xl" },
};

export default function FitJourneyLogo({ collapsed = false, size = "md" }: FitJourneyLogoProps) {
  const s = sizes[size];

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-full overflow-hidden"
        style={{
          width: s.icon,
          height: s.icon,
          boxShadow: "0 0 8px 1px hsl(152 58% 45% / 0.25)",
        }}
      >
        <img
          src={logoPng}
          alt="FitJourney logo"
          width={s.icon}
          height={s.icon}
          draggable={false}
          className="object-cover select-none"
          style={{
            imageRendering: "auto",
            willChange: "auto",
          }}
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
