/**
 * FitIntelligence Prompt Card
 * Premium floating card for contextual prompts.
 */
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain, X, Droplets, Dumbbell, AlertTriangle, Sparkles,
  Check, Heart, Stethoscope, BellOff,
} from "lucide-react";
import type { IntelligencePrompt } from "@/lib/fitIntelligenceEngine";

const EASE = [0.22, 1, 0.36, 1] as const;

const iconMap: Record<string, typeof Brain> = {
  hydration_check: Droplets,
  hydration_progress: Droplets,
  hydration_failure: Droplets,
  workout_reminder: Dumbbell,
  weekend_risk: AlertTriangle,
  clinical_warning: Stethoscope,
  motivation_nudge: Sparkles,
  emotional_response: Heart,
  welcome_back: Brain,
};

interface Props {
  prompt: IntelligencePrompt;
  responseText: string | null;
  responding: boolean;
  onQuickAction: (value: string) => void;
  onDismiss: () => void;
  onSnooze?: () => void;
}

export default function FitIntelligencePromptCard({
  prompt,
  responseText,
  responding,
  onQuickAction,
  onDismiss,
  onSnooze,
}: Props) {
  const PromptIcon = iconMap[prompt.type] || Brain;

  return (
    <motion.div
      key="card"
      initial={{ opacity: 0, y: 100, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 60, scale: 0.95 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="fixed bottom-20 right-4 left-4 sm:left-auto sm:w-[360px] z-[9990] rounded-2xl border border-primary/20 overflow-hidden shadow-2xl shadow-primary/10"
      style={{
        background: "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <PromptIcon className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold">{prompt.title}</p>
            <Badge variant="outline" className="text-[9px] py-0 border-primary/20 text-primary">
              Inteligência FitJourney
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onSnooze && (
            <button
              onClick={onSnooze}
              className="p-1 rounded-lg hover:bg-muted transition-colors"
              title="Silenciar por 2h"
            >
              <BellOff className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-3">
        {responseText ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 py-3"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm text-foreground/90">{responseText}</p>
          </motion.div>
        ) : (
          <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed py-1">
            {prompt.body}
          </p>
        )}
      </div>

      {/* Quick Actions */}
      {!responseText && prompt.quickActions && (
        <div className="px-4 pb-4">
          <div className="flex gap-2">
            {prompt.quickActions.map((action) => (
              <Button
                key={action.value}
                variant="outline"
                size="sm"
                onClick={() => onQuickAction(action.value)}
                disabled={responding}
                className="flex-1 border-primary/20 hover:bg-primary/10 hover:border-primary/40 text-sm font-medium"
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Gradient bottom accent */}
      <div className="h-0.5 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0" />
    </motion.div>
  );
}
