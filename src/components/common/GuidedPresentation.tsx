import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import CinematicGuideSlide from "@/components/common/CinematicGuideSlide";
import type { PresentationSlide } from "@/lib/presentationSlides";
import { resolveFeatureRoute } from "@/lib/featureRouteMap";
import { toast } from "sonner";

interface Props {
  slides: (PresentationSlide & {
    isNew?: boolean;
    isPremium?: boolean;
    emotionalImpact?: string;
    ctaText?: string;
    featureKey?: string;
  })[];
  title: string;
  onComplete: () => void;
  onSkip: () => void;
}

export default function GuidedPresentation({ slides, title, onComplete, onSkip }: Props) {
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();
  const slide = slides[idx];
  const progress = ((idx + 1) / slides.length) * 100;
  const isLast = idx === slides.length - 1;

  const go = useCallback((next: number) => {
    setIdx(next);
  }, []);

  const handleCtaClick = useCallback((featureKey: string) => {
    const route = resolveFeatureRoute(featureKey);
    if (route) {
      onSkip(); // Close presentation
      navigate(route);
    } else {
      toast.info("Funcionalidade em desenvolvimento");
    }
  }, [navigate, onSkip]);

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

      {/* Slide content — cinematic */}
      <div className="flex-1 flex items-center justify-center px-4 md:px-8 overflow-hidden">
        <AnimatePresence mode="wait">
          <CinematicGuideSlide
            key={slide.id}
            slide={slide}
            index={idx}
            total={slides.length}
            onCtaClick={handleCtaClick}
          />
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
