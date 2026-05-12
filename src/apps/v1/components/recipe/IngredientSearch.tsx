import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, Apple } from "lucide-react";

interface FoodResult {
  id: string;
  food_name: string;
  calories_per_gram: number | null;
  protein_per_gram: number | null;
  carbs_per_gram: number | null;
  fat_per_gram: number | null;
  portion_grams: number | null;
  portion_reference: string | null;
  category: string;
}

interface Props {
  onSelect: (food: FoodResult) => void;
  placeholder?: string;
}

export default function IngredientSearch({ onSelect, placeholder = "Buscar alimento... (ex: aveia)" }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("ifj_food_database")
        .select("id, food_name, calories_per_gram, protein_per_gram, carbs_per_gram, fat_per_gram, portion_grams, portion_reference, category")
        .eq("is_active", true)
        .ilike("food_name", `%${query}%`)
        .limit(15);
      setResults((data as FoodResult[]) || []);
      setOpen(true);
      setLoading(false);
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
          onFocus={() => results.length > 0 && setOpen(true)}
        />
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-xl border border-border bg-popover shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-4">Buscando...</p>
          ) : results.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum alimento encontrado</p>
          ) : (
            results.map((food) => (
              <button
                key={food.id}
                className="w-full text-left px-3 py-2.5 hover:bg-accent/50 transition-colors flex items-center gap-3 text-sm border-b border-border/30 last:border-0"
                onClick={() => {
                  onSelect(food);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <Apple className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{food.food_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {food.portion_reference || `${food.portion_grams ?? 100}g`} · {Math.round((food.calories_per_gram || 0) * (food.portion_grams || 100))} kcal
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground/60 shrink-0">{food.category}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
