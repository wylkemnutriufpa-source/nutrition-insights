import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Clock, Users, Flame, Beef, Wheat, Droplets, ChefHat } from "lucide-react";

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  ingredients: string[];
  instructions: string[];
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  difficulty: string;
  category: string;
  calories_per_serving: number | null;
  protein_per_serving: number | null;
  carbs_per_serving: number | null;
  fat_per_serving: number | null;
  image_url?: string | null;
  tags?: string[];
}

interface Props {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const difficultyMap: Record<string, string> = { easy: "Fácil", medium: "Média", hard: "Difícil" };
const categoryMap: Record<string, string> = { main: "Prato Principal", snack: "Lanche", dessert: "Sobremesa", breakfast: "Café da Manhã", salad: "Salada", soup: "Sopa", drink: "Bebida" };
const difficultyColor: Record<string, string> = { easy: "bg-green-500/10 text-green-600", medium: "bg-orange-500/10 text-orange-600", hard: "bg-red-500/10 text-red-600" };

export default function PremiumRecipeModal({ recipe, open, onOpenChange }: Props) {
  if (!recipe) return null;

  const totalTime = recipe.prep_time_minutes + recipe.cook_time_minutes;
  const macros = [
    { label: "Kcal", value: recipe.calories_per_serving, icon: Flame, color: "text-orange-500" },
    { label: "Proteína", value: recipe.protein_per_serving ? `${recipe.protein_per_serving}g` : null, icon: Beef, color: "text-red-500" },
    { label: "Carboidrato", value: recipe.carbs_per_serving ? `${recipe.carbs_per_serving}g` : null, icon: Wheat, color: "text-amber-500" },
    { label: "Gordura", value: recipe.fat_per_serving ? `${recipe.fat_per_serving}g` : null, icon: Droplets, color: "text-blue-500" },
  ].filter(m => m.value != null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden p-0 gap-0 rounded-2xl border-border/50">
        {/* Hero header */}
        <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 pb-4">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-3">
            <Badge className={`text-xs ${difficultyColor[recipe.difficulty] || ""}`}>
              {difficultyMap[recipe.difficulty] || recipe.difficulty}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {categoryMap[recipe.category] || recipe.category}
            </Badge>
          </div>

          <h2 className="font-display text-xl font-bold leading-tight pr-8">{recipe.title}</h2>
          {recipe.description && (
            <p className="text-sm text-muted-foreground mt-2">{recipe.description}</p>
          )}

          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> {totalTime} min
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" /> {recipe.servings} porções
            </span>
          </div>
        </div>

        {/* Macros bar */}
        {macros.length > 0 && (
          <div className="grid grid-cols-4 gap-1 px-4 py-3 bg-muted/30 border-y border-border/30">
            {macros.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="text-center py-1.5">
                  <Icon className={`w-4 h-4 mx-auto mb-1 ${m.color}`} />
                  <p className="font-bold text-sm">{m.value}</p>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[50vh] p-5 space-y-6">
          {/* Ingredients */}
          {recipe.ingredients?.length > 0 && (
            <section>
              <h3 className="font-display font-semibold text-sm flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs">🥕</span>
                Ingredientes
              </h3>
              <ul className="space-y-2">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="w-2 h-2 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                    <span className="text-muted-foreground">{ing}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Instructions */}
          {recipe.instructions?.length > 0 && (
            <section>
              <h3 className="font-display font-semibold text-sm flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs">📝</span>
                Modo de Preparo
              </h3>
              <ol className="space-y-3">
                {recipe.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground leading-relaxed pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/30 bg-muted/20">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
