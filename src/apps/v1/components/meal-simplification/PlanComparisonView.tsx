import { Badge } from "@v1/components/ui/badge";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { MealPlanItem } from "@v1/stores/mealPlanEditorV2Store";
import type { SimplicityScore } from "@v1/lib/planSimplicityEngine";
import PlanSimplicityScoreCard from "./PlanSimplicityScoreCard";
import { getMealTypeLabel } from "@v1/lib/planSimplicityEngine";

interface PlanComparisonViewProps {
  originalItems: MealPlanItem[];
  simplifiedItems: Array<MealPlanItem & { _modified?: boolean; _replacements?: string[] }>;
  originalScore: SimplicityScore;
  projectedScore: SimplicityScore;
}

export default function PlanComparisonView({
  originalItems,
  simplifiedItems,
  originalScore,
  projectedScore,
}: PlanComparisonViewProps) {
  const modifiedItems = simplifiedItems.filter(i => i._modified);
  const scoreDiff = projectedScore.total - originalScore.total;

  // Group by meal type for display
  const mealTypes = [...new Set(originalItems.map(i => i.meal_type))];

  // Compute macro totals
  const origCals = originalItems.reduce((s, i) => s + (i.calories_target || 0), 0);
  const simpCals = simplifiedItems.reduce((s, i) => s + (i.calories_target || 0), 0);
  const origProt = originalItems.reduce((s, i) => s + (i.protein_target || 0), 0);
  const simpProt = simplifiedItems.reduce((s, i) => s + (i.protein_target || 0), 0);

  return (
    <div className="space-y-4">
      {/* Score comparison */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Antes</p>
          <PlanSimplicityScoreCard score={originalScore} compact />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Depois</p>
          <PlanSimplicityScoreCard score={projectedScore} compact />
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-border bg-secondary/20 p-3">
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div>
            <p className="text-muted-foreground">Score</p>
            <div className="flex items-center justify-center gap-1">
              <span className={originalScore.color}>{originalScore.total}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className={projectedScore.color}>{projectedScore.total}</span>
              <DiffBadge diff={scoreDiff} />
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">Calorias</p>
            <p className="font-medium">{origCals} → {simpCals}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Proteína</p>
            <p className="font-medium">{origProt}g → {simpProt}g</p>
          </div>
          <div>
            <p className="text-muted-foreground">Trocas</p>
            <p className="font-bold text-primary">{modifiedItems.length}</p>
          </div>
        </div>
      </div>

      {/* Detail comparison */}
      <ScrollArea className="max-h-96">
        <div className="space-y-3">
          {mealTypes.map(mt => {
            const origMeal = originalItems.filter(i => i.meal_type === mt);
            const simpMeal = simplifiedItems.filter(i => i.meal_type === mt);
            const hasChanges = simpMeal.some(i => i._modified);

            if (!hasChanges) return null;

            return (
              <div key={mt} className="rounded-lg border border-border overflow-hidden">
                <div className="px-3 py-2 bg-secondary/40 border-b border-border">
                  <span className="text-xs font-semibold">{getMealTypeLabel(mt)}</span>
                </div>
                <div className="grid grid-cols-2 divide-x divide-border">
                  {/* Before */}
                  <div className="p-2 space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground">ANTES</p>
                    {origMeal.map(item => (
                      <div key={item.id} className="text-xs">
                        <p className="font-medium text-red-600/80 line-through">{item.title}</p>
                        {item.description && (
                          <p className="text-[10px] text-muted-foreground line-through">{item.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* After */}
                  <div className="p-2 space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground">DEPOIS</p>
                    {simpMeal.map((item, idx) => (
                      <div key={`s-${idx}`} className="text-xs">
                        <p className={`font-medium ${item._modified ? "text-green-600" : ""}`}>
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-[10px] text-muted-foreground">{item.description}</p>
                        )}
                        {item._replacements && item._replacements.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {item._replacements.map((r, ri) => (
                              <Badge key={ri} variant="outline" className="text-[9px] bg-green-500/5 text-green-700 border-green-500/20">
                                {r}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function DiffBadge({ diff }: { diff: number }) {
  if (diff > 0) {
    return (
      <span className="flex items-center text-[10px] text-green-600">
        <TrendingUp className="w-3 h-3 mr-0.5" />+{diff}
      </span>
    );
  }
  if (diff < 0) {
    return (
      <span className="flex items-center text-[10px] text-red-600">
        <TrendingDown className="w-3 h-3 mr-0.5" />{diff}
      </span>
    );
  }
  return (
    <span className="flex items-center text-[10px] text-muted-foreground">
      <Minus className="w-3 h-3" />
    </span>
  );
}
