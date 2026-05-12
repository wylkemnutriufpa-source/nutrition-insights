import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@v1/components/ui/dialog";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import { CheckCircle2, ArrowRight, Wrench, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import type { AutoFixResult, AutoFixChange } from "@v1/lib/autoFixEngine";
import { fmtMacro, safeNum } from "@v1/lib/formatMacros";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: AutoFixResult;
  wasAlreadyValid?: boolean;
  validationMessage?: string;
}

const CHANGE_LABELS: Record<string, string> = {
  blocked_food_removed: "Alimento bloqueado removido",
  meal_simplified: "Refeição simplificada",
  fruit_reduction: "Frutas reduzidas",
  breakfast_fixed: "Café da manhã corrigido",
  snack_fixed: "Lanche corrigido",
  main_meal_standardized: "Refeição principal padronizada",
  macro_rebalanced: "Macros rebalanceados",
  complexity_reduced: "Complexidade reduzida",
  personalization_applied: "Personalização aplicada",
};

export default function AutoFixResultsModal({ open, onOpenChange, result, wasAlreadyValid, validationMessage }: Props) {
  const { before, after, changes, summary, warnings } = result;

  // safeNum: protege contra null/undefined/NaN vindos do engine antes de subtrair.
  const calDiff = safeNum(after.totalCalories) - safeNum(before.totalCalories);
  const protDiff = safeNum(after.totalProtein) - safeNum(before.totalProtein);
  const carbDiff = safeNum(after.totalCarbs) - safeNum(before.totalCarbs);
  const fatDiff = safeNum(after.totalFat) - safeNum(before.totalFat);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {wasAlreadyValid ? (
              <><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Plano já está correto</>
            ) : (
              <><Wrench className="w-5 h-5 text-amber-500" /> Correções aplicadas</>
            )}
          </DialogTitle>
          <DialogDescription>
            {wasAlreadyValid
              ? validationMessage || "O plano está dentro dos limites clínicos — nenhuma correção necessária."
              : `${changes.length} correção(ões) aplicada(s) ao plano.`}
          </DialogDescription>
        </DialogHeader>

        {!wasAlreadyValid && (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {/* Macro comparison */}
              <div className="rounded-lg border border-border p-3 space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Comparação de Macros (Total)</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <MacroRow label="Calorias" before={before.totalCalories} after={after.totalCalories} unit="kcal" diff={calDiff} />
                  <MacroRow label="Proteína" before={before.totalProtein} after={after.totalProtein} unit="g" diff={protDiff} />
                  <MacroRow label="Carboidrato" before={before.totalCarbs} after={after.totalCarbs} unit="g" diff={carbDiff} />
                  <MacroRow label="Gordura" before={before.totalFat} after={after.totalFat} unit="g" diff={fatDiff} />
                </div>
              </div>

              {/* Summary badges */}
              <div className="flex flex-wrap gap-1.5">
                {summary.blocked_removed > 0 && <Badge variant="destructive" className="text-[10px]">🚫 {summary.blocked_removed} bloqueado(s)</Badge>}
                {summary.meals_simplified > 0 && <Badge variant="secondary" className="text-[10px]">✂️ {summary.meals_simplified} simplificada(s)</Badge>}
                {summary.snacks_fixed > 0 && <Badge variant="secondary" className="text-[10px]">🍎 {summary.snacks_fixed} lanche(s)</Badge>}
                {summary.breakfasts_fixed > 0 && <Badge variant="secondary" className="text-[10px]">☕ {summary.breakfasts_fixed} café(s)</Badge>}
                {summary.main_meals_standardized > 0 && <Badge variant="secondary" className="text-[10px]">🍽️ {summary.main_meals_standardized} principal(is)</Badge>}
                {summary.macro_rebalanced && <Badge className="text-[10px] bg-amber-500/15 text-amber-600 border-amber-500/30">⚖️ Macros rebalanceados</Badge>}
              </div>

              {/* Changes list */}
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold text-foreground">Detalhes das correções</h4>
                {changes.map((change, i) => (
                  <ChangeRow key={i} change={change} />
                ))}
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Avisos
                  </h4>
                  {warnings.map((w, i) => (
                    <p key={i} className="text-xs text-muted-foreground">{w}</p>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={() => onOpenChange(false)} size="sm">Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MacroRow({ label, before, after, unit, diff }: { label: string; before: number; after: number; unit: string; diff: number }) {
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : CheckCircle2;
  const color = Math.abs(diff) < 1 ? "text-emerald-500" : diff > 0 ? "text-amber-500" : "text-blue-500";

  return (
    <>
      <div className="flex items-center justify-between col-span-2 bg-muted/50 rounded px-2 py-1">
        <span className="text-muted-foreground font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{fmtMacro(before)}{unit}</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
          <span className="font-semibold text-foreground">{fmtMacro(after)}{unit}</span>
          <span className={`flex items-center gap-0.5 ${color}`}>
            <Icon className="w-3 h-3" />
            {diff > 0 ? "+" : ""}{fmtMacro(diff)}{unit}
          </span>
        </div>
      </div>
    </>
  );
}

function ChangeRow({ change }: { change: AutoFixChange }) {
  return (
    <div className="flex items-start gap-2 text-xs bg-muted/30 rounded px-2 py-1.5">
      <Badge variant="outline" className="text-[9px] shrink-0 mt-0.5">
        {CHANGE_LABELS[change.type] || change.type}
      </Badge>
      <div className="min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-muted-foreground line-through">{change.from}</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="font-medium text-foreground">{change.to}</span>
        </div>
        {change.detail && <p className="text-muted-foreground mt-0.5">{change.detail}</p>}
      </div>
    </div>
  );
}
