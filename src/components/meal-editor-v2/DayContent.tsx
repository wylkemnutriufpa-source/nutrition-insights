import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Coffee, Apple, Utensils, Cookie, Moon, Sun,
  Plus, Check, Flame, Beef, Wheat, Droplets, Search, ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMealPlanEditorV2Store, type MealType, type MealPlanItem } from "@/stores/mealPlanEditorV2Store";
import { MealItemCard } from "./MealItemCard";
import MacroBalanceBar from "@/components/meals/MacroBalanceBar";
import { FOOD_DATABASE } from "@/components/meals/FoodAutocomplete";
import type { FoodItem } from "@/components/meals/FoodAutocomplete";
import FoodSearchInline from "@/components/hybrid-builder/FoodSearchInline";
import { MealLibraryModal } from "./MealLibraryModal";
import { buildVisualLibraryMealInsert, parseDraggedVisualLibraryData } from "@/lib/mealEditorVisualInsert";
import { toast } from "sonner";

const MEAL_TYPES: { key: MealType; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "breakfast", label: "Café da Manhã", icon: <Coffee className="w-4 h-4" />, color: "text-amber-500" },
  { key: "morning_snack", label: "Lanche da Manhã", icon: <Apple className="w-4 h-4" />, color: "text-green-500" },
  { key: "lunch", label: "Almoço", icon: <Utensils className="w-4 h-4" />, color: "text-orange-500" },
  { key: "afternoon_snack", label: "Lanche da Tarde", icon: <Cookie className="w-4 h-4" />, color: "text-pink-500" },
  { key: "dinner", label: "Jantar", icon: <Moon className="w-4 h-4" />, color: "text-indigo-500" },
  { key: "evening_snack", label: "Ceia", icon: <Sun className="w-4 h-4" />, color: "text-purple-500" },
];

const findFoodMatch = (text: string): FoodItem | null => {
  const q = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return FOOD_DATABASE.find((f) => {
    const n = f.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return n === q || q.includes(n) || n.includes(q);
  }) || null;
};

interface Props {
  day: number;
}

export function DayContent({ day }: Props) {
  const { items, syncingMap, planId, addItem } = useMealPlanEditorV2Store();
  const [quickAddKey, setQuickAddKey] = useState<string | null>(null);
  const [quickAddText, setQuickAddText] = useState("");
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [foodSearchKey, setFoodSearchKey] = useState<string | null>(null);
  const [libraryMealType, setLibraryMealType] = useState<MealType>("breakfast");
  const [libraryOpen, setLibraryOpen] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent, mealType: MealType) => {
    e.preventDefault();
    setDragOverKey(null);
    if (!planId) return;

    const draggedItem = parseDraggedVisualLibraryData(e.dataTransfer.getData("application/json"));
    if (!draggedItem) return;

    addItem(buildVisualLibraryMealInsert({
      planId,
      day,
      mealType,
      item: draggedItem,
    }));
    toast.success(`${draggedItem.title || draggedItem.name || "Refeição"} adicionada!`);
  }, [planId, day, addItem]);

  const handleDragOver = useCallback((e: React.DragEvent, cellKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverKey(cellKey);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the container (not entering a child)
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverKey(null);
  }, []);

  const dayItems = items.filter(i => i.day_of_week === day);

  const totals = {
    calories: dayItems.reduce((s, i) => s + (i.calories_target || 0), 0),
    protein: dayItems.reduce((s, i) => s + (Number(i.protein_target) || 0), 0),
    carbs: dayItems.reduce((s, i) => s + (Number(i.carbs_target) || 0), 0),
    fat: dayItems.reduce((s, i) => s + (Number(i.fat_target) || 0), 0),
  };

  const handleQuickAdd = (mealType: MealType) => {
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
    <motion.div
      key={day}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-3"
    >
      {/* Day Summary Bar */}
      <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-secondary/30 text-[10px] text-muted-foreground">
        <span>{dayItems.length} itens</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-0.5"><Flame className="w-3 h-3 text-orange-400" />{totals.calories} kcal</span>
          <span className="flex items-center gap-0.5"><Beef className="w-3 h-3 text-red-400" />{totals.protein.toFixed(0)}g</span>
          <span className="flex items-center gap-0.5"><Wheat className="w-3 h-3 text-amber-500" />{totals.carbs.toFixed(0)}g</span>
          <span className="flex items-center gap-0.5"><Droplets className="w-3 h-3 text-blue-400" />{totals.fat.toFixed(0)}g</span>
        </div>
      </div>

      {/* Meal Sections */}
      {MEAL_TYPES.map((meal) => {
        const mealItems = dayItems.filter(i => i.meal_type === meal.key);
        const cellKey = `${day}-${meal.key}`;

        return (
          <div
            key={meal.key}
            className={`glass rounded-xl p-3 transition-all duration-200 ${
              dragOverKey === cellKey
                ? "ring-2 ring-primary bg-primary/5 scale-[1.01]"
                : ""
            }`}
            onDragOver={(e) => handleDragOver(e, cellKey)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, meal.key)}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={meal.color}>{meal.icon}</span>
              <span className="text-xs font-semibold">{meal.label}</span>
              {mealItems.length === 0 && (
                <span className="text-[10px] text-muted-foreground italic">vazio</span>
              )}
            </div>

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

              <div className="space-y-1.5">
                {quickAddKey === cellKey && (
                  <div className="flex gap-1">
                    <Input
                      autoFocus
                      value={quickAddText}
                      onChange={(e) => setQuickAddText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleQuickAdd(meal.key);
                        if (e.key === "Escape") { setQuickAddKey(null); setQuickAddText(""); }
                      }}
                      placeholder="Ex: 2 ovos cozidos"
                      className="h-7 text-[11px]"
                    />
                    <Button
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => handleQuickAdd(meal.key)}
                      disabled={!quickAddText.trim()}
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickAddKey(quickAddKey === cellKey ? null : cellKey);
                      setQuickAddText("");
                      setFoodSearchKey(null);
                    }}
                    className={`flex items-center gap-1 text-[10px] py-1 px-2 rounded border transition-colors ${
                      quickAddKey === cellKey
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary"
                    }`}
                  >
                    <Plus className="w-3 h-3" /> Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFoodSearchKey(foodSearchKey === cellKey ? null : cellKey);
                      setQuickAddKey(null);
                      setQuickAddText("");
                    }}
                    className={`flex items-center gap-1 text-[10px] py-1 px-2 rounded border transition-colors ${
                      foodSearchKey === cellKey
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary"
                    }`}
                  >
                    <Search className="w-3 h-3" /> Alimento
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLibraryMealType(meal.key);
                      setLibraryOpen(true);
                      setQuickAddKey(null);
                      setQuickAddText("");
                      setFoodSearchKey(null);
                    }}
                    className="flex items-center gap-1 text-[10px] py-1 px-2 rounded border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                  >
                    <ArrowLeftRight className="w-3 h-3" /> Substituir
                  </button>
                </div>

                {foodSearchKey === cellKey && (
                  <FoodSearchInline day={day} mealType={meal.key} onClose={() => setFoodSearchKey(null)} />
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Macro Balance */}
      <div className="pt-2">
        <MacroBalanceBar protein={totals.protein} carbs={totals.carbs} fat={totals.fat} calories={totals.calories} compact />
      </div>

      <MealLibraryModal
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        targetDay={day}
        targetMealType={libraryMealType}
      />
    </motion.div>
  );
}
