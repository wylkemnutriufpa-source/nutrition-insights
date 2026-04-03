import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useDraggable } from "@dnd-kit/core";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Search, Utensils, ChefHat, Apple, BookOpen, Star,
  Flame, Beef, Wheat, Droplets, Loader2, GripVertical,
} from "lucide-react";

interface FoodRow {
  id: string;
  name: string;
  calories_per_gram: number | null;
  protein_per_gram: number | null;
  carbs_per_gram: number | null;
  fat_per_gram: number | null;
  default_quantity_grams: number | null;
  image_url: string | null;
  meal_tags_json: any;
  category: string | null;
}

interface RecipeRow {
  id: string;
  title: string;
  total_calories: number | null;
  total_protein: number | null;
  total_carbs: number | null;
  total_fat: number | null;
  image_url: string | null;
  meal_type: string | null;
}

const MEAL_FILTERS = [
  { key: "all", label: "Todos" },
  { key: "breakfast", label: "Café" },
  { key: "lunch", label: "Almoço" },
  { key: "dinner", label: "Jantar" },
  { key: "snack", label: "Lanche" },
];

export default function BuilderLibraryPanel() {
  const { user } = useAuth();
  const [foods, setFoods] = useState<FoodRow[]>([]);
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mealFilter, setMealFilter] = useState("all");
  const [tab, setTab] = useState("foods");

  useEffect(() => {
    const loadLibrary = async () => {
      setLoading(true);
      const [foodsRes, recipesRes] = await Promise.all([
        supabase
          .from("ifj_food_database")
          .select("id, name, calories_per_gram, protein_per_gram, carbs_per_gram, fat_per_gram, default_quantity_grams, image_url, meal_tags_json, category")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("recipes")
          .select("id, title, total_calories, total_protein, total_carbs, total_fat, image_url, meal_type")
          .eq("is_active", true)
          .order("title"),
      ]);

      setFoods((foodsRes.data || []) as FoodRow[]);
      setRecipes((recipesRes.data || []) as RecipeRow[]);
      setLoading(false);
    };
    loadLibrary();
  }, []);

  const filteredFoods = useMemo(() => {
    let result = foods;
    if (search) {
      const q = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      result = result.filter((f) =>
        f.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q)
      );
    }
    if (mealFilter !== "all") {
      result = result.filter((f) => {
        const tags: string[] = Array.isArray(f.meal_tags_json) ? f.meal_tags_json : [];
        return tags.some((t) => t.toLowerCase().includes(mealFilter));
      });
    }
    return result.slice(0, 50);
  }, [foods, search, mealFilter]);

  const filteredRecipes = useMemo(() => {
    let result = recipes;
    if (search) {
      const q = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      result = result.filter((r) =>
        r.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q)
      );
    }
    if (mealFilter !== "all") {
      result = result.filter((r) => r.meal_type?.toLowerCase().includes(mealFilter));
    }
    return result.slice(0, 50);
  }, [recipes, search, mealFilter]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar alimento ou receita..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        {/* Meal filter chips */}
        <div className="flex gap-1 flex-wrap">
          {MEAL_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setMealFilter(f.key)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                mealFilter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-3 mt-2 h-8">
          <TabsTrigger value="foods" className="text-xs gap-1 h-7">
            <Apple className="w-3 h-3" /> Alimentos
          </TabsTrigger>
          <TabsTrigger value="recipes" className="text-xs gap-1 h-7">
            <ChefHat className="w-3 h-3" /> Receitas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="foods" className="flex-1 min-h-0 m-0">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredFoods.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhum alimento encontrado</p>
              ) : (
                filteredFoods.map((food) => (
                  <DraggableFoodItem key={food.id} food={food} />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="recipes" className="flex-1 min-h-0 m-0">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredRecipes.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhuma receita encontrada</p>
              ) : (
                filteredRecipes.map((recipe) => (
                  <DraggableRecipeItem key={recipe.id} recipe={recipe} />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DraggableFoodItem({ food }: { food: FoodRow }) {
  const qty = food.default_quantity_grams || 100;
  const kcal = Math.round((food.calories_per_gram || 0) * qty);
  const prot = Math.round((food.protein_per_gram || 0) * qty * 10) / 10;
  const carbs = Math.round((food.carbs_per_gram || 0) * qty * 10) / 10;
  const fat = Math.round((food.fat_per_gram || 0) * qty * 10) / 10;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `food-${food.id}`,
    data: {
      type: "food",
      food: { ...food, computed: { qty, kcal, prot, carbs, fat } },
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 p-2 rounded-lg cursor-grab active:cursor-grabbing transition-all text-xs ${
        isDragging ? "opacity-50 scale-95" : "hover:bg-muted/60"
      }`}
    >
      <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0" />
      {food.image_url ? (
        <img src={food.image_url} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
          <Apple className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{food.name}</p>
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mt-0.5">
          <span>{qty}g</span>
          <span>•</span>
          <Flame className="w-2.5 h-2.5" /> {kcal}
          <Beef className="w-2.5 h-2.5" /> {prot}
          <Wheat className="w-2.5 h-2.5" /> {carbs}
          <Droplets className="w-2.5 h-2.5" /> {fat}
        </div>
      </div>
    </div>
  );
}

function DraggableRecipeItem({ recipe }: { recipe: RecipeRow }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `recipe-${recipe.id}`,
    data: { type: "recipe", recipe },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 p-2 rounded-lg cursor-grab active:cursor-grabbing transition-all text-xs ${
        isDragging ? "opacity-50 scale-95" : "hover:bg-muted/60"
      }`}
    >
      <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0" />
      {recipe.image_url ? (
        <img src={recipe.image_url} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
          <ChefHat className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="font-medium truncate">{recipe.title}</p>
          <ChefHat className="w-3 h-3 text-primary shrink-0" />
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mt-0.5">
          <Flame className="w-2.5 h-2.5" /> {Math.round(recipe.total_calories || 0)}
          <Beef className="w-2.5 h-2.5" /> {Math.round(recipe.total_protein || 0)}
          <Wheat className="w-2.5 h-2.5" /> {Math.round(recipe.total_carbs || 0)}
          <Droplets className="w-2.5 h-2.5" /> {Math.round(recipe.total_fat || 0)}
        </div>
      </div>
    </div>
  );
}
