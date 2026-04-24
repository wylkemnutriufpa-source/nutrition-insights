import { Info, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";
import { hasLegacyDayItems } from "@/lib/resolveEffectiveDay";
import { planLegacyConsolidation } from "@/lib/legacyDayConsolidation";
import { toast } from "sonner";

interface Props {
  effectiveDay: number;
  forceCanonical: boolean;
  onToggleForceCanonical: (value: boolean) => void;
}

const DAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function LegacyDayBanner({ effectiveDay, forceCanonical, onToggleForceCanonical }: Props) {
  const { items, updateItem } = useMealPlanEditorV2Store();
  const hasLegacy = hasLegacyDayItems(items);

  if (!hasLegacy) return null;

  const showingLegacy = effectiveDay !== 0;
  const dayLabel = DAY_LABELS[effectiveDay] ?? `Dia ${effectiveDay}`;

  const handleMigrate = (force: boolean) => {
    const plan = planLegacyConsolidation(items, { force });
    if (plan.toMove.length === 0) {
      toast.info("Nenhum item compatível para migrar (conflitos com refeições já existentes em day 0).");
      return;
    }
    plan.toMove.forEach((id) => updateItem(id, { day_of_week: 0 } as any));
    toast.success(`${plan.toMove.length} refeição(ões) migrada(s) para o dia padrão.`);
    // Após migrar, faz sentido voltar para o slot canônico
    onToggleForceCanonical(true);
  };

  return (
    <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 flex items-start gap-3">
      <div className="shrink-0 mt-0.5">
        <Info className="w-4 h-4 text-warning-foreground" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <p className="text-xs font-bold text-warning-foreground">
            Plano legado detectado
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {showingLegacy
              ? `Este plano foi criado no formato semanal e está exibindo o dia legado #${effectiveDay} (${dayLabel}). Recomendamos migrar tudo para o slot canônico (day 0) usado pelo modo Diário.`
              : `O slot canônico (day 0) já tem refeições, mas ainda existem itens em dias legados. Você pode consolidar tudo em day 0 para evitar inconsistências.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-[11px] gap-1.5"
            onClick={() => handleMigrate(false)}
          >
            <ArrowRight className="w-3 h-3" />
            Migrar itens para dia 0
          </Button>
          {showingLegacy && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-[11px] gap-1.5"
              onClick={() => onToggleForceCanonical(!forceCanonical)}
            >
              <Lock className="w-3 h-3" />
              {forceCanonical ? "Permitir fallback legado" : "Forçar exibir day 0"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
