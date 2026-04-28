import React from 'react';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';

export const MacroSummary: React.FC = () => {
  const { meals } = useMealEditorV3Store();

  const totals = meals.reduce((acc, meal) => {
    meal.items.forEach(item => {
      acc.calories += item.calories * item.quantity;
      acc.protein += item.protein * item.quantity;
      acc.carbs += item.carbs * item.quantity;
      acc.fat += item.fat * item.quantity;
    });
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Mock targets - in real app these would come from anamnesis/settings
  const targets = {
    calories: 2200,
    protein: 160,
    carbs: 220,
    fat: 70
  };

  const getPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Resumo Diário</h2>
        
        <div className="space-y-1 mb-6">
          <div className="flex justify-between items-end mb-1">
            <span className="text-3xl font-bold">{Math.round(totals.calories)}</span>
            <span className="text-muted-foreground text-sm mb-1">/ {targets.calories} kcal</span>
          </div>
          <Progress value={getPercentage(totals.calories, targets.calories)} className="h-2" />
        </div>
      </div>

      <div className="grid gap-6">
        <MacroProgress 
          label="Proteínas" 
          current={totals.protein} 
          target={targets.protein} 
          unit="g" 
          color="bg-blue-500" 
        />
        <MacroProgress 
          label="Carboidratos" 
          current={totals.carbs} 
          target={targets.carbs} 
          unit="g" 
          color="bg-green-500" 
        />
        <MacroProgress 
          label="Gorduras" 
          current={totals.fat} 
          target={targets.fat} 
          unit="g" 
          color="bg-yellow-500" 
        />
      </div>

      <div className="mt-8">
        <Card className="p-4 bg-primary/5 border-primary/20">
          <p className="text-xs font-medium text-primary mb-1 uppercase">Dica Inteligente</p>
          <p className="text-sm text-muted-foreground leading-snug">
            {totals.protein < targets.protein * 0.8 
              ? "Sua meta de proteína está baixa. Tente adicionar mais fontes como frango, ovos ou laticínios."
              : "Balanço nutricional excelente para o seu objetivo atual."}
          </p>
        </Card>
      </div>
    </div>
  );
};

interface MacroProgressProps {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}

const MacroProgress: React.FC<MacroProgressProps> = ({ label, current, target, unit, color }) => {
  const percentage = (current / target) * 100;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {Math.round(current)}{unit} <span className="text-xs opacity-50">/ {target}{unit}</span>
        </span>
      </div>
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-500", color)} 
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

// Local cn replacement since I can't import from @/lib/utils if it causes issues in some environments, but I'll use it
import { cn } from '@/lib/utils';
