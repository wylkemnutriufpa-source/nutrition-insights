/**
 * FitJourney 2.0 — MOTOR DETERMINÍSTICO CENTRAL
 * 
 * Único ponto de verdade para cálculos metabólicos e seleção de estratégia.
 * Baseado estritamente em Mifflin-St Jeor e multiplicadores fixos.
 */

export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'maintenance' | 'loss' | 'gain' | 'aggressive_loss';

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

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
};

const GOAL_ADJUSTMENTS: Record<Goal, number> = {
  maintenance: 0,
  loss: -500,
  aggressive_loss: -800,
  gain: 400
};

/**
 * Calcula TMB usando Mifflin-St Jeor
 */
export function calculateTMB(profile: MetabolicProfile): number {
  const { weight, height, age, gender } = profile;
  let tmb = (10 * weight) + (6.25 * height) - (5 * age);
  tmb = gender === 'male' ? tmb + 5 : tmb - 161;
  return Math.round(tmb);
}

/**
 * Motor Central de Cálculo
 * 🛡️ DETERMINÍSTICO: Mesmos inputs sempre geram mesmos outputs.
 */
export function solveMetabolicProfile(profile: MetabolicProfile): MetabolicResult {
  const tmb = calculateTMB(profile);
  const get = Math.round(tmb * ACTIVITY_MULTIPLIERS[profile.activityLevel]);
  const vet = Math.round(get + GOAL_ADJUSTMENTS[profile.goal]);

  // Estratégia de Macros Padrão (Proporções Clínicas)
  // Proteína: 2.0g/kg para perda/ganho, 1.8g/kg manutenção
  const proteinPerKg = profile.goal === 'maintenance' ? 1.8 : 2.0;
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
