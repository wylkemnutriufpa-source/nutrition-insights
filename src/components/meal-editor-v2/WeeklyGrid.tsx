import { useState, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Coffee, Apple, Utensils, Cookie, Moon, Sun,
  Plus, Check, ArrowLeftRight, Search,
  Flame, Beef, Wheat, Droplets, Zap, Bookmark,
  Copy, ClipboardPaste, MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import { DayTabs } from "./DayTabs";
import { DayContent } from "./DayContent";

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
  const { items, syncingMap, planId, plan, addItem, swapCells, clipboardItems, copyCell, pasteToCell, substitutionCount, updatePlan } = useMealPlanEditorV2Store();

  const isWeeklyMode = (plan as any)?.plan_mode === "weekly";
  const [selectedDay, setSelectedDay] = useState(1); // Default to Monday

  // No modo semanal, usamos o selectedDay. No modo template, usamos 0.
  const effectiveDay = isWeeklyMode ? selectedDay : 0;
  const effectiveDayLabel = DAYS.find(d => d.key === effectiveDay)?.label || "Template";

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
  const [lastSyncedTotals, setLastSyncedTotals] = useState("");

  const weekTotals = useCallback(() => {
    let totalCals = 0;
    let totalProt = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    
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
        {isWeeklyMode && (
          <div className="mb-6 px-4 py-3 bg-card border border-border rounded-2xl shadow-sm">
            <DayTabs 
              selectedDay={selectedDay} 
              onSelectDay={setSelectedDay}
              getDayCount={(d) => items.filter(i => i.day_of_week === d).length}
            />
          </div>
        )}

        {/* Day headers */}
        <div className="grid grid-cols-[160px_1fr] gap-4 mb-6 sticky top-0 z-20 bg-background/80 backdrop-blur-md pb-4 border-b border-primary/10">
          <div className="glass rounded-xl p-4 flex items-center bg-primary/5">
            <span className="font-display text-sm font-bold text-primary tracking-wider uppercase">REFEIÇÃO</span>
          </div>
          <div className="glass rounded-xl p-4 flex items-center justify-between bg-primary/5">
            <div>
              <span className="font-display text-sm font-bold text-primary tracking-wider uppercase">
                {effectiveDay === 0 ? "TEMPLATE DE DIA PADRÃO" : `${effectiveDayLabel.toUpperCase()}`}
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {effectiveDay === 0
                  ? `Modelo de Plano Único com ${substitutionCount} substituições disponíveis por refeição.`
                  : `Plano personalizado para o dia de ${effectiveDayLabel}.`}
              </p>
            </div>
            {(() => {
              const t = getDayTotals(effectiveDay);
              return (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center px-3 py-1 bg-background rounded-lg border border-primary/10 shadow-sm">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold">Kcal</span>
                    <span className="text-xs font-bold text-orange-500">{Math.round(t.calories)}</span>
                  </div>
                  <div className="flex flex-col items-center px-3 py-1 bg-background rounded-lg border border-primary/10 shadow-sm">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold">Prot</span>
                    <span className="text-xs font-bold text-red-500">{t.protein.toFixed(0)}g</span>
                  </div>
                  <div className="flex flex-col items-center px-3 py-1 bg-background rounded-lg border border-primary/10 shadow-sm">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold">Carb</span>
                    <span className="text-xs font-bold text-amber-500">{t.carbs.toFixed(0)}g</span>
                  </div>
                  <div className="flex flex-col items-center px-3 py-1 bg-background rounded-lg border border-primary/10 shadow-sm">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold">Gord</span>
                    <span className="text-xs font-bold text-blue-500">{t.fat.toFixed(0)}g</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Meal rows or Day Content */}
        {isWeeklyMode ? (
          <div className="px-1">
            <DayContent day={selectedDay} />
          </div>
        ) : (
          MEAL_TYPES.map((meal) => (
            <div key={meal.key} className="grid grid-cols-[160px_1fr] gap-4 mb-4">
              {/* Row label */}
              <div className="glass rounded-xl p-4 flex flex-col justify-center border-l-4 border-primary/30 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl bg-primary/10 ${meal.color} shadow-inner`}>
                    {meal.icon}
                  </div>
                  <div>
                    <span className="font-display text-[13px] font-bold block text-foreground tracking-tight">{meal.label}</span>
                    <span className="text-[10px] text-muted-foreground/80 font-medium">Principal + {substitutionCount} Substs</span>
                  </div>
                </div>
              </div>

              {/* Day cell (Day 0 only) */}
              {(() => {
                const day = effectiveDay;
                const cellItems = getItems(day, meal.key);
                const cellKey = `${day}-${meal.key}`;
                const isDragSrc = dragSource?.day === day && dragSource?.mealType === meal.key;
                const isDragOvr = dragOver?.day === day && dragOver?.mealType === meal.key;

                return (
                  <div
                    key={day}
                    draggable={cellItems.length > 0}
                    onDragStart={(e) => {
                      setDragSource({ day, mealType: meal.key });
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", cellKey);
                    }}
                    onDragEnd={() => { setDragSource(null); setDragOver(null); }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      const hasExternalItem = Array.from(e.dataTransfer.types).includes("application/json");
                      e.dataTransfer.dropEffect = hasExternalItem ? "copy" : "move";
                      if (!isDragOvr) setDragOver({ day, mealType: meal.key });
                    }}
                    onDragLeave={() => { if (isDragOvr) setDragOver(null); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const draggedItem = parseDraggedVisualLibraryData(e.dataTransfer.getData("application/json"));

                      if (draggedItem && planId) {
                        addItem(buildVisualLibraryMealInsert({
                          planId,
                          day,
                          mealType: meal.key,
                          item: draggedItem,
                        }));
                      } else if (dragSource && !(dragSource.day === day && dragSource.mealType === meal.key)) {
                        swapCells(dragSource.day, dragSource.mealType, day, meal.key);
                      }
                      setDragOver(null);
                      setDragSource(null);
                    }}
                    className={`glass rounded-2xl p-5 min-h-[160px] flex flex-col group relative transition-all duration-300 shadow-sm border border-primary/5 bg-gradient-to-br from-background via-background to-primary/[0.03] ${
                      isDragSrc ? "opacity-50 scale-95 border-primary/50" : ""
                    } ${isDragOvr ? "ring-2 ring-primary/60 bg-primary/5 scale-[1.01]" : "hover:border-primary/20 hover:shadow-md"
                    } ${cellItems.length > 0 ? "cursor-grab active:cursor-grabbing" : ""}`}
                  >
                    {/* Drag handle */}
                    {cellItems.length > 0 && (
                      <div className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all flex gap-1 z-20">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); copyCell(day, meal.key); toast.success("Refeição copiada"); }}
                          className="p-1.5 rounded-lg bg-secondary/90 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors shadow-sm"
                          title="Copiar Refeição"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openSaveTemplate(day, meal.key); }}
                          className="p-1.5 rounded-lg bg-secondary/90 hover:bg-accent/50 text-muted-foreground shadow-sm"
                          title="Salvar como modelo"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    {clipboardItems && clipboardItems.length > 0 && (
                      <div className={`absolute top-2 left-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all z-20`}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); pasteToCell(day, meal.key); toast.success("Refeição colada"); }}
                          className="p-1.5 rounded-lg bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 shadow-sm"
                          title="Colar Refeição aqui"
                        >
                          <ClipboardPaste className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {isDragOvr && dragSource && (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-2xl z-10 pointer-events-none backdrop-blur-[1px]">
                        <span className="text-xs font-bold text-primary flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full shadow-sm">
                          <ArrowLeftRight className="w-4 h-4" /> Trocar
                        </span>
                      </div>
                    )}

                    {/* Items */}
                    <div className="flex-1 space-y-2">
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
                    <div onClick={(e) => e.stopPropagation()} className="mt-4 pt-3 border-t border-primary/5">
                      <div className="space-y-2">
                        {quickAddKey === cellKey && (
                          <div className="flex gap-1.5 animate-in slide-in-from-top-1 duration-200">
                            <Input
                              autoFocus
                              value={quickAddText}
                              onChange={(e) => setQuickAddText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleQuickAdd(day, meal.key);
                                if (e.key === "Escape") { setQuickAddKey(null); setQuickAddText(""); }
                              }}
                              placeholder="Ex: 2 ovos cozidos"
                              className="h-8 text-xs rounded-xl"
                            />
                            <Button
                              size="icon"
                              className="h-8 w-8 shrink-0 rounded-xl"
                              onClick={() => handleQuickAdd(day, meal.key)}
                              disabled={!quickAddText.trim()}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setQuickAddKey(quickAddKey === cellKey ? null : cellKey);
                              setQuickAddText("");
                              setFoodSearchKey(null);
                            }}
                            className={`flex items-center gap-1 text-[10px] py-1.5 px-3 rounded-xl border transition-all ${
                              quickAddKey === cellKey
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-dashed border-primary/20 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5"
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
                            className={`flex items-center gap-1 text-[10px] py-1.5 px-3 rounded-xl border transition-all ${
                              foodSearchKey === cellKey
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-dashed border-primary/20 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5"
                            }`}
                          >
                            <Search className="w-3 h-3" /> Alimento
                          </button>
                          <button
                            type="button"
                            onClick={() => openLibrary(day, meal.key)}
                            className="flex items-center gap-1 text-[10px] py-1.5 px-3 rounded-xl border border-dashed border-primary/20 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                          >
                            <Plus className="w-3 h-3" /> Biblioteca
                          </button>
                        </div>

                        {foodSearchKey === cellKey && (
                          <div className="animate-in slide-in-from-bottom-2 duration-300">
                            <FoodSearchInline 
                              day={day} 
                              mealType={meal.key} 
                              onClose={() => setFoodSearchKey(null)} 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ))
        )}
      </div>

      <MealLibrarySidebar
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        targetDay={libraryTarget.day}
        targetMealType={libraryTarget.mealType}
      />
      <MealLibraryModal
        open={mlModalOpen}
        onOpenChange={setMlModalOpen}
        targetDay={mlModalTarget.day}
        targetMealType={mlModalTarget.mealType}
      />
      <SaveTemplateDialog
        open={saveTemplateOpen}
        onOpenChange={setSaveTemplateOpen}
        items={saveTemplateItems}
        mealType={saveTemplateMealType}
      />
    </>
  );
}
