import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Clock, Users, Flame, Beef, Wheat, Droplets } from "lucide-react";
import { fmtMacro } from "@/lib/formatMacros";

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  ingredients: any;
  instructions: any;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  porcoes: number | null;
  difficulty: string | null;
  category: string | null;
  calories_per_serving: number | null;
  protein_per_serving: number | null;
  carbs_per_serving: number | null;
  fat_per_serving: number | null;
  image_url?: string | null;
  tags?: string[] | null;
}

interface Props {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const difficultyMap: Record<string, string> = { easy: "Fácil", medium: "Média", hard: "Difícil" };
const categoryMap: Record<string, string> = { main: "Prato Principal", snack: "Lanche", dessert: "Sobremesa", breakfast: "Café da Manhã", salad: "Salada", soup: "Sopa", drink: "Bebida" };
const difficultyColor: Record<string, string> = { easy: "bg-green-500/10 text-green-600", medium: "bg-orange-500/10 text-orange-600", hard: "bg-red-500/10 text-red-600" };

function formatIngredient(item: any): string {
  if (!item) return "";
  if (typeof item === "string") return item;
  if (typeof item === "object") {
    const name = item.item || item.name || item.ingredient || "";
    const amount = item.amount || item.quantity || item.qty || "";
    const unit = item.unit || "";
    const obs = item.observation || item.obs || "";
    if (!name) return JSON.stringify(item);
    const parts = [name];
    if (amount || unit) parts.push("—");
    if (amount) parts.push(String(amount));
    if (unit) parts.push(String(unit));
    if (obs) parts.push(`(${obs})`);
    return parts.join(" ").trim();
  }
  return String(item);
}

function toSafeArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(formatIngredient).filter(Boolean);
  if (typeof val === "string") return val.split("\n").filter(Boolean);
  return [];
}

function toStringArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((v) => {
    if (!v) return "";
    if (typeof v === "string") return v;
    if (typeof v === "object") {
      // For instructions: look for step/text/description
      return v.step || v.text || v.description || v.instruction || formatIngredient(v);
    }
    return String(v);
  }).filter(Boolean);
  if (typeof val === "string") return val.split("\n").filter(Boolean);
  return [];
}

export default function PremiumRecipeModal({ recipe, open, onOpenChange }: Props) {
  if (!recipe) return null;

  const prepTime = recipe.prep_time_minutes ?? 0;
  const cookTime = recipe.cook_time_minutes ?? 0;
  const totalTime = prepTime + cookTime;
  const porcoes = recipe.porcoes ?? 1;
  const difficulty = recipe.difficulty ?? "medium";
  const category = recipe.category ?? "main";
  const ingredients = toSafeArray(recipe.ingredients);
  const instructions = toStringArray(recipe.instructions);

  const macros = [
    { label: "Kcal", value: recipe.calories_per_serving != null ? fmtMacro(recipe.calories_per_serving) : null, icon: Flame, color: "text-orange-500" },
    { label: "Proteína", value: recipe.protein_per_serving != null ? `${fmtMacro(recipe.protein_per_serving)}g` : null, icon: Beef, color: "text-red-500" },
    { label: "Carboidrato", value: recipe.carbs_per_serving != null ? `${fmtMacro(recipe.carbs_per_serving)}g` : null, icon: Wheat, color: "text-amber-500" },
    { label: "Gordura", value: recipe.fat_per_serving != null ? `${fmtMacro(recipe.fat_per_serving)}g` : null, icon: Droplets, color: "text-blue-500" },
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
            <Badge className={`text-xs ${difficultyColor[difficulty] || ""}`}>
              {difficultyMap[difficulty] || difficulty}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {categoryMap[category] || category}
            </Badge>
          </div>

          <h2 className="font-display text-xl font-bold leading-tight pr-8">{recipe.title}</h2>
          {recipe.description && (
            <p className="text-sm text-muted-foreground mt-2">{recipe.description}</p>
          )}

          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            {totalTime > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> {totalTime} min
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" /> {porcoes} porções
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
          {ingredients.length > 0 && (
            <section>
              <h3 className="font-display font-semibold text-sm flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs">🥕</span>
                Ingredientes
              </h3>
              <ul className="space-y-2">
                {ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="w-2 h-2 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                    <span className="text-muted-foreground">{ing}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Instructions */}
          {instructions.length > 0 && (
            <section>
              <h3 className="font-display font-semibold text-sm flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs">📝</span>
                Modo de Preparo
              </h3>
              <ol className="space-y-3">
                {instructions.map((step, i) => (
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

          {/* Empty fallback */}
          {ingredients.length === 0 && instructions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Detalhes da receita ainda não disponíveis.
            </p>
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
