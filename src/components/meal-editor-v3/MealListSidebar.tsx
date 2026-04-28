import React from 'react';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { cn } from '@/lib/utils';
import { Utensils, Coffee, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

const MEAL_ICONS: Record<string, any> = {
  'Café da Manhã': Coffee,
  'Almoço': Sun,
  'Lanche da Tarde': Utensils,
  'Jantar': Moon,
};

export const MealListSidebar: React.FC = () => {
  const { meals, activeMealId, setActiveMeal, fastMode } = useMealEditorV3Store();

  const calculateMealCalories = (items: any[]) => {
    return items.reduce((acc, item) => acc + (item.calories * item.quantity), 0);
  };

  return (
    <div className="flex flex-col h-full py-6">
      <div className="px-6 mb-6">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Dieta do Dia</h2>
      </div>
      <div className="space-y-2 px-3">
        {meals.map((meal) => {
          const Icon = MEAL_ICONS[meal.name] || Utensils;
          const isActive = activeMealId === meal.id;
          const calories = calculateMealCalories(meal.items);

          return (
            <button
              key={meal.id}
              onClick={() => setActiveMeal(meal.id)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all relative group overflow-hidden",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
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

              {isActive && (
                <div className="relative z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

