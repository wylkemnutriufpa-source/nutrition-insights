import React, { useState } from 'react';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { cn } from '@/lib/utils';
import { Utensils, Coffee, Sun, Moon, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { MealDetailsModal } from './MealDetailsModal';
import { Button } from '@/components/ui/button';

const MEAL_ICONS: Record<string, any> = {
  'Café da Manhã': Coffee,
  'Almoço': Sun,
  'Lanche da Tarde': Utensils,
  'Jantar': Moon,
};

export const MealListSidebar: React.FC = () => {
  const { meals, activeMealId, setActiveMeal } = useMealEditorV3Store();
  const [viewingMealId, setViewingMealId] = useState<string | null>(null);

  const calculateMealCalories = (items: any[]) => {
    return items.reduce((acc, item) => acc + (item.calories * item.quantity), 0);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b bg-muted/5">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Estrutura do Plano</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {meals.map((meal) => {
          const Icon = MEAL_ICONS[meal.name] || Utensils;
          const isActive = activeMealId === meal.id;
          const calories = calculateMealCalories(meal.items);

          return (
            <div key={meal.id} className="relative group">
              <button
                onClick={() => setActiveMeal(meal.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all relative overflow-hidden border border-transparent",
                  isActive 
                    ? "bg-primary/5 border-primary/20 text-primary shadow-sm" 
                    : "hover:bg-muted/50 text-foreground"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute inset-0 bg-primary z-0"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                
                <div className={cn(
                  "p-2.5 rounded-xl transition-all relative z-10",
                  isActive ? "bg-white/20" : "bg-muted group-hover:bg-accent-foreground/5"
                )}>
                  <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-primary")} />
                </div>
                
                <div className="flex-1 overflow-hidden relative z-10">
                  <p className={cn(
                    "text-xs font-bold truncate tracking-tight",
                    isActive ? "text-white" : "text-foreground"
                  )}>{meal.name}</p>
                  <p className={cn(
                    "text-[9px] font-bold uppercase tracking-wider",
                    isActive ? "text-white/70" : "text-muted-foreground"
                  )}>
                    {meal.items.length} ITENS • {Math.round(calories)} KCAL
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-lg relative z-20 opacity-0 group-hover:opacity-100 transition-opacity",
                    isActive ? "text-white hover:bg-white/20" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingMealId(meal.id);
                  }}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </button>
            </div>
          );
        })}
      </div>

      <MealDetailsModal 
        isOpen={!!viewingMealId} 
        onClose={() => setViewingMealId(null)} 
        mealId={viewingMealId} 
      />
    </div>
  );
};
