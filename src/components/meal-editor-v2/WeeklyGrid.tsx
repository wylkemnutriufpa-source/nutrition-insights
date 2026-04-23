import { useState, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Coffee, Apple, Utensils, Cookie, Moon, Sun,
  Plus, Check, ArrowLeftRight, Search,
  Flame, Beef, Wheat, Droplets, Zap, Bookmark,
  Copy, ClipboardPaste, MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useMealPlanEditorV2Store, type MealType, type MealPlanItem } from "@/stores/mealPlanEditorV2Store";
import { MealItemCard } from "./MealItemCard";
import { DayBlockActions } from "./DayBlockActions";
import { MealLibrarySidebar } from "./MealLibrarySidebar";
import { MealLibraryModal } from "./MealLibraryModal";
import { SaveTemplateDialog } from "./SaveTemplateDialog";
import MacroBalanceBar from "@/components/meals/MacroBalanceBar";
import { FOOD_DATABASE } from "@/components/meals/FoodAutocomplete";
import type { FoodItem } from "@/components/meals/FoodAutocomplete";
import FoodSearchInline from "@/components/hybrid-builder/FoodSearchInline";
import { buildVisualLibraryMealInsert, parseDraggedVisualLibraryData } from "@/lib/mealEditorVisualInsert";

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
  const { items, syncingMap, planId, addItem, swapCells, clipboardItems, copyCell, pasteToCell } = useMealPlanEditorV2Store();

  // Quick-add state
  const [quickAddKey, setQuickAddKey] = useState<string | null>(null);
  const [quickAddText, setQuickAddText] = useState("");
  const [foodSearchKey, setFoodSearchKey] = useState<string | null>(null);

  // Drag state
  const [dragSource, setDragSource] = useState<{ day: number; mealType: MealType } | null>(null);
  const [dragOver, setDragOver] = useState<{ day: number; mealType: MealType } | null>(null);

  // Library sidebar
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryTarget, setLibraryTarget] = useState<{ day: number; mealType: MealType }>({ day: 1, mealType: "breakfast" });

  // Save template dialog
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [saveTemplateItems, setSaveTemplateItems] = useState<MealPlanItem[]>([]);
  const [saveTemplateMealType, setSaveTemplateMealType] = useState<MealType>("breakfast");

  // Meal Library Modal (banco de refeições)
  const [mlModalOpen, setMlModalOpen] = useState(false);
  const [mlModalTarget, setMlModalTarget] = useState<{ day: number; mealType: MealType }>({ day: 1, mealType: "breakfast" });

  const openMealLibraryModal = (day: number, mealType: MealType) => {
    setMlModalTarget({ day, mealType });
    setMlModalOpen(true);
  };

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

  // Auto-sync plan totals when items change
  const { updatePlan, plan } = useMealPlanEditorV2Store();
  const [lastSyncedTotals, setLastSyncedTotals] = useState("");

  const weekTotals = useCallback(() => {
    // We calculate a "daily average" or a specific target. 
    // Usually total_calories in meal_plans is the average or the target for one day.
    // Let's use Monday (day 1) as the baseline or average of all days.
    let totalCals = 0;
    let totalProt = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    
    // Average of days that have items
    const daysWithItems = [0, 1, 2, 3, 4, 5, 6].filter(d => items.some(i => i.day_of_week === d));
    if (daysWithItems.length > 0) {
      daysWithItems.forEach(d => {
        const t = getDayTotals(d);
        totalCals += t.calories;
        totalProt += t.protein;
        totalCarbs += t.carbs;
        totalFat += t.fat;
      });
      totalCals /= daysWithItems.length;
      totalProt /= daysWithItems.length;
      totalCarbs /= daysWithItems.length;
      totalFat /= daysWithItems.length;
    }

    return {
      calories: Math.round(totalCals),
      protein: Math.round(totalProt),
      carbs: Math.round(totalCarbs),
      fat: Math.round(totalFat)
    };
  }, [items, getDayTotals]);

  useEffect(() => {
    if (!planId) return;
    const t = weekTotals();
    const totalsStr = JSON.stringify(t);
    if (totalsStr !== lastSyncedTotals) {
      updatePlan({
        total_calories: t.calories,
        total_protein: t.protein,
        total_carbs: t.carbs,
        total_fat: t.fat
      });
      setLastSyncedTotals(totalsStr);
    }
  }, [items, planId, updatePlan, weekTotals, lastSyncedTotals]);

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

  const openLibrary = (day: number, mealType: MealType) => {
    setLibraryTarget({ day, mealType });
    setLibraryOpen(true);
  };

  const openSaveTemplate = (day: number, mealType: MealType) => {
    const cellItems = getItems(day, mealType);
    if (cellItems.length === 0) return;
    setSaveTemplateItems(cellItems);
    setSaveTemplateMealType(mealType);
    setSaveTemplateOpen(true);
  };

  return (
    <>
      <div className="overflow-x-auto">
        {/* Day headers */}
        <div className="grid grid-cols-[160px_repeat(7,1fr)] gap-1 mb-1 sticky top-0 z-20 bg-background pb-1">
          <div className="glass rounded-lg p-3 flex items-center">
            <span className="font-display text-xs font-bold text-primary">REFEIÇÃO</span>
          </div>
          {DAYS.map((day) => {
            const t = getDayTotals(day.key);
            return (
              <div key={day.key} className="glass rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="font-display text-xs font-bold">{day.short}</span>
                  <DayBlockActions dayKey={day.key} dayLabel={day.label} />
                </div>
                {/* HUD nutricional compacto */}
                <div className="flex flex-wrap justify-center gap-x-2 gap-y-0.5 mt-1 text-[9px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Flame className="w-2.5 h-2.5 text-orange-400" />
                    {plan?.totals_status === "incomplete" && t.calories === 0 ? "..." : (isNaN(t.calories) ? "—" : t.calories)}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Beef className="w-2.5 h-2.5 text-red-400" />
                    {plan?.totals_status === "incomplete" && t.protein === 0 ? "..." : (isNaN(t.protein) ? "—" : t.protein.toFixed(0))}g
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Wheat className="w-2.5 h-2.5 text-amber-500" />
                    {plan?.totals_status === "incomplete" && t.carbs === 0 ? "..." : (isNaN(t.carbs) ? "—" : t.carbs.toFixed(0))}g
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Droplets className="w-2.5 h-2.5 text-blue-400" />
                    {plan?.totals_status === "incomplete" && t.fat === 0 ? "..." : (isNaN(t.fat) ? "—" : t.fat.toFixed(0))}g
                  </span>
                </div>

              </div>
            );
          })}
        </div>

        {/* Meal rows */}
        {MEAL_TYPES.map((meal) => (
          <div key={meal.key} className="grid grid-cols-[160px_repeat(7,1fr)] gap-1 mb-1">
            {/* Row label */}
            <div className="glass rounded-lg p-3 flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className={meal.color}>{meal.icon}</span>
                <span className="font-display text-[11px] font-semibold">{meal.label}</span>
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
                    const hasExternalItem = Array.from(e.dataTransfer.types).includes("application/json");
                    e.dataTransfer.dropEffect = hasExternalItem ? "copy" : "move";
                    if (!isDragOvr) setDragOver({ day: day.key, mealType: meal.key });
                  }}
                  onDragLeave={() => { if (isDragOvr) setDragOver(null); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const draggedItem = parseDraggedVisualLibraryData(e.dataTransfer.getData("application/json"));

                    if (draggedItem && planId) {
                      addItem(buildVisualLibraryMealInsert({
                        planId,
                        day: day.key,
                        mealType: meal.key,
                        item: draggedItem,
                      }));
                    } else if (dragSource && !(dragSource.day === day.key && dragSource.mealType === meal.key)) {
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
                    <div className="absolute top-1 right-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex gap-0.5 z-20">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); copyCell(day.key, meal.key); toast.success("Refeição copiada para a área de transferência"); }}
                        className="p-1 rounded bg-secondary/80 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                        title="Copiar Refeição"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openSaveTemplate(day.key, meal.key); }}
                        className="p-1 rounded bg-secondary/80 hover:bg-accent/50 text-muted-foreground"
                        title="Salvar como modelo"
                      >
                        <Bookmark className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  {clipboardItems && clipboardItems.length > 0 && (
                    <div className={`absolute top-1 left-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-20`}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); pasteToCell(day.key, meal.key); toast.success("Refeição colada com sucesso"); }}
                        className="p-1 rounded bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30"
                        title="Colar Refeição aqui"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                      </button>
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

                  {/* Quick-add & Library */}
                  <div onClick={(e) => e.stopPropagation()} className="mt-1">
                    <div className="space-y-1">
                      {quickAddKey === cellKey && (
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
                      )}

                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setQuickAddKey(quickAddKey === cellKey ? null : cellKey);
                            setQuickAddText("");
                            setFoodSearchKey(null);
                          }}
                          className={`flex items-center justify-center gap-1 text-[10px] py-1 rounded border transition-colors ${
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
                          className={`flex items-center justify-center gap-1 text-[10px] py-1 rounded border transition-colors ${
                            foodSearchKey === cellKey
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary"
                          }`}
                        >
                          <Search className="w-3 h-3" /> Alimento
                        </button>
                        <button
                          type="button"
                          onClick={() => openMealLibraryModal(day.key, meal.key)}
                          className="flex items-center justify-center gap-1 text-[10px] py-1 rounded border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary"
                          title="Substituir pela biblioteca"
                        >
                          <Utensils className="w-3 h-3" /> Subst.
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-1">
                        <button
                          type="button"
                          onClick={() => openLibrary(day.key, meal.key)}
                          className="flex items-center justify-center gap-1 text-[10px] py-1 rounded border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary"
                          title="Meus Modelos"
                        >
                          <Zap className="w-3 h-3" /> Modelos
                        </button>
                      </div>

                      {foodSearchKey === cellKey && (
                        <FoodSearchInline day={day.key} mealType={meal.key} onClose={() => setFoodSearchKey(null)} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Day totals */}
        <div className="grid grid-cols-[160px_repeat(7,1fr)] gap-1 mt-2">
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

      {/* Library sidebar */}
      <MealLibrarySidebar
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        targetDay={libraryTarget.day}
        targetMealType={libraryTarget.mealType}
      />

      {/* Save template dialog */}
      <SaveTemplateDialog
        open={saveTemplateOpen}
        onOpenChange={setSaveTemplateOpen}
        items={saveTemplateItems}
        mealType={saveTemplateMealType}
      />

      {/* Meal Library Modal (banco de refeições) */}
      <MealLibraryModal
        open={mlModalOpen}
        onOpenChange={setMlModalOpen}
        targetDay={mlModalTarget.day}
        targetMealType={mlModalTarget.mealType}
      />
    </>
  );
}
