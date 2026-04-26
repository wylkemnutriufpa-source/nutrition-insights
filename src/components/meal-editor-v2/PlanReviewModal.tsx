import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, Info, ChevronRight, ChevronLeft, Navigation } from "lucide-react";
import { validateMealSubstitutions } from "@/lib/mealPlanSubstitutionValidator";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type MealPlanItem = Tables<"meal_plan_items">;

interface PlanReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: MealPlanItem[];
  onConfirm: (updatedItems: MealPlanItem[]) => void;
  isSaving?: boolean;
}

export function PlanReviewModal({ open, onOpenChange, items, onConfirm, isSaving }: PlanReviewModalProps) {
  const [activeMealIndex, setActiveMealIndex] = useState(0);
  const [localAprovals, setLocalAprovals] = useState<Record<string, Record<number, boolean>>>({});

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => (a.meal_type || "").localeCompare(b.meal_type || ""));
  }, [items]);

  const currentItem = sortedItems[activeMealIndex];

  const handleToggleApproval = (itemId: string, subIndex: number) => {
    setLocalAprovals(prev => {
      const itemApprovals = prev[itemId] || {};
      return {
        ...prev,
        [itemId]: {
          ...itemApprovals,
          [subIndex]: !itemApprovals[subIndex]
        }
      };
    });
  };

  if (!currentItem) return null;

  const validation = validateMealSubstitutions(currentItem);
  const meta = (currentItem as any).edit_metadata || (currentItem as any).metadata || {};
  const substitutions = meta.substitutions_json as string[] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Revisão do Plano Alimentar
          </DialogTitle>
          <DialogDescription>
            Confira as refeições e substituições. Marque itens para aprovação ou exclusão.
          </DialogDescription>
        </DialogHeader>

        {/* Quick Navigation Bar */}
        <div className="px-6 py-2 border-y bg-muted/20 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Navigation className="w-4 h-4 text-muted-foreground shrink-0" />
          {sortedItems.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setActiveMealIndex(idx)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
                activeMealIndex === idx 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-background border hover:border-primary/50 text-muted-foreground"
              )}
            >
              {item.title || "Refeição"}
              {validateMealSubstitutions(item).valid ? (
                <CheckCircle2 className="w-3 h-3 opacity-70" />
              ) : (
                <AlertCircle className="w-3 h-3 text-destructive" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Main Content Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant="outline" className="mb-2 bg-primary/5 text-primary border-primary/20">
                    {currentItem.meal_type}
                  </Badge>
                  <h3 className="font-display font-bold text-2xl tracking-tight">{currentItem.title}</h3>
                  <p className="text-muted-foreground mt-1">{currentItem.description}</p>
                </div>
                <div className="text-right glass p-3 rounded-xl border-primary/10">
                  <p className="font-mono text-xl font-bold text-primary">{currentItem.calories_target} kcal</p>
                  <div className="flex gap-2 text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-wider">
                    <span>P: {currentItem.protein_target}g</span>
                    <span>C: {currentItem.carbs_target}g</span>
                    <span>G: {currentItem.fat_target}g</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Primary Option */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Opção Principal
                  </h4>
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 min-h-[120px] text-sm leading-relaxed">
                    {currentItem.description || "Nenhum conteúdo definido"}
                  </div>
                </div>

                {/* Substitutions */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Substituições ({substitutions.length})
                  </h4>
                  <div className="space-y-2">
                    {substitutions.length > 0 ? (
                      substitutions.map((sub, idx) => {
                        const error = validation.detailedErrors.find(e => e.substitutionIndex === idx);
                        const isApproved = !localAprovals[currentItem.id]?.[idx] && !error;
                        
                        return (
                          <div 
                            key={idx} 
                            onClick={() => handleToggleApproval(currentItem.id, idx)}
                            className={cn(
                              "p-3 rounded-xl border text-sm flex justify-between items-center gap-3 cursor-pointer transition-all duration-200 group",
                              isApproved 
                                ? "bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/30" 
                                : "bg-destructive/5 border-destructive/20 hover:border-destructive/40"
                            )}
                          >
                            <span className={cn(
                              "flex-1 font-medium transition-colors",
                              !isApproved && "text-muted-foreground line-through decoration-destructive/50"
                            )}>{sub}</span>
                            
                            <div className="flex items-center gap-2 shrink-0">
                              {!isApproved ? (
                                <div className="flex items-center gap-1.5 text-destructive font-bold text-xs bg-destructive/10 px-2 py-1 rounded-lg">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>FORA</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs bg-emerald-500/10 px-2 py-1 rounded-lg">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>APROVADO</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center">
                        <Info className="w-6 h-6 text-muted-foreground/30 mb-2" />
                        <p className="text-xs text-muted-foreground italic">Nenhuma substituição configurada</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t bg-muted/5 flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setActiveMealIndex(prev => Math.max(0, prev - 1))}
              disabled={activeMealIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setActiveMealIndex(prev => Math.min(sortedItems.length - 1, prev + 1))}
              disabled={activeMealIndex === sortedItems.length - 1}
            >
              Próxima <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-muted-foreground">
              Voltar ao Editor
            </Button>
            <Button 
              size="sm"
              onClick={onConfirm} 
              disabled={isSaving || items.some(item => !validateMealSubstitutions(item).valid)}
              className="shadow-lg shadow-primary/20"
            >
              {isSaving ? "Salvando..." : "Confirmar e Salvar Plano"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
