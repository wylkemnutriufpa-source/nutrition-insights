import { motion } from "framer-motion";
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

const DEPTH = 16; // coin thickness in px
const SLICES = 36; // number of edge slices for smooth cylinder

export default function FitJourneyLogo({ collapsed = false, size = "md" }: FitJourneyLogoProps) {
  const s = sizes[size];
  const half = DEPTH / 2;
  const radius = s.icon / 2;

  // Generate edge slices to form a continuous cylinder
  const edgeSlices = Array.from({ length: SLICES }, (_, i) => {
    const angle = (i / SLICES) * 180; // 0-180 degrees (visible half)
    const rad = (angle * Math.PI) / 180;
    const z = Math.cos(rad) * half;
    const x = Math.sin(rad) * half;
    // Brightness varies to simulate lighting on cylinder
    const lightness = 38 + Math.sin(rad) * 18;
    return { angle, z, x, lightness };
  });

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative flex-shrink-0 flex items-center justify-center"
        style={{
          width: s.container,
          height: s.container,
          perspective: 600,
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
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        >
          {/* Front face */}
          <div
            className="absolute inset-0 rounded-full overflow-hidden"
            style={{
              transform: `translateZ(${half}px)`,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <img
              src={logoImg}
              alt="FitJourney Logo"
              className="w-full h-full object-cover rounded-full"
            />
            {/* Chrome rim on front face */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.35), inset 0 0 0 3px rgba(0,0,0,0.08)",
              }}
            />
          </div>

          {/* Back face */}
          <div
            className="absolute inset-0 rounded-full overflow-hidden"
            style={{
              transform: `rotateY(180deg) translateZ(${half}px)`,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <img
              src={logoImg}
              alt="FitJourney Logo back"
              className="w-full h-full object-cover rounded-full"
            />
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.35), inset 0 0 0 3px rgba(0,0,0,0.08)",
              }}
            />
          </div>

          {/* Continuous cylindrical edge — many thin slices */}
          {edgeSlices.map((slice, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 2,
                height: s.icon - 2,
                top: 1,
                left: radius - 1,
                transformOrigin: "center center",
                transform: `rotateY(${slice.angle}deg) translateZ(${half}px)`,
                background: `linear-gradient(180deg, 
                  hsl(152 30% ${slice.lightness + 15}%) 0%, 
                  hsl(152 40% ${slice.lightness}%) 30%,
                  hsl(160 20% ${slice.lightness - 8}%) 50%,
                  hsl(152 40% ${slice.lightness}%) 70%,
                  hsl(152 30% ${slice.lightness + 15}%) 100%)`,
              }}
            />
          ))}

          {/* Chrome rim rings — top and bottom of the cylinder */}
          <div
            className="absolute rounded-full"
            style={{
              width: s.icon,
              height: DEPTH,
              top: -DEPTH / 2 + 1,
              left: 0,
              transform: `rotateX(90deg) translateZ(${radius - 1}px)`,
              transformOrigin: "center center",
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.12) 70%, transparent 100%)",
              pointerEvents: "none",
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
