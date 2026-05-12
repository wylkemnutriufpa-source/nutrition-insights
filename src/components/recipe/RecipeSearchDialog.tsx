import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, ChefHat, Flame, Beef } from "lucide-react";
import { RecipeIngredient } from "@/lib/recipeCalculator";

interface LoadedRecipe {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  servings: number;
  total_calories: number;
  total_protein: number;
  ingredients_json: any[];
  image_url: string | null;
  image_path: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onLoad: (recipe: {
    title: string;
    description: string;
    instructions: string;
    servings: number;
    ingredients: RecipeIngredient[];
    imageUrl: string | null;
    imagePath: string | null;
  }) => void;
}

export default function RecipeSearchDialog({ open, onOpenChange, onLoad }: Props) {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<LoadedRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    (async () => {
      // Load recipes saved by this user (and any nutritionist-approved if present)
      const { data } = await supabase
        .from("user_recipes" as any)
        .select("id, title, description, instructions, servings, total_calories, total_protein, ingredients_json, image_url, image_path")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setRecipes((data as any[]) || []);
      setLoading(false);
    })();
  }, [open, user]);

  const filtered = recipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const handlePick = (r: LoadedRecipe) => {
    const ings: RecipeIngredient[] = (Array.isArray(r.ingredients_json) ? r.ingredients_json : []).map((ing: any) => ({
      id: crypto.randomUUID(),
      food_id: ing.food_id,
      name: ing.name || "Ingrediente",
      quantity_grams: Number(ing.quantity_grams) || 100,
      unit: ing.unit || "g",
      calories_per_gram: Number(ing.calories_per_gram) || 0,
      protein_per_gram: Number(ing.protein_per_gram) || 0,
      carbs_per_gram: Number(ing.carbs_per_gram) || 0,
      fat_per_gram: Number(ing.fat_per_gram) || 0,
    }));

    onLoad({
      title: r.title,
      description: r.description || "",
      instructions: r.instructions || "",
      servings: r.servings || 1,
      ingredients: ings,
      imageUrl: r.image_url,
      imagePath: r.image_path,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-primary" /> Buscar Receita Salva
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pelo nome..."
            className="pl-9"
          />
        </div>

        <p className="text-[11px] text-muted-foreground -mt-2">
          Carregue uma receita já criada para fazer o Match Clínico com seu plano alimentar.
        </p>

        <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Carregando...</span>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-10 space-y-2">
              <ChefHat className="w-10 h-10 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {recipes.length === 0
                  ? "Você ainda não salvou nenhuma receita."
                  : "Nenhuma receita corresponde à busca."}
              </p>
            </div>
          )}

          {!loading && filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => handlePick(r)}
              className="w-full text-left p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{r.title}</p>
                  {r.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{r.description}</p>
                  )}
                </div>
                {r.image_url && (
                  <img src={r.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Flame className="w-3 h-3" /> {Math.round(r.total_calories || 0)} kcal
                </Badge>
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Beef className="w-3 h-3" /> {Math.round(r.total_protein || 0)}g
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {r.servings} {r.servings === 1 ? "porção" : "porções"}
                </Badge>
              </div>
            </button>
          ))}
        </div>

        <div className="pt-2">
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
