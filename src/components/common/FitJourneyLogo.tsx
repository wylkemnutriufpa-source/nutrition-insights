import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import logoImg from "@/assets/logo.png";

interface FitJourneyLogoProps {
  collapsed?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: 36, text: "text-lg", container: 44 },
  md: { icon: 42, text: "text-lg", container: 50 },
  lg: { icon: 54, text: "text-2xl", container: 62 },
};

export default function FitJourneyLogo({ collapsed = false, size = "md" }: FitJourneyLogoProps) {
  const s = sizes[size];
  const EDGE_WIDTH = 14;

  // Animate angle 0→360 continuously
  const angle = useMotionValue(0);

  useEffect(() => {
    const controls = animate(angle, 360, {
      duration: 7,
      repeat: Infinity,
      ease: "linear",
    });
    return controls.stop;
  }, [angle]);

  // Clamp so the coin never goes thinner than ~30% — always readable
  const clampedScale = useTransform(angle, (a) => {
    const rad = (a * Math.PI) / 180;
    const cos = Math.cos(rad);
    return Math.max(0.3, Math.abs(cos));
  });

  // Determine which face is showing (front vs back)
  const isFront = useTransform(angle, (a) => {
    const normalized = a % 360;
    return normalized < 90 || normalized > 270;
  });

  // Edge visibility — shows when coin is angled
  const edgeOpacity = useTransform(angle, (a) => {
    const rad = (a * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    return Math.min(1, sin * 1.8);
  });

  // Edge offset — shifts left/right based on rotation direction
  const edgeX = useTransform(angle, (a) => {
    const rad = (a * Math.PI) / 180;
    return Math.sin(rad) * (EDGE_WIDTH * 0.5);
  });

  // Highlight position on the edge for metallic sheen
  const edgeHighlight = useTransform(angle, (a) => {
    const rad = (a * Math.PI) / 180;
    const pos = (Math.sin(rad) + 1) / 2;
    return `${pos * 100}%`;
  });

  // Shadow for grounding
  const shadowBlur = useTransform(clampedScale, (s) => `0 ${4 + (1 - s) * 6}px ${8 + (1 - s) * 10}px rgba(0,0,0,${0.1 + (1 - s) * 0.15})`);

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative flex-shrink-0 flex items-center justify-center"
        style={{ width: s.container, height: s.container }}
      >
        {/* Shadow layer */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: s.icon,
            height: s.icon,
            scaleX: clampedScale,
            boxShadow: shadowBlur,
            top: 2,
          }}
        />

        {/* Edge / thickness layer — always behind the face */}
        <motion.div
          className="absolute rounded-[6px]"
          style={{
            width: EDGE_WIDTH,
            height: s.icon - 4,
            opacity: edgeOpacity,
            x: edgeX,
            background: `linear-gradient(
              90deg,
              hsl(0 0% 45%) 0%,
              hsl(0 0% 65%) 20%,
              hsl(0 0% 82%) 45%,
              hsl(0 0% 70%) 55%,
              hsl(0 0% 65%) 80%,
              hsl(0 0% 45%) 100%
            )`,
            boxShadow: "inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.2)",
          }}
        />

        {/* Front face — the logo */}
        <motion.div
          className="absolute rounded-full overflow-hidden"
          style={{
            width: s.icon,
            height: s.icon,
            scaleX: clampedScale,
          }}
        >
          <motion.div className="w-full h-full relative">
            <img
              src={logoImg}
              alt="FitJourney Logo"
              className="w-full h-full object-cover rounded-full"
            />
            {/* Chrome rim */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                boxShadow:
                  "inset 0 0 0 1.5px rgba(255,255,255,0.4), inset 0 0 0 3px rgba(0,0,0,0.06)",
              }}
            />
            {/* Specular highlight sweep */}
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: useTransform(
                  edgeHighlight,
                  (pos) =>
                    `linear-gradient(105deg, transparent 0%, transparent ${parseFloat(pos) - 15}%, rgba(255,255,255,0.18) ${pos}, transparent ${parseFloat(pos) + 15}%, transparent 100%)`
                ),
              }}
            />
          </motion.div>
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
