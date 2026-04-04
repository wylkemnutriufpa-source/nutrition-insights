import { motion } from "framer-motion";
import { forwardRef, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import logoPng from "@/assets/logo.png";

const STORAGE_KEY = "fj_intro_seen";

interface FitJourneyLogoProps {
  collapsed?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: 80, text: "text-lg", particles: 6 },
  md: { icon: 96, text: "text-xl", particles: 8 },
  lg: { icon: 112, text: "text-2xl", particles: 10 },
};

interface FloatingParticleProps {
  delay: number;
  x: number;
  y: number;
  size: number;
  driftX: number;
  driftY: number;
  duration: number;
}

const FloatingParticle = forwardRef<HTMLDivElement, FloatingParticleProps>(function FloatingParticle(
  { delay, x, y, size, driftX, driftY, duration },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        top: `${y}%`,
        background: "radial-gradient(circle, hsl(var(--primary) / 0.8), transparent)",
        boxShadow: `0 0 ${size * 2}px hsl(var(--primary) / 0.4)`,
      }}
      animate={{
        opacity: [0, 0.9, 0],
        scale: [0.4, 1.3, 0.4],
        x: [0, driftX, 0],
        y: [0, driftY, 0],
      }}
      transition={{ duration, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
});

const FitJourneyLogo = forwardRef<HTMLDivElement, FitJourneyLogoProps>(function FitJourneyLogo(
  { collapsed = false, size = "md" },
  ref,
) {
  const s = sizes[size];
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    if (location.pathname === "/") {
      // Already on gateway, dispatch custom event to trigger intro
      window.dispatchEvent(new CustomEvent("fj-replay-intro"));
    } else {
      navigate("/?intro=1");
    }
  }, [navigate, location.pathname]);

  const particles = useMemo(() =>
    Array.from({ length: s.particles }, (_, i) => ({
      id: i,
      delay: i * 0.35,
      x: 15 + Math.random() * 70,
      y: 15 + Math.random() * 70,
      size: 2 + Math.random() * 2.5,
      driftX: (Math.random() - 0.5) * 12,
      driftY: (Math.random() - 0.5) * 12,
      duration: 2.5 + Math.random() * 1.5,
    })), [s.particles]);

  return (
    <div ref={ref} className="flex items-center gap-0 cursor-pointer relative z-20" onClick={handleClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleClick()}>
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

        {/* Floating neural particles */}
        {particles.map((p) => (
          <FloatingParticle
            key={p.id}
            delay={p.delay}
            x={p.x}
            y={p.y}
            size={p.size}
            driftX={p.driftX}
            driftY={p.driftY}
            duration={p.duration}
          />
        ))}
      </div>

      {!collapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`font-display font-bold ${s.text} tracking-tight select-none ml-2`}
        >
          <span
            style={{
              background:
                "linear-gradient(180deg, #C9A030 0%, #F5D55A 30%, #FFFBE6 52%, #F5D55A 72%, #B8920A 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 1px 2px rgba(180,140,20,0.3))",
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
});

export default FitJourneyLogo;
