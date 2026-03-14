import { motion } from "framer-motion";
import logoImg from "@/assets/logo.png";

interface FitJourneyLogoProps {
  collapsed?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: 96, text: "text-xl", container: 64 },
  md: { icon: 112, text: "text-lg", container: 72 },
  lg: { icon: 128, text: "text-2xl", container: 84 },
};

const coinDepth = 14;

export default function FitJourneyLogo({ collapsed = false, size = "md" }: FitJourneyLogoProps) {
  const s = sizes[size];
  const edgeOffset = s.icon / 2 - coinDepth / 2;
  const faceDepth = coinDepth / 2;
  const logoSrc = `${logoImg}?v=coin-face-2`;

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative flex-shrink-0 flex items-center justify-center overflow-visible"
        style={{
          width: s.container,
          height: s.container,
          perspective: 1200,
        }}
      >
        <motion.div
          className="relative z-10"
          style={{
            width: s.icon,
            height: s.icon,
            transformStyle: "preserve-3d",
          }}
          animate={{ rotateY: 360 }}
          transition={{ duration: 5.8, repeat: Infinity, ease: "linear" }}
        >
          <div
            className="absolute inset-0"
            style={{
              transform: `translateZ(${faceDepth}px)`,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <img
              src={logoSrc}
              alt="FitJourney Logo"
              className="w-full h-full object-cover scale-[1.2]"
              style={{ filter: "drop-shadow(0 2px 6px hsl(var(--foreground) / 0.2))" }}
            />
          </div>

          <div
            className="absolute inset-0"
            style={{
              transform: `rotateY(180deg) translateZ(${faceDepth}px)`,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <img
              src={logoSrc}
              alt="FitJourney Logo verso"
              className="w-full h-full object-cover scale-[1.2]"
              style={{ filter: "drop-shadow(0 2px 6px hsl(var(--foreground) / 0.2))" }}
            />
          </div>

          <div
            className="absolute top-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: coinDepth,
              height: s.icon * 0.96,
              transform: `rotateY(90deg) translateZ(${edgeOffset}px)`,
              transformOrigin: "center",
              background:
                "linear-gradient(180deg, hsl(var(--border) / 0.95), hsl(var(--muted-foreground) / 0.45), hsl(var(--border) / 0.95))",
              boxShadow: "0 0 6px hsl(var(--foreground) / 0.12)",
            }}
          />

          <div
            className="absolute top-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: coinDepth,
              height: s.icon * 0.96,
              transform: `rotateY(90deg) translateZ(${-edgeOffset}px)`,
              transformOrigin: "center",
              background:
                "linear-gradient(180deg, hsl(var(--primary) / 0.9), hsl(var(--primary) / 0.5), hsl(var(--primary) / 0.9))",
              boxShadow: "0 0 8px hsl(var(--primary) / 0.35)",
            }}
          />
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
              filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))",
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
