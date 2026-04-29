import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowLeft, Flame, Beef, Wheat, Droplet, Plus, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dayLabel?: string;
}

export const FocusModeView: React.FC<Props> = ({ isOpen, onClose, dayLabel = 'Segunda-feira' }) => {
  const { meals } = useMealEditorV3Store();

  const totals = meals.reduce(
    (acc, m) => {
      m.items.forEach((i) => {
        acc.calories += i.calories * i.quantity;
        acc.protein += i.protein * i.quantity;
        acc.carbs += i.carbs * i.quantity;
        acc.fat += i.fat * i.quantity;
      });
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md h-[100dvh] sm:h-[90vh] p-0 rounded-none sm:rounded-3xl overflow-hidden border-none flex flex-col">
        {/* Header */}
        <header className="px-4 py-3 border-b flex items-center justify-between bg-background">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-bold">{dayLabel}</h1>
          <Badge className="bg-primary/10 text-primary border-none text-[10px] font-bold uppercase">
            <Sparkles className="w-3 h-3 mr-1" />
            Foco
          </Badge>
        </header>

        {/* Macro chips */}
        <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar border-b">
          <Chip icon={Flame} value={Math.round(totals.calories)} unit="kcal" color="text-orange-500" />
          <Chip icon={Beef} value={Math.round(totals.protein)} unit="g proteínas" color="text-blue-500" />
          <Chip icon={Wheat} value={Math.round(totals.carbs)} unit="g carboidratos" color="text-emerald-500" />
          <Chip icon={Droplet} value={Math.round(totals.fat)} unit="g gorduras" color="text-amber-500" />
        </div>

        {/* Lista de refeições limpa */}
        <main className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-background">
          {meals.map((meal) => {
            const cal = meal.items.reduce((a, i) => a + i.calories * i.quantity, 0);
            const p = meal.items.reduce((a, i) => a + i.protein * i.quantity, 0);
            const c = meal.items.reduce((a, i) => a + i.carbs * i.quantity, 0);
            const f = meal.items.reduce((a, i) => a + i.fat * i.quantity, 0);

            return (
              <div key={meal.id} className="rounded-2xl border bg-card overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold">{meal.name}</h3>
                    {meal.time && (
                      <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
                        {meal.time}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">⋮</span>
                </div>
                <div className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase">
                  {Math.round(cal)} kcal · {Math.round(p)}p · {Math.round(c)}c · {Math.round(f)}g
                </div>
                {meal.items.slice(0, 1).map((item) => (
                  <div key={item.instanceId} className="px-4 pb-3 flex items-center gap-3">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} className="w-9 h-9 rounded-lg object-cover" alt="" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-muted" />
                    )}
                    <p className="text-xs font-semibold flex-1 truncate">{item.name}</p>
                    {meal.items.length > 1 && (
                      <span className="text-[10px] font-bold text-muted-foreground">
                        +{meal.items.length - 1}
                      </span>
                    )}
                  </div>
                ))}
                {meal.items.length === 0 && (
                  <p className="px-4 pb-3 text-[10px] italic text-muted-foreground">
                    Nenhum alimento
                  </p>
                )}
              </div>
            );
          })}
        </main>

        {/* FAB */}
        <button
          onClick={onClose}
          className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>
      </DialogContent>
    </Dialog>
  );
};

const Chip = ({ icon: Icon, value, unit, color }: any) => (
  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-muted/40 flex-shrink-0">
    <Icon className={cn('w-3.5 h-3.5', color)} />
    <span className="text-xs font-bold tabular-nums">{value}</span>
    <span className="text-[9px] font-bold text-muted-foreground">{unit}</span>
  </div>
);
