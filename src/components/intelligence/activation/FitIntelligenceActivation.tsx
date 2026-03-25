/**
 * FitIntelligence First-Time Activation Experience
 * 
 * Ultra-premium cinematic sequence (~15s) that runs ONLY on first activation.
 * Dark screen → golden 3D neural brain → particle text phrases → CTA → dissolve.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import NeuralLoading from "@/components/system-entry/NeuralLoading";
import { ParticleTextEffect } from "@/components/ui/particle-text-effect";
import {
  startNeuralAmbient,
  crescendo,
  fadeOutAudio,
  microVibrate,
} from "./ActivationAudio";

const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

// Gold color for particles
const GOLD_COLOR = { r: 212, g: 175, b: 85 };
const GOLD_LIGHT = { r: 235, g: 200, b: 120 };

/* ─── Typewriter Text (for phrase 3 only) ─── */
function TypewriterText({
  text,
  onComplete,
  className,
  charDelay = 55,
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

  // Much slower timeline
  useEffect(() => {
    const timeline = [
      { delay: 600, action: () => { setStage("brain"); startNeuralAmbient(); audioStarted.current = true; microVibrate(8); } },
      { delay: 5000, action: () => { setStage("phrase1"); microVibrate(6); } },
      { delay: 11000, action: () => { setStage("phrase2"); crescendo(); microVibrate(6); } },
      { delay: 17000, action: () => { setStage("phrase3"); } },
    ];

    const timers = timeline.map(({ delay, action }) => setTimeout(action, delay));
    return () => timers.forEach(clearTimeout);
  }, []);

  const handlePhrase3Done = useCallback(() => {
    setTimeout(() => {
      setStage("cta");
    }, 800);
  }, []);

  const handleStart = useCallback(async () => {
    microVibrate(15);
    setStage("dissolve");
    fadeOutAudio();

    await supabase
      .from("profiles")
      .update({ fit_intelligence_first_experience_seen: true } as any)
      .eq("user_id", userId);

    setTimeout(() => {
      setStage("done");
      onComplete();
    }, 2000);
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
        transition={{ duration: 0.8 }}
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

        {/* 3D Neural Brain — golden hue-rotated */}
        {showBrain && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{
              opacity: brainDissolved ? 0 : 1,
              scale: brainDissolved ? 1.4 : brainSmall ? 0.45 : 1,
              y: brainSmall ? "-15%" : "0%",
            }}
            transition={{
              duration: brainDissolved ? 1.8 : 1.5,
              ease: EASE_PREMIUM,
            }}
            style={{
              filter: "hue-rotate(-110deg) saturate(1.3) brightness(1.1)",
            }}
          >
            <NeuralLoading active={true} durationMultiplier={1} />
          </motion.div>
        )}

        {/* Volumetric golden glow behind brain */}
        {showBrain && !brainDissolved && (
          <motion.div
            className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, hsl(40 65% 55% / 0.08) 0%, transparent 60%)",
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.6, 0.3],
              y: brainSmall ? -80 : 0,
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Dissolve flash */}
        {stage === "dissolve" && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.6, 0], scale: [0.5, 3] }}
            transition={{ duration: 1.8, ease: "easeOut" }}
            style={{
              background: "radial-gradient(circle, hsl(40 70% 60% / 0.2) 0%, transparent 50%)",
            }}
          />
        )}

        {/* ─── Text area — bottom section ─── */}
        <div className="absolute bottom-[8%] left-0 right-0 z-10 flex flex-col items-center">
          <AnimatePresence mode="wait">
            {/* Phrase 1 — Particle text effect */}
            {stage === "phrase1" && (
              <motion.div
                key="p1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 1, ease: EASE_PREMIUM }}
                className="w-full max-w-2xl h-[120px] flex items-center justify-center"
              >
                <ParticleTextEffect
                  words={["Você acaba de ativar", "uma nova inteligência", "ao seu lado"]}
                  transitionInterval={360}
                  particleColor={GOLD_COLOR}
                  fontSize={52}
                  fontFamily="Georgia, serif"
                  width={900}
                  height={120}
                  pixelSteps={5}
                  className="w-full h-full"
                />
              </motion.div>
            )}

            {/* Phrase 2 — Particle text effect (bigger, bolder) */}
            {stage === "phrase2" && (
              <motion.div
                key="p2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 1, ease: EASE_PREMIUM }}
                className="w-full max-w-3xl h-[140px] flex items-center justify-center"
              >
                <ParticleTextEffect
                  words={["Bem-vindo ao", "Ecossistema", "FitJourney"]}
                  transitionInterval={300}
                  particleColor={GOLD_LIGHT}
                  fontSize={72}
                  fontFamily="Georgia, serif"
                  width={1000}
                  height={140}
                  pixelSteps={4}
                  className="w-full h-full"
                />
              </motion.div>
            )}

            {/* Phrase 3 — Typewriter (slower) */}
            {stage === "phrase3" && (
              <motion.p
                key="p3"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: EASE_PREMIUM }}
                className="text-center text-sm md:text-base font-medium tracking-[0.04em] max-w-sm leading-relaxed"
                style={{ color: "hsl(40 30% 65%)" }}
              >
                <TypewriterText
                  text="A partir de agora sua evolução será consciente, guiada e real"
                  onComplete={handlePhrase3Done}
                  charDelay={55}
                />
              </motion.p>
            )}

            {/* CTA */}
            {stage === "cta" && (
              <motion.div
                key="cta"
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 1, ease: EASE_PREMIUM }}
                className="flex flex-col items-center gap-6"
              >
                <motion.p
                  className="text-sm tracking-wide max-w-xs text-center"
                  style={{ color: "hsl(40 25% 55%)" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                  transition={{ delay: 0.4 }}
                >
                  A partir de agora sua evolução será consciente, guiada e real
                </motion.p>

                <motion.button
                  onClick={handleStart}
                  className="relative px-10 py-4 rounded-xl text-sm font-semibold tracking-[0.15em] uppercase overflow-hidden group"
                  style={{
                    background: "linear-gradient(135deg, hsl(40 50% 12%) 0%, hsl(35 40% 8%) 100%)",
                    border: "1px solid hsl(40 65% 55% / 0.3)",
                    color: "hsl(40 70% 75%)",
                    boxShadow: "0 0 30px hsl(40 65% 55% / 0.1), inset 0 1px 0 hsl(40 65% 55% / 0.1)",
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{
                      border: "1px solid hsl(40 70% 60% / 0.5)",
                      boxShadow: "0 0 20px hsl(40 65% 55% / 0.2)",
                    }}
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />

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
          className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
          style={{
            background: "linear-gradient(to top, hsl(40 65% 55% / 0.04), transparent)",
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
