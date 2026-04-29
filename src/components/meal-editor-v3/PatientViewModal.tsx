import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Utensils, Coffee, Sun, Moon, Clock, Apple } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PatientViewModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { meals } = useMealEditorV3Store();

  const MEAL_ICONS: Record<string, any> = {
    'sun': Sun,
    'coffee': Coffee,
    'utensils': Utensils,
    'apple': Apple,
    'moon': Moon,
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md h-[90vh] flex flex-col p-0 overflow-hidden sm:rounded-3xl border-none shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b bg-primary text-primary-foreground">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Apple className="w-6 h-6" />
            Meu Plano Alimentar
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 bg-muted/30">
          <div className="p-4 space-y-4">
            {meals.map((meal) => {
              const Icon = MEAL_ICONS[meal.icon || 'utensils'] || Utensils;
              const totalKcal = meal.items.reduce((acc, item) => {
                const currentMeasure = item.householdMeasures?.find(m => m.unit === item.selectedUnit) || { unit: item.portionUnit, factor: 1 };
                return acc + (item.calories * item.quantity * currentMeasure.factor);
              }, 0);

              return (
                <Card key={meal.id} className="overflow-hidden border-none shadow-sm rounded-2xl">
                  <div className="p-4 bg-background border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm">{meal.name}</h3>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                          <Clock className="w-3 h-3" />
                          {meal.time || '--:--'}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-primary/5 text-primary border-none font-bold text-[10px]">
                      {Math.round(totalKcal)} kcal
                    </Badge>
                  </div>
                  
                  <div className="p-3 space-y-2">
                    {meal.items.map((item) => (
                      <div key={item.instanceId} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                            <span className="text-xs font-semibold">{item.name}</span>
                          </div>
                          <span className="text-[10px] font-black text-muted-foreground uppercase">
                            {item.quantity} {item.selectedUnit || item.portionUnit}
                          </span>
                        </div>
                        
                        {(item.substitutions || []).length > 0 && (
                          <div className="ml-4 mt-1 space-y-1 bg-amber-50/30 p-2 rounded-lg border border-dashed border-amber-200/50">
                            <p className="text-[8px] font-bold text-amber-600 uppercase mb-1">Substituições:</p>
                            {item.substitutions?.map((sub) => (
                              <div key={sub.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span className="text-[8px] font-black opacity-30">OU</span>
                                <span className="font-medium">{sub.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {meal.items.length === 0 && (
                      <p className="text-[10px] text-muted-foreground italic py-2 text-center">Nenhum item definido para esta refeição.</p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};