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

    try {
      const audio = new Audio("/audio/intro.wav");
      audio.volume = 0.5;
      audioRef.current = audio;
      audio.play().catch(() => {});
    } catch {}

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
      className="fixed inset-0 z-[140] flex items-center justify-center overflow-hidden bg-black cursor-pointer"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: EASE_PREMIUM }}
      onClick={skip}
    >
      {/* Video — Always full screen */}
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
        style={{ filter: "brightness(0.65) contrast(1.1) saturate(1.2)" }}
      />

      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 20%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.85) 100%)" }} />

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
            <motion.p className="text-sm md:text-base font-light tracking-[0.35em] uppercase text-white/60">Bem-vindo ao</motion.p>
            <motion.p className="text-lg md:text-2xl font-light tracking-[0.25em] uppercase text-primary">ecossistema</motion.p>
            <motion.h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-bold tracking-[0.08em] text-white">FitJourney</motion.h1>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-white/20 animate-pulse font-light">
        Toque para entrar
      </div>
    </motion.div>
  );
}
