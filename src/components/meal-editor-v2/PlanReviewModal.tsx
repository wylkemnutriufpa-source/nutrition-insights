import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { validateMealSubstitutions } from "@/lib/mealPlanSubstitutionValidator";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type MealPlanItem = Tables<"meal_plan_items">;

interface PlanReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: MealPlanItem[];
  onConfirm: () => void;
  isSaving?: boolean;
}

export function PlanReviewModal({ open, onOpenChange, items, onConfirm, isSaving }: PlanReviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Revisão do Plano Alimentar
          </DialogTitle>
          <DialogDescription>
            Confira as refeições e substituições antes de salvar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {items.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).map((item) => {
            const validation = validateMealSubstitutions(item);
            const meta = (item as any).edit_metadata || (item as any).metadata || {};
            const substitutions = meta.substitutions_json as string[] || [];

            return (
              <div key={item.id} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-mono">{item.calories_target} kcal</p>
                    <p className="text-muted-foreground">P: {item.protein_target}g | C: {item.carbs_target}g | G: {item.fat_target}g</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Opção Principal</p>
                    <div className="p-2 rounded bg-background border text-sm italic">
                      {item.content || "Nenhum conteúdo definido"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Substituições ({substitutions.length})</p>
                    <div className="space-y-1">
                      {substitutions.length > 0 ? (
                        substitutions.map((sub, idx) => {
                          const error = validation.detailedErrors.find(e => e.substitutionIndex === idx);
                          return (
                            <div 
                              key={idx} 
                              className={cn(
                                "p-2 rounded border text-xs flex justify-between items-center gap-2",
                                error ? "bg-destructive/10 border-destructive/20" : "bg-emerald-500/5 border-emerald-500/10"
                              )}
                            >
                              <span className="truncate flex-1">{sub}</span>
                              {error ? (
                                <div className="flex items-center gap-1 text-destructive font-bold shrink-0">
                                  <XCircle className="w-3 h-3" />
                                  <span>Fora</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-emerald-600 font-bold shrink-0">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Aprovado</span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Nenhuma substituição</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar ao Editor
          </Button>
          <Button onClick={onConfirm} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Confirmar e Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
