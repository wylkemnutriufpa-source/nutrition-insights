/**
 * FitIntelligence First-Time Activation Experience
 *
 * Premium cinematic sequence (~22s) that runs ONLY on first activation.
 * Particles converge → brain forms → premium phrases → CTA → particles diverge.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import NeuralLoading, { type NeuralAnimationMode } from "@/components/system-entry/NeuralLoading";
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

function PremiumPhrase({
  text,
  variant = "body",
}: {
  text: string;
  variant?: "body" | "hero" | "caption";
}) {
  const words = text.split(" ");

  const styles = {
    body: {
      wrapper: "max-w-[90vw] md:max-w-3xl px-4 md:px-6",
      text: "justify-center text-center text-base sm:text-lg md:text-2xl font-light tracking-[0.05em] md:tracking-[0.07em] leading-[1.6] md:leading-[1.7]",
      color: "hsl(40 52% 80%)",
      shadow: "0 0 24px hsl(40 65% 55% / 0.14)",
    },
    hero: {
      wrapper: "max-w-[92vw] md:max-w-4xl px-4 md:px-6",
      text: "justify-center text-center text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-[0.06em] md:tracking-[0.1em] uppercase leading-[1.2] md:leading-[1.25]",
      color: "hsl(45 95% 72%)",
      shadow: "0 0 22px hsl(46 100% 62% / 0.22), 0 0 48px hsl(40 70% 58% / 0.12)",
      useGradient: true,
    },
    caption: {
      wrapper: "max-w-[88vw] md:max-w-2xl px-4 md:px-6",
      text: "justify-center text-center text-xs sm:text-sm md:text-base font-medium tracking-[0.04em] md:tracking-[0.06em] leading-[1.7] md:leading-[1.8]",
      color: "hsl(40 32% 68%)",
      shadow: "0 0 18px hsl(40 65% 55% / 0.1)",
    },
  }[variant];

  return (
    <div className={styles.wrapper}>
      <motion.p
        className={`flex flex-wrap items-center gap-x-[0.3em] gap-y-2 ${styles.text}`}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: variant === "hero" ? 0.16 : 0.09,
              delayChildren: 0.18,
            },
          },
        }}
      >
        {words.map((word, index) => (
          <motion.span
            key={`${word}-${index}`}
            className="inline-block whitespace-nowrap will-change-transform"
            style={
              styles.useGradient
                ? {
                    backgroundImage:
                      "linear-gradient(180deg, hsl(38 70% 40%) 0%, hsl(45 100% 58%) 24%, hsl(48 100% 86%) 50%, hsl(45 100% 60%) 74%, hsl(36 64% 38%) 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    color: "transparent",
                    textShadow: "none",
                  }
                : {
                    color: styles.color,
                    textShadow: styles.shadow,
                  }
            }
            variants={{
              hidden: {
                opacity: 0,
                y: 24,
                scale: 0.96,
                filter: "blur(10px)",
              },
              visible: {
                opacity: 1,
                y: 0,
                scale: 1,
                filter: "blur(0px)",
                transition: {
                  duration: variant === "hero" ? 1.15 : 0.92,
                  ease: EASE_PREMIUM,
                },
              },
            }}
          >
            {word}
          </motion.span>
        ))}
      </motion.p>
    </div>
  );
}

interface Props {
  userId: string;
  onComplete: () => void;
}

export default function FitIntelligenceActivation({ userId, onComplete }: Props) {
  const [stage, setStage] = useState<
    "dark" | "converging" | "brain" | "phrase1" | "phrase2" | "phrase3" | "cta" | "dissolve" | "done"
  >("dark");
  const [brainMode, setBrainMode] = useState<NeuralAnimationMode>("converge");
  const audioStarted = useRef(false);

  useEffect(() => {
    const timeline = [
      {
        delay: 500,
        action: () => {
          setStage("converging");
          setBrainMode("converge");
          startNeuralAmbient();
          audioStarted.current = true;
          microVibrate(8);
        },
      },
      {
        delay: 4500,
        action: () => {
          setStage("brain");
          setBrainMode("idle");
        },
      },
      {
        delay: 8800,
        action: () => {
          setStage("phrase1");
          microVibrate(6);
        },
      },
      {
        delay: 13400,
        action: () => {
          setStage("phrase2");
          crescendo();
          microVibrate(7);
        },
      },
      {
        delay: 18400,
        action: () => {
          setStage("phrase3");
        },
      },
      {
        delay: 22800,
        action: () => {
          setStage("cta");
        },
      },
    ];

    const timers = timeline.map(({ delay, action }) => setTimeout(action, delay));
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleStart = useCallback(async () => {
    microVibrate(15);
    setStage("dissolve");
    setBrainMode("diverge");
    fadeOutAudio();

    await supabase
      .from("profiles")
      .update({ fit_intelligence_first_experience_seen: true } as any)
      .eq("user_id", userId);

    setTimeout(() => {
      setStage("done");
      onComplete();
    }, 2500);
  }, [userId, onComplete]);

  if (stage === "done") return null;

  const showBrain = stage !== "dark";
  const brainSmall = stage === "phrase1" || stage === "phrase2" || stage === "phrase3" || stage === "cta";

  return (
    <AnimatePresence>
      <motion.div
        key="activation-overlay"
        className="fixed inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
        style={{
          background: "radial-gradient(ellipse at 50% 40%, hsl(40 10% 6%) 0%, hsl(240 20% 4%) 50%, hsl(0 0% 1%) 100%)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(40 50% 50% / 0.1) 2px, hsl(40 50% 50% / 0.1) 3px),
                             repeating-linear-gradient(90deg, transparent, transparent 2px, hsl(40 50% 50% / 0.1) 2px, hsl(40 50% 50% / 0.1) 3px)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Brain with converge/idle/diverge modes */}
        {showBrain && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            animate={{
              scale: brainSmall ? 0.46 : 1,
              y: brainSmall ? "-16%" : "0%",
            }}
            transition={{
              duration: 1.6,
              ease: EASE_PREMIUM,
            }}
            style={{
              filter: "hue-rotate(-110deg) saturate(1.3) brightness(1.1)",
            }}
          >
            <NeuralLoading
              active={true}
              durationMultiplier={1}
              animationMode={brainMode}
              transitionDuration={brainMode === "converge" ? 3.5 : 2.0}
            />
          </motion.div>
        )}

        {showBrain && stage !== "dissolve" && (
          <motion.div
            className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, hsl(40 65% 55% / 0.08) 0%, transparent 60%)",
            }}
            animate={{
              scale: [1, 1.26, 1],
              opacity: [0.3, 0.6, 0.3],
              y: brainSmall ? -85 : 0,
            }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

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

        <div className="absolute bottom-[8%] left-0 right-0 z-10 flex flex-col items-center justify-center min-h-[190px]">
          <AnimatePresence mode="wait">
            {stage === "phrase1" && (
              <motion.div
                key="p1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 1 }}
              >
                <PremiumPhrase text={PHRASES[0]} variant="body" />
              </motion.div>
            )}

            {stage === "phrase2" && (
              <motion.div
                key="p2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 1.1 }}
              >
                <PremiumPhrase text={PHRASES[1]} variant="hero" />
              </motion.div>
            )}

            {stage === "phrase3" && (
              <motion.div
                key="p3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9 }}
              >
                <PremiumPhrase text={PHRASES[2]} variant="caption" />
              </motion.div>
            )}

            {stage === "cta" && (
              <motion.div
                key="cta"
                initial={{ opacity: 0, y: 30, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 1, ease: EASE_PREMIUM }}
                className="flex flex-col items-center gap-6"
              >
                <motion.p
                  className="max-w-[85vw] md:max-w-md px-4 md:px-6 text-center text-xs sm:text-sm tracking-[0.06em] md:tracking-[0.08em] leading-relaxed"
                  style={{ color: "hsl(40 25% 55%)" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.85 }}
                  transition={{ delay: 0.45 }}
                >
                  {PHRASES[2]}
                </motion.p>

                <motion.button
                  onClick={handleStart}
                  className="relative overflow-hidden rounded-xl px-6 sm:px-10 py-3.5 sm:py-4 text-xs sm:text-sm font-semibold uppercase tracking-[0.1em] sm:tracking-[0.15em]"
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
                    <Sparkles className="h-4 w-4" />
                    Iniciar Minha Jornada
                  </span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
