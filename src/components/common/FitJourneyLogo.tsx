import { motion } from "framer-motion";
import logoImg from "@/assets/logo.png";

interface FitJourneyLogoProps {
  collapsed?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: 40, text: "text-xl", container: 40 },
  md: { icon: 48, text: "text-lg", container: 48 },
  lg: { icon: 60, text: "text-2xl", container: 60 },
};

const coinDepth = 6;

export default function FitJourneyLogo({ collapsed = false, size = "md" }: FitJourneyLogoProps) {
  const s = sizes[size];
  const edgeOffset = s.icon / 2 - coinDepth / 2;
  const faceDepth = coinDepth / 2;

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative flex-shrink-0 flex items-center justify-center"
        style={{
          width: s.container,
          height: s.container,
          perspective: 800,
        }}
      >
        <motion.div
          className="relative"
          style={{
            width: s.icon,
            height: s.icon,
            transformStyle: "preserve-3d",
          }}
          animate={{ rotateY: 360 }}
          transition={{ duration: 5.8, repeat: Infinity, ease: "linear" }}
        >
          {/* Front face */}
          <div
            className="absolute inset-0 rounded-full overflow-hidden"
            style={{
              transform: `translateZ(${faceDepth}px)`,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <img
              src={logoImg}
              alt="FitJourney Logo"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Back face */}
          <div
            className="absolute inset-0 rounded-full overflow-hidden"
            style={{
              transform: `rotateY(180deg) translateZ(${faceDepth}px)`,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <img
              src={logoImg}
              alt="FitJourney Logo verso"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Coin edges */}
          <div
            className="absolute top-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: coinDepth,
              height: s.icon * 0.92,
              transform: `rotateY(90deg) translateZ(${edgeOffset}px)`,
              transformOrigin: "center",
              background:
                "linear-gradient(180deg, hsl(152 58% 42% / 0.9), hsl(152 58% 30% / 0.5), hsl(152 58% 42% / 0.9))",
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: coinDepth,
              height: s.icon * 0.92,
              transform: `rotateY(90deg) translateZ(${-edgeOffset}px)`,
              transformOrigin: "center",
              background:
                "linear-gradient(180deg, hsl(152 58% 42% / 0.9), hsl(152 58% 30% / 0.5), hsl(152 58% 42% / 0.9))",
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
