/**
 * FitIntelligence First-Time Activation Experience
 * 
 * Ultra-premium cinematic sequence (6-8s) that runs ONLY on first activation.
 * Dark screen → golden 3D neural brain → typewriter phrases → CTA → dissolve.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import NeuralLoading from "@/components/system-entry/NeuralLoading";
import {
  startNeuralAmbient,
  crescendo,
  fadeOutAudio,
  microVibrate,
} from "./ActivationAudio";

const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

const PHRASES = [
  "Você acaba de ativar uma nova inteligência ao seu lado",
  "Bem-vindo ao Ecossistema FitJourney",
  "A partir de agora sua evolução será consciente, guiada e real",
];

/* ─── Typewriter Text ─── */
function TypewriterText({
  text,
  onComplete,
  className,
  charDelay = 40,
}: {
  text: string;
  onComplete?: () => void;
  className?: string;
  charDelay?: number;
}) {
  const [displayed, setDisplayed] = useState("");
  const idxRef = useRef(0);

  useEffect(() => {
    idxRef.current = 0;
    setDisplayed("");
    const iv = setInterval(() => {
      idxRef.current++;
      if (idxRef.current > text.length) {
        clearInterval(iv);
        onComplete?.();
        return;
      }
      setDisplayed(text.slice(0, idxRef.current));
    }, charDelay);
    return () => clearInterval(iv);
  }, [text, charDelay, onComplete]);

  return (
    <span className={className}>
      {displayed}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="inline-block w-[2px] h-[1em] ml-0.5 align-middle"
        style={{ background: "hsl(40 65% 55%)" }}
      />
    </span>
  );
}

/* ─── Main Component ─── */
interface Props {
  userId: string;
  onComplete: () => void;
}

export default function FitIntelligenceActivation({ userId, onComplete }: Props) {
  const [stage, setStage] = useState<
    "dark" | "brain" | "phrase1" | "phrase2" | "phrase3" | "cta" | "dissolve" | "done"
  >("dark");
  const audioStarted = useRef(false);

  // Timeline orchestration
  useEffect(() => {
    const timeline = [
      { delay: 400, action: () => { setStage("brain"); startNeuralAmbient(); audioStarted.current = true; microVibrate(8); } },
      { delay: 3500, action: () => { setStage("phrase1"); microVibrate(6); } },
    ];

    const timers = timeline.map(({ delay, action }) => setTimeout(action, delay));
    return () => timers.forEach(clearTimeout);
  }, []);

  const handlePhrase1Done = useCallback(() => {
    setTimeout(() => {
      setStage("phrase2");
      crescendo();
    }, 600);
  }, []);

  const handlePhrase2Done = useCallback(() => {
    setTimeout(() => {
      setStage("phrase3");
    }, 500);
  }, []);

  const handlePhrase3Done = useCallback(() => {
    setTimeout(() => {
      setStage("cta");
    }, 400);
  }, []);

  const handleStart = useCallback(async () => {
    microVibrate(15);
    setStage("dissolve");
    fadeOutAudio();

    // Mark as seen
    await supabase
      .from("profiles")
      .update({ fit_intelligence_first_experience_seen: true } as any)
      .eq("user_id", userId);

    setTimeout(() => {
      setStage("done");
      onComplete();
    }, 1800);
  }, [userId, onComplete]);

  if (stage === "done") return null;

  const showBrain = stage !== "dark";
  const brainSmall = stage === "phrase1" || stage === "phrase2" || stage === "phrase3" || stage === "cta";
  const brainDissolved = stage === "dissolve";

  return (
    <AnimatePresence>
      <motion.div
        key="activation-overlay"
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          background: "radial-gradient(ellipse at 50% 40%, hsl(40 10% 6%) 0%, hsl(240 20% 4%) 50%, hsl(0 0% 1%) 100%)",
        }}
      >
        {/* Subtle tech grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(40 50% 50% / 0.1) 2px, hsl(40 50% 50% / 0.1) 3px),
                             repeating-linear-gradient(90deg, transparent, transparent 2px, hsl(40 50% 50% / 0.1) 2px, hsl(40 50% 50% / 0.1) 3px)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* 3D Neural Brain — golden hue-rotated from the green NeuralLoading */}
        {showBrain && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{
              opacity: brainDissolved ? 0 : 1,
              scale: brainDissolved ? 1.4 : brainSmall ? 0.55 : 1,
              y: brainSmall ? -80 : 0,
            }}
            transition={{
              duration: brainDissolved ? 1.5 : 1,
              ease: EASE_PREMIUM,
            }}
            style={{
              // Shift green (150°) to gold (40°) → rotate by -110°
              filter: "hue-rotate(-110deg) saturate(1.3) brightness(1.1)",
            }}
          >
            <NeuralLoading active={true} durationMultiplier={1} />
          </motion.div>
        )}

        {/* Volumetric golden glow behind brain */}
        {showBrain && !brainDissolved && (
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, hsl(40 65% 55% / 0.08) 0%, transparent 60%)",
              y: brainSmall ? -80 : 0,
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Dissolve flash */}
        {stage === "dissolve" && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.6, 0], scale: [0.5, 3] }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{
              background: "radial-gradient(circle, hsl(40 70% 60% / 0.2) 0%, transparent 50%)",
            }}
          />
        )}

        {/* Text area — positioned in bottom half, clear separation from brain */}
        <div className="absolute bottom-[15%] left-0 right-0 z-10 flex flex-col items-center px-6">
          <AnimatePresence mode="wait">
            {stage === "phrase1" && (
              <motion.p
                key="p1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.6, ease: EASE_PREMIUM }}
                className="text-center text-lg md:text-xl font-light tracking-wide max-w-md leading-relaxed"
                style={{ color: "hsl(40 50% 75%)" }}
              >
                <TypewriterText text={PHRASES[0]} onComplete={handlePhrase1Done} charDelay={35} />
              </motion.p>
            )}

            {stage === "phrase2" && (
              <motion.h2
                key="p2"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.7, ease: EASE_PREMIUM }}
                className="text-center text-2xl md:text-4xl font-bold tracking-[0.1em] uppercase max-w-lg leading-tight"
                style={{
                  background: "linear-gradient(135deg, hsl(40 70% 65%), hsl(45 80% 75%), hsl(35 65% 55%))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 20px hsl(40 65% 55% / 0.3))",
                }}
              >
                <TypewriterText text={PHRASES[1]} onComplete={handlePhrase2Done} charDelay={45} />
              </motion.h2>
            )}

            {stage === "phrase3" && (
              <motion.p
                key="p3"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: EASE_PREMIUM }}
                className="text-center text-sm md:text-base font-medium tracking-[0.04em] max-w-sm leading-relaxed"
                style={{ color: "hsl(40 30% 65%)" }}
              >
                <TypewriterText text={PHRASES[2]} onComplete={handlePhrase3Done} charDelay={30} />
              </motion.p>
            )}

            {stage === "cta" && (
              <motion.div
                key="cta"
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, ease: EASE_PREMIUM }}
                className="flex flex-col items-center gap-5"
              >
                <motion.p
                  className="text-sm tracking-wide max-w-xs text-center"
                  style={{ color: "hsl(40 25% 55%)" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                  transition={{ delay: 0.3 }}
                >
                  {PHRASES[2]}
                </motion.p>

                {/* Premium CTA Button */}
                <motion.button
                  onClick={handleStart}
                  className="relative px-8 py-3.5 rounded-xl text-sm font-semibold tracking-[0.15em] uppercase overflow-hidden group"
                  style={{
                    background: "linear-gradient(135deg, hsl(40 50% 12%) 0%, hsl(35 40% 8%) 100%)",
                    border: "1px solid hsl(40 65% 55% / 0.3)",
                    color: "hsl(40 70% 75%)",
                    boxShadow: "0 0 30px hsl(40 65% 55% / 0.1), inset 0 1px 0 hsl(40 65% 55% / 0.1)",
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {/* Animated border glow */}
                  <motion.div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{
                      border: "1px solid hsl(40 70% 60% / 0.5)",
                      boxShadow: "0 0 20px hsl(40 65% 55% / 0.2)",
                    }}
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />

                  {/* Shimmer sweep */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(110deg, transparent 30%, hsl(40 70% 60% / 0.08) 45%, hsl(40 70% 60% / 0.15) 50%, hsl(40 70% 60% / 0.08) 55%, transparent 70%)",
                      backgroundSize: "200% 100%",
                    }}
                    animate={{ backgroundPosition: ["-200% center", "200% center"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  />

                  <span className="relative z-10 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Iniciar Minha Jornada
                  </span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom ambient glow */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{
            background: "linear-gradient(to top, hsl(40 65% 55% / 0.03), transparent)",
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
