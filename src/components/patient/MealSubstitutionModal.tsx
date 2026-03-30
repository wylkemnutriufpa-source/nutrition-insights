import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRightLeft, Flame, Beef, Wheat, Droplets,
  Check, TrendingDown, TrendingUp, Minus, Sparkles,
  UtensilsCrossed, ShieldCheck,
} from "lucide-react";
import { FOOD_DATABASE, type FoodItem } from "@/components/meals/FoodAutocomplete";
import {
  getValidSubstitutions, getFoodGroup, SUBSTITUTION_GROUP_LABELS,
  SMART_LABEL_CONFIG, type SmartLabel, type SubstitutionGroup,
} from "@/lib/substitutionGroups";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MealSubstitutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealTitle: string;
  mealPlanItemId: string;
  mealPlanId: string;
  patientId: string;
  onSubstitute: (food: FoodItem, originalTitle: string) => void;
}

function DiffBadge({ diff, unit }: { diff: number; unit: string }) {
  if (Math.abs(diff) < 3) return <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Minus className="w-2.5 h-2.5" /> ≈{unit}</span>;
  const isPositive = diff > 0;
  return (
    <span className={`text-[10px] flex items-center gap-0.5 font-medium ${isPositive ? "text-orange-500" : "text-emerald-500"}`}>
      {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {isPositive ? "+" : ""}{diff.toFixed(0)}{unit}
    </span>
  );
}

export default function MealSubstitutionModal({
  open, onOpenChange, mealTitle, mealPlanItemId, mealPlanId, patientId, onSubstitute,
}: MealSubstitutionModalProps) {
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [confirming, setConfirming] = useState(false);

  const { currentMatch, substitutions, groupLabel } = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const query = norm(mealTitle);
    const match = FOOD_DATABASE.find(f => {
      const n = norm(f.name);
      return n === query || query.includes(n) || n.includes(query);
    });

    if (!match) return { currentMatch: null, substitutions: [], groupLabel: null };

    const group = getFoodGroup(match.name);
    const subs = getValidSubstitutions(match.name, undefined, 3);
    const label = group ? SUBSTITUTION_GROUP_LABELS[group] : null;

    return { currentMatch: match, substitutions: subs, groupLabel: label };
  }, [mealTitle]);

  const handleConfirm = async () => {
    if (!selected || !currentMatch) return;
    setConfirming(true);

    try {
      // Save substitution record — does NOT modify the original plan
      await supabase.from("patient_meal_substitutions" as any).insert({
        patient_id: patientId,
        meal_plan_id: mealPlanId,
        meal_plan_item_id: mealPlanItemId,
        original_food: currentMatch.name,
        substituted_food: selected.name,
        substitution_category: getFoodGroup(currentMatch.name) || currentMatch.category,
        original_calories: currentMatch.calories,
        substituted_calories: selected.calories,
        original_protein: currentMatch.protein,
        substituted_protein: selected.protein,
      });

      onSubstitute(selected, currentMatch.name);
      toast.success(`✅ ${currentMatch.name} → ${selected.name}`, {
        description: "Substituição registrada! O plano original permanece intacto.",
      });
      setSelected(null);
      onOpenChange(false);
    } catch {
      toast.error("Erro ao registrar substituição");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setSelected(null); onOpenChange(o); }}>
      <DialogContent className="max-w-md max-h-[90vh] p-0 overflow-hidden rounded-2xl border-border/50 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-bold leading-tight">Substituir Refeição</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Escolha uma opção equivalente do mesmo grupo
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Current meal */}
        {currentMatch && (
          <div className="px-6 pb-2">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Refeição atual</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{currentMatch.name}</p>
                  <p className="text-[10px] text-muted-foreground">{currentMatch.portion}</p>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="flex items-center gap-0.5 text-orange-500"><Flame className="w-3 h-3" />{currentMatch.calories}</span>
                  <span className="flex items-center gap-0.5 text-red-500"><Beef className="w-3 h-3" />{currentMatch.protein}g</span>
                </div>
              </div>
            </div>
            {groupLabel && (
              <div className="flex items-center gap-1.5 mt-2">
                <Badge variant="outline" className="text-[10px]">{groupLabel}</Badge>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  Validação clínica ativa
                </span>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Substitution list */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-4 max-h-[calc(90vh-320px)]">
          {!currentMatch || substitutions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Sem substituições disponíveis</p>
              <p className="text-xs mt-1">Este alimento não possui equivalentes no mesmo grupo.</p>
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold">Melhores Substituições</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{substitutions.length} opções</span>
              </div>
              <AnimatePresence>
                {substitutions.map(({ food, labels }, i) => {
                  const calDiff = food.calories - (currentMatch?.calories || 0);
                  const protDiff = food.protein - (currentMatch?.protein || 0);
                  const isSelected = selected?.name === food.name;

                  return (
                    <motion.button
                      key={food.name}
                      type="button"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setSelected(isSelected ? null : food)}
                      className={`w-full text-left rounded-xl border p-3 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-lg shadow-primary/10"
                          : "border-border/50 bg-card/60 hover:border-primary/30 hover:bg-card/80"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                          isSelected ? "bg-primary text-primary-foreground" : "bg-secondary"
                        }`}>
                          {isSelected ? <Check className="w-4 h-4" /> : <UtensilsCrossed className="w-4 h-4 text-muted-foreground" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{food.name}</p>
                          <p className="text-[10px] text-muted-foreground">{food.portion}</p>
                          {/* Smart labels */}
                          {labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {labels.map(label => {
                                const cfg = SMART_LABEL_CONFIG[label];
                                return (
                                  <span key={label} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border ${cfg.color}`}>
                                    {cfg.emoji} {cfg.text}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Flame className="w-2.5 h-2.5 text-orange-400" />{food.calories}
                            </span>
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Beef className="w-2.5 h-2.5 text-red-400" />{food.protein}g
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DiffBadge diff={calDiff} unit="cal" />
                            <DiffBadge diff={protDiff} unit="g" />
                          </div>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isSelected && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          className="mt-3 pt-3 border-t border-primary/20"
                        >
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { label: "Cal", value: food.calories, unit: "", icon: <Flame className="w-3.5 h-3.5 text-orange-500" /> },
                              { label: "Prot", value: food.protein, unit: "g", icon: <Beef className="w-3.5 h-3.5 text-red-500" /> },
                              { label: "Carb", value: food.carbs, unit: "g", icon: <Wheat className="w-3.5 h-3.5 text-amber-500" /> },
                              { label: "Gord", value: food.fat, unit: "g", icon: <Droplets className="w-3.5 h-3.5 text-yellow-500" /> },
                            ].map(m => (
                              <div key={m.label} className="rounded-lg bg-secondary/60 p-2 text-center">
                                <div className="flex justify-center mb-0.5">{m.icon}</div>
                                <p className="text-[9px] text-muted-foreground">{m.label}</p>
                                <p className="font-bold text-xs">{Number(m.value).toFixed(0)}{m.unit}</p>
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-emerald-600 mt-2 text-center font-medium">
                            ✅ Mesmo grupo nutricional • plano original preservado
                          </p>
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer */}
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-6 pb-6 pt-2 border-t border-border/50"
          >
            <Button
              onClick={handleConfirm}
              disabled={confirming}
              className="w-full gap-2 h-12 text-sm font-semibold"
            >
              <ArrowRightLeft className="w-4 h-4" />
              {confirming ? "Substituindo..." : `Substituir por ${selected.name}`}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              📋 O plano original permanece intacto. A substituição fica registrada para seu nutricionista.
            </p>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
