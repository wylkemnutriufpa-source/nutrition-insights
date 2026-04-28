import React from 'react';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { cn } from '@/lib/utils';
import { Utensils, Coffee, Sun, Moon } from 'lucide-react';

const MEAL_ICONS: Record<string, any> = {
  'Café da Manhã': Coffee,
  'Almoço': Sun,
  'Lanche da Tarde': Utensils,
  'Jantar': Moon,
};

export const MealListSidebar: React.FC = () => {
  const { meals, activeMealId, setActiveMeal } = useMealEditorV3Store();

  const calculateMealCalories = (items: any[]) => {
    return items.reduce((acc, item) => acc + (item.calories * item.quantity), 0);
  };

  return (
    <div className="flex flex-col h-full py-4">
      <div className="px-4 mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Refeições</h2>
      </div>
      <div className="space-y-1 px-2">
        {meals.map((meal) => {
          const Icon = MEAL_ICONS[meal.name] || Utensils;
          const isActive = activeMealId === meal.id;
          const calories = calculateMealCalories(meal.items);

          return (
            <button
              key={meal.id}
              onClick={() => setActiveMeal(meal.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all group",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "hover:bg-accent text-foreground"
              )}
            >
              <div className={cn(
                "p-2 rounded-md transition-colors",
                isActive ? "bg-primary-foreground/20" : "bg-muted group-hover:bg-accent-foreground/10"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{meal.name}</p>
                <p className={cn(
                  "text-[10px]",
                  isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                  {meal.items.length} itens • {Math.round(calories)} kcal
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
