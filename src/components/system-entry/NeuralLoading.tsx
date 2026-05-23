import { useRef, useEffect, useCallback, useState, lazy, Suspense } from "react";
import { motion, useReducedMotion } from "framer-motion";
import logoPng from "@/assets/logo.png";
import type { NeuralAnimationMode } from "./NeuralParticleCanvas";

// 🛡️ SOBERANIA: Lazy load heavy 3D engine (Three.js)
const NeuralParticleCanvas = lazy(() => import("./NeuralParticleCanvas"));

interface NeuralLoadingProps {
  active: boolean;
  durationMultiplier?: number;
  animationMode?: NeuralAnimationMode;
  transitionDuration?: number;
  onTransitionComplete?: () => void;
}

export function NeuralLoading({
  active,
  durationMultiplier = 1,
  animationMode = "idle",
  transitionDuration = 3.5,
  onTransitionComplete,
}: NeuralLoadingProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isClient, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  if (!active || !isClient) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
    >
      <Suspense fallback={<div className="text-white text-xs opacity-50">Iniciando motor neural...</div>}>
        {!shouldReduceMotion && (
          <NeuralParticleCanvas
            durationMultiplier={durationMultiplier}
            animationMode={animationMode}
            transitionDuration={transitionDuration}
            onTransitionComplete={onTransitionComplete}
          />
        )}
      </Suspense>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ delay: 0.5, duration: 1.2 }}
        className="relative z-10 flex flex-col items-center gap-6"
      >
        <div className="relative">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -inset-8 rounded-full bg-green-500/20 blur-2xl"
          />
          <img src={logoPng} alt="FitJourney" className="h-16 w-auto brightness-0 invert" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-green-500/80">
            Clinical Intelligence
          </span>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />
        </div>
      </motion.div>
    </motion.div>
  );
}
