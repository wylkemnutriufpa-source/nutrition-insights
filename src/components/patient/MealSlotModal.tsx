import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Flame, Beef, Wheat, Droplets, Utensils, 
  Clock, ArrowRightLeft, CheckCircle2,
  Circle, MinusCircle, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MealPlanItem, MealCompletion, AdherenceStatus, MealDetailData } from "./MealPlanDailyView";
import { MealItemCard, MEAL_TYPES, IMPACT_TAGS, getImpactTags } from "./MealPlanDailyView";

interface MealSlotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealType: string;
  items: MealPlanItem[];
  completions: MealCompletion[];
  onSetAdherence: (item: MealPlanItem, status: AdherenceStatus) => void;
  onOpenSubstitution: (item: MealPlanItem) => void;
  onOpenDetail: (item: MealDetailData) => void;
}

export function MealSlotModal({
  open,
  onOpenChange,
  mealType,
  items,
  completions,
  onSetAdherence,
  onOpenSubstitution,
  onOpenDetail,
}: MealSlotModalProps) {
  const mealConfig = MEAL_TYPES.find(m => m.key === mealType);
  
  // SOBERANIA V3: Snapshot Soberano é a fonte única.
  // Cálculo removido. Os totais de cada slot devem vir do snapshot.
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden flex flex-col rounded-3xl border-none shadow-2xl">
        <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-inner">
                {mealConfig?.icon || <Utensils className="w-6 h-6" />}
              </div>
              <div className="flex-1 text-left">
                <DialogTitle className="text-xl font-display font-bold">
                  {mealConfig?.label || "Refeição"}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 text-xs font-medium">
                  <Clock className="w-3 h-3" /> {mealConfig?.time}
                </DialogDescription>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Total da Refeição</p>
                <div className="flex items-center gap-1.5 justify-end">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-lg font-display font-bold text-orange-600">{Math.round(totals.calories)} kcal</span>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-2 text-center">
              <p className="text-[8px] text-muted-foreground uppercase font-bold">Proteína</p>
              <p className="font-bold text-sm text-red-600">{Math.round(totals.protein)}g</p>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-2 text-center">
              <p className="text-[8px] text-muted-foreground uppercase font-bold">Carbs</p>
              <p className="font-bold text-sm text-amber-600">{Math.round(totals.carbs)}g</p>
            </div>
            <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-2 text-center">
              <p className="text-[8px] text-muted-foreground uppercase font-bold">Gordura</p>
              <p className="font-bold text-sm text-yellow-600">{Math.round(totals.fat)}g</p>
            </div>
          </div>
        </div>

        <Separator className="opacity-50" />

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6 pb-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Utensils className="w-3 h-3" /> Itens da Refeição
              </h4>
              <div className="space-y-3">
                {items.filter(Boolean).map((item) => {
                  const completion = (completions || []).find(c => c && c.meal_plan_item_id === item.id);
                  return (
                    <div key={item.id} className="relative">
                      <MealItemCard
                        item={item}
                        status={completion?.adherence_status || null}
                        completedAt={completion?.completed_at || null}
                        isJustDone={false}
                        focusMode={true}
                        onSetAdherence={onSetAdherence}
                        onOpenDetail={onOpenDetail}
                        onOpenSubstitution={onOpenSubstitution}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 text-center">
              <p className="text-xs text-muted-foreground">
                Dica: Se precisar trocar algum item, clique em <b>"Trocar Opção"</b> no respectivo card acima.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
