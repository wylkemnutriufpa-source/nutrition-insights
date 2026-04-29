import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { Badge } from '@/components/ui/badge';
import { Package, Lock, PlusCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MealDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealId: string | null;
}

export const MealDetailsModal: React.FC<MealDetailsModalProps> = ({ isOpen, onClose, mealId }) => {
  const { meals } = useMealEditorV3Store();
  const meal = meals.find((m) => m.id === mealId);

  if (!meal) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl sm:rounded-3xl border-none shadow-2xl p-0 overflow-hidden h-[80vh] flex flex-col">
        <DialogHeader className="p-6 border-b bg-muted/20">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Package className="w-6 h-6 text-primary" />
            </div>
            {meal.name}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {meal.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Package className="w-12 h-12 opacity-20 mb-4" />
                <p>Nenhum alimento nesta refeição.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {meal.items.map((item) => (
                  <div key={item.instanceId} className="space-y-3">
                    <div className={cn(
                      "p-4 flex items-center gap-4 rounded-2xl border border-border/60 bg-white dark:bg-[#0d0d0d]",
                      (item.isMarmita || item.locked) && "border-orange-200/50 bg-orange-50/20"
                    )}>
                      {item.imageUrl && (
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0 border">
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold truncate text-base">{item.name}</h4>
                          {(item.isMarmita || item.locked) && (
                            <Lock className="w-3.5 h-3.5 text-orange-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium uppercase tracking-tight">
                          <span>{item.quantity} {item.portionUnit}</span>
                          <span className="opacity-30">•</span>
                          <span className="text-primary font-bold">{Math.round(item.calories * item.quantity)} kcal</span>
                        </div>
                      </div>
                    </div>

                    {item.substitutions && item.substitutions.length > 0 && (
                      <div className="ml-8 space-y-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">Substituições Sugeridas</p>
                        {item.substitutions.map((sub) => (
                          <div 
                            key={sub.id} 
                            className="flex items-center justify-between px-4 py-2.5 bg-muted/20 rounded-xl border border-dashed text-xs text-muted-foreground font-medium"
                          >
                            <div className="flex items-center gap-2">
                              <span className="italic font-black text-[10px] opacity-30">OU</span>
                              <span className="font-bold text-foreground">{sub.name}</span>
                              <span className="opacity-70">({sub.calories} kcal)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};