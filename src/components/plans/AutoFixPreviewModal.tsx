import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, ArrowRight, Wand2, PencilLine, X } from "lucide-react";
import type { AutoFixResult } from "@/lib/autoFixEngine";
import { useNavigate } from "react-router-dom";

const CHANGE_LABELS: Record<string, string> = {
  blocked_food_removed: "🚫 Alimento bloqueado removido",
  meal_simplified: "✂️ Refeição simplificada",
  fruit_reduction: "🍎 Frutas reduzidas",
  breakfast_fixed: "☀️ Café corrigido",
  snack_fixed: "🍌 Lanche corrigido",
  macro_rebalanced: "⚖️ Macros rebalanceados",
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: "☀️ Café", cafe_da_manha: "☀️ Café",
  morning_snack: "🍎 Lanche M.", lanche_manha: "🍎 Lanche M.",
  lunch: "🍽️ Almoço", almoco: "🍽️ Almoço",
  afternoon_snack: "🍌 Lanche T.", lanche_tarde: "🍌 Lanche T.",
  dinner: "🌙 Jantar", jantar: "🌙 Jantar",
  evening_snack: "🥛 Ceia", ceia: "🥛 Ceia",
  all: "🔄 Todas",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  result: AutoFixResult;
  onApprove: () => void;
}

function ScoreCompare({ label, before, after }: { label: string; before: number; after: number }) {
  const improved = after > before;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-red-400 font-medium">{before}</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
        <span className={`font-bold ${improved ? "text-emerald-400" : "text-amber-400"}`}>{after}</span>
      </div>
    </div>
  );
}

function MacroCompare({ label, before, after, unit }: { label: string; before: number; after: number; unit: string }) {
  const diff = after - before;
  const pct = before > 0 ? Math.round((diff / before) * 100) : 0;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span>{before}{unit}</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
        <span className="font-medium">{after}{unit}</span>
        {pct !== 0 && (
          <Badge variant="outline" className={`text-[10px] px-1 py-0 ${Math.abs(pct) <= 10 ? "text-emerald-400 border-emerald-500/20" : "text-amber-400 border-amber-500/20"}`}>
            {pct > 0 ? "+" : ""}{pct}%
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function AutoFixPreviewModal({ open, onOpenChange, result, onApprove }: Props) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-amber-500" />
            Correção Automática Aplicada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Score comparison */}
          <div className="glass rounded-lg p-4 space-y-2 border border-emerald-500/20">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Resultado
            </h4>
            <ScoreCompare label="Score Simplicidade" before={result.before.score.total} after={result.after.score.total} />
            <div className="flex gap-2">
              <div className="flex-1">
                <Progress value={result.before.score.total} className="h-2 [&>div]:bg-red-500" />
                <span className="text-[10px] text-muted-foreground">Antes</span>
              </div>
              <div className="flex-1">
                <Progress value={result.after.score.total} className="h-2 [&>div]:bg-emerald-500" />
                <span className="text-[10px] text-muted-foreground">Depois</span>
              </div>
            </div>
          </div>

          {/* Macro comparison */}
          <div className="glass rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold">⚖️ Macros (total diário)</h4>
            <MacroCompare label="Calorias" before={result.before.totalCalories} after={result.after.totalCalories} unit=" kcal" />
            <MacroCompare label="Proteína" before={result.before.totalProtein} after={result.after.totalProtein} unit="g" />
            <MacroCompare label="Carboidratos" before={result.before.totalCarbs} after={result.after.totalCarbs} unit="g" />
            <MacroCompare label="Gordura" before={result.before.totalFat} after={result.after.totalFat} unit="g" />
          </div>

          {/* Changes list */}
          <div className="glass rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold">
              🔧 {result.changes.length} Correções Aplicadas
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {result.changes.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-md bg-secondary/50">
                  <span className="shrink-0 mt-0.5">{CHANGE_LABELS[c.type]?.split(" ")[0] || "🔧"}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-red-400 line-through">{c.from}</span>
                      <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="text-emerald-400 font-medium">{c.to}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {MEAL_LABELS[c.mealType] || c.mealType}
                      {c.dayOfWeek >= 0 && ` · Dia ${c.dayOfWeek + 1}`}
                    </span>
                    {c.detail && <p className="text-[10px] text-muted-foreground mt-0.5">{c.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="text-xs text-amber-400 space-y-1">
              {result.warnings.map((w, i) => (
                <p key={i}>⚠️ {w}</p>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={onApprove}
              className="flex-1 gap-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
            >
              <CheckCircle2 className="w-4 h-4" /> Aprovar versão corrigida
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => {
                onOpenChange(false);
                if (result.newPlanId) navigate(`/meal-plans/${result.newPlanId}`);
              }}
            >
              <PencilLine className="w-4 h-4" /> Editar manualmente
            </Button>
            <Button
              variant="ghost"
              className="gap-2 text-muted-foreground"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" /> Descartar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
