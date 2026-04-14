/**
 * ═══════════════════════════════════════════════════════════
 * MOTOR CLÍNICO DE CÁLCULO DE MACRONUTRIENTES
 * FitJourney Clinical Macro Engine v2.0.0
 * ═══════════════════════════════════════════════════════════
 *
 * ARQUITETURA OBRIGATÓRIA DE 2 CAMADAS:
 *
 * CAMADA 1 — MOTOR CLÍNICO (IMUTÁVEL)
 *   - Cálculo de TMB, TDEE, calorias e macros
 *   - FONTE DE VERDADE — nenhum template pode sobrescrever
 *   - Nenhum plano pode ser gerado sem passar por aqui
 *
 * CAMADA 2 — TEMPLATE (APENAS ESTRUTURA)
 *   - Templates definem apenas QUAIS refeições existem
 *   - Templates NÃO definem quantidades absolutas
 *   - Templates NÃO podem sobrescrever macros
 *
 * REGRAS INVIOLÁVEIS:
 * 1. Proteína: 1.6–2.2 g/kg (definição) | 1.8–2.5 g/kg (hipertrofia)
 * 2. Gordura: 0.8–1.0 g/kg
 * 3. Carboidrato: completa o restante calórico
 * 4. Déficit: -300 a -500 kcal | Superávit: +300 a +500 kcal
 * 5. Pisos calóricos: 1200 kcal (mulher) | 1500 kcal (homem)
 * 6. Soma de macros por refeição DEVE bater com totais (tolerância 3%)
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
  protein: number;
  fat: number;
  carbs: number;
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

/**
 * Resultado da validação final de 2 camadas.
 * Garante que a soma dos macros das refeições bate com os totais.
 */
export interface TwoLayerValidation {
  valid: boolean;
  totalTargets: MacroTargets;
  mealSum: { calories: number; protein: number; carbs: number; fat: number };
  deviations: { calories: number; protein: number; carbs: number; fat: number };
  errors: string[];
  corrections: MealDistribution[] | null;
}

// ── Constantes Fisiológicas ────────────────────────────────

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const PROTEIN_RANGES: Record<PatientGoal, { min: number; max: number; ideal: number }> = {
  deficit:      { min: 1.6, max: 2.2, ideal: 2.0 },
  maintenance:  { min: 1.4, max: 2.0, ideal: 1.6 },
  hypertrophy:  { min: 1.8, max: 2.5, ideal: 2.2 },
};

const FAT_RANGE = { min: 0.8, max: 1.0, ideal: 0.9 };

const CALORIC_ADJUSTMENTS: Record<PatientGoal, { min: number; max: number; ideal: number }> = {
  deficit:      { min: -500, max: -300, ideal: -400 },
  maintenance:  { min: -100, max: 100, ideal: 0 },
  hypertrophy:  { min: 300, max: 500, ideal: 400 },
};

const MIN_CALORIES: Record<PatientSex, number> = {
  female: 1200,
  male: 1500,
};

const MAX_CALORIES = 4500;

/** Tolerância máxima de desvio macro-refeição vs total (3%) */
const MAX_DEVIATION_PERCENT = 0.03;

/** Distribuição percentual de calorias por refeição — APENAS ESTRUTURA */
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

// ── Funções de Cálculo (CAMADA 1 — IMUTÁVEL) ──────────────

export function calculateTMB(profile: PatientProfile): number {
  const { weightKg, heightCm, age, sex } = profile;
  if (sex === "female") {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
  }
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
}

export function calculateTDEE(tmb: number, activityLevel: ActivityLevel): number {
  return Math.round(tmb * ACTIVITY_MULTIPLIERS[activityLevel]);
}

export function calculateTargetCalories(tdee: number, goal: PatientGoal, sex: PatientSex): number {
  const adjustment = CALORIC_ADJUSTMENTS[goal].ideal;
  const raw = tdee + adjustment;
  return Math.max(MIN_CALORIES[sex], Math.min(MAX_CALORIES, raw));
}

export function calculateMacroTargets(profile: PatientProfile): MacroTargets {
  const tmb = calculateTMB(profile);
  const tdee = calculateTDEE(tmb, profile.activityLevel);
  const calories = calculateTargetCalories(tdee, profile.goal, profile.sex);

  const proteinRange = PROTEIN_RANGES[profile.goal];
  const proteinPerKg = proteinRange.ideal;
  const protein = Math.round(profile.weightKg * proteinPerKg);

  const fatPerKg = FAT_RANGE.ideal;
  const fat = Math.round(profile.weightKg * fatPerKg);

  const proteinKcal = protein * 4;
  const fatKcal = fat * 9;
  const carbsKcal = Math.max(0, calories - proteinKcal - fatKcal);
  const carbs = Math.round(carbsKcal / 4);

  return { calories, protein, fat, carbs, proteinPerKg, fatPerKg };
}

// ── Distribuição por Refeição (CAMADA 2 — ESTRUTURA) ──────

/**
 * Distribui os macros calculados pela Camada 1 nas refeições do template.
 * O template APENAS define percentuais de distribuição.
 * Os valores absolutos vêm EXCLUSIVAMENTE dos macros calculados.
 */
export function distributeMeals(targets: MacroTargets, goal: PatientGoal): MealDistribution[] {
  const template = MEAL_DISTRIBUTION[goal];
  
  const rawMeals = template.map(slot => {
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

  // Auto-correção: ajustar para que a soma bata com os totais
  return correctMealDistribution(rawMeals, targets);
}

/**
 * Corrige arredondamentos para que soma das refeições = total exato.
 * Aplica a diferença na maior refeição (almoço normalmente).
 */
function correctMealDistribution(meals: MealDistribution[], targets: MacroTargets): MealDistribution[] {
  const sumCal = meals.reduce((s, m) => s + m.calories, 0);
  const sumP = meals.reduce((s, m) => s + m.protein, 0);
  const sumC = meals.reduce((s, m) => s + m.carbs, 0);
  const sumF = meals.reduce((s, m) => s + m.fat, 0);

  // Find largest meal (usually lunch)
  const largest = meals.reduce((max, m) => m.calories > max.calories ? m : max, meals[0]);

  largest.calories += (targets.calories - sumCal);
  largest.protein += (targets.protein - sumP);
  largest.carbs += (targets.carbs - sumC);
  largest.fat += (targets.fat - sumF);

  return meals;
}

// ── Validação Clínica Obrigatória ──────────────────────────

export function validatePlan(profile: PatientProfile, targets: MacroTargets): ClinicalPlanValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  let needsCorrection = false;
  let corrected = { ...targets };

  const proteinRange = PROTEIN_RANGES[profile.goal];
  const actualProteinPerKg = targets.protein / profile.weightKg;

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

  const actualFatPerKg = targets.fat / profile.weightKg;
  if (actualFatPerKg < FAT_RANGE.min * 0.9) {
    warnings.push(`Gordura baixa: ${actualFatPerKg.toFixed(2)}g/kg`);
    corrected.fat = Math.round(profile.weightKg * FAT_RANGE.min);
    corrected.fatPerKg = FAT_RANGE.min;
    needsCorrection = true;
  }
  if (actualFatPerKg > FAT_RANGE.max * 1.1) {
    warnings.push(`Gordura alta: ${actualFatPerKg.toFixed(2)}g/kg`);
    corrected.fat = Math.round(profile.weightKg * FAT_RANGE.max);
    corrected.fatPerKg = FAT_RANGE.max;
    needsCorrection = true;
  }

  const minCal = MIN_CALORIES[profile.sex];
  if (targets.calories < minCal) {
    errors.push(`Calorias abaixo do piso: ${targets.calories} kcal`);
    corrected.calories = minCal;
    needsCorrection = true;
  }
  if (targets.calories > MAX_CALORIES) {
    errors.push(`Calorias acima do teto: ${targets.calories} kcal`);
    corrected.calories = MAX_CALORIES;
    needsCorrection = true;
  }

  const tmb = calculateTMB(profile);
  const tdee = calculateTDEE(tmb, profile.activityLevel);
  if (profile.goal === "deficit" && targets.calories >= tdee) {
    warnings.push(`Déficit sem déficit real: ${targets.calories} ≥ TDEE ${tdee}`);
  }
  if (profile.goal === "hypertrophy" && targets.calories <= tdee) {
    warnings.push(`Hipertrofia sem superávit real: ${targets.calories} ≤ TDEE ${tdee}`);
  }

  if (needsCorrection) {
    const proteinKcal = corrected.protein * 4;
    const fatKcal = corrected.fat * 9;
    const carbsKcal = Math.max(0, corrected.calories - proteinKcal - fatKcal);
    corrected.carbs = Math.round(carbsKcal / 4);
  }

  const macroKcal = (corrected.protein * 4) + (corrected.carbs * 4) + (corrected.fat * 9);
  const deviation = Math.abs(macroKcal - corrected.calories) / corrected.calories;
  if (deviation > MAX_DEVIATION_PERCENT) {
    warnings.push(`Desvio macro-calórico: ${(deviation * 100).toFixed(1)}%`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    correctedMacros: needsCorrection ? corrected : undefined,
  };
}

// ══════════════════════════════════════════════════════════════
// VALIDAÇÃO FINAL DE 2 CAMADAS (OBRIGATÓRIA)
// ══════════════════════════════════════════════════════════════

/**
 * Valida que a soma dos macros de TODAS as refeições bate com
 * os macros totais calculados pela Camada 1 (tolerância 3%).
 * 
 * Se não bater → corrige automaticamente e retorna as correções.
 * 
 * ESTA VALIDAÇÃO É OBRIGATÓRIA ANTES DE PERSISTIR QUALQUER PLANO.
 */
export function validateTwoLayerIntegrity(
  targets: MacroTargets,
  meals: MealDistribution[],
): TwoLayerValidation {
  const mealSum = {
    calories: meals.reduce((s, m) => s + m.calories, 0),
    protein: meals.reduce((s, m) => s + m.protein, 0),
    carbs: meals.reduce((s, m) => s + m.carbs, 0),
    fat: meals.reduce((s, m) => s + m.fat, 0),
  };

  const deviations = {
    calories: targets.calories > 0 ? Math.abs(mealSum.calories - targets.calories) / targets.calories : 0,
    protein: targets.protein > 0 ? Math.abs(mealSum.protein - targets.protein) / targets.protein : 0,
    carbs: targets.carbs > 0 ? Math.abs(mealSum.carbs - targets.carbs) / targets.carbs : 0,
    fat: targets.fat > 0 ? Math.abs(mealSum.fat - targets.fat) / targets.fat : 0,
  };

  const errors: string[] = [];
  if (deviations.calories > MAX_DEVIATION_PERCENT) {
    errors.push(`Desvio calórico: ${(deviations.calories * 100).toFixed(1)}% (soma=${mealSum.calories}, alvo=${targets.calories})`);
  }
  if (deviations.protein > MAX_DEVIATION_PERCENT) {
    errors.push(`Desvio proteína: ${(deviations.protein * 100).toFixed(1)}% (soma=${mealSum.protein}g, alvo=${targets.protein}g)`);
  }
  if (deviations.carbs > MAX_DEVIATION_PERCENT) {
    errors.push(`Desvio carbs: ${(deviations.carbs * 100).toFixed(1)}% (soma=${mealSum.carbs}g, alvo=${targets.carbs}g)`);
  }
  if (deviations.fat > MAX_DEVIATION_PERCENT) {
    errors.push(`Desvio gordura: ${(deviations.fat * 100).toFixed(1)}% (soma=${mealSum.fat}g, alvo=${targets.fat}g)`);
  }

  if (errors.length === 0) {
    return { valid: true, totalTargets: targets, mealSum, deviations, errors, corrections: null };
  }

  // Auto-correção: redistribuir para bater com os totais
  const corrected = correctMealDistribution([...meals.map(m => ({ ...m }))], targets);
  return {
    valid: false,
    totalTargets: targets,
    mealSum,
    deviations,
    errors,
    corrections: corrected,
  };
}

// ── Função Principal: Plano Clínico Completo (2 Camadas) ──

/**
 * PIPELINE OBRIGATÓRIO:
 * 1. Camada 1: Calcula macros totais via motor clínico
 * 2. Camada 1: Valida e auto-corrige se necessário
 * 3. Camada 2: Distribui macros no template (apenas estrutura)
 * 4. Validação Final: Garante que soma das refeições = total (3%)
 * 
 * PROIBIDO gerar plano direto sem usar este pipeline.
 */
export function generateClinicalPlan(profile: PatientProfile): ClinicalPlanResult {
  // CAMADA 1: Motor Clínico (IMUTÁVEL)
  const tmb = calculateTMB(profile);
  const tdee = calculateTDEE(tmb, profile.activityLevel);
  let targets = calculateMacroTargets(profile);

  // Validação obrigatória
  const validation = validatePlan(profile, targets);
  if (validation.correctedMacros) {
    targets = validation.correctedMacros;
  }

  // CAMADA 2: Template (APENAS ESTRUTURA)
  const meals = distributeMeals(targets, profile.goal);

  // VALIDAÇÃO FINAL: soma das refeições DEVE bater com totais
  const twoLayerCheck = validateTwoLayerIntegrity(targets, meals);
  const finalMeals = twoLayerCheck.corrections || meals;

  // Merge two-layer warnings into validation
  if (twoLayerCheck.errors.length > 0) {
    validation.warnings.push(
      `[2-Layer AutoFix] ${twoLayerCheck.errors.join("; ")} → Corrigido automaticamente.`
    );
  }

  return {
    profile,
    tmb,
    tdee,
    targets,
    meals: finalMeals,
    validation,
  };
}

// ── Helpers de Mapeamento ──────────────────────────────────

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
