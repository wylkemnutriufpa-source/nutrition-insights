import { useExperienceModeRecommendation } from "@/hooks/useExperienceModeRecommendation";
import { useExperienceMode, type ExperienceMode } from "@/hooks/useExperienceMode";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MODE_LABELS: Record<ExperienceMode, string> = {
  basic: "Básico",
  pro: "Profissional",
  advanced: "Avançado",
};

export default function ExperienceModeRecommendation() {
  const { suggested, reason, confidence, loading, factors } = useExperienceModeRecommendation();
  const { mode, setMode } = useExperienceMode();

  if (loading || suggested === mode) return null;

  const handleApply = () => {
    setMode(suggested);
    toast.success(`Modo ${MODE_LABELS[suggested]} ativado 🚀`);
  };

  const isUpgrade = MODE_ORDER.indexOf(suggested) > MODE_ORDER.indexOf(mode);

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
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
