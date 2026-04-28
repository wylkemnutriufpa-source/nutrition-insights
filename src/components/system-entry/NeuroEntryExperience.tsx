import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { SkipForward } from "lucide-react";
import NeuralLoading from "./NeuralLoading";
import { useSystemEntryController } from "./useSystemEntryController";

interface NeuroEntryExperienceProps {
  dataReady: boolean;
  userRole?: "patient" | "professional" | "admin";
  onComplete: () => void;
  demoMode?: boolean;
}

function microVibrate(ms = 10) {
  try { navigator?.vibrate?.(ms); } catch { /* noop */ }
}

// Audio removed for performance

/* ─── Floating background particles ─── */
function BackgroundParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    x: `${5 + Math.random() * 90}%`,
    y: `${5 + Math.random() * 90}%`,
    size: 1 + Math.random() * 2.5,
    delay: Math.random() * 4,
    dur: 5 + Math.random() * 6,
  }));

  return (
    <>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.x, top: p.y, width: p.size, height: p.size,
            background: "hsl(var(--primary) / 0.3)",
          }}
          animate={{ y: [0, -15, 0], opacity: [0.05, 0.3, 0.05] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

/* ─── Cinematic text stages ─── */
const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

function CinematicText({
  stage,
  awarenessMessage,
  durationMultiplier,
}: {
  stage: "loading" | "awareness" | "reveal" | "ready";
  awarenessMessage: string;
  durationMultiplier: number;
}) {
  const [textStage, setTextStage] = useState(0);

  useEffect(() => {
    // Stage 0: title appears immediately
    // Stage 1: subtitle after 0.6s
    // Stage 2: awareness message (when state === awareness)
    const t1 = setTimeout(() => setTextStage(1), 600 * durationMultiplier);
    return () => clearTimeout(t1);
  }, [durationMultiplier]);

  useEffect(() => {
    if (stage === "awareness") setTextStage(2);
  }, [stage]);

  return (
    <div className="text-center mt-8 md:mt-10 relative z-10 min-h-[100px] flex flex-col items-center justify-center">
      {/* Stage 1: Title */}
      <AnimatePresence mode="wait">
        {textStage < 2 && (
          <motion.h1
            key="title"
            className="text-2xl md:text-3xl font-bold tracking-[0.18em] uppercase"
            style={{
              color: "hsl(var(--primary))",
              textShadow: "0 0 30px hsl(var(--primary) / 0.3), 0 0 60px hsl(var(--primary) / 0.1)",
            }}
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.7, ease: EASE_PREMIUM }}
          >
            FitJourney Intelligence
          </motion.h1>
        )}
      </AnimatePresence>

      {/* Stage 2: Subtitle */}
      <AnimatePresence>
        {textStage >= 1 && textStage < 2 && (
          <motion.p
            key="subtitle"
            className="text-xs md:text-sm tracking-[0.1em] mt-3 uppercase text-muted-foreground/70"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 0.8, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.6, ease: EASE_PREMIUM }}
          >
            Preparing your intelligent clinical ecosystem...
          </motion.p>
        )}
      </AnimatePresence>

      {/* Stage 3: Awareness message */}
      <AnimatePresence>
        {textStage >= 2 && (
          <motion.div
            key="awareness"
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Radial ripple */}
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 300, height: 300,
                background: "radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, transparent 65%)",
              }}
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: [0, 0.6, 0], scale: [0.3, 2] }}
              transition={{ duration: 1.2 * durationMultiplier, ease: "easeOut" }}
            />

            <motion.p
              className="text-sm md:text-base font-medium tracking-[0.08em] max-w-xs"
              style={{
                background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
              initial={{ opacity: 0, y: 10, letterSpacing: "0.02em" }}
              animate={{ opacity: 1, y: 0, letterSpacing: "0.08em" }}
              transition={{ duration: 0.8, ease: EASE_PREMIUM }}
            >
              {awarenessMessage}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function NeuroEntryExperience({
  dataReady,
  userRole = "patient",
  onComplete,
  demoMode = false,
}: NeuroEntryExperienceProps) {
  const reduced = useReducedMotion();
  const { state, awarenessMessage, durationMultiplier, skipToReady } = useSystemEntryController({
    dataReady: demoMode ? false : dataReady,
    userRole,
  });

  const tonePlayed = useRef(false);

  useEffect(() => {
    if (state === "awareness" && !tonePlayed.current) {
      tonePlayed.current = true;
      microVibrate(10);
    }
  }, [state]);

  useEffect(() => {
    if (state === "reveal") microVibrate(6);
  }, [state]);

  useEffect(() => {
    if (state === "ready") onComplete();
  }, [state, onComplete]);

  useEffect(() => {
    if (reduced && dataReady) {
      const t = setTimeout(onComplete, 300);
      return () => clearTimeout(t);
    }
  }, [reduced, dataReady, onComplete]);

  const handleSkip = useCallback(() => {
    skipToReady();
    onComplete();
  }, [skipToReady, onComplete]);

  if (reduced && dataReady) return null;

  const showBrain = state === "loading" || state === "awareness";

  return (
    <AnimatePresence>
      {state !== "ready" ? (
        <motion.div
          key="neuro-entry"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(20px)", scale: 1.05 }}
          transition={{ duration: 0.8, ease: EASE_PREMIUM }}
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at 50% 40%, hsl(152 30% 8%) 0%, hsl(222 40% 5%) 45%, hsl(0 0% 2%) 100%)",
          }}
        >
          {/* Deep space atmosphere */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Breathing ambient */}
            <motion.div
              className="absolute inset-0"
              animate={{
                background: [
                  "radial-gradient(ellipse at 50% 40%, hsl(152 25% 9%) 0%, hsl(222 40% 5%) 45%, hsl(0 0% 2%) 100%)",
                  "radial-gradient(ellipse at 50% 40%, hsl(152 30% 11%) 0%, hsl(222 40% 6%) 45%, hsl(0 0% 2%) 100%)",
                  "radial-gradient(ellipse at 50% 40%, hsl(152 25% 9%) 0%, hsl(222 40% 5%) 45%, hsl(0 0% 2%) 100%)",
                ],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Volumetric light behind brain */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-[500px] h-[500px] md:w-[700px] md:h-[700px] rounded-full"
              style={{
                background: "radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, hsl(var(--primary) / 0.02) 40%, transparent 65%)",
              }}
              animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Floating particles */}
            {!reduced && <BackgroundParticles />}
          </div>

          {/* Brain + neural network — hero element */}
          <motion.div
            className="relative z-10"
            animate={
              state === "awareness"
                ? { scale: 0.88, opacity: 0.8, y: -10 }
                : { scale: 1, opacity: 1, y: 0 }
            }
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <NeuralLoading active={showBrain} durationMultiplier={durationMultiplier} />
          </motion.div>

          {/* Cinematic text sequence */}
          <CinematicText
            stage={state}
            awarenessMessage={awarenessMessage}
            durationMultiplier={durationMultiplier}
          />

          {/* Skip button — discreet but visible */}
          <motion.button
            onClick={handleSkip}
            className="absolute top-5 right-5 md:top-8 md:right-8 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-muted-foreground/40 hover:text-muted-foreground/80 hover:bg-white/[0.04] transition-all duration-300 backdrop-blur-sm border border-transparent hover:border-white/[0.06]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            aria-label="Pular introdução"
          >
            <span className="hidden sm:inline tracking-wider uppercase">Pular</span>
            <SkipForward className="w-3.5 h-3.5" />
          </motion.button>

          {/* Premium loading bar */}
          <motion.div
            className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 w-32 md:w-40 h-[1.5px] rounded-full overflow-hidden"
            style={{ background: "hsl(var(--primary) / 0.1)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, hsl(var(--primary) / 0.6), hsl(var(--primary)), hsl(var(--accent) / 0.8))",
              }}
              initial={{ width: "0%" }}
              animate={{ width: dataReady ? "100%" : "60%" }}
              transition={{
                duration: dataReady ? 0.4 : 4,
                ease: dataReady ? [0.22, 1, 0.36, 1] : "easeInOut",
              }}
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
