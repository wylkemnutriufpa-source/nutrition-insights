import { Meal, Food, MealItem } from '../types';
import { NutritionalScore, ValidationIssue } from '../types/nutritionalScoreTypes';
import { isProtein, isCarb, isFruit, calculateItemMacros } from './v3Motor';

export interface PlanMetadata {
  goalCalories?: number;
  goalProtein?: number;
  goalCarbs?: number;
  goalFat?: number;
  goal?: string;
  restrictions?: string[];
  preferences?: string[];
  consent_given?: boolean;
  consent_date?: string;
}

export const calculateNutritionalScore = (
  meals: Meal[],
  metadata: PlanMetadata = {}
): NutritionalScore => {
  const isPersonalized = !!metadata.goal;
  // ... rest of logic uses metadata to adjust weights

  const totals = meals.reduce((acc, meal) => {
    meal.items.forEach(item => {
      const macros = calculateItemMacros(item, item.quantity);
      acc.kcal += macros.kcal;
      acc.protein += macros.protein;
      acc.carbs += macros.carbs;
      acc.fat += macros.fat;
    });
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  // 1. Aderência Calórica (30%)
  let calScore = 0;
  if (metadata.goalCalories) {
    const diff = Math.abs(totals.kcal - metadata.goalCalories) / metadata.goalCalories;
    if (diff <= 0.05) calScore = 100;
    else if (diff <= 0.15) calScore = 70;
    else calScore = Math.max(0, 100 - (diff * 200));
  } else {
    // Se não houver meta, avaliamos apenas se não é zero
    calScore = totals.kcal > 0 ? 80 : 0;
  }

  // 2. Distribuição de Macros (30%)
  let macroScore = 0;
  if (metadata.goalProtein && metadata.goalCarbs && metadata.goalFat) {
    const pDiff = Math.abs(totals.protein - metadata.goalProtein) / metadata.goalProtein;
    const cDiff = Math.abs(totals.carbs - metadata.goalCarbs) / metadata.goalCarbs;
    const fDiff = Math.abs(totals.fat - metadata.goalFat) / metadata.goalFat;
    const avgDiff = (pDiff + cDiff + fDiff) / 3;
    
    if (avgDiff <= 0.05) macroScore = 100;
    else if (avgDiff <= 0.15) macroScore = 70;
    else macroScore = Math.max(0, 100 - (avgDiff * 200));
  } else {
    macroScore = totals.kcal > 0 ? 70 : 0;
  }

  // 3. Equilíbrio entre refeições (20%)
  // Avalia se as calorias estão bem distribuídas ou se há refeições vazias
  const mealCals = meals.map(m => m.items.reduce((sum, i) => sum + calculateItemMacros(i, i.quantity).kcal, 0));
  const emptyMeals = mealCals.filter(c => c === 0).length;
  const distScore = Math.max(0, 100 - (emptyMeals * 20));

  // 4. Qualidade Alimentar (20%)
  // Simulação de qualidade baseada em presença de macros essenciais em refeições principais
  let qualityScore = 80; // Base
  const mainMeals = meals.filter(m => {
    const name = m.name.toLowerCase();
    return name.includes('almoço') || name.includes('jantar') || name.includes('café');
  });
  
  mainMeals.forEach(m => {
    const hasProt = m.items.some(i => isProtein(i.name));
    if (!hasProt) qualityScore -= 10;
  });
  qualityScore = Math.max(0, qualityScore);

  const total = Math.round(
    (calScore * 0.3) + 
    (macroScore * 0.3) + 
    (distScore * 0.2) + 
    (qualityScore * 0.2)
  );

  return {
    total,
    breakdown: {
      calories: Math.round(calScore),
      macros: Math.round(macroScore),
      distribution: Math.round(distScore),
      quality: Math.round(qualityScore)
    }
  };
};

export const validatePlanClinically = (
  meals: Meal[],
  metadata: PlanMetadata = {}
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const totals = meals.reduce((acc, meal) => {
    meal.items.forEach(item => {
      const macros = calculateItemMacros(item, item.quantity);
      acc.kcal += macros.kcal;
      acc.protein += macros.protein;
      acc.carbs += macros.carbs;
      acc.fat += macros.fat;
    });
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  // Validação de calorias
  if (metadata.goalCalories) {
    const diff = (totals.kcal - metadata.goalCalories) / metadata.goalCalories;
    if (Math.abs(diff) > 0.15) {
      issues.push({
        type: 'calories',
        severity: 'critical',
        message: `Calorias ${diff > 0 ? 'acima' : 'abaixo'} da meta (${Math.round(totals.kcal)} / ${metadata.goalCalories} kcal)`
      });
    } else if (Math.abs(diff) > 0.05) {
      issues.push({
        type: 'calories',
        severity: 'attention',
        message: `Calorias levemente ${diff > 0 ? 'fora' : 'dentro'} do planejado`
      });
    }
  }

  // Validação de proteína
  if (metadata.goalProtein) {
    const diff = (totals.protein - metadata.goalProtein) / metadata.goalProtein;
    if (diff < -0.1) {
      issues.push({
        type: 'protein',
        severity: 'critical',
        message: 'Proteína insuficiente para as necessidades do paciente'
      });
    }
  }

  // Validação de refeições vazias
  meals.forEach(m => {
    if (m.items.length === 0) {
      issues.push({
        type: 'meal_empty',
        severity: 'attention',
        message: `Refeição "${m.name}" está vazia`,
        mealId: m.id
      });
    }
  });

  return issues;
};
