import {
  useExperienceModeRecommendation,
  dismissRecommendation,
  markRecommendationApplied,
  isRecommendationCoolingDown,
} from "@v1/hooks/useExperienceModeRecommendation";
import { useExperienceMode, type ExperienceMode } from "@v1/hooks/useExperienceMode";
import { Sparkles, X } from "lucide-react";
import { Button } from "@v1/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

const MODE_LABELS: Record<ExperienceMode, string> = {
  basic: "Básico",
  pro: "Profissional",
  advanced: "Avançado",
};

const MODE_ORDER: ExperienceMode[] = ["basic", "pro", "advanced"];

export default function ExperienceModeRecommendation() {
  const { suggested, reason, confidence, loading, factors } = useExperienceModeRecommendation();
  const { mode, setMode } = useExperienceMode();
  const [dismissed, setDismissed] = useState(() => isRecommendationCoolingDown());

  if (loading || suggested === mode || dismissed) return null;

  const handleApply = () => {
    setMode(suggested);
    markRecommendationApplied();
    setDismissed(true);
    toast.success(`Modo ${MODE_LABELS[suggested]} ativado 🚀`);
  };

  const handleDismiss = () => {
    dismissRecommendation();
    setDismissed(true);
  };

  const isUpgrade = MODE_ORDER.indexOf(suggested) > MODE_ORDER.indexOf(mode);

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-3 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dispensar sugestão"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium text-foreground">
          {isUpgrade
            ? `Você está pronto para o modo ${MODE_LABELS[suggested]} ✨`
            : `IFJ sugere o modo ${MODE_LABELS[suggested]} para você`}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{reason}</p>
        {factors.recentActivityDays > 0 && (
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            {factors.recentActivityDays} dia{factors.recentActivityDays > 1 ? "s" : ""} ativo
            {factors.recentActivityDays > 1 ? "s" : ""} esta semana
            {factors.clinicalDecisions > 0 && ` · ${factors.clinicalDecisions} decisão(ões) IFJ`}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <Button size="sm" variant="default" className="h-7 text-xs" onClick={handleApply}>
            {isUpgrade ? "Evoluir agora" : "Aplicar sugestão"}
          </Button>
          <span className="text-[10px] text-muted-foreground">{confidence}% de confiança</span>
        </div>
      </div>
    </div>
  );
}
