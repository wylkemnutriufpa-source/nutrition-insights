import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildMealItems, type MealItemInput } from "@/lib/mealItemBuilder";
import {
  Flame, Beef, Wheat, Droplets, Loader2, Zap, Check,
  Coffee, Apple, Utensils, Cookie, Moon, Sun
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type MealType = Database["public"]["Enums"]["meal_type"];

interface CalorieTemplate {
  label: string;
  kcal: number;
  emoji: string;
  description: string;
  color: string;
}

const TEMPLATES: CalorieTemplate[] = [
  { label: "1000 kcal", kcal: 1000, emoji: "🥗", description: "Déficit agressivo / VLCD", color: "from-emerald-500/20 to-emerald-600/10" },
  { label: "1100 kcal", kcal: 1100, emoji: "🥬", description: "Déficit intenso", color: "from-green-500/20 to-green-600/10" },
  { label: "1200 kcal", kcal: 1200, emoji: "🔥", description: "Emagrecimento clássico", color: "from-orange-500/20 to-orange-600/10" },
  { label: "1500 kcal", kcal: 1500, emoji: "⚖️", description: "Déficit moderado", color: "from-amber-500/20 to-amber-600/10" },
  { label: "1800 kcal", kcal: 1800, emoji: "💪", description: "Manutenção / Recomp", color: "from-blue-500/20 to-blue-600/10" },
  { label: "2000 kcal", kcal: 2000, emoji: "🏋️", description: "Manutenção / Hipertrofia", color: "from-purple-500/20 to-purple-600/10" },
  { label: "2200 kcal", kcal: 2200, emoji: "🚀", description: "Superávit leve", color: "from-indigo-500/20 to-indigo-600/10" },
  { label: "2500 kcal", kcal: 2500, emoji: "⚡", description: "Superávit / Performance", color: "from-red-500/20 to-red-600/10" },
];

// Macro ratios by approach
const MACRO_PROFILES = [
  { label: "Balanceado", key: "balanced", protein: 0.25, carbs: 0.50, fat: 0.25 },
  { label: "High Protein", key: "high_protein", protein: 0.35, carbs: 0.40, fat: 0.25 },
  { label: "Low Carb", key: "low_carb", protein: 0.30, carbs: 0.25, fat: 0.45 },
  { label: "Cetogênico", key: "keto", protein: 0.25, carbs: 0.05, fat: 0.70 },
];

// Meal distribution percentages
const MEAL_DISTRIBUTION: { type: MealType; label: string; pct: number; icon: React.ReactNode }[] = [
  { type: "breakfast", label: "Café da Manhã", pct: 0.20, icon: <Coffee className="w-3.5 h-3.5" /> },
  { type: "morning_snack", label: "Lanche Manhã", pct: 0.10, icon: <Apple className="w-3.5 h-3.5" /> },
  { type: "lunch", label: "Almoço", pct: 0.30, icon: <Utensils className="w-3.5 h-3.5" /> },
  { type: "afternoon_snack", label: "Lanche Tarde", pct: 0.10, icon: <Cookie className="w-3.5 h-3.5" /> },
  { type: "dinner", label: "Jantar", pct: 0.25, icon: <Moon className="w-3.5 h-3.5" /> },
  { type: "evening_snack", label: "Ceia", pct: 0.05, icon: <Sun className="w-3.5 h-3.5" /> },
];

interface CalorieTemplatesProps {
  mealPlanId: string;
  onApplied: () => void;
}

export default function CalorieTemplates({ mealPlanId, onApplied }: CalorieTemplatesProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CalorieTemplate | null>(null);
  const [customKcal, setCustomKcal] = useState(1500);
  const [macroProfile, setMacroProfile] = useState(MACRO_PROFILES[0]);
  const [applying, setApplying] = useState(false);
  const [applyAllDays, setApplyAllDays] = useState(true);

  const activeKcal = selected ? selected.kcal : customKcal;
  const macros = {
    protein: Math.round((activeKcal * macroProfile.protein) / 4),
    carbs: Math.round((activeKcal * macroProfile.carbs) / 4),
    fat: Math.round((activeKcal * macroProfile.fat) / 9),
  };

  const handleApply = async () => {
    setApplying(true);
    const days = applyAllDays ? [0, 1, 2, 3, 4, 5, 6] : [new Date().getDay()];

    const inputs: MealItemInput[] = days.flatMap(day =>
      MEAL_DISTRIBUTION.map(meal => {
        const mealKcal = Math.round(activeKcal * meal.pct);
        const mealProtein = Math.round(macros.protein * meal.pct);
        const mealCarbs = Math.round(macros.carbs * meal.pct);
        const mealFat = Math.round(macros.fat * meal.pct);

        return {
          meal_plan_id: mealPlanId,
          title: meal.label,
          description: `• ${meal.label}\n• Meta: ${mealKcal}kcal | ${mealProtein}g prot | ${mealCarbs}g carb | ${mealFat}g gord\n\n⚠️ Refeição modelo — preencha os alimentos reais`,
          meal_type: meal.type,
          day_of_week: day,
          calories_target: mealKcal,
          protein_target: mealProtein,
          carbs_target: mealCarbs,
          fat_target: mealFat,
          item_origin: "template",
        };
      })
    );

    const { items: inserts, warnings } = buildMealItems(inputs);
    if (warnings.length > 0) {
      console.warn("[CalorieTemplates]", warnings);
    }

    // Remove existing items for the affected days before inserting
    if (!mealPlanId || typeof mealPlanId !== 'string' || mealPlanId.trim() === "") {
      console.error("[CRITICAL] DELETE bloqueado: mealPlanId inválido em CalorieTemplates", { mealPlanId });
      throw new Error("DELETE bloqueado: mealPlanId inválido");
    }
    
    console.info("[DELETE] Limpando itens para aplicar template de calorias", { mealPlanId, days, operation: "applyCalorieTemplate", timestamp: Date.now() });
    
    const { error: deleteError } = await supabase
      .from("meal_plan_items")
      .delete()
      .eq("meal_plan_id", mealPlanId)
      .in("day_of_week", days);

    if (deleteError) {
      setApplying(false);
      toast.error("Erro ao limpar itens existentes: " + deleteError.message);
      return;
    }

    const { error } = await supabase.from("meal_plan_items").insert(inserts);
    setApplying(false);

    if (error) {
      toast.error("Erro ao aplicar template: " + error.message);
    } else {
      toast.success(`Template ${activeKcal} kcal aplicado com ${inserts.length} itens! 🎯`);
      setOpen(false);
      onApplied();
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Zap className="w-4 h-4" /> Templates Kcal
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> Templates por Calorias
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Template chips */}
            <div>
              <p className="text-sm font-medium mb-2">Selecione a faixa calórica:</p>
              <div className="grid grid-cols-4 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.kcal}
                    onClick={() => { setSelected(t); setCustomKcal(t.kcal); }}
                    className={`rounded-xl p-3 text-center border transition-all ${
                      selected?.kcal === t.kcal
                        ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/30"
                        : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    <span className="text-xl">{t.emoji}</span>
                    <p className="font-display font-bold text-sm mt-1">{t.kcal}</p>
                    <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom slider */}
            <div>
              <p className="text-sm font-medium mb-2">Ou ajuste manualmente:</p>
              <div className="flex items-center gap-3">
                <Slider
                  value={[customKcal]}
                  onValueChange={([v]) => { setCustomKcal(v); setSelected(TEMPLATES.find(t => t.kcal === v) || null); }}
                  min={800}
                  max={3500}
                  step={50}
                  className="flex-1"
                />
                <span className="font-display font-bold text-lg text-primary min-w-[70px] text-right">
                  {customKcal}
                </span>
              </div>
            </div>

            {/* Macro profile */}
            <div>
              <p className="text-sm font-medium mb-2">Perfil de macros:</p>
              <div className="grid grid-cols-4 gap-2">
                {MACRO_PROFILES.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setMacroProfile(p)}
                    className={`rounded-lg px-2 py-2 text-center text-xs font-medium border transition-all ${
                      macroProfile.key === p.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="glass rounded-xl p-4">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" /> Pré-visualização — {activeKcal} kcal/dia
              </p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <Beef className="w-4 h-4 mx-auto text-red-500 mb-1" />
                  <p className="font-display font-bold text-sm">{macros.protein}g</p>
                  <p className="text-[10px] text-muted-foreground">Proteína ({Math.round(macroProfile.protein * 100)}%)</p>
                </div>
                <div className="text-center">
                  <Wheat className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                  <p className="font-display font-bold text-sm">{macros.carbs}g</p>
                  <p className="text-[10px] text-muted-foreground">Carboidratos ({Math.round(macroProfile.carbs * 100)}%)</p>
                </div>
                <div className="text-center">
                  <Droplets className="w-4 h-4 mx-auto text-blue-400 mb-1" />
                  <p className="font-display font-bold text-sm">{macros.fat}g</p>
                  <p className="text-[10px] text-muted-foreground">Gordura ({Math.round(macroProfile.fat * 100)}%)</p>
                </div>
              </div>

              <p className="text-xs font-medium mb-2 text-muted-foreground">Distribuição por refeição:</p>
              <div className="space-y-1.5">
                {MEAL_DISTRIBUTION.map((m) => {
                  const mealKcal = Math.round(activeKcal * m.pct);
                  return (
                    <div key={m.type} className="flex items-center gap-2 text-xs">
                      {m.icon}
                      <span className="flex-1">{m.label}</span>
                      <span className="text-muted-foreground">{Math.round(m.pct * 100)}%</span>
                      <span className="font-semibold min-w-[60px] text-right">{mealKcal} kcal</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Apply options */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setApplyAllDays(true)}
                className={`flex-1 rounded-lg py-2 text-xs font-medium border transition-all ${
                  applyAllDays ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                Todos os dias (Seg-Dom)
              </button>
              <button
                onClick={() => setApplyAllDays(false)}
                className={`flex-1 rounded-lg py-2 text-xs font-medium border transition-all ${
                  !applyAllDays ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                Apenas hoje
              </button>
            </div>

            <Button
              onClick={handleApply}
              disabled={applying}
              className="w-full gradient-primary gap-2"
            >
              {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {applying ? "Aplicando..." : `Aplicar Template ${activeKcal} kcal`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
