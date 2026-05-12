import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMealPlanEditorV2Store, type MealType } from "@/stores/mealPlanEditorV2Store";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, Coffee, Apple, Utensils, Cookie, Moon, Sun,
  Flame, Beef, Wheat, Droplets, Plus, Loader2, RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";
import { fmtMacro, safeNum } from "@/lib/formatMacros";

// ── Types ───────────────────────────────────────────────────
interface MealLibraryItem {
  id: string;
  title: string;
  meal_type: string;
  goal_tag: string;
  clinical_tags: string[];
  base_calories: number;
  protein: number;
  carbs: number;
  fat: number;
  foods: { name: string; portion: string }[];
  substitutions: { replace: string; options: string[] }[];
}

interface MealLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetDay: number;
  targetMealType: MealType;
  patientTargetKcal?: number | null;
}

// ── Constants ───────────────────────────────────────────────
const MEAL_TABS: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "breakfast", label: "Café", icon: <Coffee className="w-3.5 h-3.5" /> },
  { key: "morning_snack", label: "Lanche M", icon: <Apple className="w-3.5 h-3.5" /> },
  { key: "lunch", label: "Almoço", icon: <Utensils className="w-3.5 h-3.5" /> },
  { key: "afternoon_snack", label: "Lanche T", icon: <Cookie className="w-3.5 h-3.5" /> },
  { key: "dinner", label: "Jantar", icon: <Moon className="w-3.5 h-3.5" /> },
  { key: "evening_snack", label: "Ceia", icon: <Sun className="w-3.5 h-3.5" /> },
];

const GOAL_OPTIONS = [
  { key: "all", label: "Todos" },
  { key: "weight_loss", label: "Emagrecimento" },
  { key: "hypertrophy", label: "Hipertrofia" },
  { key: "low_carb", label: "Low Carb" },
  { key: "metabolic", label: "Metabólico" },
  { key: "functional", label: "Funcional" },
  { key: "maintenance", label: "Manutenção" },
];

const CLINICAL_FILTERS = [
  "anti_inflamatorio", "intestinal", "diabetes", "hormonal",
  "cardiovascular", "detox", "saciedade", "sono",
];

// ── Component ───────────────────────────────────────────────
export function MealLibraryModal({
  open, onOpenChange, targetDay, targetMealType, patientTargetKcal,
}: MealLibraryModalProps) {
  const { planId, addItems, addItem, items: storeItems, deleteItemsInCell } = useMealPlanEditorV2Store();
  const [items, setItems] = useState<MealLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [mealTab, setMealTab] = useState<string>(targetMealType);
  const [goalFilter, setGoalFilter] = useState("all");
  const [clinicalFilter, setClinicalFilter] = useState<string | null>(null);

  // Sync tab with prop
  useEffect(() => { setMealTab(targetMealType); }, [targetMealType]);

  // Fetch all active meal_library items (once)
  useEffect(() => {
    if (!open) return;
    if (items.length > 0) return; // cache
    setLoading(true);
    supabase
      .from("meal_library" as any)
      .select("*")
      .eq("is_active", true)
      .order("title")
      .then(({ data }: any) => {
        setItems((data || []) as MealLibraryItem[]);
        setLoading(false);
      });
  }, [open, items.length]);

  // Filter logic
  const filtered = useMemo(() => {
    let list = items.filter((i) => i.meal_type === mealTab);
    if (goalFilter !== "all") list = list.filter((i) => i.goal_tag === goalFilter);
    if (clinicalFilter) list = list.filter((i) =>
      Array.isArray(i.clinical_tags) && i.clinical_tags.includes(clinicalFilter)
    );
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        i.title.toLowerCase().includes(q) ||
        i.foods?.some((f) => f.name?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [items, mealTab, goalFilter, clinicalFilter, search]);

  // ── Insert handler with caloric scaling ───────────────────
  const handleInsert = useCallback((meal: MealLibraryItem) => {
    if (!planId) return;

    // Calculate scale factor if patient has a target
    let scaleFactor = 1;
    if (patientTargetKcal && meal.base_calories > 0) {
      const mealShare: Record<string, number> = {
        breakfast: 0.25, morning_snack: 0.10, lunch: 0.30,
        afternoon_snack: 0.10, dinner: 0.20, evening_snack: 0.05,
      };
      const targetMealKcal = patientTargetKcal * (mealShare[meal.meal_type] || 0.2);
      scaleFactor = targetMealKcal / meal.base_calories;
      scaleFactor = Math.max(0.5, Math.min(2.0, scaleFactor));
    }

    const foods = Array.isArray(meal.foods) ? meal.foods : [];

    // Build metadata for clinical traceability
    const mealMeta = {
      source: "library",
      library_meal_id: meal.id,
      goal_tag: meal.goal_tag,
      clinical_tags: meal.clinical_tags,
      foods: meal.foods,
      substitutions: meal.substitutions,
    };

    // Clear existing items in this cell BEFORE inserting
    deleteItemsInCell(targetDay, targetMealType as any);

    // Always insert a header item with the meal title first
    const headerItem = {
      meal_plan_id: planId,
      title: meal.title,
      description: foods.length > 0
        ? foods.map((f) => `• ${f.name} — ${f.portion}`).join("\n")
        : null,
      meal_type: targetMealType,
      day_of_week: targetDay,
      calories_target: Math.round(meal.base_calories * scaleFactor),
      protein_target: Math.round(meal.protein * scaleFactor),
      carbs_target: Math.round(meal.carbs * scaleFactor),
      fat_target: Math.round(meal.fat * scaleFactor),
      edit_metadata: mealMeta,
    };

    addItem(headerItem as any);

    toast.success(`"${meal.title}" substituído no plano`);
    onOpenChange(false);
  }, [planId, targetDay, targetMealType, patientTargetKcal, addItem, deleteItemsInCell, onOpenChange]);

  const dayLabel = targetDay === 0 ? "Domingo" : ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][targetDay - 1];
  const mealLabel = MEAL_TABS.find((t) => t.key === targetMealType)?.label || targetMealType;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Utensils className="w-4 h-4 text-primary" />
            Banco de Refeições FitJourney
          </DialogTitle>
          <DialogDescription className="text-xs">
            Inserir em: <strong>{mealLabel}</strong> • <strong>{dayLabel}</strong>
            {patientTargetKcal && (
              <span className="ml-2 text-primary font-semibold">
                Meta: {fmtMacro(patientTargetKcal)} kcal/dia
              </span>
            )}
          </DialogDescription>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar refeição, alimento ou tag clínica…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </DialogHeader>

        {/* Meal type tabs */}
        <Tabs value={mealTab} onValueChange={setMealTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-5 mt-3 mb-0 h-8 bg-muted/50">
            {MEAL_TABS.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="text-[10px] gap-1 h-7 px-2">
                {tab.icon} {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Filters row */}
          <div className="px-5 pt-2 pb-1 flex flex-wrap gap-1">
            {GOAL_OPTIONS.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setGoalFilter(g.key)}
                className={`text-[10px] h-6 px-2 rounded-md font-medium transition-colors ${
                  goalFilter === g.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Clinical tag filters */}
          <div className="px-5 pb-2 flex flex-wrap gap-1">
            {CLINICAL_FILTERS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setClinicalFilter(clinicalFilter === tag ? null : tag)}
                className={`text-[9px] h-5 px-1.5 rounded font-medium transition-colors ${
                  clinicalFilter === tag
                    ? "bg-accent text-accent-foreground ring-1 ring-primary"
                    : "bg-muted/50 text-muted-foreground hover:bg-accent/50"
                }`}
              >
                {tag.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          {/* Results */}
          <ScrollArea className="flex-1 px-5 pb-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-sm text-muted-foreground">
                <Utensils className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Nenhuma refeição encontrada</p>
                <p className="text-[10px] mt-1">Tente outro filtro ou tipo de refeição</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filtered.map((meal) => (
                  <MealCard key={meal.id} meal={meal} onInsert={handleInsert} scaleFactor={
                    patientTargetKcal && meal.base_calories > 0
                      ? Math.max(0.5, Math.min(2.0, (patientTargetKcal * ({
                          breakfast: 0.25, morning_snack: 0.10, lunch: 0.30,
                          afternoon_snack: 0.10, dinner: 0.20, evening_snack: 0.05,
                        }[meal.meal_type] || 0.2)) / meal.base_calories))
                      : null
                  } />
                ))}
              </div>
            )}
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ── Meal Card ───────────────────────────────────────────────
function MealCard({ meal, onInsert, scaleFactor }: {
  meal: MealLibraryItem;
  onInsert: (m: MealLibraryItem) => void;
  scaleFactor: number | null;
}) {
  // Defesa em profundidade: safeNum coage null/undefined/NaN para 0 antes
  // do cálculo, e fmtMacro garante que o JSX nunca renderize "NaN".
  const sf = safeNum(scaleFactor) || 1;
  const adjustedKcal = scaleFactor ? Math.round(safeNum(meal.base_calories) * sf) : safeNum(meal.base_calories);
  const adjustedP = scaleFactor ? Math.round(safeNum(meal.protein) * sf) : safeNum(meal.protein);
  const adjustedC = scaleFactor ? Math.round(safeNum(meal.carbs) * sf) : safeNum(meal.carbs);
  const adjustedF = scaleFactor ? Math.round(safeNum(meal.fat) * sf) : safeNum(meal.fat);

  return (
    <button
      type="button"
      onClick={() => onInsert(meal)}
      className="w-full text-left rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-md p-3 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-sm leading-tight">{meal.title}</span>
        <Plus className="w-4 h-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
      </div>

      {/* Macros row */}
      <div className="flex items-center gap-2.5 mt-2 text-[10px]">
        <span className="flex items-center gap-0.5 font-semibold">
          <Flame className="w-3 h-3 text-orange-400" /> {fmtMacro(adjustedKcal)}
          {scaleFactor && scaleFactor !== 1 && (
            <span className="text-muted-foreground ml-0.5">
              <RefreshCcw className="w-2 h-2 inline" />
            </span>
          )}
        </span>
        <span className="flex items-center gap-0.5 text-muted-foreground">
          <Beef className="w-2.5 h-2.5 text-red-400" /> {fmtMacro(adjustedP)}g
        </span>
        <span className="flex items-center gap-0.5 text-muted-foreground">
          <Wheat className="w-2.5 h-2.5 text-amber-500" /> {fmtMacro(adjustedC)}g
        </span>
        <span className="flex items-center gap-0.5 text-muted-foreground">
          <Droplets className="w-2.5 h-2.5 text-blue-400" /> {fmtMacro(adjustedF)}g
        </span>
      </div>

      {/* Foods preview */}
      {Array.isArray(meal.foods) && meal.foods.length > 0 && (
        <div className="mt-1.5 text-[10px] text-muted-foreground truncate">
          {meal.foods.map((f) => f.name).join(" • ")}
        </div>
      )}

      {/* Tags */}
      <div className="flex gap-1 mt-1.5 flex-wrap">
        <Badge variant="outline" className="text-[8px] h-4 px-1.5 capitalize">
          {meal.goal_tag.replace(/_/g, " ")}
        </Badge>
        {Array.isArray(meal.clinical_tags) && meal.clinical_tags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[8px] h-4 px-1.5">
            {tag.replace(/_/g, " ")}
          </Badge>
        ))}
      </div>
    </button>
  );
}
