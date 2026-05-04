import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface AppBootExperienceProps {
  /** True when ALL data (auth, profile, roles, flags) is loaded */
  dataReady: boolean;
  /** Called after exit animation completes — mount the real app */
  onComplete: () => void;
}

// ─── Haptic helper ───
function microVibrate(ms = 12) {
  try {
    navigator?.vibrate?.(ms);
  } catch { /* noop */ }
}

export default function AppBootExperience({ dataReady, onComplete }: AppBootExperienceProps) {
  const shouldReduceMotion = useReducedMotion();
  const [booting, setBooting] = useState(true);
  const minTimeRef = useRef(Date.now());

  useEffect(() => {
    if (shouldReduceMotion && dataReady) {
      onComplete();
      return;
    }

    if (dataReady) {
      const elapsed = Date.now() - minTimeRef.current;
      const minDisplay = 2500; // Tempo mínimo para o vídeo aparecer
      const remaining = Math.max(0, minDisplay - elapsed);

      const timer = setTimeout(() => {
        setBooting(false);
        microVibrate(8);
      }, remaining);

      return () => clearTimeout(timer);
    }
  }, [dataReady, shouldReduceMotion, onComplete]);

  const handleExitComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {booting ? (
        <motion.div
          key="boot-video-container"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(20px)", scale: 1.05 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[150] flex flex-col items-center justify-center overflow-hidden bg-black"
        >
          {/* Video background */}
          <video
            className="absolute inset-0 w-full h-full object-cover"
            src="/videos/logo-animated.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            style={{ filter: "brightness(0.8) contrast(1.1)" }}
          />

          {/* Gradient overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.5) 100%)",
            }}
          />

          {/* Brand text */}
          <motion.div
            className="relative z-10 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1
              className="text-3xl md:text-4xl font-bold tracking-[0.25em] uppercase text-white"
              style={{
                textShadow: "0 0 40px rgba(16, 185, 129, 0.4)",
              }}
            >
              FitJourney
            </h1>
          </motion.div>

          {/* Loading bar */}
          <motion.div
            className="absolute bottom-12 left-1/2 -translate-x-1/2 w-40 h-[2px] rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.1)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #10b981, #34d399)",
              }}
              initial={{ width: "0%" }}
              animate={{ width: dataReady ? "100%" : "60%" }}
              transition={{
                duration: dataReady ? 0.4 : 4,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
