import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { PresentationSlide } from "@/lib/presentationSlides";

interface Props {
  slides: PresentationSlide[];
  title: string;
  onComplete: () => void;
  onSkip: () => void;
}

export default function GuidedPresentation({ slides, title, onComplete, onSkip }: Props) {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const slide = slides[idx];
  const progress = ((idx + 1) / slides.length) * 100;
  const isLast = idx === slides.length - 1;

  const go = useCallback((next: number) => {
    setDir(next > idx ? 1 : -1);
    setIdx(next);
  }, [idx]);

  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <span className="text-lg font-display font-bold">{title}</span>
          <span className="text-xs text-muted-foreground">
            {idx + 1} / {slides.length}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
          <X className="w-4 h-4 mr-1" /> Pular
        </Button>
      </header>

      {/* Progress */}
      <div className="px-4 md:px-8 pt-2">
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Slide content */}
      <div className="flex-1 flex items-center justify-center px-4 md:px-8 overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={slide.id}
            custom={dir}
            initial={{ opacity: 0, x: dir * 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -80 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full max-w-2xl mx-auto"
          >
            <div className="text-center mb-8">
              <div className={`w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br ${slide.gradient} flex items-center justify-center shadow-lg mb-5`}>
                <Icon className="w-10 h-10 text-primary-foreground" />
              </div>
              <span className="text-4xl mb-3 block">{slide.emoji}</span>
              <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">{slide.title}</h2>
              <p className="text-muted-foreground text-sm md:text-base">{slide.subtitle}</p>
            </div>

            <ul className="space-y-4 max-w-lg mx-auto">
              {slide.bullets.map((b, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className="flex items-start gap-3 text-sm md:text-base"
                >
                  <span className={`mt-1 w-2 h-2 rounded-full bg-gradient-to-br ${slide.gradient} flex-shrink-0`} />
                  <span>{b}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <footer className="px-4 md:px-8 py-5 border-t border-border/50 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          disabled={idx === 0}
          onClick={() => go(idx - 1)}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
        </Button>

        {/* Dot indicators */}
        <div className="hidden sm:flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === idx ? "bg-primary w-5" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {isLast ? (
          <Button size="sm" onClick={onComplete}>
            Concluir <RotateCcw className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button size="sm" onClick={() => go(idx + 1)}>
            Próximo <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </footer>
    </div>
  );
}
