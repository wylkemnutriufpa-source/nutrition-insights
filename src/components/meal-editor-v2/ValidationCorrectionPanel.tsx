import { useState } from "react";
import { AlertTriangle, CheckCircle2, Wand2, X, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";
import { toast } from "sonner";

interface MacroResult {
  label: string;
  unit: string;
  target: number;
  actual: number;
  diff_pct: number;
  tolerance: number;
  passed: boolean;
  rule: string;
}

interface ValidationError {
  rule: string;
  message: string;
  weight: number;
}

interface RestrictionViolation {
  restriction: string;
  keyword_found: string;
}

export interface ValidationResult {
  success: boolean;
  status: string;
  score: number;
  macros: MacroResult[] | null;
  restrictions_violated: RestrictionViolation[];
  errors: ValidationError[];
  audit: any;
}

interface Props {
  result: ValidationResult;
  onClose: () => void;
  onCorrectionApplied: () => void | Promise<void>;
}

interface CorrectionSuggestion {
  type: "macro_scale" | "restriction_swap";
  label: string;
  description: string;
  macro?: string;
  scaleFactor?: number;
  restrictionKeyword?: string;
}

function generateSuggestions(result: ValidationResult): CorrectionSuggestion[] {
  const suggestions: CorrectionSuggestion[] = [];

  // Macro divergence suggestions
  if (result.macros) {
    for (const m of result.macros) {
      if (!m.passed && m.target > 0) {
        const direction = m.actual > m.target ? "reduzir" : "aumentar";
        const factor = m.target / m.actual;
        suggestions.push({
          type: "macro_scale",
          label: `Ajustar ${m.label}`,
          description: `${direction} ${m.label} de ${m.actual}${m.unit} → ${m.target}${m.unit} (escalar porções por ${Math.round(factor * 100)}%)`,
          macro: m.label.toLowerCase(),
          scaleFactor: factor,
        });
      }
    }
  }

  // Restriction violation suggestions
  for (const rv of result.restrictions_violated) {
    suggestions.push({
      type: "restriction_swap",
      label: `Substituir "${rv.keyword_found}"`,
      description: `Remover itens com "${rv.keyword_found}" (restrição: ${rv.restriction}). Substitua por equivalentes permitidos.`,
      restrictionKeyword: rv.keyword_found,
    });
  }

  return suggestions;
}

export function ValidationCorrectionPanel({ result, onClose, onCorrectionApplied }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const store = useMealPlanEditorV2Store();

  const suggestions = generateSuggestions(result);

  const persistAfterCorrection = async () => {
    await onCorrectionApplied();
  };

  const applyMacroScale = async (suggestion: CorrectionSuggestion) => {
    if (!suggestion.scaleFactor || !suggestion.macro) return;
    setApplying(suggestion.label);

    try {
      const items = store.items;
      const factor = suggestion.scaleFactor;
      const macroKey = suggestion.macro;

      let updatedCount = 0;

      for (const item of items) {
        const updates: Record<string, number> = {};

        if (macroKey === "calorias" || macroKey === "calories") {
          updates.calories_target = Math.round((item.calories_target || 0) * factor);
          updates.protein_target = Math.round(Number(item.protein_target || 0) * factor);
          updates.carbs_target = Math.round(Number(item.carbs_target || 0) * factor);
          updates.fat_target = Math.round(Number(item.fat_target || 0) * factor);
        } else if (macroKey === "proteína" || macroKey === "protein") {
          updates.protein_target = Math.round(Number(item.protein_target || 0) * factor);
        } else if (macroKey === "carboidrato" || macroKey === "carbs") {
          updates.carbs_target = Math.round(Number(item.carbs_target || 0) * factor);
        } else if (macroKey === "gordura" || macroKey === "fat") {
          updates.fat_target = Math.round(Number(item.fat_target || 0) * factor);
        }

        if (Object.keys(updates).length > 0) {
          store.updateItem(item.id, updates as any);
          updatedCount++;
        }
      }

      await persistAfterCorrection();
      toast.success(`${suggestion.label}: ${updatedCount} itens ajustados e salvos automaticamente. Agora valide novamente.`);
    } catch (e: any) {
      toast.error("Erro ao aplicar correção: " + e.message);
    } finally {
      setApplying(null);
    }
  };

  const applyRestrictionRemoval = async (suggestion: CorrectionSuggestion) => {
    if (!suggestion.restrictionKeyword) return;
    setApplying(suggestion.label);

    try {
      const keyword = suggestion.restrictionKeyword;
      const items = store.items;
      let removed = 0;

      for (const item of items) {
        const desc = (item.description || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        if (desc.includes(keyword)) {
          store.deleteItem(item.id);
          removed++;
        }
      }

      await persistAfterCorrection();
      if (removed > 0) {
        toast.success(`${removed} item(ns) com "${keyword}" removido(s) e o plano foi salvo. Agora valide novamente.`);
      } else {
        toast.info("Nenhum item encontrado com esse ingrediente, mas o plano atual foi salvo.");
      }
    } catch (e: any) {
      toast.error("Erro ao remover itens: " + e.message);
    } finally {
      setApplying(null);
    }
  };

  const handleApply = (suggestion: CorrectionSuggestion) => {
    if (suggestion.type === "macro_scale") {
      applyMacroScale(suggestion);
    } else if (suggestion.type === "restriction_swap") {
      applyRestrictionRemoval(suggestion);
    }
  };

  const scoreColor = result.score >= 80
    ? "text-amber-500"
    : result.score >= 50
      ? "text-orange-500"
      : "text-destructive";

  return (
    <div className="glass rounded-xl border border-destructive/30 overflow-hidden animate-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-destructive/5 border-b border-destructive/20">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <div>
            <h3 className="font-display font-semibold text-sm">
              Sugestões de Melhoria — Score: <span className={scoreColor}>{result.score}/100</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              {result.errors.length} divergência(s) encontrada(s) • {suggestions.length} sugestão(ões) de correção
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Errors list */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Divergências</h4>
            {result.errors.map((err, i) => (
              <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-destructive/5">
                <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                <span className="text-foreground/80">{err.message}</span>
                <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">
                  peso: {err.weight}
                </Badge>
              </div>
            ))}
          </div>

          {/* Macros comparison */}
          {result.macros && result.macros.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comparação de Macros</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {result.macros.map((m, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-lg border text-center ${
                      m.passed
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-destructive/30 bg-destructive/5"
                    }`}
                  >
                    <div className="text-[10px] font-medium text-muted-foreground">{m.label}</div>
                    <div className="text-sm font-bold">
                      {m.actual}{m.unit}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      meta: {m.target}{m.unit}
                    </div>
                    <div className={`text-[10px] font-semibold ${m.passed ? "text-emerald-600" : "text-destructive"}`}>
                      {m.passed ? (
                        <span className="flex items-center justify-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> OK
                        </span>
                      ) : (
                        `${m.diff_pct > 0 ? "+" : ""}${m.diff_pct}%`
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Correction suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5" /> Sugestões de Correção Automática
              </h4>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="space-y-0.5 flex-1 mr-3">
                      <div className="text-sm font-medium">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.description}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1.5 border-primary/30 hover:bg-primary/10"
                      onClick={() => handleApply(s)}
                      disabled={applying !== null}
                    >
                      {applying === s.label ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="w-3.5 h-3.5" />
                      )}
                      Aplicar
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                💡 Após aplicar correções, clique em <strong>Salvar</strong> e depois <strong>Validar</strong> novamente.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
