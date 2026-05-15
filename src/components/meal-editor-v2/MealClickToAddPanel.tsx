/**
 * MealClickToAddPanel — Phase 2: Click-to-add meal builder
 * 
 * Filtered by meal_type, shows items from visual library.
 * One click = add to plan. Auto macro sum displayed live.
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMealPlanEditorV2Store, type MealType } from "@/stores/mealPlanEditorV2Store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Search, Loader2, Coffee, Apple, Utensils, Cookie, Moon, Sun,
  Flame, Beef, Wheat, Droplets, Check, Plus, Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

interface VisualItem {
  id: string;
  name: string;
  display_name: string;
  category: string;
  subcategory: string | null;
  image_url: string | null;
  default_portion: string | null;
  default_calories: number | null;
  default_protein: number | null;
  default_carbs: number | null;
  default_fat: number | null;
  tags: string[] | null;
}

/** Maps meal_type to visual library categories */
const MEAL_TYPE_TO_CATEGORIES: Record<MealType, string[]> = {
  breakfast: ["cafe_da_manha"],
  morning_snack: ["lanche", "frutas"],
  lunch: ["almoco"],
  afternoon_snack: ["lanche", "frutas"],
  dinner: ["jantar"],
  evening_snack: ["lanche", "frutas", "ceia"],
};

const MEAL_TYPE_CONFIG: Record<MealType, { label: string; icon: React.ReactNode; color: string }> = {
  breakfast: { label: "Café da Manhã", icon: <Coffee className="w-4 h-4" />, color: "text-amber-500" },
  morning_snack: { label: "Lanche Manhã", icon: <Apple className="w-4 h-4" />, color: "text-green-500" },
  lunch: { label: "Almoço", icon: <Utensils className="w-4 h-4" />, color: "text-orange-500" },
  afternoon_snack: { label: "Lanche Tarde", icon: <Cookie className="w-4 h-4" />, color: "text-pink-500" },
  dinner: { label: "Jantar", icon: <Moon className="w-4 h-4" />, color: "text-indigo-500" },
  evening_snack: { label: "Ceia", icon: <Sun className="w-4 h-4" />, color: "text-purple-500" },
};

const ALL_MEAL_TYPES: MealType[] = ["Café da Manhã", "Lanche da Manhã", "Almoço", "Lanche da Tarde", "Jantar", "Ceia"];

interface Props {
  day: number;
}

export default function MealClickToAddPanel({ day }: Props) {
  const { items, planId, addItem } = useMealPlanEditorV2Store();
  const [allItems, setAllItems] = useState<VisualItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeMealType, setActiveMealType] = useState<MealType>("Café da Manhã");
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());

  // Fetch visual library once
  useEffect(() => {
    if (allItems.length > 0) return;
    setLoading(true);
    supabase
      .from("meal_visual_library" as any)
      .select("id, name, display_name, category, subcategory, image_url, default_portion, default_calories, default_protein, default_carbs, default_fat, tags")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }: any) => {
        setAllItems((data || []) as VisualItem[]);
        setLoading(false);
      });
  }, [allItems.length]);

  // Filter items by active meal type
  const filtered = useMemo(() => {
    const categories = MEAL_TYPE_TO_CATEGORIES[activeMealType] || [];
    let list = allItems.filter((i) => {
      return categories.some(cat => {
        if (cat === "frutas") {
          return i.category === "frutas" || i.subcategory === "frutas" || i.tags?.includes("fruta");
        }
        return i.category === cat;
      });
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        i.display_name.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allItems, activeMealType, search]);

  // Day totals
  const dayItems = items.filter(i => i.day_of_week === day);
  const dayTotals = useMemo(() => ({
    calories: dayItems.reduce((s, i) => s + (i.calories_target || 0), 0),
    protein: dayItems.reduce((s, i) => s + (Number(i.protein_target) || 0), 0),
    carbs: dayItems.reduce((s, i) => s + (Number(i.carbs_target) || 0), 0),
    fat: dayItems.reduce((s, i) => s + (Number(i.fat_target) || 0), 0),
  }), [dayItems]);

  // Meal-specific totals
  const mealItems = dayItems.filter(i => i.meal_type === activeMealType);
  const mealTotals = useMemo(() => ({
    calories: mealItems.reduce((s, i) => s + (i.calories_target || 0), 0),
    protein: mealItems.reduce((s, i) => s + (Number(i.protein_target) || 0), 0),
    carbs: mealItems.reduce((s, i) => s + (Number(i.carbs_target) || 0), 0),
    fat: mealItems.reduce((s, i) => s + (Number(i.fat_target) || 0), 0),
    count: mealItems.length,
  }), [mealItems]);

  // Click to add
  const handleAdd = useCallback((item: VisualItem) => {
    if (!planId) return;
    addItem({
      meal_plan_id: planId,
      title: item.display_name,
      description: item.default_portion || null,
      meal_type: activeMealType,
      day_of_week: day,
      calories_target: item.default_calories ?? null,
      protein_target: item.default_protein ?? null,
      carbs_target: item.default_carbs ?? null,
      fat_target: item.default_fat ?? null,
      visual_library_item_id: item.id || null,
      image_url: item.image_url || null,
    });
    setRecentlyAdded(prev => new Set(prev).add(item.id));
    toast.success(`✅ ${item.display_name} adicionado!`);
    // Clear the "added" indicator after 2s
    setTimeout(() => {
      setRecentlyAdded(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 2000);
  }, [planId, activeMealType, day, addItem]);

  const config = MEAL_TYPE_CONFIG[activeMealType];

  return (
    <div className="flex flex-col h-full">
      {/* Meal type tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 border-b border-border">
        {ALL_MEAL_TYPES.map((mt) => {
          const cfg = MEAL_TYPE_CONFIG[mt];
          const count = dayItems.filter(i => i.meal_type === mt).length;
          const isActive = activeMealType === mt;
          return (
            <button
              key={mt}
              type="button"
              onClick={() => setActiveMealType(mt)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className={isActive ? "" : cfg.color}>{cfg.icon}</span>
              <span className="hidden sm:inline">{cfg.label}</span>
              {count > 0 && (
                <span className={`text-[9px] ml-0.5 ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Live macro summary */}
      <div className="flex items-center justify-between px-2 py-2 rounded-lg bg-secondary/30 mb-3">
        <div className="text-[10px] text-muted-foreground">
          <span className="font-semibold">{config.label}</span> • {mealTotals.count} itens
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-0.5 font-bold">
            <Flame className="w-3 h-3 text-orange-400" /> {mealTotals.calories} kcal
          </span>
          <span className="flex items-center gap-0.5">
            <Beef className="w-3 h-3 text-red-400" /> {mealTotals.protein.toFixed(0)}g
          </span>
          <span className="flex items-center gap-0.5">
            <Wheat className="w-3 h-3 text-amber-500" /> {mealTotals.carbs.toFixed(0)}g
          </span>
          <span className="flex items-center gap-0.5">
            <Droplets className="w-3 h-3 text-blue-400" /> {mealTotals.fat.toFixed(0)}g
          </span>
        </div>
      </div>

      {/* Day total bar */}
      <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-primary/5 border border-primary/10 mb-3 text-[10px]">
        <span className="font-semibold text-primary">Total do Dia</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-0.5 font-bold">
            <Flame className="w-3 h-3 text-orange-400" /> {dayTotals.calories} kcal
          </span>
          <span className="flex items-center gap-0.5">
            <Beef className="w-3 h-3 text-red-400" /> {dayTotals.protein.toFixed(0)}g
          </span>
          <span className="flex items-center gap-0.5">
            <Wheat className="w-3 h-3 text-amber-500" /> {dayTotals.carbs.toFixed(0)}g
          </span>
          <span className="flex items-center gap-0.5">
            <Droplets className="w-3 h-3 text-blue-400" /> {dayTotals.fat.toFixed(0)}g
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar refeição…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>

      {/* Items grid */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            <Utensils className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Nenhuma refeição encontrada</p>
            <p className="text-[10px] mt-1">Tente outra categoria ou busca</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filtered.map((item) => {
              const wasAdded = recentlyAdded.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleAdd(item)}
                  className={`rounded-lg border overflow-hidden text-left transition-all group hover:shadow-md ${
                    wasAdded
                      ? "border-green-500 bg-green-500/5 ring-1 ring-green-500/30"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.display_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground/20" />
                      </div>
                    )}
                    {/* Add overlay */}
                    <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                      wasAdded ? "opacity-100 bg-green-500/20" : "opacity-0 group-hover:opacity-100 bg-black/20"
                    }`}>
                      {wasAdded ? (
                        <div className="bg-green-500 text-white rounded-full p-2">
                          <Check className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="bg-primary text-primary-foreground rounded-full p-2">
                          <Plus className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-2">
                    <p className="text-xs font-medium leading-tight truncate">{item.display_name}</p>
                    {item.default_portion && (
                      <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{item.default_portion}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-[9px]">
                      {item.default_calories != null && (
                        <span className="flex items-center gap-0.5 font-semibold">
                          <Flame className="w-2.5 h-2.5 text-orange-400" /> {item.default_calories}
                        </span>
                      )}
                      {item.default_protein != null && (
                        <span className="flex items-center gap-0.5 text-muted-foreground">
                          <Beef className="w-2.5 h-2.5 text-red-400" /> {item.default_protein}g
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
