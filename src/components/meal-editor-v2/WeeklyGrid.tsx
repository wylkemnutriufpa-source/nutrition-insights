import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Coffee, Apple, Utensils, Cookie, Moon, Sun,
  Plus, Check, Loader2, ArrowLeftRight,
  Flame, Beef, Wheat, Droplets, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function WeeklyGrid() {
  const { items, syncingMap, planId, addItem, swapCells, deleteItem } = useMealPlanEditorV2Store();

  // Quick-add state
  const [quickAddKey, setQuickAddKey] = useState<string | null>(null);
  const [quickAddText, setQuickAddText] = useState("");

  // Drag state
  const [dragSource, setDragSource] = useState<{ day: number; mealType: MealType } | null>(null);
  const [dragOver, setDragOver] = useState<{ day: number; mealType: MealType } | null>(null);

  const getItems = useCallback(
    (day: number, mealType: MealType) =>
      items.filter((i) => i.day_of_week === day && i.meal_type === mealType),
    [items]
  );

  const getDayTotals = useCallback(
    (day: number) => {
      const dayItems = items.filter((i) => i.day_of_week === day);
      return {
        calories: dayItems.reduce((s, i) => s + (i.calories_target || 0), 0),
        protein: dayItems.reduce((s, i) => s + (Number(i.protein_target) || 0), 0),
        carbs: dayItems.reduce((s, i) => s + (Number(i.carbs_target) || 0), 0),
        fat: dayItems.reduce((s, i) => s + (Number(i.fat_target) || 0), 0),
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

  const handleDeleteDay = (day: number) => {
    const dayItems = items.filter((i) => i.day_of_week === day);
    dayItems.forEach((item) => deleteItem(item.id));
  };

  return (
    <div className="overflow-x-auto">
      {/* Day headers */}
      <div className="grid grid-cols-[180px_repeat(7,1fr)] gap-1 mb-1 sticky top-0 z-20 bg-background pb-1">
        <div className="glass rounded-lg p-3 flex items-center">
          <span className="font-display text-xs font-bold text-primary">REFEIÇÃO</span>
        </div>
        {DAYS.map((day) => (
          <div key={day.key} className="glass rounded-lg p-2 text-center">
            <div className="font-display text-xs font-bold">{day.short}</div>
            <div className="text-[10px] text-muted-foreground">{day.label}</div>
            <div className="flex justify-center mt-1 gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5"
                onClick={() => handleDeleteDay(day.key)}
                title="Limpar dia"
              >
                <Trash2 className="w-3 h-3 text-muted-foreground" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Meal rows */}
      {MEAL_TYPES.map((meal) => (
        <div key={meal.key} className="grid grid-cols-[180px_repeat(7,1fr)] gap-1 mb-1">
          {/* Row label */}
          <div className="glass rounded-lg p-3 flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className={meal.color}>{meal.icon}</span>
              <span className="font-display text-xs font-semibold">{meal.label}</span>
            </div>
          </div>

          {/* Day cells */}
          {DAYS.map((day) => {
            const cellItems = getItems(day.key, meal.key);
            const cellKey = `${day.key}-${meal.key}`;
            const isDragSrc = dragSource?.day === day.key && dragSource?.mealType === meal.key;
            const isDragOvr = dragOver?.day === day.key && dragOver?.mealType === meal.key;

            return (
              <div
                key={day.key}
                draggable={cellItems.length > 0}
                onDragStart={(e) => {
                  setDragSource({ day: day.key, mealType: meal.key });
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", cellKey);
                }}
                onDragEnd={() => { setDragSource(null); setDragOver(null); }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (!isDragOvr) setDragOver({ day: day.key, mealType: meal.key });
                }}
                onDragLeave={() => { if (isDragOvr) setDragOver(null); }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragSource && !(dragSource.day === day.key && dragSource.mealType === meal.key)) {
                    swapCells(dragSource.day, dragSource.mealType, day.key, meal.key);
                  }
                  setDragOver(null);
                  setDragSource(null);
                }}
                className={`glass rounded-lg p-2 min-h-[100px] flex flex-col group relative transition-all duration-200 ${
                  isDragSrc ? "opacity-50 scale-95 border-primary/50" : ""
                } ${isDragOvr ? "ring-2 ring-primary/60 bg-primary/5 scale-[1.02]" : "hover:border-primary/30"
                } ${cellItems.length > 0 ? "cursor-grab active:cursor-grabbing" : ""}`}
              >
                {/* Drag handle */}
                {cellItems.length > 0 && (
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-60 transition-opacity">
                    <ArrowLeftRight className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
                {isDragOvr && dragSource && (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-lg z-10 pointer-events-none">
                    <span className="text-[10px] font-semibold text-primary flex items-center gap-1">
                      <ArrowLeftRight className="w-3.5 h-3.5" /> Trocar
                    </span>
                  </div>
                )}

                {/* Items */}
                <div className="flex-1 space-y-1.5">
                  <AnimatePresence initial={false}>
                    {cellItems.map((item) => (
                      <MealItemCard
                        key={item.id}
                        item={item}
                        isSyncing={!!syncingMap[item.id]}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {/* Quick-add */}
                <div onClick={(e) => e.stopPropagation()} className="mt-1">
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
                      className="w-full flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-primary py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity border border-dashed border-border hover:border-primary"
                    >
                      <Plus className="w-3 h-3" /> Adicionar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Day totals */}
      <div className="grid grid-cols-[180px_repeat(7,1fr)] gap-1 mt-2">
        <div className="glass rounded-lg p-3 flex items-center">
          <span className="font-display text-xs font-bold text-primary">TOTAL DIÁRIO</span>
        </div>
        {DAYS.map((day) => {
          const t = getDayTotals(day.key);
          return (
            <div key={day.key} className="glass rounded-lg p-2 border-primary/20">
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div className="flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-400" />
                  <span className="font-semibold">{t.calories}</span>
                  <span className="text-muted-foreground">kcal</span>
                </div>
                <div className="flex items-center gap-1">
                  <Beef className="w-3 h-3 text-red-400" />
                  <span className="font-semibold">{t.protein.toFixed(0)}g</span>
                  <span className="text-muted-foreground">prot</span>
                </div>
                <div className="flex items-center gap-1">
                  <Wheat className="w-3 h-3 text-amber-500" />
                  <span className="font-semibold">{t.carbs.toFixed(0)}g</span>
                  <span className="text-muted-foreground">carb</span>
                </div>
                <div className="flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-blue-400" />
                  <span className="font-semibold">{t.fat.toFixed(0)}g</span>
                  <span className="text-muted-foreground">gord</span>
                </div>
              </div>
              <div className="mt-1.5">
                <MacroBalanceBar protein={t.protein} carbs={t.carbs} fat={t.fat} calories={t.calories} compact />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
