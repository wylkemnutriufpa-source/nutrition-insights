import { Meal, Food, MealItem, PatientContext } from '../types/clinical-types';
import { PlanMetadata, validatePlanClinically } from './nutritionalEvaluator';
import { ValidationIssue } from '../types/nutritionalScoreTypes';
import { isProtein } from './v3Motor';
import { toast } from 'sonner';
import { ClinicalEngineFactory } from './engineFactory';
import { logAudit } from '@/lib/auditLog';
import { recalculateMacros, applyClinicalSafety } from '../utils/foodNormalization';

/**
 * Proxy para manter compatibilidade com Editor V3
 */
export const generateMealWithEngine = (
  meal: Meal, 
  goal: string, 
  baseCalories: number = 2000, 
  availableFoods: Food[] = [],
  protocolType: string = 'default_v3',
  context?: PatientContext
): MealItem[] => {
  const strategy = ClinicalEngineFactory.getStrategy(protocolType);
  return strategy.generateMeal(meal, goal, baseCalories, availableFoods, context);
};

/**
 * Gera um plano completo distribuindo alimentos usando a estratégia clínica selecionada.
 */
export const generatePlanWithEngine = (
  currentMeals: Meal[], 
  goal: string, 
  baseCalories: number = 2000, 
  availableFoods: Food[],
  protocolType: string = 'default_v3',
  context?: PatientContext
): Meal[] => {
  if (!availableFoods || availableFoods.length < 10) {
    console.error('[Clinical Engine] Bloqueio: Base insuficiente.');
    toast.error('Erro: Motor desativado por falta de dados clínicos.');
    return currentMeals;
  }

  const strategy = ClinicalEngineFactory.getStrategy(protocolType);

  return currentMeals.map(meal => {
    if (meal.items.length === 0) {
      const newItems = strategy.generateMeal(meal, goal, baseCalories, availableFoods, context);
      
      // Log audível da decisão clínica
      logAudit(
        'generate_meal',
        'meal_plan',
        null,
        {
          protocol: strategy.id,
          meal_name: meal.name,
          decision_explanation: strategy.explainDecision(meal, newItems),
          item_count: newItems.length
        }
      );

      return { ...meal, items: newItems };
    }
    return meal;
  });
};

/**
 * Refina o plano com base no diagnóstico clínico (Etapa 3)
 */
export const refinePlanWithScore = (
  meals: Meal[], 
  metadata: PlanMetadata, 
  issues: ValidationIssue[], 
  availableFoods: Food[],
  level: 'light' | 'moderate' | 'aggressive' = 'moderate'
): Meal[] => {
  let newMeals = [...meals];
  
  if (level === 'light') {
    return newMeals.map(meal => ({
      ...meal,
      items: meal.items.map(item => {
        if (item.locked) return item;
        const calIssue = issues.find(i => i.type === 'calories');
        if (calIssue) {
          const factor = calIssue.message.includes('acima') ? 0.9 : 1.1;
          return { ...item, quantity: Math.round(item.quantity * factor) };
        }
        return item;
      })
    }));
  }

  issues.forEach(issue => {
    if (issue.type === 'protein' && issue.severity === 'critical') {
      const proteins = availableFoods.filter(f => isProtein(f.name));
      if (proteins.length > 0) {
        const targetMealIndex = newMeals.findIndex(m => 
          m.name.toLowerCase().includes('almoço') || m.name.toLowerCase().includes('jantar')
        );
        
        if (targetMealIndex !== -1) {
          const protein = proteins[Math.floor(Math.random() * proteins.length)];
          const safeQuantity = applyClinicalSafety(protein.name, 100);
          const macros = recalculateMacros(protein, safeQuantity);
          
          const newItem: MealItem = {
            ...protein,
            ...macros,
            instanceId: Math.random().toString(36).substring(2, 10),
            quantity: safeQuantity,
            locked: false,
            substitutions: [] // Garantindo contrato V3
          };
          newMeals[targetMealIndex] = {
            ...newMeals[targetMealIndex],
            items: [...newMeals[targetMealIndex].items, newItem]
          };
        }
      }
    }
  });

  return newMeals;
};