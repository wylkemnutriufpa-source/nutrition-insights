import { useState, useEffect, useCallback } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { Input } from "@v1/components/ui/input";
import { Button } from "@v1/components/ui/button";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import { Search, X, Utensils, Plus } from "lucide-react";
import { motion } from "framer-motion";
import type { StrategyMealPreview } from "@v1/lib/strategyAdvisor";

interface Props {
  mealType: string;
  onSelect: (meal: StrategyMealPreview) => void;
  onClose: () => void;
}

interface FoodItem {
  id: string;
  food_name: string;
  category: string;
  portion_reference: string;
  portion_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "☀️ Café da Manhã",
  morning_snack: "🍎 Lanche AM",
  lunch: "🍽️ Almoço",
  afternoon_snack: "🍪 Lanche PM",
  dinner: "🌙 Jantar",
  evening_snack: "🫖 Ceia",
  new: "🍴 Nova Refeição",
};

export default function FoodSearchInStrategy({ mealType, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [visualItems, setVisualItems] = useState<any[]>([]);

  // Load visual library items as well
  useEffect(() => {
    loadVisualLibrary();
  }, []);

  const loadVisualLibrary = async () => {
    const { data } = await supabase
      .from("meal_visual_library")
      .select("id, name, display_name, category, default_calories, default_protein, default_carbs, default_fat, default_portion")
      .eq("is_active", true)
      .order("sort_order")
      .limit(200);
    setVisualItems(data || []);
  };

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => searchFoods(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const searchFoods = async (term: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("ifj_food_database")
      .select("id, food_name, category, portion_reference, portion_grams, calories, protein, carbs, fats")
      .eq("is_active", true)
      .ilike("food_name", `%${term}%`)
      .limit(20);
    setResults(data || []);
    setLoading(false);
  };

  const filteredVisual = query.length >= 2
    ? visualItems.filter(v =>
        v.display_name?.toLowerCase().includes(query.toLowerCase()) ||
        v.name?.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const handleSelectFood = useCallback((food: FoodItem) => {
    const resolvedMealType = mealType === "new" ? "afternoon_snack" : mealType;
    onSelect({
      mealType: resolvedMealType,
      label: MEAL_TYPE_LABELS[resolvedMealType] || resolvedMealType,
      description: `${food.food_name} — ${food.portion_reference || `${food.portion_grams}g`}`,
      calories: food.calories || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fat: food.fats || 0,
    });
  }, [mealType, onSelect]);

  const handleSelectVisual = useCallback((item: any) => {
    const resolvedMealType = mealType === "new" ? "afternoon_snack" : mealType;
    onSelect({
      mealType: resolvedMealType,
      label: MEAL_TYPE_LABELS[resolvedMealType] || resolvedMealType,
      description: item.display_name || item.name,
      calories: item.default_calories || 0,
      protein: item.default_protein || 0,
      carbs: item.default_carbs || 0,
      fat: item.default_fat || 0,
    });
  }, [mealType, onSelect]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-card border border-border rounded-xl p-3 shadow-lg"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Utensils className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold">Buscar Alimentos / Refeições</p>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar alimento, receita ou refeição..."
          className="h-8 text-xs pl-7"
          autoFocus
        />
      </div>

      <ScrollArea className="max-h-[250px]">
        <div className="space-y-1">
          {/* Visual library results */}
          {filteredVisual.map(item => (
            <button
              key={`v-${item.id}`}
              onClick={() => handleSelectVisual(item)}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-[10px]">📸</div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate">{item.display_name || item.name}</p>
                <p className="text-[9px] text-muted-foreground">
                  {item.default_calories || 0} kcal • {item.default_protein || 0}g P
                </p>
              </div>
              <Plus className="w-3 h-3 text-primary shrink-0" />
            </button>
          ))}

          {/* Food database results */}
          {results.map(food => (
            <button
              key={food.id}
              onClick={() => handleSelectFood(food)}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center text-[10px]">🥗</div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate">{food.food_name}</p>
                <p className="text-[9px] text-muted-foreground">
                  {food.calories} kcal • {food.protein}g P • {food.portion_reference || `${food.portion_grams}g`}
                </p>
              </div>
              <Plus className="w-3 h-3 text-primary shrink-0" />
            </button>
          ))}

          {query.length >= 2 && results.length === 0 && filteredVisual.length === 0 && !loading && (
            <p className="text-[10px] text-muted-foreground text-center py-4">Nenhum resultado para "{query}"</p>
          )}

          {query.length < 2 && (
            <p className="text-[10px] text-muted-foreground text-center py-4">
              Digite pelo menos 2 caracteres para buscar
            </p>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
