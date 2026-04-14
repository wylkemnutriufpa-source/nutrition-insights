/**
 * ═══════════════════════════════════════════════════════════
 * MOTOR CLÍNICO DE CÁLCULO DE MACRONUTRIENTES
 * FitJourney Clinical Macro Engine v1.0.0
 * ═══════════════════════════════════════════════════════════
 *
 * Este módulo implementa cálculos fisiológicos rigorosos para
 * planos alimentares. Nenhum plano pode ser gerado sem passar
 * por estas validações.
 *
 * REGRAS INVIOLÁVEIS:
 * 1. Proteína: 1.6–2.2 g/kg (definição) | 1.8–2.5 g/kg (hipertrofia)
 * 2. Gordura: 0.8–1.0 g/kg
 * 3. Carboidrato: completa o restante calórico
 * 4. Déficit: -300 a -500 kcal | Superávit: +300 a +500 kcal
 * 5. Pisos calóricos: 1200 kcal (mulher) | 1500 kcal (homem)
 * ═══════════════════════════════════════════════════════════
 */

// ── Tipos ──────────────────────────────────────────────────

export type PatientGoal = "deficit" | "maintenance" | "hypertrophy";
export type PatientSex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

export interface PatientProfile {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: PatientSex;
  activityLevel: ActivityLevel;
  goal: PatientGoal;
}

export interface MacroTargets {
  calories: number;
  protein: number;     // gramas
  fat: number;         // gramas
  carbs: number;       // gramas
  proteinPerKg: number;
  fatPerKg: number;
}

export interface MealDistribution {
  mealType: string;
  label: string;
  caloriePercent: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ClinicalPlanValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  correctedMacros?: MacroTargets;
}

export interface ClinicalPlanResult {
  profile: PatientProfile;
  tmb: number;
  tdee: number;
  targets: MacroTargets;
  meals: MealDistribution[];
  validation: ClinicalPlanValidation;
}

// ── Constantes Fisiológicas ────────────────────────────────

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Faixas de proteína por objetivo (g/kg) */
const PROTEIN_RANGES: Record<PatientGoal, { min: number; max: number; ideal: number }> = {
  deficit:      { min: 1.6, max: 2.2, ideal: 2.0 },
  maintenance:  { min: 1.4, max: 2.0, ideal: 1.6 },
  hypertrophy:  { min: 1.8, max: 2.5, ideal: 2.2 },
};

/** Faixa de gordura (g/kg) — universal */
const FAT_RANGE = { min: 0.8, max: 1.0, ideal: 0.9 };

/** Ajuste calórico por objetivo */
const CALORIC_ADJUSTMENTS: Record<PatientGoal, { min: number; max: number; ideal: number }> = {
  deficit:      { min: -500, max: -300, ideal: -400 },
  maintenance:  { min: -100, max: 100, ideal: 0 },
  hypertrophy:  { min: 300, max: 500, ideal: 400 },
};

/** Pisos calóricos absolutos */
const MIN_CALORIES: Record<PatientSex, number> = {
  female: 1200,
  male: 1500,
};

/** Teto calórico de segurança */
const MAX_CALORIES = 4500;

/** Distribuição percentual de calorias por refeição */
const MEAL_DISTRIBUTION: Record<PatientGoal, { type: string; label: string; percent: number }[]> = {
  deficit: [
    { type: "breakfast",        label: "Café da manhã",  percent: 0.20 },
    { type: "morning_snack",    label: "Lanche manhã",   percent: 0.08 },
    { type: "lunch",            label: "Almoço",         percent: 0.30 },
    { type: "afternoon_snack",  label: "Lanche tarde",   percent: 0.08 },
    { type: "dinner",           label: "Jantar",         percent: 0.25 },
    { type: "evening_snack",    label: "Ceia",           percent: 0.09 },
  ],
  maintenance: [
    { type: "breakfast",        label: "Café da manhã",  percent: 0.22 },
    { type: "morning_snack",    label: "Lanche manhã",   percent: 0.08 },
    { type: "lunch",            label: "Almoço",         percent: 0.28 },
    { type: "afternoon_snack",  label: "Lanche tarde",   percent: 0.10 },
    { type: "dinner",           label: "Jantar",         percent: 0.22 },
    { type: "evening_snack",    label: "Ceia",           percent: 0.10 },
  ],
  hypertrophy: [
    { type: "breakfast",        label: "Café da manhã",  percent: 0.20 },
    { type: "morning_snack",    label: "Lanche manhã",   percent: 0.10 },
    { type: "lunch",            label: "Almoço",         percent: 0.28 },
    { type: "afternoon_snack",  label: "Lanche tarde",   percent: 0.12 },
    { type: "dinner",           label: "Jantar",         percent: 0.20 },
    { type: "evening_snack",    label: "Ceia",           percent: 0.10 },
  ],
};

// ── Funções de Cálculo ─────────────────────────────────────

/** TMB via Mifflin-St Jeor (padrão ouro) */
export function calculateTMB(profile: PatientProfile): number {
  const { weightKg, heightCm, age, sex } = profile;
  if (sex === "female") {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
  }
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
}

/** TDEE = TMB × fator de atividade */
export function calculateTDEE(tmb: number, activityLevel: ActivityLevel): number {
  return Math.round(tmb * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/** Calcula metas calóricas com ajuste por objetivo */
export function calculateTargetCalories(tdee: number, goal: PatientGoal, sex: PatientSex): number {
  const adjustment = CALORIC_ADJUSTMENTS[goal].ideal;
  const raw = tdee + adjustment;
  return Math.max(MIN_CALORIES[sex], Math.min(MAX_CALORIES, raw));
}

/** Calcula macronutrientes com regras fisiológicas rigorosas */
export function calculateMacroTargets(profile: PatientProfile): MacroTargets {
  const tmb = calculateTMB(profile);
  const tdee = calculateTDEE(tmb, profile.activityLevel);
  const calories = calculateTargetCalories(tdee, profile.goal, profile.sex);

  // Proteína: g/kg conforme objetivo
  const proteinRange = PROTEIN_RANGES[profile.goal];
  const proteinPerKg = proteinRange.ideal;
  const protein = Math.round(profile.weightKg * proteinPerKg);

  // Gordura: 0.8–1.0 g/kg
  const fatPerKg = FAT_RANGE.ideal;
  const fat = Math.round(profile.weightKg * fatPerKg);

  // Carboidrato: completa o restante
  const proteinKcal = protein * 4;
  const fatKcal = fat * 9;
  const carbsKcal = Math.max(0, calories - proteinKcal - fatKcal);
  const carbs = Math.round(carbsKcal / 4);

  return { calories, protein, fat, carbs, proteinPerKg, fatPerKg };
}

// ── Distribuição por Refeição ──────────────────────────────

export function distributeMeals(targets: MacroTargets, goal: PatientGoal): MealDistribution[] {
  const template = MEAL_DISTRIBUTION[goal];
  
  return template.map(slot => {
    const mealCals = Math.round(targets.calories * slot.percent);
    const mealProtein = Math.round(targets.protein * slot.percent);
    const mealFat = Math.round(targets.fat * slot.percent);
    const mealCarbsKcal = Math.max(0, mealCals - (mealProtein * 4) - (mealFat * 9));
    const mealCarbs = Math.round(mealCarbsKcal / 4);

    return {
      mealType: slot.type,
      label: slot.label,
      caloriePercent: slot.percent,
      calories: mealCals,
      protein: mealProtein,
      carbs: mealCarbs,
      fat: mealFat,
    };
  });
}

// ── Validação Clínica Obrigatória ──────────────────────────

export function validatePlan(profile: PatientProfile, targets: MacroTargets): ClinicalPlanValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  let needsCorrection = false;
  let corrected = { ...targets };

  const proteinRange = PROTEIN_RANGES[profile.goal];
  const actualProteinPerKg = targets.protein / profile.weightKg;

  // 1. Validar proteína (REGRA CRÍTICA)
  if (actualProteinPerKg < proteinRange.min) {
    errors.push(`Proteína muito baixa: ${actualProteinPerKg.toFixed(2)}g/kg (mín: ${proteinRange.min}g/kg)`);
    corrected.protein = Math.round(profile.weightKg * proteinRange.min);
    corrected.proteinPerKg = proteinRange.min;
    needsCorrection = true;
  }
  if (actualProteinPerKg > proteinRange.max) {
    errors.push(`Proteína excessiva: ${actualProteinPerKg.toFixed(2)}g/kg (máx: ${proteinRange.max}g/kg)`);
    corrected.protein = Math.round(profile.weightKg * proteinRange.max);
    corrected.proteinPerKg = proteinRange.max;
    needsCorrection = true;
  }

  // 2. Validar gordura
  const actualFatPerKg = targets.fat / profile.weightKg;
  if (actualFatPerKg < FAT_RANGE.min * 0.9) {
    warnings.push(`Gordura baixa: ${actualFatPerKg.toFixed(2)}g/kg (mín recomendado: ${FAT_RANGE.min}g/kg)`);
    corrected.fat = Math.round(profile.weightKg * FAT_RANGE.min);
    corrected.fatPerKg = FAT_RANGE.min;
    needsCorrection = true;
  }
  if (actualFatPerKg > FAT_RANGE.max * 1.1) {
    warnings.push(`Gordura alta: ${actualFatPerKg.toFixed(2)}g/kg (máx recomendado: ${FAT_RANGE.max}g/kg)`);
    corrected.fat = Math.round(profile.weightKg * FAT_RANGE.max);
    corrected.fatPerKg = FAT_RANGE.max;
    needsCorrection = true;
  }

  // 3. Validar calorias
  const minCal = MIN_CALORIES[profile.sex];
  if (targets.calories < minCal) {
    errors.push(`Calorias abaixo do piso: ${targets.calories} kcal (mín: ${minCal} kcal)`);
    corrected.calories = minCal;
    needsCorrection = true;
  }
  if (targets.calories > MAX_CALORIES) {
    errors.push(`Calorias acima do teto: ${targets.calories} kcal (máx: ${MAX_CALORIES} kcal)`);
    corrected.calories = MAX_CALORIES;
    needsCorrection = true;
  }

  // 4. Validar coerência objetivo x calorias (TDEE comparison)
  const tmb = calculateTMB(profile);
  const tdee = calculateTDEE(tmb, profile.activityLevel);
  if (profile.goal === "deficit" && targets.calories >= tdee) {
    warnings.push(`Plano de déficit mas calorias (${targets.calories}) ≥ TDEE (${tdee}). Não há déficit real.`);
  }
  if (profile.goal === "hypertrophy" && targets.calories <= tdee) {
    warnings.push(`Plano de hipertrofia mas calorias (${targets.calories}) ≤ TDEE (${tdee}). Não há superávit real.`);
  }

  // Recalcular carboidratos se houve correção
  if (needsCorrection) {
    const proteinKcal = corrected.protein * 4;
    const fatKcal = corrected.fat * 9;
    const carbsKcal = Math.max(0, corrected.calories - proteinKcal - fatKcal);
    corrected.carbs = Math.round(carbsKcal / 4);
  }

  // 5. Validar macro-soma vs calorias totais (tolerância 3%)
  const macroKcal = (corrected.protein * 4) + (corrected.carbs * 4) + (corrected.fat * 9);
  const deviation = Math.abs(macroKcal - corrected.calories) / corrected.calories;
  if (deviation > 0.03) {
    warnings.push(`Desvio macro-calórico: ${(deviation * 100).toFixed(1)}% (tolerância: 3%)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    correctedMacros: needsCorrection ? corrected : undefined,
  };
}

// ── Função Principal: Gerar Plano Clínico Completo ─────────

export function generateClinicalPlan(profile: PatientProfile): ClinicalPlanResult {
  const tmb = calculateTMB(profile);
  const tdee = calculateTDEE(tmb, profile.activityLevel);
  let targets = calculateMacroTargets(profile);

  // Validação obrigatória
  const validation = validatePlan(profile, targets);

  // Auto-correção se necessário
  if (validation.correctedMacros) {
    targets = validation.correctedMacros;
  }

  const meals = distributeMeals(targets, profile.goal);

  return {
    profile,
    tmb,
    tdee,
    targets,
    meals,
    validation,
  };
}

// ── Helpers de Mapeamento (Goal aliases) ───────────────────

export function mapGoalToClinic(goal: string): PatientGoal {
  const map: Record<string, PatientGoal> = {
    lose_weight: "deficit",
    emagrecimento: "deficit",
    perda_peso: "deficit",
    definicao: "deficit",
    deficit: "deficit",
    maintain: "maintenance",
    manutencao: "maintenance",
    maintenance: "maintenance",
    gain_muscle: "hypertrophy",
    hipertrofia: "hypertrophy",
    ganho_massa: "hypertrophy",
    gain_weight: "hypertrophy",
    hypertrophy: "hypertrophy",
    improve_health: "maintenance",
    athletic_performance: "maintenance",
  };
  return map[goal.toLowerCase()] || "maintenance";
}

export function mapSexToClinic(sex: string): PatientSex {
  const female = ["female", "feminino", "f", "mulher"];
  return female.includes(sex.toLowerCase()) ? "female" : "male";
}

export function mapActivityToClinic(level: string): ActivityLevel {
  const map: Record<string, ActivityLevel> = {
    sedentary: "sedentary", sedentario: "sedentary",
    light: "light", leve: "light",
    moderate: "moderate", moderado: "moderate",
    active: "active", ativo: "active", intense: "active", intenso: "active",
    very_active: "very_active", muito_ativo: "very_active",
  };
  return map[level.toLowerCase()] || "light";
}
