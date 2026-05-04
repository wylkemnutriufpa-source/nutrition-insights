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
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden bg-black cursor-pointer"
          onClick={handleSkip}
        >
          {/* Video — Centralizado e contido */}
          <div className="absolute inset-0 flex items-center justify-center">
            <video
              className="w-full h-full object-contain"
              src="/videos/logo-animated.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              style={{ filter: "brightness(0.8) contrast(1.1)" }}
            />
          </div>

          {/* Gradient overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.5) 100%)",
            }}
          />

          {/* Brand/Stage Text */}
          <div className="relative z-10 text-center space-y-4">
            <motion.h1
              className="text-2xl md:text-3xl font-bold tracking-[0.18em] uppercase text-white"
              style={{
                textShadow: "0 0 30px rgba(16, 185, 129, 0.5)",
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              FitJourney Intelligence
            </motion.h1>
            
            <AnimatePresence mode="wait">
              {awarenessMessage && (
                <motion.p
                  key={awarenessMessage}
                  className="text-sm md:text-base font-medium tracking-[0.08em] text-white/80"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {awarenessMessage}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Skip button */}
          <motion.button
            onClick={handleSkip}
            className="absolute top-5 right-5 md:top-8 md:right-8 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-white/40 hover:text-white/80 hover:bg-white/[0.04] transition-all duration-300 backdrop-blur-sm border border-transparent hover:border-white/[0.06]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="hidden sm:inline tracking-wider uppercase">Pular</span>
            <SkipForward className="w-3.5 h-3.5" />
          </motion.button>

          {/* Progress bar */}
          <motion.div
            className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 w-32 md:w-40 h-[1.5px] rounded-full overflow-hidden bg-white/10"
          >
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: "0%" }}
              animate={{ width: dataReady ? "100%" : "60%" }}
              transition={{ duration: dataReady ? 0.4 : 4 }}
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
