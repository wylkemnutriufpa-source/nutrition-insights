import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Rocket, Volume2, VolumeX, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAmbientAudio } from "@/hooks/useAmbientAudio";

export interface PresentationSlide {
  image_url: string;
  title?: string;
  subtitle?: string;
  description?: string;
}

interface Props {
  slides: PresentationSlide[];
  mode: "professional" | "patient";
  onFinish: () => void;
  onSkip?: () => void;
  finalCTAs?: { label: string; icon?: React.ReactNode; onClick: () => void }[];
}

const SWIPE_THRESHOLD = 50;
const AUTOPLAY_INTERVAL = 7000;

export default function FullscreenPresentationViewer({ slides, mode, onFinish, onSkip, finalCTAs }: Props) {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [autoProgress, setAutoProgress] = useState(0);
  const [imagesReady, setImagesReady] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [orientationDismissed, setOrientationDismissed] = useState(false);
  const touchStart = useRef(0);
  const autoTimerRef = useRef<number | null>(null);
  const progressRef = useRef<number | null>(null);
  const total = slides.length;
  const isLast = idx === total - 1;
  const progress = ((idx + 1) / total) * 100;
  const isPro = mode === "professional";
  const [showVolume, setShowVolume] = useState(false);

  // Reduce particles on mobile
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const particleCount = isMobile ? 8 : 20;

  const audio = useAmbientAudio({
    src: "/audio/ambient-cinema.mp3",
    initialVolume: 0.45,
    fadeInDuration: 1200,
    loop: true,
  });

  // Block body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Stop audio on unmount
  useEffect(() => () => { audio.stop(); }, []);

  // Preload ALL images upfront
  useEffect(() => {
    let loaded = 0;
    const total = slides.length;
    slides.forEach((s) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded++;
        if (loaded >= total) setImagesReady(true);
      };
      img.src = s.image_url;
    });
    // Fallback: show after 3s even if not all loaded
    const t = setTimeout(() => setImagesReady(true), 3000);
    return () => clearTimeout(t);
  }, [slides]);

  // Detect portrait orientation on mobile
  useEffect(() => {
    const checkOrientation = () => {
      const mobile = window.innerWidth < 768;
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(mobile && portrait);
    };
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  // Auto-play logic
  useEffect(() => {
    if (!autoPlay || isPaused || isLast) {
      if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
      if (progressRef.current) { cancelAnimationFrame(progressRef.current); progressRef.current = null; }
      return;
    }

    setAutoProgress(0);
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min((elapsed / AUTOPLAY_INTERVAL) * 100, 100);
      setAutoProgress(pct);
      if (pct < 100) {
        progressRef.current = requestAnimationFrame(tick);
      }
    };
    progressRef.current = requestAnimationFrame(tick);

    autoTimerRef.current = window.setTimeout(() => {
      setDir(1);
      setIdx(prev => Math.min(prev + 1, total - 1));
      setAutoProgress(0);
    }, AUTOPLAY_INTERVAL);

    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      if (progressRef.current) cancelAnimationFrame(progressRef.current);
    };
  }, [idx, autoPlay, isPaused, isLast, total]);

  const go = useCallback((next: number) => {
    if (next < 0 || next >= total) return;
    setDir(next > idx ? 1 : -1);
    setIdx(next);
    setAutoProgress(0);
  }, [idx, total]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(idx + 1); }
      else if (e.key === "ArrowLeft") go(idx - 1);
      else if (e.key === "Escape") { audio.stop(); if (onSkip) onSkip(); else onFinish(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [go, idx, onFinish, onSkip]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
    if (audio.needsInteraction) audio.startPlayback();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > SWIPE_THRESHOLD) go(idx + (delta > 0 ? 1 : -1));
  };

  const handleFinish = () => { audio.stop(); onFinish(); };
  const handleSkip = () => { audio.stop(); if (onSkip) onSkip(); else onFinish(); };

  const slide = slides[idx];

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 250 : -250, opacity: 0, scale: 0.94, filter: isMobile ? "none" : "blur(12px)" }),
    center: { x: 0, opacity: 1, scale: 1, filter: "blur(0px)" },
    exit: (d: number) => ({ x: d > 0 ? -250 : 250, opacity: 0, scale: 0.94, filter: isMobile ? "none" : "blur(12px)" }),
  };

  const accent = isPro ? "#10b981" : "#3b82f6";
  const accentGlow = isPro ? "rgba(16,185,129,0.12)" : "rgba(59,130,246,0.12)";

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col overflow-hidden select-none"
      style={{ background: "linear-gradient(145deg, hsl(160 35% 3%) 0%, hsl(160 20% 7%) 35%, hsl(200 15% 5%) 100%)" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={() => { if (audio.needsInteraction) audio.startPlayback(); }}
      onMouseMove={() => { if (isPaused) return; }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── Ambient particles ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: particleCount }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 1 + Math.random() * 2,
              height: 1 + Math.random() * 2,
              background: isPro ? `rgba(16,185,129,${0.15 + Math.random() * 0.15})` : `rgba(59,130,246,${0.12 + Math.random() * 0.12})`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{ y: [0, -(20 + Math.random() * 30), 0], opacity: [0.1, 0.45, 0.1] }}
            transition={{ duration: 6 + Math.random() * 6, repeat: Infinity, delay: Math.random() * 5, ease: "easeInOut" }}
          />
        ))}

        {/* Orbital glow */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            width: 600,
            height: 600,
            left: "50%",
            top: "45%",
            marginLeft: -300,
            marginTop: -300,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accentGlow} 0%, transparent 70%)`,
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.45, 0.25], rotate: [0, 180, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />

        {/* Secondary glow */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            width: 400,
            height: 400,
            right: "10%",
            bottom: "15%",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${isPro ? "rgba(52,211,153,0.06)" : "rgba(96,165,250,0.06)"} 0%, transparent 60%)`,
          }}
          animate={{ scale: [1.1, 0.9, 1.1], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* ── Progress bar (top) ── */}
      <div className="relative h-0.5 w-full bg-white/5 flex-shrink-0">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-r-full"
          style={{ background: `linear-gradient(90deg, ${accent}, ${isPro ? "#34d399" : "#60a5fa"})` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 md:px-8 py-3 flex-shrink-0 relative z-30">
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/35 font-mono tracking-widest">
            {String(idx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>

          {/* Auto-play toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 text-white/30 hover:text-white/70 hover:bg-white/5"
            onClick={() => setAutoPlay(p => !p)}
            title={autoPlay ? "Pausar auto-play" : "Ativar auto-play"}
          >
            {autoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Glassmorphism audio control */}
          <div
            className="flex items-center gap-1"
            onMouseEnter={() => setShowVolume(true)}
            onMouseLeave={() => setShowVolume(false)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); audio.toggleMute(); }}
              className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all duration-300"
              style={{
                background: "rgba(255,255,255,0.08)",
                borderColor: "rgba(255,255,255,0.12)",
                boxShadow: audio.isMuted ? "none" : `0 0 16px ${accent}30`,
              }}
              title={audio.isMuted ? "Ativar som" : "Silenciar"}
            >
              {audio.isMuted || audio.needsInteraction
                ? <VolumeX className="w-4 h-4 text-white/50" />
                : <Volume2 className="w-4 h-4 text-white/70" />
              }
            </button>
            <AnimatePresence>
              {showVolume && !audio.needsInteraction && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 72 }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden"
                >
                  <Slider
                    value={[audio.volume * 100]}
                    max={100}
                    step={5}
                    onValueChange={([v]) => audio.changeVolume(v / 100)}
                    className="w-[68px]"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-white/30 hover:text-white/70 hover:bg-white/5 text-xs"
          >
            <X className="w-3.5 h-3.5 mr-1" /> Pular
          </Button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex items-center justify-center px-4 md:px-12 min-h-0 relative">
        {/* Click zones */}
        {idx > 0 && (
          <button
            onClick={() => go(idx - 1)}
            className="absolute left-0 top-0 bottom-0 w-1/5 z-10 cursor-w-resize opacity-0 hover:opacity-100 transition-opacity duration-300"
            aria-label="Slide anterior"
          >
            <div className="flex items-center justify-center h-full">
              <motion.div
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/5"
                whileHover={{ scale: 1.1 }}
              >
                <ChevronLeft className="w-5 h-5 text-white/60" />
              </motion.div>
            </div>
          </button>
        )}
        {!isLast && (
          <button
            onClick={() => go(idx + 1)}
            className="absolute right-0 top-0 bottom-0 w-1/5 z-10 cursor-e-resize opacity-0 hover:opacity-100 transition-opacity duration-300"
            aria-label="Próximo slide"
          >
            <div className="flex items-center justify-center h-full">
              <motion.div
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/5"
                whileHover={{ scale: 1.1 }}
              >
                <ChevronRight className="w-5 h-5 text-white/60" />
              </motion.div>
            </div>
          </button>
        )}

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={idx}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.65, ease: [0.22, 0.68, 0.36, 1.0] }}
            className="w-full max-w-[1200px] flex flex-col items-center gap-5"
          >
            {/* Image container */}
            <motion.div
              className="relative w-full rounded-2xl overflow-hidden"
              style={{ maxHeight: "62vh" }}
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            >
              {/* Orbital border glow */}
              <motion.div
                className="absolute -inset-[2px] rounded-2xl z-0 pointer-events-none"
                style={{
                  background: `conic-gradient(from var(--angle, 0deg), transparent 60%, ${accent}33 75%, transparent 90%)`,
                }}
                animate={{ "--angle": ["0deg", "360deg"] } as any}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />

              <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] shadow-2xl z-10">
                {/* Gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 z-10" />
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent z-10" />

                {/* Ken Burns image */}
                <motion.img
                  key={`img-${idx}`}
                  src={slide.image_url}
                  alt={slide.title || `Slide ${idx + 1}`}
                  className="w-full h-full object-contain bg-black/30"
                  style={{ maxHeight: "62vh" }}
                  initial={{ scale: 1.06 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 12, ease: "linear" }}
                />

                {/* Glass ring */}
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/[0.08] z-20 pointer-events-none" />
              </div>
            </motion.div>

            {/* Text — staggered entrance */}
            <div className="text-center space-y-2.5 max-w-2xl px-4">
              {slide.title && (
                <motion.h2
                  className="text-xl md:text-3xl font-bold text-white tracking-tight leading-tight"
                  initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
                >
                  {slide.title}
                </motion.h2>
              )}
              {slide.subtitle && (
                <motion.p
                  className="text-sm md:text-base font-medium"
                  style={{ color: isPro ? "rgba(52,211,153,0.8)" : "rgba(96,165,250,0.8)" }}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
                >
                  {slide.subtitle}
                </motion.p>
              )}
              {slide.description && (
                <motion.p
                  className="text-xs md:text-sm text-white/40 leading-relaxed max-w-lg mx-auto"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
                >
                  {slide.description}
                </motion.p>
              )}
            </div>

            {/* Final slide CTA */}
            {isLast && (
              <motion.div
                className="space-y-5 text-center mt-2"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
              >
                <motion.p
                  className="text-lg md:text-xl font-bold text-white/90"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  ✨ Você agora possui um sistema de nutrição clínica inteligente.
                </motion.p>
                <motion.div
                  className="flex flex-wrap gap-3 justify-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1, duration: 0.5 }}
                >
                  {finalCTAs?.map((cta, i) => (
                    <Button
                      key={i}
                      onClick={() => { audio.stop(); cta.onClick(); }}
                      variant={i === 0 ? "default" : "outline"}
                      size="lg"
                      className={i === 0
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-shadow"
                        : "border-white/15 text-white/75 hover:bg-white/10"
                      }
                    >
                      {cta.icon}
                      {cta.label}
                    </Button>
                  )) || (
                    <Button
                      onClick={handleFinish}
                      size="lg"
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                    >
                      <Rocket className="w-5 h-5 mr-2" /> Começar usar o sistema
                    </Button>
                  )}
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom navigation ── */}
      <div className="flex-shrink-0 relative z-30">
        {/* Auto-play progress bar */}
        {autoPlay && !isLast && (
          <div className="h-[2px] w-full bg-white/5 mx-auto">
            <motion.div
              className="h-full rounded-full"
              style={{
                width: `${autoProgress}%`,
                background: `linear-gradient(90deg, ${accent}80, ${accent})`,
              }}
            />
          </div>
        )}

        <div className="flex items-center justify-between px-4 md:px-8 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => go(idx - 1)}
            disabled={idx === 0}
            className="text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-15"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>

          {/* Dots */}
          <div className="flex gap-1.5 items-center">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                className={`rounded-full transition-all duration-400 ${
                  i === idx
                    ? "w-7 h-2"
                    : i < idx
                    ? "w-2 h-2 bg-white/25 hover:bg-white/45"
                    : "w-2 h-2 bg-white/12 hover:bg-white/30"
                }`}
                style={i === idx ? {
                  background: `linear-gradient(90deg, ${accent}, ${isPro ? "#34d399" : "#60a5fa"})`,
                  boxShadow: `0 0 10px ${accent}60`,
                } : undefined}
              />
            ))}
          </div>

          {isLast ? (
            <Button
              size="sm"
              onClick={handleFinish}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/20"
            >
              Entrar <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <motion.div
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => go(idx + 1)}
                className="text-white/45 hover:text-white hover:bg-white/5"
              >
                Avançar <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Mobile tap hint ── */}
      <AnimatePresence>
        {audio.needsInteraction && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            className="absolute bottom-20 left-0 right-0 flex justify-center z-40 pointer-events-none"
          >
            <motion.div
              className="px-5 py-2.5 rounded-full text-xs text-white/60 backdrop-blur-xl border border-white/10"
              style={{ background: "rgba(255,255,255,0.06)" }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              ✨ Toque na tela para iniciar a experiência
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
