import { motion } from "framer-motion";
import logoImg from "@/assets/logo.png";

interface FitJourneyLogoProps {
  collapsed?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: 68, text: "text-xl", container: 64 },
  md: { icon: 78, text: "text-lg", container: 72 },
  lg: { icon: 90, text: "text-2xl", container: 84 },
};

export default function FitJourneyLogo({ collapsed = false, size = "md" }: FitJourneyLogoProps) {
  const s = sizes[size];

  return (
    <div className="flex items-center gap-3">
      {/* 3D Coin Container */}
      <div
        className="relative flex-shrink-0 flex items-center justify-center"
        style={{
          width: s.container,
          height: s.container,
          perspective: 800,
        }}
      >
        {/* Cinematic ambient glow */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(152 58% 42% / 0.35) 0%, hsl(152 58% 42% / 0.1) 50%, transparent 70%)",
            filter: "blur(8px)",
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Secondary glow pulse */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(170 80% 55% / 0.2) 0%, transparent 60%)",
            filter: "blur(12px)",
          }}
          animate={{
            scale: [1.1, 1.5, 1.1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        {/* Energy particles */}
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: i % 2 === 0 ? 3 : 2,
              height: i % 2 === 0 ? 3 : 2,
              background: `radial-gradient(circle, ${
                i % 3 === 0
                  ? "hsl(152, 58%, 55%)"
                  : i % 3 === 1
                  ? "hsl(170, 80%, 60%)"
                  : "hsl(45, 100%, 70%)"
              }, transparent)`,
              boxShadow: `0 0 6px ${
                i % 3 === 0
                  ? "hsl(152, 58%, 55%)"
                  : i % 3 === 1
                  ? "hsl(170, 80%, 60%)"
                  : "hsl(45, 100%, 70%)"
              }`,
              top: "50%",
              left: "50%",
            }}
            animate={{
              x: [0, Math.cos((i * 72 * Math.PI) / 180) * (s.container * 0.55), 0],
              y: [0, Math.sin((i * 72 * Math.PI) / 180) * (s.container * 0.55), 0],
              opacity: [0, 0.9, 0],
              scale: [0, 1.2, 0],
            }}
            transition={{
              duration: 3 + i * 0.4,
              repeat: Infinity,
              delay: i * 0.6,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Spinning conic ring */}
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: -3,
            background:
              "conic-gradient(from 0deg, hsl(152 58% 50% / 0.6), transparent 30%, hsl(170 60% 55% / 0.5) 50%, transparent 70%, hsl(45 100% 65% / 0.3) 85%, hsl(152 58% 50% / 0.6))",
            opacity: 0.5,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />

        {/* 3D Coin — smooth Y-axis rotation with front & back faces */}
        <motion.div
          className="relative z-10"
          style={{
            width: s.icon,
            height: s.icon,
            transformStyle: "preserve-3d",
          }}
          animate={{
            rotateY: [0, 360],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {/* Front face */}
          <div
            className="absolute inset-0"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <img
              src={logoImg}
              alt="FitJourney Logo"
              className="w-full h-full object-contain"
              style={{
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
              }}
            />
          </div>

          {/* Back face (mirrored) */}
          <div
            className="absolute inset-0"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <img
              src={logoImg}
              alt="FitJourney Logo Back"
              className="w-full h-full object-contain"
              style={{
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
              }}
            />
          </div>

          {/* Coin edge (thickness) */}
          <div
            className="absolute rounded-full"
            style={{
              width: s.icon,
              height: s.icon,
              background: "linear-gradient(180deg, hsl(152 58% 45%), hsl(152 58% 30%), hsl(152 58% 45%))",
              transform: "translateZ(-2px)",
              boxShadow: "0 0 20px hsl(152 58% 42% / 0.4), 0 4px 12px rgba(0,0,0,0.3)",
            }}
          />
        </motion.div>

        {/* Specular highlight overlay */}
        <motion.div
          className="absolute z-20 rounded-full pointer-events-none"
          style={{
            width: s.icon,
            height: s.icon,
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%, rgba(255,255,255,0.08) 100%)",
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
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
