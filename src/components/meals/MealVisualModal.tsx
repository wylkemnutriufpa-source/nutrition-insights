import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Flame, Beef, Wheat, Droplets, ChefHat, UtensilsCrossed, ScrollText } from "lucide-react";
import MealVisualPlaceholder from "./MealVisualPlaceholder";
import type { MealVisualItem } from "@/types/mealVisualLibrary";
import { MEAL_VISUAL_CATEGORIES } from "@/types/mealVisualLibrary";

interface MealVisualModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MealVisualItem | null;
  /** Override data from the actual plan item (clinical data takes priority) */
  planOverrides?: {
    title?: string;
    description?: string | null;
    calories_target?: number | null;
    protein_target?: number | null;
    carbs_target?: number | null;
    fat_target?: number | null;
    image_url?: string | null;
  };
}

export default function MealVisualModal({ open, onOpenChange, item, planOverrides }: MealVisualModalProps) {
  if (!item) return null;

  const title = planOverrides?.title || item.display_name;
  const description = planOverrides?.description || item.short_description;
  const calories = planOverrides?.calories_target ?? item.default_calories;
  const protein = planOverrides?.protein_target ?? item.default_protein;
  const carbs = planOverrides?.carbs_target ?? item.default_carbs;
  const fat = planOverrides?.fat_target ?? item.default_fat;
  const imageUrl = planOverrides?.image_url || item.image_url || item.image_path;
  const cat = MEAL_VISUAL_CATEGORIES[item.category];
  const hasMacros = calories || protein || carbs || fat;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden rounded-2xl border-border/50 shadow-2xl backdrop-blur-sm">
        {/* Hero */}
        {imageUrl ? (
          <div className="relative w-full h-48 overflow-hidden">
            <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/10">
                  <UtensilsCrossed className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white drop-shadow-lg">{title}</h3>
                  {cat && <p className="text-xs text-white/70 drop-shadow">{cat.emoji} {cat.label}</p>}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-3">
                <MealVisualPlaceholder size="sm" />
                <div>
                  <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">
                    {cat ? `${cat.emoji} ${cat.label}` : "Detalhes da refeição"}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>
        )}

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-6 pt-3">
            {item.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary">
                {tag}
              </Badge>
            ))}
            {item.default_portion && (
              <Badge variant="outline" className="text-[10px]">
                {item.default_portion}
              </Badge>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-8 space-y-5 max-h-[calc(90vh-200px)]">
          {/* Macros */}
          {hasMacros && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Calorias", value: calories, unit: "", icon: <Flame className="w-5 h-5 text-orange-500" /> },
                { label: "Proteína", value: protein, unit: "g", icon: <Beef className="w-5 h-5 text-red-500" /> },
                { label: "Carbs", value: carbs, unit: "g", icon: <Wheat className="w-5 h-5 text-amber-500" /> },
                { label: "Gordura", value: fat, unit: "g", icon: <Droplets className="w-5 h-5 text-yellow-500" /> },
              ].map((m) => (
                <div key={m.label} className="rounded-xl bg-secondary/60 p-3 text-center">
                  <div className="flex justify-center mb-1.5">{m.icon}</div>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  <p className="font-bold text-base">{m.value != null ? `${Number(m.value).toFixed(0)}${m.unit}` : "—"}</p>
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}

          {/* Recipe */}
          {item.base_recipe && (
            <>
              <Separator />
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <ScrollText className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold text-base">Receita / Preparo</h4>
                </div>
                <div className="rounded-lg bg-secondary/30 p-4">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {item.base_recipe}
                  </p>
                </div>
              </section>
            </>
          )}

          {/* Empty state */}
          {!hasMacros && !description && !item.base_recipe && (
            <div className="text-center py-10 text-muted-foreground">
              <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Informações detalhadas em breve.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
