import { Badge } from "@/components/ui/badge";
import { Ban } from "lucide-react";
import { BRAZILIAN_REPLACEMENTS } from "@/lib/planSimplicityEngine";

interface BlockedFoodsBadgeListProps {
  blockedFoods: string[];
  showReplacements?: boolean;
}

export default function BlockedFoodsBadgeList({ blockedFoods, showReplacements = true }: BlockedFoodsBadgeListProps) {
  if (blockedFoods.length === 0) return null;

  const normalize = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Ban className="w-4 h-4 text-red-500" />
        <span className="text-xs font-semibold text-red-700">
          Alimentos Bloqueados Detectados ({blockedFoods.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {blockedFoods.map((food, i) => {
          const replacement = Object.entries(BRAZILIAN_REPLACEMENTS).find(
            ([key]) => normalize(key) === normalize(food) || normalize(food).includes(normalize(key))
          );

          return (
            <div key={`${food}-${i}`} className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-700 border-red-500/20">
                ❌ {food}
              </Badge>
              {showReplacements && replacement && (
                <>
                  <span className="text-[10px] text-muted-foreground">→</span>
                  <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-700 border-green-500/20">
                    ✅ {replacement[1].replacement}
                  </Badge>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
