import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useMealPlanEditorV2Store, type MealType } from "@/stores/mealPlanEditorV2Store";
import {
  Search, Flame, Beef, Wheat, Droplets, Loader2, Star,
  TrendingUp, Clock, CalendarDays, CalendarRange, Shuffle, Check,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────
interface MealOption {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: "recipe" | "food" | "composed";
  imageUrl?: string | null;
  recipeId?: string;
  foodId?: string;
  portion?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  day: number;
  mealType: MealType;
  mealLabel: string;
}

// ── Meal type to filter mapping ──────────────────────────────
const MEAL_TYPE_KEYWORDS: Record<string, string[]> = {
  breakfast: ["café", "breakfast", "cafe_da_manha", "morning", "manhã"],
  morning_snack: ["lanche", "snack", "lanche_manha"],
  lunch: ["almoço", "almoco", "lunch"],
  afternoon_snack: ["lanche", "snack", "lanche_tarde"],
  dinner: ["jantar", "dinner"],
  evening_snack: ["ceia", "evening", "noite"],
};

const APPLY_MODES = [
  { key: "this", label: "Este dia", icon: Check, desc: "Apenas este dia" },
  { key: "weekdays", label: "Dias úteis", icon: CalendarDays, desc: "Seg–Sex" },
  { key: "weekend", label: "Fim de semana", icon: CalendarRange, desc: "Sáb–Dom" },
  { key: "all", label: "Semana toda", icon: CalendarDays, desc: "7 dias" },
  { key: "vary", label: "Variar na semana", icon: Shuffle, desc: "Rotaciona opções" },
] as const;

type ApplyMode = typeof APPLY_MODES[number]["key"];

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function SmartMealSelectorModal({ open, onClose, day, mealType, mealLabel }: Props) {
  const store = useMealPlanEditorV2Store();
  const [options, setOptions] = useState<MealOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [applyMode, setApplyMode] = useState<ApplyMode>("this");
  const [tab, setTab] = useState<"all" | "popular" | "recommended">("all");

  // ── Load options from recipes + foods ──────────────────────
  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set());
    setPrimaryId(null);
    setSearch("");
    setApplyMode("this");
    setTab("all");

    (async () => {
      setLoading(true);
      const keywords = MEAL_TYPE_KEYWORDS[mealType] || [];

      const [recipesRes, foodsRes] = await Promise.all([
        supabase
          .from("recipes")
          .select("id, title, calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving, image_url, category, description")
          .order("title"),
        supabase
          .from("ifj_food_database")
          .select("id, food_name, calories_per_gram, protein_per_gram, carbs_per_gram, fat_per_gram, portion_grams, meal_tags_json, category")
          .eq("is_active", true)
          .order("food_name"),
      ]);

      const recipeOptions: MealOption[] = ((recipesRes.data || []) as any[])
        .filter((r) => {
          if (!keywords.length) return true;
          const cat = (r.category || "").toLowerCase();
          return keywords.some((k) => cat.includes(k)) || true; // show all, prioritize matching
        })
        .map((r) => ({
          id: `recipe-${r.id}`,
          name: r.title,
          description: r.description || r.title,
          calories: Math.round(r.calories_per_serving || 0),
          protein: Math.round(r.protein_per_serving || 0),
          carbs: Math.round(r.carbs_per_serving || 0),
          fat: Math.round(r.fat_per_serving || 0),
          source: "recipe" as const,
          imageUrl: r.image_url,
          recipeId: r.id,
        }));

      const foodOptions: MealOption[] = ((foodsRes.data || []) as any[])
        .filter((f) => {
          const tags: string[] = Array.isArray(f.meal_tags_json) ? f.meal_tags_json : [];
          if (!keywords.length) return true;
          return keywords.some((k) =>
            tags.some((t: string) => t.toLowerCase().includes(k)) ||
            (f.category || "").toLowerCase().includes(k)
          );
        })
        .map((f) => {
          const g = f.portion_grams || 100;
          return {
            id: `food-${f.id}`,
            name: f.food_name,
            description: `${f.food_name} ${g}g`,
            calories: Math.round((f.calories_per_gram || 0) * g),
            protein: Math.round((f.protein_per_gram || 0) * g * 10) / 10,
            carbs: Math.round((f.carbs_per_gram || 0) * g * 10) / 10,
            fat: Math.round((f.fat_per_gram || 0) * g * 10) / 10,
            source: "food" as const,
            foodId: f.id,
            portion: g,
          };
        });

      // Sort: recipes first (more complete), then foods
      // Prioritize items matching meal type keywords
      const sorted = [...recipeOptions, ...foodOptions].sort((a, b) => {
        const aMatch = keywords.some((k) => a.name.toLowerCase().includes(k)) ? 0 : 1;
        const bMatch = keywords.some((k) => b.name.toLowerCase().includes(k)) ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        if (a.source !== b.source) return a.source === "recipe" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      setOptions(sorted);
      setLoading(false);
    })();
  }, [open, mealType]);

  // ── Filtered options ───────────────────────────────────────
  const filtered = useMemo(() => {
    let result = options;
    if (search) {
      const q = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      result = result.filter((o) =>
        o.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q)
      );
    }
    if (tab === "popular") {
      result = result.filter((o) => o.source === "recipe");
    }
    return result.slice(0, 60);
  }, [options, search, tab]);

  // ── Toggle selection ───────────────────────────────────────
  const toggleOption = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (primaryId === id) setPrimaryId(next.size > 0 ? Array.from(next)[0] : null);
      } else {
        next.add(id);
        if (!primaryId) setPrimaryId(id);
      }
      return next;
    });
  }, [primaryId]);

  const setPrimary = useCallback((id: string) => {
    setPrimaryId(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  // ── Totals for primary selection ───────────────────────────
  const primaryOption = useMemo(
    () => options.find((o) => o.id === primaryId) || null,
    [options, primaryId]
  );

  const selectedOptions = useMemo(
    () => options.filter((o) => selectedIds.has(o.id)),
    [options, selectedIds]
  );

  // ── Apply to plan ─────────────────────────────────────────
  const handleApply = () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione pelo menos uma opção");
      return;
    }

    const planId = store.plan?.id;
    if (!planId) return;

    const primary = primaryOption || selectedOptions[0];
    const substitutions = selectedOptions.filter((o) => o.id !== primary?.id);

    // Determine target days
    let targetDays: number[];
    switch (applyMode) {
      case "weekdays": targetDays = WEEKDAYS; break;
      case "weekend": targetDays = WEEKEND; break;
      case "all": targetDays = ALL_DAYS; break;
      case "vary": targetDays = ALL_DAYS; break;
      default: targetDays = [day];
    }

    if (applyMode === "vary" && selectedOptions.length > 1) {
      // Rotate options across days
      targetDays.forEach((d, idx) => {
        const option = selectedOptions[idx % selectedOptions.length];
        store.deleteItemsInCell(d, mealType);
        addOptionToSlot(planId, option, d, mealType);
      });
      toast.success(`Refeições variadas aplicadas em ${targetDays.length} dias`);
    } else {
      // Apply same primary + subs to all target days
      targetDays.forEach((d) => {
        store.deleteItemsInCell(d, mealType);
        if (primary) {
          addOptionToSlot(planId, primary, d, mealType);
        }
        // Add substitutions as extra items (marked)
        substitutions.forEach((sub) => {
          addOptionToSlot(planId, sub, d, mealType, true);
        });
      });
      const dayLabel = targetDays.length === 1 ? "1 dia" : `${targetDays.length} dias`;
      toast.success(`${selectedOptions.length} opção(ões) aplicadas em ${dayLabel}`);
    }

    onClose();
  };

  const addOptionToSlot = (
    planId: string,
    option: MealOption,
    targetDay: number,
    targetMealType: MealType,
    isSubstitution = false,
  ) => {
    store.addItem({
      meal_plan_id: planId,
      title: option.name,
      description: isSubstitution
        ? `[Substituição] ${option.description}`
        : option.description,
      day_of_week: targetDay,
      meal_type: targetMealType,
      calories_target: option.calories,
      protein_target: option.protein,
      carbs_target: option.carbs,
      fat_target: option.fat,
      item_origin: option.source === "recipe" ? "recipe_library" : "food_database",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-3 border-b border-border">
          <DialogTitle className="text-base flex items-center gap-2">
            🍽️ {mealLabel}
            <span className="text-xs font-normal text-muted-foreground">— Selecionar refeição</span>
          </DialogTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar receitas e alimentos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
              autoFocus
            />
          </div>
          {/* Tab filters */}
          <div className="flex gap-1 mt-2">
            {[
              { key: "all" as const, label: "Todos", icon: null },
              { key: "popular" as const, label: "🔥 Receitas", icon: null },
              { key: "recommended" as const, label: "⭐ Recomendados", icon: null },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                  tab === t.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Options list */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          <div className="p-3 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">
                Nenhuma opção encontrada
              </p>
            ) : (
              filtered.map((option) => {
                const isSelected = selectedIds.has(option.id);
                const isPrimary = primaryId === option.id;
                return (
                  <div
                    key={option.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                      isPrimary
                        ? "bg-primary/10 border border-primary/30 shadow-sm"
                        : isSelected
                        ? "bg-accent/50 border border-accent"
                        : "hover:bg-muted/60 border border-transparent"
                    }`}
                    onClick={() => toggleOption(option.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOption(option.id)}
                      className="shrink-0"
                    />

                    {option.imageUrl && (
                      <img
                        src={option.imageUrl}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{option.name}</p>
                        {option.source === "recipe" && (
                          <span className="text-[9px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full shrink-0">
                            Receita
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5" /> {option.calories} kcal
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Beef className="w-2.5 h-2.5" /> {option.protein}g
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Wheat className="w-2.5 h-2.5" /> {option.carbs}g
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Droplets className="w-2.5 h-2.5" /> {option.fat}g
                        </span>
                      </div>
                    </div>

                    {isSelected && !isPrimary && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setPrimary(option.id); }}
                        className="text-[9px] text-primary hover:text-primary/80 font-medium shrink-0"
                        title="Definir como principal"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isPrimary && (
                      <Star className="w-3.5 h-3.5 text-primary fill-primary shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Footer: summary + apply mode + confirm */}
        {selectedIds.size > 0 && (
          <div className="border-t border-border p-3 space-y-3 bg-muted/30">
            {/* Selection summary */}
            <div className="flex items-center gap-3 text-xs">
              <span className="font-medium">
                {selectedIds.size} selecionada{selectedIds.size > 1 ? "s" : ""}
              </span>
              {primaryOption && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    Principal: <strong>{primaryOption.name}</strong>
                  </span>
                  {selectedIds.size > 1 && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        {selectedIds.size - 1} substituição(ões)
                      </span>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Macro totals for primary */}
            {primaryOption && (
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1">
                  <Flame className="w-3 h-3 text-destructive" /> {primaryOption.calories} kcal
                </span>
                <span className="flex items-center gap-1">
                  <Beef className="w-3 h-3 text-primary" /> {primaryOption.protein}g P
                </span>
                <span className="flex items-center gap-1">
                  <Wheat className="w-3 h-3 text-accent-foreground" /> {primaryOption.carbs}g C
                </span>
                <span className="flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-muted-foreground" /> {primaryOption.fat}g G
                </span>
              </div>
            )}

            {/* Apply mode */}
            <div className="flex gap-1.5 flex-wrap">
              {APPLY_MODES.map((mode) => (
                <button
                  key={mode.key}
                  onClick={() => setApplyMode(mode.key)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                    applyMode === mode.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-background border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
                  }`}
                  title={mode.desc}
                >
                  <mode.icon className="w-3 h-3" />
                  {mode.label}
                </button>
              ))}
            </div>

            {/* Apply button */}
            <button
              onClick={handleApply}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Aplicar {selectedIds.size > 1 ? "com substituições" : "refeição"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
