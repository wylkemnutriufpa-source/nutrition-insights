import { motion } from "framer-motion";
import logoVideo from "@/assets/logo-video.mp4";

interface FitJourneyLogoProps {
  collapsed?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: 56, text: "text-lg" },
  md: { icon: 68, text: "text-lg" },
  lg: { icon: 80, text: "text-2xl" },
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
        }}
      >
        <video
          src={logoVideo}
          autoPlay
          loop
          muted
          playsInline
          className="object-cover"
          style={{
            width: s.icon * 1.35,
            height: s.icon * 1.35,
            mixBlendMode: "multiply",
            filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.18))",
            imageRendering: "auto",
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
