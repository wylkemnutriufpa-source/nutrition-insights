import { Meal } from '../types';
import { calculateItemMacros } from './v3Motor';
import { PlanMetadata } from './nutritionalEvaluator';
import { NutritionalScore, ValidationIssue } from '../nutritionalScoreTypes';

// ... keep existing code

/**
 * Calcula o Score Nutricional adaptado ao contexto do paciente
 */
export const calculatePersonalizedScore = (
  meals: Meal[],
  metadata: PlanMetadata
): NutritionalScore => {
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

  const goal = metadata.goal?.toLowerCase() || 'manutenção';
  
  // Definição de pesos baseada no objetivo
  let weights = { calories: 0.3, macros: 0.3, distribution: 0.2, quality: 0.2 };
  
  if (goal.includes('emagrecimento') || goal.includes('perda')) {
    weights = { calories: 0.45, macros: 0.25, distribution: 0.15, quality: 0.15 };
  } else if (goal.includes('hipertrofia') || goal.includes('ganho')) {
    weights = { calories: 0.25, macros: 0.45, distribution: 0.15, quality: 0.15 };
  }

  // 1. Aderência Calórica
  let calScore = 0;
  if (metadata.goalCalories) {
    const diff = Math.abs(totals.kcal - metadata.goalCalories) / metadata.goalCalories;
    if (diff <= 0.05) calScore = 100;
    else if (diff <= 0.15) calScore = 70;
    else calScore = Math.max(0, 100 - (diff * 200));
  }

  // 2. Distribuição de Macros
  let macroScore = 0;
  if (metadata.goalProtein && metadata.goalCarbs && metadata.goalFat) {
    const pDiff = Math.abs(totals.protein - metadata.goalProtein) / metadata.goalProtein;
    const cDiff = Math.abs(totals.carbs - metadata.goalCarbs) / metadata.goalCarbs;
    const fDiff = Math.abs(totals.fat - metadata.goalFat) / metadata.goalFat;
    
    // Peso maior para proteína se for hipertrofia
    const pWeight = goal.includes('hipertrofia') ? 0.6 : 0.33;
    const otherWeight = (1 - pWeight) / 2;
    
    const weightedDiff = (pDiff * pWeight) + (cDiff * otherWeight) + (fDiff * otherWeight);
    
    if (weightedDiff <= 0.05) macroScore = 100;
    else if (weightedDiff <= 0.15) macroScore = 70;
    else macroScore = Math.max(0, 100 - (weightedDiff * 200));
  }

  // 3. Distribuição entre refeições
  const mealCals = meals.map(m => m.items.reduce((sum, i) => sum + calculateItemMacros(i, i.quantity).kcal, 0));
  const emptyMeals = mealCals.filter(c => c === 0).length;
  const distScore = Math.max(0, 100 - (emptyMeals * 25));

  // 4. Qualidade e Preferências
  let qualityScore = 100;
  const restrictions = metadata.restrictions || [];
  const preferences = metadata.preferences || [];
  
  meals.forEach(meal => {
    meal.items.forEach(item => {
      const itemName = item.name.toLowerCase();
      // Penalização crítica para restrições
      if (restrictions.some(r => itemName.includes(r.toLowerCase()))) {
        qualityScore -= 30;
      }
    });
  });

  // Bônus para preferências
  const flatItems = meals.flatMap(m => m.items.map(i => i.name.toLowerCase()));
  preferences.forEach(p => {
    if (flatItems.some(name => name.includes(p.toLowerCase()))) {
      qualityScore += 5;
    }
  });

  qualityScore = Math.min(100, Math.max(0, qualityScore));

  const total = Math.round(
    (calScore * weights.calories) + 
    (macroScore * weights.macros) + 
    (distScore * weights.distribution) + 
    (qualityScore * weights.quality)
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

/**
 * Validação Clínica Avançada
 */
export const validateClinicalContext = (
  meals: Meal[],
  metadata: PlanMetadata
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

  // 1. Restrições
  const restrictions = metadata.restrictions || [];
  meals.forEach(meal => {
    meal.items.forEach(item => {
      const violated = restrictions.find(r => item.name.toLowerCase().includes(r.toLowerCase()));
      if (violated) {
        issues.push({
          type: 'restriction',
          severity: 'critical',
          message: `Restrição violada: "${violated}" encontrada no item ${item.name}`,
          mealId: meal.id
        });
      }
    });
  });

  // 2. Proteína p/ Hipertrofia
  if (metadata.goal?.toLowerCase().includes('hipertrofia') && metadata.goalProtein) {
    if (totals.protein < metadata.goalProtein * 0.9) {
      issues.push({
        type: 'protein',
        severity: 'critical',
        message: 'Proteína insuficiente para protocolo de hipertrofia'
      });
    }
  }

  // 3. Distribuição
  const mealCals = meals.map(m => m.items.reduce((sum, i) => sum + calculateItemMacros(i, i.quantity).kcal, 0));
  if (mealCals.some(c => c > totals.kcal * 0.5)) {
    issues.push({
      type: 'distribution',
      severity: 'attention',
      message: 'Uma única refeição concentra mais de 50% das calorias totais'
    });
  }

  return issues;
};

/**
 * Cálculo do Indicador de Confiança Clínica
 */
export const calculatePlanConfidence = (
  score: NutritionalScore,
  issues: ValidationIssue[],
  metadata: PlanMetadata
): PlanConfidence => {
  let value = score.total;
  const reasons: string[] = [];

  const breakdown = {
    objectiveAdherence: score.breakdown.calories * 0.5 + score.breakdown.macros * 0.5,
    quality: score.breakdown.quality,
    consistency: score.breakdown.distribution,
    restrictions: 100
  };

  const criticalIssues = issues.filter(i => i.severity === 'critical');
  if (criticalIssues.length > 0) {
    value -= criticalIssues.length * 15;
    reasons.push(`${criticalIssues.length} erro(s) crítico(s) detectado(s)`);
    
    if (issues.some(i => i.type === 'restriction')) {
      breakdown.restrictions = Math.max(0, 100 - criticalIssues.filter(i => i.type === 'restriction').length * 40);
    }
  }

  if (score.breakdown.quality < 70) {
    value -= 10;
    reasons.push('Baixa qualidade alimentar ou violação de restrições');
  }

  if (!metadata.goal) {
    value -= 20;
    reasons.push('Plano sem contexto de objetivo definido');
    breakdown.objectiveAdherence = 0;
  }

  value = Math.max(0, Math.min(100, value));
  
  let level: 'low' | 'medium' | 'high' = 'high';
  if (value < 50) level = 'low';
  else if (value < 80) level = 'medium';

  return { value, level, reasons, breakdown };
};
