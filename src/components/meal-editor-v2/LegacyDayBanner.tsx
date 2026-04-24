import { useState } from "react";
import { Info, ArrowRight, Lock, Undo2, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";
import { hasLegacyDayItems } from "@/lib/resolveEffectiveDay";
import {
  planLegacyConsolidation,
  buildMigrationUndoSnapshot,
  formatMealTypeCounts,
  type MigrationUndoEntry,
} from "@/lib/legacyDayConsolidation";
import { useLegacyBannerVisibility } from "@/hooks/useForceCanonicalDay";
import { toast } from "sonner";

interface Props {
  effectiveDay: number;
  forceCanonical: boolean;
  onToggleForceCanonical: (value: boolean) => void;
}

const DAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

interface MigrationSummary {
  movedTotal: number;
  movedByMealType: Record<string, number>;
  conflictsTotal: number;
  conflictsByMealType: Record<string, number>;
  undoSnapshot: MigrationUndoEntry[];
  performedAt: number;
}

export default function LegacyDayBanner({ effectiveDay, forceCanonical, onToggleForceCanonical }: Props) {
  const { items, updateItem } = useMealPlanEditorV2Store();
  const [visible, setVisible] = useLegacyBannerVisibility();
  const [summary, setSummary] = useState<MigrationSummary | null>(null);

  const hasLegacy = hasLegacyDayItems(items);

  // Sem itens legados E sem resumo recente: nada a mostrar.
  if (!hasLegacy && !summary) return null;
  // Profissional descartou e não há resumo recente: respeitar dismiss.
  if (!visible && !summary) return null;

  const showingLegacy = effectiveDay !== 0;
  const dayLabel = DAY_LABELS[effectiveDay] ?? `Dia ${effectiveDay}`;

  const handleMigrate = (force: boolean) => {
    const plan = planLegacyConsolidation(items, { force });
    if (plan.toMove.length === 0) {
      toast.info("Nenhum item compatível para migrar (conflitos com refeições já existentes em day 0).");
      return;
    }

    const undoSnapshot = buildMigrationUndoSnapshot(items, plan.toMove);
    plan.toMove.forEach((id) => updateItem(id, { day_of_week: 0 } as any));

    const movedSummary = formatMealTypeCounts(plan.movedByMealType);
    const conflictSummary = plan.conflicts.length > 0
      ? ` Conflitos preservados: ${formatMealTypeCounts(plan.conflictsByMealType)}.`
      : "";

    toast.success(
      `${plan.toMove.length} refeição(ões) migrada(s) para day 0 — ${movedSummary}.${conflictSummary}`,
      {
        duration: 8000,
        action: {
          label: "Desfazer",
          onClick: () => handleUndo(undoSnapshot),
        },
      }
    );

    setSummary({
      movedTotal: plan.toMove.length,
      movedByMealType: plan.movedByMealType,
      conflictsTotal: plan.conflicts.length,
      conflictsByMealType: plan.conflictsByMealType,
      undoSnapshot,
      performedAt: Date.now(),
    });

    // Após migrar, faz sentido voltar para o slot canônico
    onToggleForceCanonical(true);
  };

  const handleUndo = (snapshot: MigrationUndoEntry[]) => {
    if (snapshot.length === 0) {
      toast.info("Nada para desfazer.");
      return;
    }
    snapshot.forEach((entry) => {
      updateItem(entry.itemId, { day_of_week: entry.previousDay } as any);
    });
    toast.success(`Migração desfeita: ${snapshot.length} item(ns) restaurado(s) ao dia original.`);
    setSummary(null);
  };

  return (
    <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 flex items-start gap-3">
      <div className="shrink-0 mt-0.5">
        {summary ? (
          <CheckCircle2 className="w-4 h-4 text-success-foreground" />
        ) : (
          <Info className="w-4 h-4 text-warning-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        {/* Caso ainda existam itens legados, mostra o aviso padrão */}
        {hasLegacy && (
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
        )}

        {/* Resumo da última migração */}
        {summary && (
          <div className="rounded-lg bg-success/10 border border-success/30 p-2 space-y-1">
            <p className="text-xs font-bold text-success-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3" />
              Migração concluída — {summary.movedTotal} item(ns) movido(s) para day 0
            </p>
            <p className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Movidos por refeição:</span>{" "}
              {formatMealTypeCounts(summary.movedByMealType)}
            </p>
            {summary.conflictsTotal > 0 && (
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-warning-foreground">Mantidos por conflito:</span>{" "}
                {formatMealTypeCounts(summary.conflictsByMealType)} — {summary.conflictsTotal} item(ns) preservado(s)
                porque já havia refeição correspondente em day 0.
              </p>
            )}
            <div className="pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px] gap-1.5"
                onClick={() => handleUndo(summary.undoSnapshot)}
              >
                <Undo2 className="w-3 h-3" />
                Desfazer migração ({summary.undoSnapshot.length})
              </Button>
            </div>
          </div>
        )}

        {/* Ações de migração (somente se houver legados) */}
        {hasLegacy && (
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
        )}
      </div>

      {/* Botão dismiss — só visível quando não há legados pendentes ou quando o profissional quer ocultar */}
      {hasLegacy && (
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="shrink-0 -mt-1 -mr-1 p-1 rounded hover:bg-warning/20 text-muted-foreground hover:text-foreground transition-colors"
          title="Ocultar este aviso"
          aria-label="Ocultar aviso de plano legado"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
