import React from 'react';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { AnimatedNumber } from './AnimatedNumber';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export const MacroSummary: React.FC = () => {
  const { meals, fastMode, patientTargets, planStatus } = useMealEditorV3Store();
  
  // Real targets with fallback
  const targets = patientTargets || {
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 60
  };

  if (!patientTargets) {
    console.warn('Meta do paciente não encontrada, usando fallback controlado.');
  }

  const totals = meals.reduce((acc, meal) => {
    meal.items.forEach(item => {
      acc.calories += item.calories * item.quantity;
      acc.protein += item.protein * item.quantity;
      acc.carbs += item.carbs * item.quantity;
      acc.fat += item.fat * item.quantity;
    });
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const isGoalReached = (current: number, target: number) => {
    const diff = Math.abs(current - target);
    return diff <= target * 0.05; // 5% tolerance
  };

  const getPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumo Diário</h2>
            <AnimatePresence>
              {(planStatus === 'syncing' || planStatus === 'success' || planStatus === 'error') && (
                <motion.span
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "text-[8px] font-bold uppercase mt-0.5",
                    planStatus === 'syncing' && "text-blue-500",
                    planStatus === 'success' && "text-green-500",
                    planStatus === 'error' && "text-red-500"
                  )}
                >
                  {planStatus === 'syncing' && "Atualizando..."}
                  {planStatus === 'success' && "Meta atingida ✔"}
                  {planStatus === 'error' && "Erro ⚠"}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          {isGoalReached(totals.calories, targets.calories) && (
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              className="text-green-500 flex items-center gap-1 text-[10px] font-bold uppercase"
            >
              <CheckCircle2 className="w-3 h-3" />
              Meta Atingida
            </motion.div>
          )}
        </div>

        <div className="space-y-1 mb-6">
          <div className="flex justify-between items-end mb-1">
            <AnimatedNumber 
              value={totals.calories} 
              className={cn(
                "text-3xl font-bold transition-colors",
                isGoalReached(totals.calories, targets.calories) ? "text-green-500" : "text-foreground"
              )} 
            />
            <span className="text-muted-foreground text-sm mb-1">/ {targets.calories} kcal</span>
          </div>
          <Progress 
            value={getPercentage(totals.calories, targets.calories)} 
            className="h-2" 
          />
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

      {!fastMode && (
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-primary mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-primary mb-1 uppercase tracking-tight">Dica Inteligente</p>
                  <p className="text-sm text-muted-foreground leading-snug">
                    {totals.protein < targets.protein * 0.8 
                      ? "Sua meta de proteína está baixa. Tente adicionar mais fontes como frango, ovos ou laticínios."
                      : "Balanço nutricional excelente para o seu objetivo atual."}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}
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
  const isOk = Math.abs(current - target) <= target * 0.1;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={cn(
          "transition-colors font-medium",
          isOk ? "text-green-600" : "text-muted-foreground"
        )}>
          <AnimatedNumber value={current} suffix={unit} />
          <span className="text-xs opacity-50 font-normal"> / {target}{unit}</span>
        </span>
      </div>
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          className={cn("h-full transition-all duration-500", color)} 
        />
      </div>
    </div>
  );
};

