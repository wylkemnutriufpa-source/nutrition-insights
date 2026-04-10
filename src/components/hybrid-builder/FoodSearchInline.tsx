import { useState, useRef, useEffect } from "react";
import { Search, Plus, X, Flame, Beef } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FOOD_DATABASE, type FoodItem } from "@/components/meals/FoodAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import { useMealPlanEditorV2Store, type MealType } from "@/stores/mealPlanEditorV2Store";
import { toast } from "sonner";

interface Props {
  day: number;
  mealType: MealType;
  replacingItemId?: string | null;
  onClose: () => void;
}

interface DbFood {
  id: string;
  food_name: string;
  calories_per_gram: number;
  protein_per_gram: number;
  carbs_per_gram: number;
  fat_per_gram: number;
  portion_grams: number;
  category: string;
}

export default function FoodSearchInline({ day, mealType, replacingItemId, onClose }: Props) {
  const store = useMealPlanEditorV2Store();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<(FoodItem & { source: "local" | "db"; dbFood?: DbFood })[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const q = norm(query);

    // Local search
    const localResults = FOOD_DATABASE
      .filter(f => norm(f.name).includes(q))
      .slice(0, 8)
      .map(f => ({ ...f, source: "local" as const }));

    setResults(localResults);

    // DB search (debounced)
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("ifj_food_database" as any)
          .select("id, food_name, calories_per_gram, protein_per_gram, carbs_per_gram, fat_per_gram, portion_grams, category")
          .eq("is_active", true)
          .ilike("food_name", `%${query.trim()}%`)
          .limit(10);

        if (data && data.length > 0) {
          const dbResults = (data as unknown as DbFood[]).map(f => ({
            name: f.food_name,
            portion: `${f.portion_grams}g`,
            calories: Math.round(f.calories_per_gram * f.portion_grams),
            protein: Math.round(f.protein_per_gram * f.portion_grams * 10) / 10,
            carbs: Math.round(f.carbs_per_gram * f.portion_grams * 10) / 10,
            fat: Math.round(f.fat_per_gram * f.portion_grams * 10) / 10,
            category: f.category || "outros",
            source: "db" as const,
            dbFood: f,
          }));

          // Merge, removing duplicates by name
          const localNames = new Set(localResults.map(r => norm(r.name)));
          const merged = [
            ...localResults,
            ...dbResults.filter(r => !localNames.has(norm(r.name))),
          ];
          setResults(merged.slice(0, 15));
        }
      } catch {
        // silently fail db search, local results remain
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleAdd = (food: (typeof results)[0]) => {
    const planId = store.plan?.id;
    if (!planId) return;

    const portionMatch = food.portion.match(/(\d+)/);
    const grams = portionMatch ? parseInt(portionMatch[1]) : 100;

    store.addItem({
      meal_plan_id: planId,
      title: food.name,
      description: `${food.name} ${grams}g`,
      day_of_week: day,
      meal_type: mealType,
      calories_target: food.calories,
      protein_target: food.protein,
      carbs_target: food.carbs,
      fat_target: food.fat,
      item_origin: food.source === "db" ? "food_database" : "manual",
    });

    toast.success(`${food.name} adicionado`);
    setQuery("");
    setResults([]);
  };

  const categoryColor: Record<string, string> = {
    proteina: "bg-red-500/10 text-red-700 dark:text-red-400",
    carboidrato: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    gordura: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    fruta: "bg-green-500/10 text-green-700 dark:text-green-400",
    vegetal: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    laticinio: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    bebida: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
    outros: "bg-muted text-muted-foreground",
  };

  return (
    <div className="border border-primary/20 rounded-lg bg-card p-2 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-center gap-1.5">
        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar alimento... (ex: frango, arroz)"
          className="h-7 text-xs border-0 bg-transparent px-0 focus-visible:ring-0"
        />
        {loading && <div className="w-3 h-3 border border-primary/40 border-t-primary rounded-full animate-spin shrink-0" />}
        <button onClick={onClose} className="p-0.5 rounded hover:bg-muted shrink-0">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {results.length > 0 && (
        <div className="max-h-[200px] overflow-y-auto space-y-0.5">
          {results.map((food, idx) => (
            <button
              key={`${food.name}-${idx}`}
              onClick={() => handleAdd(food)}
              className="w-full flex items-center gap-2 p-1.5 rounded-md hover:bg-primary/5 text-left transition-colors group"
            >
              <Plus className="w-3 h-3 text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium truncate">{food.name}</span>
                  <span className={`text-[9px] px-1 py-0.5 rounded ${categoryColor[food.category] || categoryColor.outros}`}>
                    {food.category}
                  </span>
                  {food.source === "db" && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-primary/10 text-primary">BD</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{food.portion}</span>
                  <span className="flex items-center gap-0.5"><Flame className="w-2.5 h-2.5" />{food.calories}</span>
                  <span className="flex items-center gap-0.5"><Beef className="w-2.5 h-2.5" />{food.protein}g</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {query.length >= 2 && results.length === 0 && !loading && (
        <p className="text-[10px] text-muted-foreground text-center py-2">
          Nenhum alimento encontrado para "{query}"
        </p>
      )}
    </div>
  );
}
