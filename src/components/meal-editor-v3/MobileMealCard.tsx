import React, { useState } from 'react';
import { Meal, MealItem, useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Sun, Coffee, Utensils, Moon, Star, MoreVertical,
  Pencil, Copy, SwitchCamera, Trash2, Lock, Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const MEAL_ICONS: Record<string, any> = {
  'café da manhã': Coffee,
  almoço: Sun,
  'lanche da tarde': Utensils,
  'lanche da manhã': Utensils,
  jantar: Moon,
  ceia: Star,
};

interface Props {
  meal: Meal;
  defaultTime?: string;
  weekMode?: boolean;
  activeDayId?: string;
  onAddItem: (mealId: string) => void;
  onEditItem: (mealId: string, item: MealItem) => void;
  onSubstituteItem: (mealId: string, item: MealItem) => void;
}

const getIcon = (name: string) => MEAL_ICONS[name.toLowerCase()] || Utensils;

const computeTotals = (items: MealItem[]) =>
  items.reduce(
    (acc, i) => {
      acc.calories += i.calories * i.quantity;
      acc.protein += i.protein * i.quantity;
      acc.carbs += i.carbs * i.quantity;
      acc.fat += i.fat * i.quantity;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

export const MobileMealCard: React.FC<Props> = ({
  meal, defaultTime, weekMode, activeDayId, onAddItem, onEditItem, onSubstituteItem,
}) => {
  const { removeFoodFromMeal, duplicateMeal, setDaySubstitution } = useMealEditorV3Store();
  const Icon = getIcon(meal.name);
  const totals = computeTotals(meal.items);
  const [actionItem, setActionItem] = useState<MealItem | null>(null);

  return (
    <Card className="rounded-2xl border bg-card overflow-hidden shadow-sm">
      {/* Header da refeição */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm truncate">{meal.name}</h3>
              {defaultTime && (
                <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
                  {defaultTime}
                </span>
              )}
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
              {Math.round(totals.calories)} kcal • {Math.round(totals.protein)}p •{' '}
              {Math.round(totals.carbs)}c • {Math.round(totals.fat)}g
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-muted-foreground"
          onClick={() => duplicateMeal(meal.id)}
          aria-label="Duplicar refeição"
        >
          <Copy className="w-4 h-4" />
        </Button>
      </div>

      {/* Lista de itens */}
      <div className="divide-y divide-border/40">
        {meal.items.length === 0 ? (
          <button
            onClick={() => onAddItem(meal.id)}
            className="w-full px-4 py-6 flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar alimento
          </button>
        ) : (
          meal.items.map((item) => {
            const isSelectedSub = weekMode && activeDayId && meal.daySubstitutions?.[activeDayId] === item.instanceId;
            const hasOtherSubSelected = weekMode && activeDayId && meal.daySubstitutions?.[activeDayId] && meal.daySubstitutions[activeDayId] !== item.instanceId;

            return (
              <div 
                key={item.instanceId} 
                className={cn(
                  "px-3 py-2.5 transition-all duration-300",
                  isSelectedSub && "bg-primary/10 border-l-4 border-l-primary",
                  hasOtherSubSelected && "opacity-40 grayscale-[0.5]"
                )}
              >
                <div className="flex items-center gap-3">
                  {item.imageUrl ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted flex-shrink-0 border">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
                      <Utensils className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm truncate">{item.name}</p>
                      {(item.isMarmita || item.locked) && (
                        <Lock className="w-3 h-3 text-orange-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] font-semibold text-muted-foreground mt-0.5 tabular-nums">
                      {Math.round(item.quantity * item.portionValue)}
                      {item.portionUnit} • {Math.round(item.calories * item.quantity)} kcal
                    </p>
                    {weekMode && item.substitutions && item.substitutions.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {item.substitutions.slice(0, 3).map((s) => (
                          <span
                            key={s.id}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            OU {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {weekMode && activeDayId && !isSelectedSub && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[9px] font-black uppercase px-2 hover:bg-primary/20 text-primary"
                        onClick={() => setDaySubstitution(meal.id, activeDayId, item.instanceId)}
                      >
                        Selecionar
                      </Button>
                    )}
                    
                    {isSelectedSub && (
                      <Badge className="bg-primary text-white text-[8px] font-black h-5 uppercase">
                        ATIVO
                      </Badge>
                    )}

                    {!weekMode && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-muted-foreground flex-shrink-0"
                        onClick={() => setActionItem(item)}
                        aria-label="Mais opções do item"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action sheet por item */}
      <Sheet open={!!actionItem} onOpenChange={(open) => !open && setActionItem(null)}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-none bg-background p-0 max-w-md mx-auto"
        >
          {actionItem && (
            <div className="p-4 pb-8 space-y-2">
              <div className="flex items-center gap-3 px-2 py-3 mb-2 border-b">
                {actionItem.imageUrl && (
                  <img
                    src={actionItem.imageUrl}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                )}
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{actionItem.name}</p>
                  <p className="text-[10px] font-bold text-muted-foreground">
                    {Math.round(actionItem.calories * actionItem.quantity)} kcal
                  </p>
                </div>
              </div>

              <ActionRow
                icon={Pencil}
                label="Editar"
                onClick={() => {
                  onEditItem(meal.id, actionItem);
                  setActionItem(null);
                }}
                disabled={actionItem.isMarmita || actionItem.locked}
              />
              <ActionRow
                icon={Copy}
                label="Duplicar"
                onClick={() => {
                  toast.info('Item duplicado');
                  setActionItem(null);
                }}
              />
              <ActionRow
                icon={SwitchCamera}
                label="Substituir"
                onClick={() => {
                  onSubstituteItem(meal.id, actionItem);
                  setActionItem(null);
                }}
              />
              <ActionRow
                icon={Trash2}
                label="Remover"
                destructive
                onClick={() => {
                  removeFoodFromMeal(meal.id, actionItem.instanceId);
                  setActionItem(null);
                }}
                disabled={actionItem.isMarmita || actionItem.locked}
              />

              <Button
                variant="outline"
                className="w-full mt-2 h-12 rounded-2xl font-bold"
                onClick={() => setActionItem(null)}
              >
                Cancelar
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
};

const ActionRow: React.FC<{
  icon: any;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}> = ({ icon: Icon, label, onClick, destructive, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-semibold transition-colors',
      'hover:bg-muted/60 active:bg-muted',
      destructive && 'text-destructive',
      disabled && 'opacity-40 pointer-events-none'
    )}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);
