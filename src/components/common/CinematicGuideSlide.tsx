import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Crown, ExternalLink } from "lucide-react";
import type { PresentationSlide } from "@/lib/presentationSlides";
import { cn } from "@/lib/utils";

interface Props {
  slide: PresentationSlide & {
    isNew?: boolean;
    isPremium?: boolean;
    emotionalImpact?: string;
    ctaText?: string;
    featureKey?: string;
  };
  index: number;
  total: number;
  onCtaClick?: (featureKey: string) => void;
}

const impactGlow: Record<string, string> = {
  low: "shadow-primary/10",
  medium: "shadow-primary/20",
  high: "shadow-primary/40",
  transformador: "shadow-accent/60",
};

export default function CinematicGuideSlide({ slide, index, total, onCtaClick }: Props) {
  const Icon = slide.icon;
  const glow = impactGlow[slide.emotionalImpact ?? "medium"];
  const featureKey = (slide as any).featureKey ?? slide.id;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -20 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Badges */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {slide.isNew && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
            <Badge className="bg-accent text-accent-foreground gap-1 animate-pulse">
              <Sparkles className="w-3 h-3" /> NOVO RECURSO
            </Badge>
          </motion.div>
        )}
        {slide.isPremium && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }}>
            <Badge variant="outline" className="border-warning text-warning gap-1">
              <Crown className="w-3 h-3" /> PREMIUM
            </Badge>
          </motion.div>
        )}
      </div>

      {/* Icon with cinematic glow */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.6, type: "spring" }}
          className="relative inline-flex"
        >
          {/* Glow ring */}
          <div className={cn(
            "absolute inset-0 rounded-3xl blur-xl opacity-50",
            `bg-gradient-to-br ${slide.gradient}`
          )} />
          <div className={cn(
            "relative w-20 h-20 rounded-3xl bg-gradient-to-br flex items-center justify-center shadow-2xl",
            slide.gradient,
            glow
          )}>
            <Icon className="w-10 h-10 text-primary-foreground" />
          </div>
        </motion.div>

        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-4xl mt-4 block"
        >
          {slide.emoji}
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-2xl md:text-3xl font-display font-bold mt-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
        >
          {slide.title}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground text-sm md:text-base mt-2"
        >
          {slide.subtitle}
        </motion.p>
      </div>

      {/* Bullets with staggered cinematic entrance */}
      <ul className="space-y-3 max-w-lg mx-auto">
        {slide.bullets.map((b, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.1, duration: 0.4, ease: "easeOut" }}
            className="flex items-start gap-3 text-sm md:text-base"
          >
            <span className={cn(
              "mt-1.5 w-2 h-2 rounded-full flex-shrink-0 shadow-sm",
              `bg-gradient-to-br ${slide.gradient}`
            )} />
            <span className="text-foreground/90">{b}</span>
          </motion.li>
        ))}
      </ul>

      {/* CTA — now a real clickable button */}
      {slide.ctaText && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-8"
        >
          <Button
            onClick={() => onCtaClick?.(featureKey)}
            className={cn(
              "gap-2 px-6 py-2.5 rounded-full text-sm font-medium shadow-lg",
              "bg-gradient-to-r text-primary-foreground hover:opacity-90 transition-opacity",
              slide.gradient,
              slide.emotionalImpact === "transformador" && "animate-pulse"
            )}
          >
            <ExternalLink className="w-4 h-4" />
            {slide.ctaText}
          </Button>
        </motion.div>
      )}

      {/* Slide counter */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center text-xs text-muted-foreground/50 mt-6"
      >
        {index + 1} / {total}
      </motion.p>
    </motion.div>
  );
}
