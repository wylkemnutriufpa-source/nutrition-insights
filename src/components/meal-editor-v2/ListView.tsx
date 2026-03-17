import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Coffee, Apple, Utensils, Cookie, Moon, Sun,
  Plus, Check, Flame, Beef, Wheat, Droplets, Zap, Bookmark, ChevronDown, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMealPlanEditorV2Store, type MealType, type MealPlanItem } from "@/stores/mealPlanEditorV2Store";
import { MealItemCard } from "./MealItemCard";
import MacroBalanceBar from "@/components/meals/MacroBalanceBar";
import { FOOD_DATABASE } from "@/components/meals/FoodAutocomplete";
import type { FoodItem } from "@/components/meals/FoodAutocomplete";

const MEAL_TYPES: { key: MealType; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "breakfast", label: "Café da Manhã", icon: <Coffee className="w-4 h-4" />, color: "text-amber-500" },
  { key: "morning_snack", label: "Lanche da Manhã", icon: <Apple className="w-4 h-4" />, color: "text-green-500" },
  { key: "lunch", label: "Almoço", icon: <Utensils className="w-4 h-4" />, color: "text-orange-500" },
  { key: "afternoon_snack", label: "Lanche da Tarde", icon: <Cookie className="w-4 h-4" />, color: "text-pink-500" },
  { key: "dinner", label: "Jantar", icon: <Moon className="w-4 h-4" />, color: "text-indigo-500" },
  { key: "evening_snack", label: "Ceia", icon: <Sun className="w-4 h-4" />, color: "text-purple-500" },
];

const DAYS = [
  { key: 0, label: "Domingo", short: "Dom" },
  { key: 1, label: "Segunda", short: "Seg" },
  { key: 2, label: "Terça", short: "Ter" },
  { key: 3, label: "Quarta", short: "Qua" },
  { key: 4, label: "Quinta", short: "Qui" },
  { key: 5, label: "Sexta", short: "Sex" },
  { key: 6, label: "Sábado", short: "Sáb" },
];

const findFoodMatch = (text: string): FoodItem | null => {
  const q = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return FOOD_DATABASE.find((f) => {
    const n = f.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return n === q || q.includes(n) || n.includes(q);
  }) || null;
};

export function ListView() {
  const { items, syncingMap, planId, addItem } = useMealPlanEditorV2Store();
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());
  const [quickAddKey, setQuickAddKey] = useState<string | null>(null);
  const [quickAddText, setQuickAddText] = useState("");

  const toggleDay = (day: number) => {
    setCollapsedDays(prev => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  };

  const getDayTotals = useCallback(
    (day: number) => {
      const dayItems = items.filter((i) => i.day_of_week === day);
      return {
        calories: dayItems.reduce((s, i) => s + (i.calories_target || 0), 0),
        protein: dayItems.reduce((s, i) => s + (Number(i.protein_target) || 0), 0),
        carbs: dayItems.reduce((s, i) => s + (Number(i.carbs_target) || 0), 0),
        fat: dayItems.reduce((s, i) => s + (Number(i.fat_target) || 0), 0),
        count: dayItems.length,
      };
    },
    [items]
  );

  const handleQuickAdd = (day: number, mealType: MealType) => {
    if (!planId || !quickAddText.trim()) return;
    const match = findFoodMatch(quickAddText.trim());
    addItem({
      meal_plan_id: planId,
      title: quickAddText.trim(),
      description: match?.portion ?? null,
      meal_type: mealType,
      day_of_week: day,
      calories_target: match?.calories ?? null,
      protein_target: match?.protein ?? null,
      carbs_target: match?.carbs ?? null,
      fat_target: match?.fat ?? null,
    });
    setQuickAddText("");
    setQuickAddKey(null);
  };

  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {DAYS.map((day) => {
        const t = getDayTotals(day.key);
        const isCollapsed = collapsedDays.has(day.key);
        const dayItems = items.filter(i => i.day_of_week === day.key);

        return (
          <motion.div
            key={day.key}
            className="glass rounded-xl overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: day.key * 0.03 }}
          >
            {/* Day Header */}
            <button
              type="button"
              onClick={() => toggleDay(day.key)}
              className="w-full flex items-center justify-between p-3 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isCollapsed
                  ? <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  : <ChevronDown className="w-4 h-4 text-primary" />}
                <span className="font-display font-bold text-sm">{day.label}</span>
                <Badge variant="outline" className="text-[9px] h-5">{t.count} itens</Badge>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-0.5"><Flame className="w-3 h-3 text-orange-400" />{t.calories}</span>
                <span className="flex items-center gap-0.5"><Beef className="w-3 h-3 text-red-400" />{t.protein.toFixed(0)}g</span>
                <span className="flex items-center gap-0.5"><Wheat className="w-3 h-3 text-amber-500" />{t.carbs.toFixed(0)}g</span>
                <span className="flex items-center gap-0.5"><Droplets className="w-3 h-3 text-blue-400" />{t.fat.toFixed(0)}g</span>
              </div>
            </button>

            {/* Day Content */}
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 space-y-3">
                    {MEAL_TYPES.map((meal) => {
                      const mealItems = dayItems.filter(i => i.meal_type === meal.key);
                      const cellKey = `${day.key}-${meal.key}`;

                      return (
                        <div key={meal.key}>
                          {/* Meal Type Header */}
                          <div className="flex items-center gap-2 mb-1.5 pl-1">
                            <span className={meal.color}>{meal.icon}</span>
                            <span className="text-xs font-semibold">{meal.label}</span>
                            {mealItems.length === 0 && (
                              <span className="text-[10px] text-muted-foreground italic">vazio</span>
                            )}
                          </div>

                          {/* Items */}
                          <div className="space-y-1 pl-6">
                            <AnimatePresence initial={false}>
                              {mealItems.map(item => (
                                <MealItemCard
                                  key={item.id}
                                  item={item}
                                  isSyncing={!!syncingMap[item.id]}
                                />
                              ))}
                            </AnimatePresence>

                            {/* Quick Add */}
                            {quickAddKey === cellKey ? (
                              <div className="flex gap-1">
                                <Input
                                  autoFocus
                                  value={quickAddText}
                                  onChange={(e) => setQuickAddText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleQuickAdd(day.key, meal.key);
                                    if (e.key === "Escape") { setQuickAddKey(null); setQuickAddText(""); }
                                  }}
                                  placeholder="Ex: 2 ovos cozidos"
                                  className="h-7 text-[11px]"
                                />
                                <Button
                                  size="icon"
                                  className="h-7 w-7 shrink-0"
                                  onClick={() => handleQuickAdd(day.key, meal.key)}
                                  disabled={!quickAddText.trim()}
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => { setQuickAddKey(cellKey); setQuickAddText(""); }}
                                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary py-1 px-2 rounded border border-dashed border-border hover:border-primary transition-colors"
                              >
                                <Plus className="w-3 h-3" /> Adicionar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Day Macro Bar */}
                    <div className="pt-2 border-t border-border/50">
                      <MacroBalanceBar protein={t.protein} carbs={t.carbs} fat={t.fat} calories={t.calories} compact />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
