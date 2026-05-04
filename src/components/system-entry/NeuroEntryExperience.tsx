import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { SkipForward } from "lucide-react";
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

export default function NeuroEntryExperience({
  dataReady,
  userRole = "patient",
  onComplete,
  demoMode = false,
}: NeuroEntryExperienceProps) {
  const reduced = useReducedMotion();
  const { state, awarenessMessage, skipToReady } = useSystemEntryController({
    dataReady: demoMode ? false : dataReady,
    userRole,
  });

  useEffect(() => {
    if (state === "ready") {
      onComplete();
    }
  }, [state, onComplete]);

  const handleSkip = useCallback(() => {
    skipToReady();
    onComplete();
  }, [skipToReady, onComplete]);

  if (reduced && dataReady) return null;

  return (
    <AnimatePresence>
      {state !== "ready" ? (
        <motion.div
          key="neuro-entry-video"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(20px)", scale: 1.05 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[160] flex items-center justify-center overflow-hidden bg-black cursor-pointer"
          onClick={handleSkip}
        >
          {/* Video — Perfectly centered and contained for logo clarity */}
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <video
              className="w-full h-full max-w-[800px] max-h-[800px] object-contain"
              src="/videos/logo-animated.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              style={{ filter: "brightness(1) contrast(1)" }}
            />
          </div>

          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.5) 100%)" }} />

          <div className="relative z-10 text-center space-y-4">
            <motion.h1 className="text-2xl md:text-3xl font-bold tracking-[0.2em] uppercase text-white">FitJourney Intelligence</motion.h1>
            <AnimatePresence mode="wait">
              {awarenessMessage && (
                <motion.p
                  key={awarenessMessage}
                  className="text-sm md:text-base font-light tracking-[0.1em] text-white/70"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {awarenessMessage}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
            <motion.div className="w-32 h-[1px] rounded-full overflow-hidden bg-white/10">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: dataReady ? "100%" : "60%" }}
                transition={{ duration: dataReady ? 0.4 : 4 }}
              />
            </motion.div>
            <div className="text-[10px] uppercase tracking-[0.4em] text-white/20 animate-pulse font-light">
              Toque para entrar
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
