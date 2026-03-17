import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Rocket, Users, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function FullscreenPresentationViewer({ slides, mode, onFinish, onSkip, finalCTAs }: Props) {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const touchStart = useRef(0);
  const total = slides.length;
  const isLast = idx === total - 1;
  const progress = ((idx + 1) / total) * 100;

  // Preload next image
  useEffect(() => {
    if (idx < total - 1) {
      const img = new Image();
      img.src = slides[idx + 1].image_url;
    }
  }, [idx, slides, total]);

  const go = useCallback((next: number) => {
    if (next < 0 || next >= total) return;
    setDir(next > idx ? 1 : -1);
    setIdx(next);
  }, [idx, total]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(idx + 1);
      else if (e.key === "ArrowLeft") go(idx - 1);
      else if (e.key === "Escape") { if (onSkip) onSkip(); else onFinish(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [go, idx, onFinish, onSkip]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > SWIPE_THRESHOLD) go(idx + (delta > 0 ? 1 : -1));
  };

  const slide = slides[idx];
  const isPro = mode === "professional";

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 400 : -400, opacity: 0, scale: 0.92 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ x: d > 0 ? -400 : 400, opacity: 0, scale: 0.92 }),
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(135deg, hsl(160 30% 4%) 0%, hsl(160 20% 8%) 40%, hsl(160 15% 6%) 100%)" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Ambient particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              background: isPro ? "rgba(16,185,129,0.25)" : "rgba(59,130,246,0.2)",
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{ y: [0, -40, 0], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 4 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 3 }}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="relative h-1 w-full bg-white/5 flex-shrink-0">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-r-full"
          style={{ background: isPro ? "linear-gradient(90deg, #10b981, #34d399)" : "linear-gradient(90deg, #3b82f6, #60a5fa)" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 md:px-8 py-3 flex-shrink-0">
        <span className="text-xs text-white/40 font-mono tracking-wider">
          {idx + 1} / {total}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip || onFinish}
          className="text-white/40 hover:text-white/80 hover:bg-white/5 text-xs"
        >
          <X className="w-4 h-4 mr-1" /> Pular apresentação
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 md:px-12 min-h-0 relative">
        {/* Click zones */}
        {idx > 0 && (
          <button
            onClick={() => go(idx - 1)}
            className="absolute left-0 top-0 bottom-0 w-1/5 z-10 cursor-w-resize opacity-0 hover:opacity-100 transition-opacity"
            aria-label="Slide anterior"
          >
            <div className="flex items-center justify-center h-full">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                <ChevronLeft className="w-5 h-5 text-white/70" />
              </div>
            </div>
          </button>
        )}
        {!isLast && (
          <button
            onClick={() => go(idx + 1)}
            className="absolute right-0 top-0 bottom-0 w-1/5 z-10 cursor-e-resize opacity-0 hover:opacity-100 transition-opacity"
            aria-label="Próximo slide"
          >
            <div className="flex items-center justify-center h-full">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                <ChevronRight className="w-5 h-5 text-white/70" />
              </div>
            </div>
          </button>
        )}

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={idx}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-[1200px] flex flex-col items-center gap-6"
          >
            {/* Image container with cinematic parallax zoom */}
            <motion.div
              className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-white/5"
              style={{ maxHeight: "65vh" }}
              animate={{ scale: [0.98, 1] }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-10" />
              <motion.img
                src={slide.image_url}
                alt={slide.title || `Slide ${idx + 1}`}
                className="w-full h-full object-contain bg-black/20"
                style={{ maxHeight: "65vh" }}
                animate={{ scale: [1.04, 1] }}
                transition={{ duration: 8, ease: "linear" }}
              />
              {/* Glassmorphism overlay */}
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 z-20 pointer-events-none" />
            </motion.div>

            {/* Text overlay */}
            <motion.div
              className="text-center space-y-2 max-w-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {slide.title && (
                <h2 className="text-xl md:text-3xl font-bold text-white tracking-tight">
                  {slide.title}
                </h2>
              )}
              {slide.subtitle && (
                <p className="text-sm md:text-base text-white/60 font-medium">
                  {slide.subtitle}
                </p>
              )}
              {slide.description && (
                <p className="text-xs md:text-sm text-white/40 leading-relaxed max-w-lg mx-auto">
                  {slide.description}
                </p>
              )}
            </motion.div>

            {/* Final slide CTA */}
            {isLast && (
              <motion.div
                className="space-y-4 text-center mt-2"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
              >
                <p className="text-lg md:text-xl font-bold text-white/90">
                  ✨ Você agora possui um sistema de nutrição clínica inteligente.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  {finalCTAs?.map((cta, i) => (
                    <Button
                      key={i}
                      onClick={cta.onClick}
                      variant={i === 0 ? "default" : "outline"}
                      size="lg"
                      className={i === 0
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50"
                        : "border-white/20 text-white/80 hover:bg-white/10"
                      }
                    >
                      {cta.icon}
                      {cta.label}
                    </Button>
                  )) || (
                    <Button
                      onClick={onFinish}
                      size="lg"
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                    >
                      <Rocket className="w-5 h-5 mr-2" /> Começar usar o sistema
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between px-4 md:px-8 py-4 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => go(idx - 1)}
          disabled={idx === 0}
          className="text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-20"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>

        {/* Dots */}
        <div className="flex gap-1.5 items-center">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className={`rounded-full transition-all duration-300 ${
                i === idx
                  ? `w-6 h-2 ${isPro ? "bg-emerald-400" : "bg-blue-400"}`
                  : "w-2 h-2 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>

        {isLast ? (
          <Button
            size="sm"
            onClick={onFinish}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
          >
            Entrar na plataforma <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => go(idx + 1)}
            className="text-white/50 hover:text-white hover:bg-white/5"
          >
            Avançar <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
