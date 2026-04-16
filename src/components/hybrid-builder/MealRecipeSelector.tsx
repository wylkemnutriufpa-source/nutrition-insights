import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ChefHat, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface MealRecipe {
  id: string;
  name: string;
  meal_type: string;
  foods_json: { name: string; grams: number }[];
}

interface Props {
  onSelect: (recipe: MealRecipe) => void;
  onCancel: () => void;
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  "almoço": "🍽️ Almoço",
  "jantar": "🌙 Jantar",
};

export default function MealRecipeSelector({ onSelect, onCancel }: Props) {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<MealRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from("meal_recipes")
        .select("id, name, meal_type, foods_json")
        .eq("nutritionist_id", user.id)
        .eq("is_active", true)
        .order("meal_type")
        .order("name");
      setRecipes((data as any[]) || []);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const selected = recipes.find(r => r.id === selectedId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Carregando receitas...</span>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <ChefHat className="w-12 h-12 mx-auto text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Nenhuma receita cadastrada ainda.</p>
        <p className="text-xs text-muted-foreground">Peça ao administrador para importar as receitas de marmita.</p>
        <Button variant="outline" size="sm" onClick={onCancel}>Voltar</Button>
      </div>
    );
  }

  // Group by meal_type
  const grouped = recipes.reduce<Record<string, MealRecipe[]>>((acc, r) => {
    const key = r.meal_type || "outro";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ChefHat className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-bold">Selecionar Receita (Marmita)</h3>
      </div>

      <p className="text-xs text-muted-foreground">
        Escolha uma receita base. O motor vai apenas escalar as porções proporcionalmente aos macros do paciente.
      </p>

      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
        {Object.entries(grouped).map(([type, items]) => (
          <div key={type}>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">
              {MEAL_TYPE_LABELS[type] || type}
            </p>
            <div className="grid gap-2">
              {items.map(r => {
                const foods = Array.isArray(r.foods_json) ? r.foods_json : [];
                const isSelected = selectedId === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(isSelected ? null : r.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border bg-card hover:border-primary/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{r.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {foods.slice(0, 5).map((f, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">
                          {f.name} {f.grams}g
                        </Badge>
                      ))}
                      {foods.length > 5 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{foods.length - 5}
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel} className="flex-1">
          Voltar
        </Button>
        <Button
          size="sm"
          disabled={!selected}
          onClick={() => selected && onSelect(selected)}
          className="flex-1 gap-1"
        >
          <Check className="w-4 h-4" />
          Usar Receita
        </Button>
      </div>
    </div>
  );
}
