import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SkipForward } from "lucide-react";

const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;
const STORAGE_KEY = "fj_intro_seen";

interface CinematicIntroProps {
  onComplete: () => void;
}

export default function CinematicIntro({ onComplete }: CinematicIntroProps) {
  const [phase, setPhase] = useState<"video" | "text" | "exit">("video");
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoReadyRef = useRef(false);

  // Fallback: if video never fires onCanPlay, proceed anyway after 2s
  useEffect(() => {
    const fallback = setTimeout(() => {
      if (!videoReadyRef.current) {
        videoReadyRef.current = true;
        setVideoReady(true);
      }
    }, 2000);
    return () => clearTimeout(fallback);
  }, []);
  const timerRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = useCallback(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
  }, []);

  const skip = useCallback(() => {
    clearTimers();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    sessionStorage.setItem(STORAGE_KEY, "1");
    onComplete();
  }, [clearTimers, onComplete]);

  useEffect(() => {
    if (!videoReady) return;

    // Play intro audio
    try {
      const audio = new Audio("/audio/intro.wav");
      audio.volume = 0.5;
      audioRef.current = audio;
      audio.play().catch(() => {});
    } catch {}

    // Show text after 1.5s, start exit at 4s, complete at 5s
    const t1 = setTimeout(() => setPhase("text"), 1500);
    const t2 = setTimeout(() => setPhase("exit"), 4000);
    const t3 = setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      sessionStorage.setItem(STORAGE_KEY, "1");
      onComplete();
    }, 5000);

    timerRef.current = [t1, t2, t3];
    return () => {
      clearTimers();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [videoReady, onComplete, clearTimers]);

  return (
    <motion.div
      className="fixed inset-0 z-[140] flex items-center justify-center overflow-hidden bg-black"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: EASE_PREMIUM }}
    >
      {/* Video background */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        src="/videos/intro.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onCanPlayThrough={() => { if (!videoReadyRef.current) { videoReadyRef.current = true; setVideoReady(true); } }}
        onCanPlay={() => { if (!videoReadyRef.current) { videoReadyRef.current = true; setVideoReady(true); } }}
        onLoadedData={() => { if (!videoReadyRef.current) { videoReadyRef.current = true; setVideoReady(true); } }}
        onError={() => { if (!videoReadyRef.current) { videoReadyRef.current = true; setVideoReady(true); } }}
        style={{ filter: "brightness(0.55) contrast(1.1) saturate(1.2)" }}
      />

      {/* Gradient overlays for cinematic feel */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 20%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.85) 100%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.4) 100%)",
        }}
      />

      {/* Subtle green glow from center */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{
          width: 600,
          height: 600,
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, hsl(var(--primary) / 0.04) 40%, transparent 70%)",
          filter: "blur(60px)",
        }}
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: 1, scale: 1.2 }}
        transition={{ duration: 3, ease: "easeOut" }}
      />

      {/* Main text — emerges from depth */}
      <AnimatePresence>
        {(phase === "text" || phase === "exit") && (
          <motion.div
            key="intro-text"
            className="relative z-10 flex flex-col items-center gap-4 px-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "exit" ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: EASE_PREMIUM }}
          >
            {/* Horizontal accent line */}
            <motion.div
              className="h-[1px] rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.6), transparent)",
              }}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 120, opacity: 1 }}
              transition={{ duration: 1, delay: 0.2, ease: EASE_PREMIUM }}
            />

            {/* "Bem-vindo ao" */}
            <motion.p
              className="text-sm md:text-base font-light tracking-[0.35em] uppercase text-white/60"
              initial={{ opacity: 0, y: 40, scale: 0.8, filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 1.2, delay: 0.1, ease: EASE_PREMIUM }}
            >
              Bem-vindo ao
            </motion.p>

            {/* "ecossistema" */}
            <motion.p
              className="text-lg md:text-2xl font-light tracking-[0.25em] uppercase"
              style={{
                background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
              initial={{ opacity: 0, y: 60, scale: 0.7, filter: "blur(16px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 1.4, delay: 0.3, ease: EASE_PREMIUM }}
            >
              ecossistema
            </motion.p>

            {/* "FitJourney" — hero text */}
            <motion.h1
              className="text-4xl sm:text-5xl md:text-7xl font-display font-bold tracking-[0.08em]"
              style={{
                color: "white",
                textShadow:
                  "0 0 40px hsl(var(--primary) / 0.4), 0 0 80px hsl(var(--primary) / 0.15), 0 4px 20px rgba(0,0,0,0.5)",
              }}
              initial={{ opacity: 0, y: 80, scale: 0.6, filter: "blur(20px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 1.6, delay: 0.5, ease: EASE_PREMIUM }}
            >
              FitJourney
            </motion.h1>

            {/* Bottom accent line */}
            <motion.div
              className="h-[1px] rounded-full mt-2"
              style={{
                background:
                  "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4), transparent)",
              }}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 80, opacity: 1 }}
              transition={{ duration: 1, delay: 0.8, ease: EASE_PREMIUM }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip button */}
      <motion.button
        onClick={skip}
        className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-300 backdrop-blur-sm border border-transparent hover:border-white/[0.08] z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        aria-label="Pular intro"
      >
        <span className="hidden sm:inline tracking-wider uppercase">Pular</span>
        <SkipForward className="w-3.5 h-3.5" />
      </motion.button>

      {/* Bottom progress bar */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 w-32 h-[1.5px] rounded-full overflow-hidden z-20"
        style={{ background: "rgba(255,255,255,0.08)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background:
              "linear-gradient(90deg, hsl(var(--primary) / 0.6), hsl(var(--primary)), hsl(var(--accent) / 0.8))",
          }}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 5, ease: "easeInOut" }}
        />
      </motion.div>
    </motion.div>
  );
}
