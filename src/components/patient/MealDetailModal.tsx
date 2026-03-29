import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Flame, Beef, Wheat, Droplets, Clock, ChefHat, Target,
  Shuffle, Leaf, UtensilsCrossed, ScrollText,
} from "lucide-react";

interface FoodItem {
  name: string;
  portion: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface Substitution {
  replace: string;
  options: string[];
}

export interface MealDetailData {
  title: string;
  description?: string | null;
  meal_type?: string;
  calories_target?: number | null;
  protein_target?: number | null;
  carbs_target?: number | null;
  fat_target?: number | null;
  metadata?: Record<string, any> | null;
  image_url?: string | null;
}

interface MealDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: MealDetailData | null;
}

const MEAL_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  breakfast: { label: "Café da Manhã", emoji: "☕" },
  morning_snack: { label: "Lanche da Manhã", emoji: "🍌" },
  lunch: { label: "Almoço", emoji: "🍽️" },
  afternoon_snack: { label: "Lanche da Tarde", emoji: "🍎" },
  dinner: { label: "Jantar", emoji: "🌙" },
  evening_snack: { label: "Ceia", emoji: "🫖" },
};

const GOAL_LABELS: Record<string, { label: string; color: string }> = {
  weight_loss: { label: "Emagrecimento", color: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
  hypertrophy: { label: "Hipertrofia", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  metabolic: { label: "Metabólico", color: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
  low_carb: { label: "Low Carb", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  functional: { label: "Funcional", color: "bg-teal-500/15 text-teal-600 border-teal-500/30" },
  maintenance: { label: "Manutenção", color: "bg-slate-500/15 text-slate-600 border-slate-500/30" },
};

const CLINICAL_LABELS: Record<string, string> = {
  diabetes: "Diabetes",
  intestinal: "Saúde Intestinal",
  hormonal: "Equilíbrio Hormonal",
  anti_inflammatory: "Anti-inflamatório",
  anti_inflamatorio: "Anti-inflamatório",
  cardiovascular: "Cardiovascular",
  detox: "Detox",
  saciedade: "Alta Saciedade",
  sono: "Melhora do Sono",
};

function parseJsonField<T>(value: any): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return []; }
  }
  return [];
}

export function MealDetailModal({ open, onOpenChange, meal }: MealDetailModalProps) {
  if (!meal) return null;

  const meta = meal.metadata || {};
  const foods: FoodItem[] = parseJsonField<FoodItem>(meta.foods || meta.foods_structure);
  const substitutions: Substitution[] = parseJsonField<Substitution>(meta.substitutions);
  const instructions: string | undefined = meta.instructions || meta.preparation;
  const prepTime: number | undefined = meta.prep_time_minutes || meta.prep_time;
  const goalTag: string | undefined = meta.goal_tag;
  const clinicalTags: string[] = parseJsonField<string>(meta.clinical_tags || meta.clinical_tag);
  const source: string | undefined = meta.source;
  const mealTypeInfo = MEAL_TYPE_LABELS[meal.meal_type || ""] || null;
  const imageUrl = meal.image_url || meta.image_url;

  const hasMacros = meal.calories_target || meal.protein_target || meal.carbs_target || meal.fat_target;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden rounded-2xl border-border/50 shadow-2xl backdrop-blur-sm fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]">
        {/* Hero Photo */}
        {imageUrl && (
          <div className="relative w-full h-48 overflow-hidden">
            <img
              src={imageUrl}
              alt={meal.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            {/* Overlay title on photo */}
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/10">
                  <UtensilsCrossed className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white drop-shadow-lg">{meal.title}</h3>
                  {mealTypeInfo && (
                    <p className="text-xs text-white/70 drop-shadow">{mealTypeInfo.emoji} {mealTypeInfo.label}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header (without photo) */}
        {!imageUrl && (
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
            <DialogHeader className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    <UtensilsCrossed className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-lg font-bold leading-tight">{meal.title}</DialogTitle>
                    <DialogDescription className="text-xs mt-0.5">
                      {mealTypeInfo
                        ? `${mealTypeInfo.emoji} ${mealTypeInfo.label}`
                        : meal.description
                          ? meal.description
                          : "Detalhes da refeição"}
                    </DialogDescription>
                  </div>
                </div>
              </div>
            </DialogHeader>
          </div>
        )}

        {/* Tags row */}
        {(goalTag || clinicalTags.length > 0 || prepTime || source === "library") && (
          <div className="flex flex-wrap gap-1.5 px-6 pt-3">
            {goalTag && GOAL_LABELS[goalTag] && (
              <Badge variant="outline" className={`text-[10px] ${GOAL_LABELS[goalTag].color}`}>
                <Target className="w-2.5 h-2.5 mr-1" />
                {GOAL_LABELS[goalTag].label}
              </Badge>
            )}
            {clinicalTags.map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px] bg-accent/50 border-accent">
                <Leaf className="w-2.5 h-2.5 mr-1" />
                {CLINICAL_LABELS[tag] || tag.replace(/_/g, " ")}
              </Badge>
            ))}
            {prepTime && (
              <Badge variant="outline" className="text-[10px]">
                <Clock className="w-2.5 h-2.5 mr-1" /> {prepTime} min
              </Badge>
            )}
            {source === "library" && (
              <Badge variant="outline" className="text-[10px] bg-primary/10 border-primary/30 text-primary">
                Banco FitJourney
              </Badge>
            )}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-8 space-y-6 max-h-[calc(90vh-160px)]">
          {/* Macros */}
          {hasMacros && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Calorias", value: meal.calories_target, unit: "", icon: <Flame className="w-5 h-5 text-orange-500" /> },
                { label: "Proteína", value: meal.protein_target, unit: "g", icon: <Beef className="w-5 h-5 text-red-500" /> },
                { label: "Carbs", value: meal.carbs_target, unit: "g", icon: <Wheat className="w-5 h-5 text-amber-500" /> },
                { label: "Gordura", value: meal.fat_target, unit: "g", icon: <Droplets className="w-5 h-5 text-yellow-500" /> },
              ].map(m => (
                <div key={m.label} className="rounded-xl bg-secondary/60 p-3 text-center">
                  <div className="flex justify-center mb-1.5">{m.icon}</div>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  <p className="font-bold text-base">{m.value != null ? `${Number(m.value).toFixed(0)}${m.unit}` : "—"}</p>
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          {meal.description && (
            <p className="text-sm text-muted-foreground">{meal.description}</p>
          )}

          {/* Ingredients */}
          {foods.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ChefHat className="w-5 h-5 text-primary" />
                <h4 className="font-semibold text-base">Ingredientes</h4>
              </div>
              <ul className="space-y-2.5">
                {foods.map((food, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm bg-secondary/30 rounded-lg px-3 py-2.5">
                    <span className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
                    <span className="flex-1 font-medium">{food.name}</span>
                    <span className="text-xs text-muted-foreground font-semibold bg-secondary rounded px-2 py-0.5">{food.portion}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Instructions */}
          {instructions && (
            <>
              <Separator />
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <ScrollText className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold text-base">Modo de Preparo</h4>
                </div>
                <div className="rounded-lg bg-secondary/30 p-4">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{instructions}</p>
                </div>
              </section>
            </>
          )}

          {/* Substitutions */}
          {substitutions.length > 0 && (
            <>
              <Separator />
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Shuffle className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold text-base">Substituições</h4>
                </div>
                <div className="space-y-2.5">
                  {substitutions.map((sub, idx) => (
                    <div key={idx} className="rounded-lg bg-secondary/40 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">
                        Trocar <span className="text-foreground font-semibold">{sub.replace}</span> por:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {sub.options.map((opt, oi) => (
                          <Badge key={oi} variant="secondary" className="text-xs">{opt}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Empty state */}
          {foods.length === 0 && !instructions && substitutions.length === 0 && !hasMacros && !imageUrl && (
            <div className="text-center py-10 text-muted-foreground">
              <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Detalhes serão adicionados pelo seu nutricionista.</p>
              <p className="text-xs mt-1">Macros, ingredientes e instruções aparecerão aqui.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
