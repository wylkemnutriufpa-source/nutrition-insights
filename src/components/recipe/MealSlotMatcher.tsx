import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle, ArrowRight } from "lucide-react";
import { RecipeIngredient, RecipeMacros, matchRecipeToMealSlot, perServingMacros, calculateRecipeMacros, macrosMatchTarget } from "@/lib/recipeCalculator";

interface MealSlot {
  id: string;
  meal_type: string;
  day_of_week: number;
  calories: number;
  protein: number;
  description: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ingredients: RecipeIngredient[];
  servings: number;
  recipeName: string;
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Café da Manhã",
  morning_snack: "Lanche da Manhã",
  lunch: "Almoço",
  afternoon_snack: "Lanche da Tarde",
  dinner: "Jantar",
  supper: "Ceia",
};

export default function MealSlotMatcher({ open, onOpenChange, ingredients, servings, recipeName }: Props) {
  const { user } = useAuth();
  const [slots, setSlots] = useState<MealSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [result, setResult] = useState<{
    scaleFactor: number;
    adjustedIngredients: RecipeIngredient[];
    adjustedMacros: RecipeMacros;
    match: ReturnType<typeof macrosMatchTarget>;
  } | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      // Get active meal plan items for the patient
      const query = supabase
        .from("meal_plans")
        .select("id")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      // Filter by active statuses
      (query as any).in("status", ["approved", "published", "published_to_patient"]);
      const { data: plans } = await query;

      if (!plans?.length) return;

      const { data: items } = await supabase
        .from("meal_plan_items")
        .select("id, meal_type, day_of_week, calories_target, protein_target, description")
        .eq("meal_plan_id", plans[0].id);

      if (items) {
        // Deduplicate by meal_type (pick first day)
        const seen = new Map<string, MealSlot>();
        for (const item of items as any[]) {
          if (!seen.has(item.meal_type)) {
            seen.set(item.meal_type, item);
          }
        }
        setSlots(Array.from(seen.values()));
      }
    })();
  }, [open, user]);

  useEffect(() => {
    if (!selectedSlot || ingredients.length === 0) { setResult(null); return; }
    const slot = slots.find((s) => s.id === selectedSlot);
    if (!slot) return;

    const { scaleFactor, adjustedIngredients, adjustedMacros } = matchRecipeToMealSlot(
      ingredients,
      slot.calories,
      servings
    );
    const match = macrosMatchTarget(adjustedMacros, slot.calories, slot.protein);
    setResult({ scaleFactor, adjustedIngredients, adjustedMacros, match });
  }, [selectedSlot, ingredients, servings, slots]);

  const currentMacros = perServingMacros(calculateRecipeMacros(ingredients), servings);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            🧠 Match Clínico — {recipeName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Para qual refeição deseja usar esta receita?</p>
            <Select value={selectedSlot} onValueChange={setSelectedSlot}>
              <SelectTrigger><SelectValue placeholder="Selecione a refeição" /></SelectTrigger>
              <SelectContent>
                {slots.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {MEAL_LABELS[s.meal_type] || s.meal_type} — {Math.round(s.calories)} kcal
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {result && (
            <div className="space-y-3">
              {/* Before/After comparison */}
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                <div className="p-3 rounded-lg bg-muted/40 text-center">
                  <p className="text-[10px] text-muted-foreground">Atual</p>
                  <p className="text-lg font-bold">{Math.round(currentMacros.calories)}</p>
                  <p className="text-[10px]">kcal/porção</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <div className="p-3 rounded-lg bg-primary/10 text-center">
                  <p className="text-[10px] text-primary">Ajustado</p>
                  <p className="text-lg font-bold text-primary">{Math.round(result.adjustedMacros.calories)}</p>
                  <p className="text-[10px]">kcal/porção</p>
                </div>
              </div>

              {/* Match status */}
              <div className="flex items-center gap-2">
                {result.match.matches ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 gap-1">
                    <Check className="w-3 h-3" /> Aprovado — dentro da margem de 5%
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" /> Diferença: {result.match.caloriesDiff > 0 ? "+" : ""}{Math.round(result.match.caloriesDiff)} kcal
                  </Badge>
                )}
              </div>

              {/* Adjusted quantities */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium">Quantidades ajustadas:</p>
                {result.adjustedIngredients.map((ing) => (
                  <div key={ing.id} className="flex items-center justify-between text-sm px-2 py-1.5 rounded bg-muted/30">
                    <span>{ing.name}</span>
                    <span className="font-mono text-xs font-medium text-primary">
                      {ing.quantity_grams}{ing.unit === "g" ? "g" : ` ${ing.unit}`}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-muted-foreground text-center">
                Fator de escala: {result.scaleFactor.toFixed(2)}x
              </p>
            </div>
          )}

          {slots.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum plano alimentar ativo encontrado.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
