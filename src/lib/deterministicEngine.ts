/**
 * FitJourney 2.0 — MOTOR DETERMINÍSTICO CENTRAL
 * 
 * Único ponto de verdade para cálculos metabólicos e seleção de estratégia.
 * Baseado estritamente em Mifflin-St Jeor e multiplicadores fixos.
 */

export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose_weight' | 'maintain' | 'gain_muscle' | 'maintenance' | 'loss' | 'gain' | 'aggressive_loss';

export interface MetabolicProfile {
  age: number;
  weight: number;
  height: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export interface MetabolicResult {
  tmb: number; // Taxa Metabólica Basal
  get: number; // Gasto Energético Total (TDEE)
  vet: number; // Valor Energético Total (Alvo Calórico)
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
};

const GOAL_ADJUSTMENTS: Record<string, number> = {
  lose_weight: -500,
  loss: -500,
  aggressive_loss: -800,
  maintain: 0,
  maintenance: 0,
  gain_muscle: 300,
  gain: 400
};

/**
 * Cálculo de Taxa Metabólica Basal (Mifflin-St Jeor)
 */
export function calculateTMB(weight: number, height: number, age: number, gender: Gender): number {
  if (gender === 'male') {
    return Math.round((10 * weight) + (6.25 * height) - (5 * age) + 5);
  }
  return Math.round((10 * weight) + (6.25 * height) - (5 * age) - 161);
}

/**
 * Gasto Energético Total (GET / TDEE)
 */
export function calculateGET(tmb: number, activityLevel: ActivityLevel): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.2;
  return Math.round(tmb * multiplier);
}

/**
 * Motor Central de Cálculo
 * 🛡️ DETERMINÍSTICO: Mesmos inputs sempre geram mesmos outputs.
 */
export function solveMetabolicProfile(profile: MetabolicProfile): MetabolicResult {
  const tmb = calculateTMB(profile.weight, profile.height, profile.age, profile.gender);
  const get = calculateGET(tmb, profile.activityLevel);
  const adjustment = GOAL_ADJUSTMENTS[profile.goal] !== undefined ? GOAL_ADJUSTMENTS[profile.goal] : 0;
  const vet = Math.round(get + adjustment);

  // Estratégia de Macros Padrão (Proporções Clínicas)
  // Proteína: 2.0g/kg para perda/ganho, 1.8g/kg manutenção
  const isMaintenance = profile.goal === 'maintenance' || profile.goal === 'maintain';
  const proteinPerKg = isMaintenance ? 1.8 : 2.0;
  const proteinG = Math.round(profile.weight * proteinPerKg);
  
  // Gordura: 0.8g/kg fixo
  const fatG = Math.round(profile.weight * 0.8);
  
  // Carbos: O que sobrar das calorias
  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const carbKcal = Math.max(0, vet - (proteinKcal + fatKcal));
  const carbsG = Math.round(carbKcal / 4);

  return {
    tmb,
    get,
    vet,
    macros: {
      protein: proteinG,
      carbs: carbsG,
      fat: fatG
    }
  };
}

/**
 * Meta Calórica e Macronutrientes Determinísticos (Legado)
 */
export function calculateDeterministicPlan(weight: number, get: number, goal: Goal) {
  const profile: MetabolicProfile = {
    age: 30, // default if not provided
    weight,
    height: 170, // default if not provided
    gender: 'male', // default if not provided
    activityLevel: 'moderate',
    goal
  };
  
  const result = solveMetabolicProfile(profile);
  
  return {
    kcal: result.vet,
    protein_g: result.macros.protein,
    carb_g: result.macros.carbs,
    fat_g: result.macros.fat
  };
}

