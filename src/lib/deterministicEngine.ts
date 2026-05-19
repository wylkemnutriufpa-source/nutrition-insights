/**
 * FitJourney 2.0 — MOTOR DETERMINÍSTICO CENTRAL
 * 
 * Único ponto de verdade para cálculos metabólicos e seleção de estratégia.
 * Baseado estritamente em Mifflin-St Jeor e multiplicadores fixos.
 */

export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose_weight' | 'maintain' | 'gain_muscle';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
};

/**
 * Cálculo de Taxa Metabólica Basal (Mifflin-St Jeor)
 */
export function calculateTMB(weight: number, height: number, age: number, gender: Gender): number {
  if (gender === 'male') {
    return (10 * weight) + (6.25 * height) - (5 * age) + 5;
  }
  return (10 * weight) + (6.25 * height) - (5 * age) - 161;
}

/**
 * Gasto Energético Total (GET / TDEE)
 */
export function calculateGET(tmb: number, activityLevel: ActivityLevel): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.2;
  return Math.round(tmb * multiplier);
}

/**
 * Meta Calórica e Macronutrientes Determinísticos
 */
export function calculateDeterministicPlan(weight: number, get: number, goal: Goal) {
  let kcal = get;
  
  // Definição de superávit/déficit fixo
  if (goal === 'lose_weight') kcal = get - 500;
  if (goal === 'gain_muscle') kcal = get + 300;

  // Proteína fixa por objetivo (g/kg)
  let proteinPerKg = 2.0;
  if (goal === 'lose_weight') proteinPerKg = 2.2;
  if (goal === 'maintain') proteinPerKg = 1.8;
  
  const protein_g = Math.round(weight * proteinPerKg);
  const fat_g = Math.round(weight * 0.8); // 0.8g/kg de gordura como padrão estável
  const carb_g = Math.round((kcal - (protein_g * 4) - (fat_g * 9)) / 4);

  return {
    kcal: Math.round(kcal),
    protein_g,
    carb_g: Math.max(0, carb_g),
    fat_g
  };
}
