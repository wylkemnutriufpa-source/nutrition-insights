import { useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { SkipForward } from "lucide-react";
import NeuralLoading from "./NeuralLoading";
import SystemAwarenessMoment from "./SystemAwarenessMoment";
import { useSystemEntryController, type AppEntryState } from "./useSystemEntryController";

interface NeuroEntryExperienceProps {
  dataReady: boolean;
  userRole?: "patient" | "professional" | "admin";
  onComplete: () => void;
}

function microVibrate(ms = 10) {
  try { navigator?.vibrate?.(ms); } catch { /* noop */ }
}

function playTone() {
  try {
    if (localStorage.getItem("fj_audio_muted") === "1") return;
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    const notes = [880, 1318.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.035, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8 + i * 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + i * 0.08);
      osc.stop(t + 1 + i * 0.15);
    });
  } catch { /* Web Audio unavailable */ }
}

export default function NeuroEntryExperience({
  dataReady,
  userRole = "patient",
  onComplete,
}: NeuroEntryExperienceProps) {
  const reduced = useReducedMotion();
  const { state, awarenessMessage, durationMultiplier, skipToReady } = useSystemEntryController({
    dataReady,
    userRole,
  });

  const tonePlayed = useRef(false);

  useEffect(() => {
    if (state === "awareness" && !tonePlayed.current) {
      tonePlayed.current = true;
      playTone();
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
  const showAwareness = state === "awareness";

  return (
    <AnimatePresence>
      {state !== "ready" ? (
        <motion.div
          key="neuro-entry"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(16px)", scale: 1.03 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at center, hsl(222 30% 10%) 0%, hsl(222 40% 5%) 60%, hsl(0 0% 0%) 100%)",
          }}
        >
          {/* Breathing background */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{
              background: [
                "radial-gradient(ellipse at center, hsl(222 30% 10%) 0%, hsl(222 40% 5%) 60%, hsl(0 0% 0%) 100%)",
                "radial-gradient(ellipse at center, hsl(222 30% 12%) 0%, hsl(222 40% 6%) 60%, hsl(0 0% 0%) 100%)",
                "radial-gradient(ellipse at center, hsl(222 30% 10%) 0%, hsl(222 40% 5%) 60%, hsl(0 0% 0%) 100%)",
              ],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Brain + neural network */}
          <motion.div
            animate={
              state === "awareness"
                ? { scale: 0.85, opacity: 0.7 }
                : { scale: 1, opacity: 1 }
            }
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <NeuralLoading active={showBrain} durationMultiplier={durationMultiplier} />
          </motion.div>

          {/* Awareness message */}
          <div className="mt-6">
            <SystemAwarenessMoment
              active={showAwareness}
              message={awarenessMessage}
              durationMultiplier={durationMultiplier}
            />
          </div>

          {/* Brand text */}
          <AnimatePresence>
            {showBrain && (
              <motion.div
                className="mt-6 text-center"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <h1
                  className="text-xl md:text-2xl font-bold tracking-[0.16em] uppercase"
                  style={{
                    color: "hsl(var(--primary))",
                    textShadow: "0 0 24px hsl(var(--primary) / 0.25)",
                  }}
                >
                  FITJOURNEY
                </h1>
                <motion.p
                  className="text-[10px] md:text-xs tracking-[0.1em] mt-1.5 uppercase text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                >
                  Intelligent Clinical Evolution
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skip button */}
          <motion.button
            onClick={handleSkip}
            className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground/60 hover:text-muted-foreground hover:bg-white/[0.05] transition-colors duration-200 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            aria-label="Pular introdução"
          >
            <span className="hidden sm:inline">Pular</span>
            <SkipForward className="w-3.5 h-3.5" />
          </motion.button>

          {/* Loading bar */}
          <motion.div
            className="absolute bottom-10 left-1/2 -translate-x-1/2 w-36 h-[2px] rounded-full overflow-hidden bg-muted/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))" }}
              initial={{ width: "0%" }}
              animate={{ width: dataReady ? "100%" : "65%" }}
              transition={{ duration: dataReady ? 0.3 : 3.5, ease: dataReady ? "easeOut" : "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
