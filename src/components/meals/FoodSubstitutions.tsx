import { useState } from "react";
import { FOOD_DATABASE, type FoodItem } from "./FoodAutocomplete";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRightLeft, Flame, Beef, Wheat, Droplets } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  proteina: "bg-red-500/10 text-red-700 border-red-500/20",
  carboidrato: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  verdura: "bg-green-500/10 text-green-700 border-green-500/20",
  fruta: "bg-pink-500/10 text-pink-700 border-pink-500/20",
  gordura: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  laticinio: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  preparacao: "bg-purple-500/10 text-purple-700 border-purple-500/20",
};

const CATEGORY_LABELS: Record<string, string> = {
  proteina: "🥩 Proteínas",
  carboidrato: "🌾 Carboidratos",
  verdura: "🥦 Verduras",
  fruta: "🍎 Frutas",
  gordura: "🥑 Gorduras",
  laticinio: "🥛 Laticínios",
  preparacao: "🍽️ Preparações",
};

export function getCategoryColor(foodName: string): string {
  const match = FOOD_DATABASE.find(f => {
    const a = f.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const b = foodName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return a === b || b.includes(a) || a.includes(b);
  });
  if (!match) return "";
  return CATEGORY_COLORS[match.category] || "";
}

export function getCategoryDot(foodName: string): string {
  const match = FOOD_DATABASE.find(f => {
    const a = f.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const b = foodName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return a === b || b.includes(a) || a.includes(b);
  });
  if (!match) return "";
  const dots: Record<string, string> = {
    proteina: "bg-red-400",
    carboidrato: "bg-amber-400",
    verdura: "bg-green-400",
    fruta: "bg-pink-400",
    gordura: "bg-yellow-400",
    laticinio: "bg-blue-400",
    preparacao: "bg-purple-400",
  };
  return dots[match.category] || "";
}

interface FoodSubstitutionsProps {
  currentFood: string;
  onSelect: (food: FoodItem) => void;
}

export default function FoodSubstitutions({ currentFood, onSelect }: FoodSubstitutionsProps) {
  const [showAll, setShowAll] = useState(false);

  // Find the current food in database
  const query = currentFood.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const currentMatch = FOOD_DATABASE.find(f => {
    const name = f.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return name === query || query.includes(name) || name.includes(query);
  });

  if (!currentMatch) return null;

  // Find substitutions from same category
  const substitutions = FOOD_DATABASE.filter(
    f => f.category === currentMatch.category && f.name !== currentMatch.name
  ).sort((a, b) => {
    // Sort by caloric proximity
    const diffA = Math.abs(a.calories - currentMatch.calories);
    const diffB = Math.abs(b.calories - currentMatch.calories);
    return diffA - diffB;
  });

  if (substitutions.length === 0) return null;

  const displayed = showAll ? substitutions : substitutions.slice(0, 5);

  return (
    <div className="rounded-lg border border-border bg-secondary/20 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-secondary/40 border-b border-border">
        <ArrowRightLeft className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold">Substituições Equivalentes</span>
        <Badge variant="outline" className="text-[10px] ml-auto">
          {CATEGORY_LABELS[currentMatch.category] || currentMatch.category}
        </Badge>
      </div>
      <ScrollArea className={showAll ? "max-h-48" : ""}>
        <div className="p-1.5 space-y-0.5">
          {displayed.map((food, i) => {
            // Calculate equivalent portion to match original calories
            const ratio = currentMatch.calories > 0 ? currentMatch.calories / food.calories : 1;
            const adjustedCal = Math.round(food.calories * ratio);
            const adjustedProt = +(food.protein * ratio).toFixed(1);
            const adjustedCarbs = +(food.carbs * ratio).toFixed(1);
            const adjustedFat = +(food.fat * ratio).toFixed(1);
            
            // Parse portion to adjust quantity
            const portionMatch = food.portion.match(/^([\d,.]+)/);
            const adjustedPortion = portionMatch
              ? food.portion.replace(portionMatch[1], String(Math.round(parseFloat(portionMatch[1].replace(",", ".")) * ratio)))
              : food.portion;

            const calDiff = adjustedCal - currentMatch.calories;
            return (
              <button
                key={`${food.name}-${i}`}
                type="button"
                className="w-full text-left px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors flex items-center gap-2 group"
                onClick={() => onSelect({ ...food, portion: adjustedPortion, calories: adjustedCal, protein: adjustedProt, carbs: adjustedCarbs, fat: adjustedFat })}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{food.name}</p>
                  <p className="text-[10px] font-semibold text-primary/70">📏 {adjustedPortion}</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] shrink-0">
                  <span className="flex items-center gap-0.5 text-muted-foreground">
                    <Flame className="w-2.5 h-2.5 text-orange-400" />{adjustedCal}
                  </span>
                  <span className="flex items-center gap-0.5 text-muted-foreground">
                    <Beef className="w-2.5 h-2.5 text-red-400" />{adjustedProt}g
                  </span>
                  <span className="flex items-center gap-0.5 text-muted-foreground">
                    <Wheat className="w-2.5 h-2.5 text-amber-500" />{adjustedCarbs}g
                  </span>
                  <span className={`text-[9px] ${calDiff > 5 ? "text-orange-500" : calDiff < -5 ? "text-green-500" : "text-muted-foreground"}`}>
                    {calDiff > 0 ? `+${calDiff}` : calDiff === 0 ? "≈" : calDiff}cal
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
      {substitutions.length > 5 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="w-full text-center py-1.5 text-[10px] text-primary hover:bg-accent/30 transition-colors border-t border-border"
        >
          {showAll ? "Mostrar menos" : `Ver todas (${substitutions.length})`}
        </button>
      )}
    </div>
  );
}
