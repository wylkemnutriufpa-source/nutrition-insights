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
  const [skipTriggered, setSkipTriggered] = useState(false);

  const handleFinish = useCallback(() => {
    if (skipTriggered) return;
    setSkipTriggered(true);
    setBooting(false);
    microVibrate(15);
  }, [skipTriggered]);

  useEffect(() => {
    if (shouldReduceMotion && dataReady) {
      onComplete();
      return;
    }

    if (dataReady) {
      const elapsed = Date.now() - minTimeRef.current;
      const minDisplay = 3000; // Garantir tempo para o vídeo ser apreciado
      const remaining = Math.max(0, minDisplay - elapsed);

      const timer = setTimeout(handleFinish, remaining);
      return () => clearTimeout(timer);
    }
  }, [dataReady, shouldReduceMotion, handleFinish]);

  const handleExitComplete = useCallback(() => {
    console.log("[AppBootExperience] Transição concluída.");
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
          className="fixed inset-0 z-[150] flex items-center justify-center overflow-hidden bg-black cursor-pointer"
          onClick={handleFinish}
        >
          {/* Video — Always full screen and centered */}
          <video
            className="absolute inset-0 w-full h-full object-contain md:object-cover"
            src="/videos/logo-animated.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            style={{ filter: "brightness(0.9) contrast(1.1)" }}
          />

          {/* Gradient overlay suave */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%)",
            }}
          />

          {/* Brand text & Loading — Centered stack */}
          <div className="relative z-10 flex flex-col items-center gap-4 mt-auto mb-12">
            {/* Loading bar */}
            <motion.div
              className="w-48 h-[1px] rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.05)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
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
            
            <div className="text-[10px] uppercase tracking-[0.4em] text-white/20 animate-pulse font-light">
              Clique para entrar
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
