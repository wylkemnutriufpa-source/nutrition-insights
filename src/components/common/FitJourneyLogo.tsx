import { motion } from "framer-motion";
import { forwardRef, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

const FitJourneyLogo = forwardRef<HTMLButtonElement, FitJourneyLogoProps>(function FitJourneyLogo(
  { collapsed = false, size = "md" },
  ref,
) {
  const s = sizes[size];
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, isNutritionist, isPersonal, isPatient } = useAuth();

  const handleClick = useCallback(() => {
    if (typeof window === "undefined") return;

    // Se já estiver logado, o "voltar ao início" deve ser o dashboard respectivo,
    // não a rota raiz que dispara o fluxo de Welcome.
    const isPro = isAdmin || isNutritionist || isPersonal;
    const target = isPro ? "/admin/dashboard" : (isPatient ? "/client/dashboard" : "/");

    console.log("[NAV] FitJourneyLogo -> Smart redirect", { isPro, target });
    
    // Clear session storage only if we really want to reset something, 
    // but for navigation it might be better to just go to target.
    sessionStorage.removeItem(STORAGE_KEY);
    
    navigate(target, { replace: true });
    
    if (location.pathname === target) {
      window.location.reload();
    }
  }, [location.pathname, navigate, isAdmin, isNutritionist, isPersonal, isPatient]);


  const particles = useMemo(
    () =>
      Array.from({ length: s.particles }, (_, i) => ({
        id: i,
        delay: i * 0.35,
        x: 15 + Math.random() * 70,
        y: 15 + Math.random() * 70,
        size: 2 + Math.random() * 2.5,
        driftX: (Math.random() - 0.5) * 12,
        driftY: (Math.random() - 0.5) * 12,
        duration: 2.5 + Math.random() * 1.5,
      })),
    [s.particles],
  );

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      className="relative z-20 flex items-center gap-0 cursor-pointer touch-manipulation bg-transparent border-0 p-0 text-left appearance-none"
      aria-label="Voltar para a entrada do FitJourney"
    >
      <div
        className="relative flex-shrink-0 flex items-center justify-center"
        style={{ width: s.icon, height: s.icon }}
      >
        <motion.div
          className="pointer-events-none absolute -inset-2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.45) 0%, hsl(var(--primary) / 0.18) 45%, transparent 75%)",
            filter: "blur(8px)",
          }}
          animate={{ scale: [0.95, 1.15, 0.95], opacity: [0.45, 0.95, 0.45] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="pointer-events-none absolute -inset-3 rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--accent) / 0.35) 0%, hsl(var(--accent) / 0.12) 50%, transparent 78%)",
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
          className="relative z-10 object-cover select-none pointer-events-none"
          style={{ imageRendering: "auto", willChange: "auto" }}
        />

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
          className="select-none ml-1"
        >
          <div
            className={`font-display font-extrabold ${s.text} tracking-tight`}
            style={{ fontStyle: "normal" }}
          >
            <span
              style={{
                background:
                  "linear-gradient(180deg, #D4A84B 0%, #F5D55A 20%, #FFFBE6 45%, #F5D55A 65%, #B8920A 85%, #8B6914 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(1px 2px 1px rgba(100,70,0,0.5))",
                textShadow: "none",
                letterSpacing: "-0.02em",
              }}
            >
              Fit
            </span>
            <span
              style={{
                background:
                  "linear-gradient(180deg, #8A8A8A 0%, #C0C0C0 18%, #E8E8E8 40%, #F5F5F5 50%, #C0C0C0 65%, #6B6B6B 85%, #3A3A3A 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(1px 2px 1px rgba(0,0,0,0.45))",
                textShadow: "none",
                letterSpacing: "-0.02em",
              }}
            >
              Journey
            </span>
          </div>
        </motion.div>
      )}
    </button>
  );
});

export default FitJourneyLogo;
