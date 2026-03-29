import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SkipForward } from "lucide-react";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";

const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;
const STORAGE_KEY = "fj_intro_seen";
const TOTAL_DURATION = 3000; // 3 seconds

/* ─── Floating particles ─── */
function IntroParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    x: `${Math.random() * 100}%`,
    y: `${Math.random() * 100}%`,
    size: 1 + Math.random() * 3,
    delay: Math.random() * 1.5,
    dur: 2 + Math.random() * 3,
  }));

  return (
    <>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            background: "hsl(var(--primary) / 0.4)",
            boxShadow: "0 0 6px hsl(var(--primary) / 0.3)",
          }}
          initial={{ opacity: 0 }}
          animate={{
            y: [0, -20, 0],
            opacity: [0, 0.6, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: p.dur,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </>
  );
}

/* ─── Energy ring that pulses from center ─── */
function EnergyRings() {
  return (
    <>
      {[0, 0.3, 0.6].map((delay, i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{
            width: 120,
            height: 120,
            border: "1px solid hsl(var(--primary) / 0.3)",
            boxShadow: `0 0 20px hsl(var(--primary) / 0.1), inset 0 0 20px hsl(var(--primary) / 0.05)`,
          }}
          initial={{ opacity: 0, scale: 0.2 }}
          animate={{ opacity: [0, 0.6, 0], scale: [0.2, 3, 5] }}
          transition={{ duration: 2, delay: 0.2 + delay, ease: "easeOut" }}
        />
      ))}
    </>
  );
}

interface CinematicIntroProps {
  onComplete: () => void;
}

export default function CinematicIntro({ onComplete }: CinematicIntroProps) {
  const [phase, setPhase] = useState<"particles" | "logo" | "text" | "exit">("particles");
  const timerRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = useCallback(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
  }, []);

  const skip = useCallback(() => {
    clearTimers();
    sessionStorage.setItem(STORAGE_KEY, "1");
    onComplete();
  }, [clearTimers, onComplete]);

  useEffect(() => {
    // Phase timeline (total ~3s)
    const t1 = setTimeout(() => setPhase("logo"), 400);
    const t2 = setTimeout(() => setPhase("text"), 1400);
    const t3 = setTimeout(() => setPhase("exit"), 2400);
    const t4 = setTimeout(() => {
      sessionStorage.setItem(STORAGE_KEY, "1");
      onComplete();
    }, TOTAL_DURATION);

    timerRef.current = [t1, t2, t3, t4];
    return clearTimers;
  }, [onComplete, clearTimers]);

  return (
    <motion.div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, hsl(152 30% 6%) 0%, hsl(222 40% 4%) 50%, hsl(0 0% 1%) 100%)",
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: EASE_PREMIUM }}
    >
      {/* Particles always visible */}
      <IntroParticles />

      {/* Energy rings appear early */}
      <EnergyRings />

      {/* Central volumetric glow */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{
          width: 400,
          height: 400,
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, hsl(var(--primary) / 0.04) 40%, transparent 70%)",
        }}
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: 1, scale: [0.3, 1.2, 1] }}
        transition={{ duration: 1.5, ease: EASE_PREMIUM }}
      />

      {/* Logo reveal */}
      <AnimatePresence>
        {(phase === "logo" || phase === "text" || phase === "exit") && (
          <motion.div
            key="logo"
            className="relative z-10"
            initial={{ opacity: 0, scale: 0.5, filter: "blur(12px)" }}
            animate={{
              opacity: phase === "exit" ? 0.3 : 1,
              scale: phase === "exit" ? 1.1 : [0.5, 1.05, 1],
              filter: "blur(0px)",
              y: phase === "text" || phase === "exit" ? -30 : 0,
            }}
            transition={{ duration: 0.6, ease: EASE_PREMIUM }}
            style={{
              filter: "drop-shadow(0 0 30px hsl(var(--primary) / 0.4)) drop-shadow(0 0 60px hsl(var(--primary) / 0.2))",
            }}
          >
            <FitJourneyLogo size="lg" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Text sequence */}
      <AnimatePresence mode="wait">
        {phase === "text" && (
          <motion.div
            key="text-block"
            className="relative z-10 mt-6 text-center flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: EASE_PREMIUM }}
          >
            <motion.p
              className="text-sm md:text-base font-semibold tracking-[0.15em] uppercase"
              style={{
                background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                textShadow: "none",
              }}
              initial={{ opacity: 0, letterSpacing: "0.05em" }}
              animate={{ opacity: 1, letterSpacing: "0.15em" }}
              transition={{ duration: 0.6, ease: EASE_PREMIUM }}
            >
              Sua nova jornada começa agora
            </motion.p>

            <motion.p
              className="text-xs md:text-sm text-muted-foreground/60 tracking-[0.08em] max-w-sm mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Aqui você não faz apenas dieta.
              <br />
              Você inicia uma transformação inteligente.
            </motion.p>
          </motion.div>
        )}

        {phase === "exit" && (
          <motion.p
            key="welcome"
            className="relative z-10 mt-4 text-lg md:text-xl font-bold tracking-[0.12em]"
            style={{
              color: "hsl(var(--primary))",
              textShadow: "0 0 20px hsl(var(--primary) / 0.3)",
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: EASE_PREMIUM }}
          >
            Bem-vindo ao FitJourney
          </motion.p>
        )}
      </AnimatePresence>

      {/* Skip button */}
      <motion.button
        onClick={skip}
        className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-muted-foreground/40 hover:text-muted-foreground/80 hover:bg-white/[0.04] transition-all duration-300 backdrop-blur-sm border border-transparent hover:border-white/[0.06] z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        aria-label="Pular intro"
      >
        <span className="hidden sm:inline tracking-wider uppercase">Pular</span>
        <SkipForward className="w-3.5 h-3.5" />
      </motion.button>

      {/* Bottom loading bar */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 w-28 h-[1.5px] rounded-full overflow-hidden"
        style={{ background: "hsl(var(--primary) / 0.1)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background:
              "linear-gradient(90deg, hsl(var(--primary) / 0.6), hsl(var(--primary)), hsl(var(--accent) / 0.8))",
          }}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: TOTAL_DURATION / 1000, ease: "easeInOut" }}
        />
      </motion.div>
    </motion.div>
  );
}
