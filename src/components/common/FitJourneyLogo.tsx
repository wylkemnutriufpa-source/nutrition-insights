import { motion } from "framer-motion";
import logoImg from "@/assets/logo.jpg";

interface FitJourneyLogoProps {
  collapsed?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: "w-9 h-9", text: "text-xl", ring: "-inset-[3px]", orbit: 22, img: 24 },
  md: { icon: "w-10 h-10", text: "text-lg", ring: "-inset-[3px]", orbit: 25, img: 28 },
  lg: { icon: "w-12 h-12", text: "text-2xl", ring: "-inset-[4px]", orbit: 30, img: 34 },
};

// Orbital particle that traces a tilted circular path
function OrbitalParticle({ duration, delay, tilt, radius, particleSize, color }: {
  duration: number; delay: number; tilt: number; radius: number; particleSize: number; color: string;
}) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{
        transform: `rotateX(${tilt}deg)`,
        transformStyle: "preserve-3d",
      }}
    >
      <motion.div
        className="absolute"
        style={{
          width: particleSize,
          height: particleSize,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}, transparent)`,
          boxShadow: `0 0 ${particleSize * 2}px ${color}`,
          top: "50%",
          left: "50%",
          marginTop: -particleSize / 2,
          marginLeft: -particleSize / 2,
          offsetPath: `circle(${radius}px at 0px 0px)`,
          offsetRotate: "0deg",
        }}
        animate={{ offsetDistance: ["0%", "100%"] }}
        transition={{
          duration,
          repeat: Infinity,
          delay,
          ease: "linear",
        }}
      />
    </motion.div>
  );
}

export default function FitJourneyLogo({ collapsed = false, size = "md" }: FitJourneyLogoProps) {
  const s = sizes[size];

  const orbits = [
    { duration: 3, delay: 0, tilt: 65, particleSize: 3, color: "hsl(152, 58%, 55%)" },
    { duration: 3, delay: 1.5, tilt: 65, particleSize: 2.5, color: "hsl(170, 80%, 60%)" },
    { duration: 4, delay: 0.3, tilt: -20, particleSize: 3.5, color: "hsl(45, 100%, 65%)" },
    { duration: 4, delay: 2, tilt: -20, particleSize: 2, color: "hsl(152, 58%, 50%)" },
    { duration: 3.5, delay: 0.8, tilt: 140, particleSize: 2.5, color: "hsl(200, 80%, 65%)" },
    { duration: 3.5, delay: 2.5, tilt: 140, particleSize: 3, color: "hsl(170, 60%, 55%)" },
  ];

  return (
    <div className="flex items-center gap-3">
      {/* Icon with orbital particles */}
      <div className="relative flex-shrink-0" style={{ perspective: 400 }}>
        {/* Soft ambient glow */}
        <motion.div
          className="absolute -inset-2 rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(152 58% 42% / 0.2) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Spinning conic gradient border */}
        <motion.div
          className={`absolute ${s.ring} rounded-full`}
          style={{
            background: "conic-gradient(from 0deg, hsl(152 58% 42%), transparent 40%, hsl(170 60% 45% / 0.8) 60%, transparent 80%, hsl(152 58% 42%))",
            opacity: 0.5,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />

        {/* Orbital particles */}
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
          {orbits.map((o, i) => (
            <OrbitalParticle
              key={i}
              duration={o.duration}
              delay={o.delay}
              tilt={o.tilt}
              radius={s.orbit}
              particleSize={o.particleSize}
              color={o.color}
            />
          ))}
        </div>

        {/* Main icon container - CIRCLE with GIF logo */}
        <div
          className={`${s.icon} rounded-full flex items-center justify-center relative z-10 overflow-hidden`}
          style={{
            background: "linear-gradient(135deg, hsl(152 58% 42%), hsl(170 60% 45%), hsl(152 58% 48%))",
            boxShadow: "0 0 20px hsl(152 58% 42% / 0.3), inset 0 1px 1px rgba(255,255,255,0.3)",
          }}
        >
          <img
            src={logoImg}
            alt="FitJourney Logo"
            className="rounded-full object-cover"
            style={{
              width: s.img,
              height: s.img,
              filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.25))",
            }}
          />
        </div>
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
