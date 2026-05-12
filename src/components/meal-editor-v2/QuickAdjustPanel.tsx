import { useMealPlanEditorV2Store } from "@v1/stores/mealPlanEditorV2Store";
import { Button } from "@v1/components/ui/button";
import { Beef, Wheat, Flame, Plus, Minus, Zap, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function QuickAdjustPanel() {
  const { recalculateMealPlan, items, plan } = useMealPlanEditorV2Store();
  
  const masterItems = items.filter(i => i.day_of_week === 0);
  const totalProt = masterItems.reduce((s, i) => s + (Number(i.protein_target) || 0), 0);
  const totalCarb = masterItems.reduce((s, i) => s + (Number(i.carbs_target) || 0), 0);
  const totalKcal = masterItems.reduce((s, i) => s + (Number(i.calories_target) || 0), 0);

  const handleAdjust = (type: "protein" | "carbs" | "calories", amount: number) => {
    recalculateMealPlan({ [type]: amount });
  };

  // Soft Guards / Clinical Standard
  const pRatio = totalProt > 0 ? (totalProt * 4) / totalKcal : 0;
  const isPlow = pRatio < 0.15;
  const isChigh = (totalCarb * 4) / totalKcal > 0.65;

  return (
    <div className="sticky top-0 z-[40] bg-background/80 backdrop-blur-xl border-b border-primary/10 shadow-sm px-6 py-3 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-6 shrink-0">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Ajuste Rápido</span>
          <div className="flex items-center gap-2 mt-0.5">
            <div className={`h-2 w-2 rounded-full ${isPlow || isChigh ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
            <span className="text-xs font-semibold">{isPlow || isChigh ? "Fora do padrão" : "Ajuste aplicado"}</span>
          </div>
        </div>

        <div className="h-8 w-px bg-border mx-2" />

        {/* Protein Controls */}
        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border/50">
          <div className="flex items-center gap-1.5 px-2">
            <Beef className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-sm font-bold font-mono">{Math.round(totalProt)}g</span>
          </div>
          <div className="flex gap-1">
            <Button variant="secondary" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleAdjust("protein", -5)}>
              <Minus className="w-3 h-3" />
            </Button>
            <Button variant="secondary" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleAdjust("protein", 5)}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Carb Controls */}
        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border/50">
          <div className="flex items-center gap-1.5 px-2">
            <Wheat className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-sm font-bold font-mono">{Math.round(totalCarb)}g</span>
          </div>
          <div className="flex gap-1">
            <Button variant="secondary" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleAdjust("carbs", -10)}>
              <Minus className="w-3 h-3" />
            </Button>
            <Button variant="secondary" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleAdjust("carbs", 10)}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Calorie Controls */}
        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border/50">
          <div className="flex items-center gap-1.5 px-2">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-sm font-bold font-mono">{Math.round(totalKcal)}</span>
          </div>
          <div className="flex gap-1">
            <Button variant="secondary" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleAdjust("calories", -100)}>
              <Minus className="w-3 h-3" />
            </Button>
            <Button variant="secondary" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleAdjust("calories", 100)}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Button 
          variant="outline" 
          className="h-8 rounded-full border-primary/20 hover:bg-primary/5 text-primary text-xs gap-2"
          onClick={() => {
            recalculateMealPlan({ protein: 10 });
            toast.info("Priorizando Proteína (+10g)");
          }}
        >
          <Zap className="w-3 h-3" />
          +10g Proteína
        </Button>
        <Button 
          variant="outline" 
          className="h-8 rounded-full border-amber-500/20 hover:bg-amber-500/5 text-amber-600 text-xs gap-2"
          onClick={() => {
            recalculateMealPlan({ carbs: -20 });
            toast.info("Reduzindo Carboidratos (-20g)");
          }}
        >
          <Zap className="w-3 h-3" />
          -20g Carbo
        </Button>
        
        {(isPlow || isChigh) && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
            <AlertCircle className="w-3 h-3" />
            DESVIO CLÍNICO
          </div>
        )}
      </div>
    </div>
  );
}