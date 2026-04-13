/**
 * Strategy Advisor Engine v2.0.0
 * 
 * Analyzes patient clinical profile and suggests 3 nutritional strategies
 * with size variants (small/medium/large), physiological guardrails,
 * and transparent rationale.
 * 
 * IMPORTANT: The preview is ILLUSTRATIVE — it shows representative meals
 * to help the nutritionist compare strategies. The actual plan is generated
 * by the generate-meal-plan edge function using the chosen strategy's
 * macro targets as the SOURCE OF TRUTH.
 */

// ── Physiological Guardrails ──
// These are hard limits that NO strategy can violate.
export const PHYSIOLOGICAL_GUARDRAILS = {
  // Protein per kg body weight
  proteinPerKg: { min: 1.2, max: 3.0 },
  // Fat per kg body weight (minimum for hormonal health)
  fatPerKg: { min: 0.7 },
  // Max protein per single meal (g) — absorption/utilization ceiling
  maxProteinPerMeal: 50,
  // Max kcal per single meal
  maxKcalPerMeal: 900,
  // Min kcal per meal (too low = pointless)
  minKcalPerMeal: 80,
  // Absolute calorie floors (clinical safety)
  minKcal: { female: 1200, male: 1500 },
  // Absolute calorie ceiling
  maxKcal: 4500,
  // Max fat percentage of total kcal
  maxFatPercent: 45,
} as const;

export type SizeVariant = "small" | "medium" | "large";

export interface PatientProfile {
  patientId: string;
  name: string;
  sex: "male" | "female";
  age: number;
  weight: number; // kg
  height: number; // cm
  activityLevel: string;
  goal: string;
  bodyFatEstimate?: number | null;
  restrictions: string[];
  allergies: string[];
  dislikedFoods: string[];
  medicalConditions: string[];
  clinicalFlags: string[];
  behavioralProfile?: {
    wakeUpTime?: string;
    workoutTime?: string;
    motivationStyle?: string;
    cravingHours?: string[];
    weekendDietBreaks?: boolean;
    forgetsWater?: boolean;
  } | null;
}

export interface StrategyMealPreview {
  mealType: string;
  label: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MacroProfile {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  proteinPerKg: number;
  carbPercent: number;
  fatPercent: number;
}

export interface SizeVariantProfile {
  size: SizeVariant;
  label: string;
  description: string;
  macroProfile: MacroProfile;
}

export interface NutritionalStrategy {
  id: string;
  name: string;
  slug: string;
  icon: string;
  rationale: string;
  keyFactors: string[];
  /** Current selected size variant's macros */
  macroProfile: MacroProfile;
  /** All 3 size variants available */
  sizeVariants: SizeVariantProfile[];
  /** Currently active variant */
  activeSize: SizeVariant;
  mealDistribution: {
    mealsPerDay: number;
    distribution: Record<string, number>;
  };
  previewMeals: StrategyMealPreview[];
  score: number;
  tags: string[];
  /** Guardrail violations detected (should be empty after clamping) */
  guardrailNotes: string[];
}

export interface StrategyAnalysis {
  profile: {
    summary: string;
    metabolicType: string;
    bmi: number;
    bmiCategory: string;
    tmb: number;
    tdee: number;
  };
  strategies: NutritionalStrategy[];
  analysisTimestamp: string;
  /** Preview disclaimer */
  previewDisclaimer: string;
}

// ── Constants ──

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_LABELS: Record<string, string> = {
  lose_weight: "Emagrecimento",
  maintain: "Manutenção",
  gain_muscle: "Ganho de Massa",
  gain_weight: "Ganho de Peso",
  improve_health: "Saúde Geral",
  athletic_performance: "Performance",
};

// ── Size variant multipliers ──
// These define the kcal offset from base TDEE for each size
const SIZE_VARIANT_CONFIG: Record<SizeVariant, { label: string; description: string; kcalMultiplier: number; proteinOffset: number }> = {
  small: { label: "P — 120g prot", description: "Perfis menores, mulheres ou menor gasto (120g proteína base)", kcalMultiplier: 0.88, proteinOffset: 0 },
  medium: { label: "M — 140g prot", description: "Cálculo padrão por TDEE e objetivo (140g proteína base)", kcalMultiplier: 1.0, proteinOffset: 20 },
  large: { label: "G — 160g prot", description: "Perfis maiores, alta atividade ou ganho (160g proteína base)", kcalMultiplier: 1.12, proteinOffset: 40 },
};

/** Base protein for tier calculation — all templates start at 120g and go up by 20g */
const BASE_PROTEIN_G = 120;
const PROTEIN_TIER_STEP = 20;

/**
 * Determine the recommended default size based on patient TDEE.
 * Low TDEE (<1600) → small, Mid (1600-2200) → medium, High (>2200) → large
 */
function recommendSizeByTDEE(tdee: number, sex: string): SizeVariant {
  if (sex === "female" && tdee < 1700) return "small";
  if (tdee < 1600) return "small";
  if (tdee > 2200) return "large";
  return "medium";
}

// ── Core Calculations ──

function calculateTMB(weight: number, height: number, age: number, sex: string): number {
  if (sex === "female") return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
}

function calculateBMI(weight: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}

function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return "Abaixo do peso";
  if (bmi < 25) return "Peso normal";
  if (bmi < 30) return "Sobrepeso";
  if (bmi < 35) return "Obesidade grau I";
  if (bmi < 40) return "Obesidade grau II";
  return "Obesidade grau III";
}

// ── Guardrail enforcement ──

function applyGuardrails(
  rawKcal: number,
  rawProteinPerKg: number,
  weight: number,
  sex: string,
  mealsPerDay: number,
): { kcal: number; proteinPerKg: number; notes: string[] } {
  const G = PHYSIOLOGICAL_GUARDRAILS;
  const notes: string[] = [];

  // Clamp protein/kg
  let proteinPerKg = rawProteinPerKg;
  if (proteinPerKg < G.proteinPerKg.min) {
    notes.push(`Proteína/kg ajustada de ${rawProteinPerKg} para ${G.proteinPerKg.min}g/kg (mínimo fisiológico)`);
    proteinPerKg = G.proteinPerKg.min;
  }
  if (proteinPerKg > G.proteinPerKg.max) {
    notes.push(`Proteína/kg ajustada de ${rawProteinPerKg} para ${G.proteinPerKg.max}g/kg (teto fisiológico)`);
    proteinPerKg = G.proteinPerKg.max;
  }

  // Clamp total kcal
  const minKcal = G.minKcal[sex as "male" | "female"] || G.minKcal.male;
  let kcal = rawKcal;
  if (kcal < minKcal) {
    notes.push(`Calorias ajustadas de ${rawKcal} para ${minKcal} kcal (piso clínico para ${sex === "female" ? "mulheres" : "homens"})`);
    kcal = minKcal;
  }
  if (kcal > G.maxKcal) {
    notes.push(`Calorias limitadas a ${G.maxKcal} kcal (teto de segurança)`);
    kcal = G.maxKcal;
  }

  // Check if total protein would exceed per-meal ceiling
  const totalProtein = Math.round(weight * proteinPerKg);
  const maxTotalFromMeals = G.maxProteinPerMeal * mealsPerDay;
  if (totalProtein > maxTotalFromMeals) {
    const clampedPerKg = Math.round((maxTotalFromMeals / weight) * 10) / 10;
    notes.push(`Proteína reduzida de ${proteinPerKg}g/kg para ${clampedPerKg}g/kg (máx ${G.maxProteinPerMeal}g/refeição × ${mealsPerDay} refeições)`);
    proteinPerKg = clampedPerKg;
  }

  return { kcal, proteinPerKg, notes };
}

function calculateMacrosWithGuardrails(
  kcal: number,
  proteinPerKg: number,
  weight: number,
  sex: string,
  carbRatio: number,
  fatRatio: number,
  mealsPerDay: number,
): { macroProfile: MacroProfile; notes: string[] } {
  const G = PHYSIOLOGICAL_GUARDRAILS;
  const notes: string[] = [];

  const protein = Math.round(weight * proteinPerKg);
  const proteinKcal = protein * 4;
  const remaining = Math.max(0, kcal - proteinKcal);

  // Distribute remaining between carbs and fat
  const totalRatio = carbRatio + fatRatio;
  let fatKcal = Math.round(remaining * (fatRatio / totalRatio));
  let carbKcal = remaining - fatKcal;

  // Enforce minimum fat per kg
  const minFatG = Math.round(weight * G.fatPerKg.min);
  const minFatKcal = minFatG * 9;
  if (fatKcal < minFatKcal) {
    notes.push(`Gordura ajustada para mínimo de ${G.fatPerKg.min}g/kg (${minFatG}g) — saúde hormonal`);
    fatKcal = minFatKcal;
    carbKcal = remaining - fatKcal;
  }

  // Enforce max fat %
  const fatPct = (fatKcal / kcal) * 100;
  if (fatPct > G.maxFatPercent) {
    fatKcal = Math.round(kcal * G.maxFatPercent / 100);
    carbKcal = remaining - fatKcal;
    notes.push(`Gordura limitada a ${G.maxFatPercent}% das calorias totais`);
  }

  const carbs = Math.max(0, Math.round(carbKcal / 4));
  const fat = Math.round(fatKcal / 9);

  return {
    macroProfile: {
      calories: kcal,
      protein,
      carbs,
      fat,
      proteinPerKg: Math.round(proteinPerKg * 10) / 10,
      carbPercent: Math.round((carbs * 4 / kcal) * 100),
      fatPercent: Math.round((fat * 9 / kcal) * 100),
    },
    notes,
  };
}

// ── Strategy Definitions ──

interface StrategyTemplate {
  id: string;
  name: string;
  slug: string;
  icon: string;
  proteinPerKg: number;
  carbRatio: number;
  fatRatio: number;
  mealsPerDay: number;
  kcalAdjustment: number;
  applicableGoals: string[];
  tags: string[];
  getScore: (p: PatientProfile, bmi: number) => number;
  getRationale: (p: PatientProfile, bmi: number) => string;
  getKeyFactors: (p: PatientProfile, bmi: number) => string[];
}

const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: "high_protein_balanced",
    name: "High Protein Balanced",
    slug: "high_protein_balanced",
    icon: "💪",
    proteinPerKg: 2.2,
    carbRatio: 0.45,
    fatRatio: 0.30,
    mealsPerDay: 6,
    kcalAdjustment: -300,
    applicableGoals: ["lose_weight", "gain_muscle", "maintain", "improve_health"],
    tags: ["alta proteína", "saciedade", "preservação muscular"],
    getScore: (p, bmi) => {
      let score = 70;
      if (["lose_weight", "gain_muscle"].includes(p.goal)) score += 15;
      if (p.activityLevel === "active" || p.activityLevel === "very_active") score += 10;
      if (bmi >= 25) score += 5;
      if (p.behavioralProfile?.cravingHours?.length) score += 5;
      return Math.min(100, score);
    },
    getRationale: (p, bmi) => {
      const parts: string[] = [];
      if (p.goal === "lose_weight") parts.push("Estratégia ideal para emagrecimento com preservação de massa magra.");
      else if (p.goal === "gain_muscle") parts.push("Proteína elevada para suportar hipertrofia muscular.");
      else parts.push("Distribuição equilibrada com ênfase em proteína para saciedade.");
      if (bmi >= 25) parts.push(`IMC ${bmi} indica sobrepeso — proteína alta ajuda na saciedade e termogênese.`);
      if (p.activityLevel === "active" || p.activityLevel === "very_active") parts.push("Nível de atividade alto justifica maior aporte proteico.");
      return parts.join(" ");
    },
    getKeyFactors: (p, bmi) => {
      const factors: string[] = [`Objetivo: ${GOAL_LABELS[p.goal] || p.goal}`, `IMC: ${bmi}`];
      if (p.activityLevel) factors.push(`Atividade: ${p.activityLevel}`);
      if (p.behavioralProfile?.cravingHours?.length) factors.push("Compulsões reportadas");
      return factors;
    },
  },
  {
    id: "low_carb_moderate",
    name: "Low Carb Moderado",
    slug: "low_carb_moderate",
    icon: "🥑",
    proteinPerKg: 2.0,
    carbRatio: 0.25,
    fatRatio: 0.50,
    mealsPerDay: 5,
    kcalAdjustment: -400,
    applicableGoals: ["lose_weight", "improve_health", "maintain"],
    tags: ["low carb", "resistência insulínica", "saciedade prolongada"],
    getScore: (p, bmi) => {
      let score = 60;
      if (p.goal === "lose_weight") score += 10;
      if (bmi >= 30) score += 15;
      if (p.clinicalFlags.some(f => ["diabetes_risk", "insulin_resistance", "metabolic_syndrome"].includes(f))) score += 20;
      if (p.medicalConditions.some(c => c.includes("diabet") || c.includes("insulin"))) score += 15;
      if (p.activityLevel === "sedentary" || p.activityLevel === "light") score += 5;
      if (p.activityLevel === "active" || p.activityLevel === "very_active") score -= 15;
      if (p.goal === "gain_muscle" || p.goal === "athletic_performance") score -= 20;
      return Math.max(20, Math.min(100, score));
    },
    getRationale: (p, bmi) => {
      const parts = ["Redução controlada de carboidratos para melhorar sensibilidade insulínica e saciedade."];
      if (p.clinicalFlags.some(f => ["diabetes_risk", "insulin_resistance"].includes(f))) parts.push("Flags clínicas de resistência insulínica justificam abordagem low carb.");
      if (bmi >= 30) parts.push(`IMC ${bmi} sugere benefício com menor carga glicêmica.`);
      if (p.activityLevel === "sedentary") parts.push("Atividade sedentária reduz necessidade de carboidratos.");
      return parts.join(" ");
    },
    getKeyFactors: (p, bmi) => {
      const factors = [`Objetivo: ${GOAL_LABELS[p.goal] || p.goal}`, `IMC: ${bmi}`];
      if (p.clinicalFlags.length > 0) factors.push(`Flags: ${p.clinicalFlags.slice(0, 3).join(", ")}`);
      if (p.activityLevel === "sedentary" || p.activityLevel === "light") factors.push("Baixa atividade física");
      return factors;
    },
  },
  {
    id: "carb_cycling",
    name: "Carb Cycling",
    slug: "carb_cycling",
    icon: "🔄",
    proteinPerKg: 2.0,
    carbRatio: 0.40,
    fatRatio: 0.35,
    mealsPerDay: 6,
    kcalAdjustment: -250,
    applicableGoals: ["lose_weight", "gain_muscle", "athletic_performance", "maintain"],
    tags: ["ciclagem", "performance", "periodização"],
    getScore: (p, bmi) => {
      let score = 55;
      if (p.activityLevel === "active" || p.activityLevel === "very_active") score += 20;
      if (p.behavioralProfile?.workoutTime) score += 10;
      if (p.goal === "gain_muscle") score += 15;
      if (p.goal === "athletic_performance") score += 20;
      if (p.behavioralProfile?.weekendDietBreaks) score += 10;
      if (p.activityLevel === "sedentary") score -= 15;
      return Math.max(20, Math.min(100, score));
    },
    getRationale: (p) => {
      const parts = ["Periodização de carboidratos: dias high-carb em treino, low-carb em repouso."];
      if (p.behavioralProfile?.workoutTime) parts.push(`Treino às ${p.behavioralProfile.workoutTime} — carboidrato concentrado pré/pós-treino.`);
      if (p.behavioralProfile?.weekendDietBreaks) parts.push("Flexibilidade no fim de semana ajuda na adesão de longo prazo.");
      if (p.goal === "athletic_performance") parts.push("Otimiza performance com energia disponível nos dias de treino.");
      return parts.join(" ");
    },
    getKeyFactors: (p) => {
      const factors = [`Objetivo: ${GOAL_LABELS[p.goal] || p.goal}`];
      if (p.behavioralProfile?.workoutTime) factors.push(`Treino: ${p.behavioralProfile.workoutTime}`);
      factors.push(`Atividade: ${p.activityLevel}`);
      if (p.behavioralProfile?.weekendDietBreaks) factors.push("Prefere flexibilidade no FDS");
      return factors;
    },
  },
  {
    id: "mediterranean_adapted",
    name: "Mediterrâneo Adaptado",
    slug: "mediterranean_adapted",
    icon: "🫒",
    proteinPerKg: 1.6,
    carbRatio: 0.45,
    fatRatio: 0.35,
    mealsPerDay: 5,
    kcalAdjustment: -200,
    applicableGoals: ["improve_health", "maintain", "lose_weight"],
    tags: ["anti-inflamatório", "saúde cardiovascular", "longevidade"],
    getScore: (p, bmi) => {
      let score = 50;
      if (p.goal === "improve_health") score += 25;
      if (p.goal === "maintain") score += 15;
      if (p.clinicalFlags.some(f => ["hypertension", "cardiovascular_risk", "inflammation"].includes(f))) score += 20;
      if (p.medicalConditions.some(c => c.includes("cardio") || c.includes("pressão") || c.includes("colesterol"))) score += 15;
      if (p.age > 45) score += 10;
      if (p.goal === "gain_muscle") score -= 10;
      return Math.max(20, Math.min(100, score));
    },
    getRationale: (p) => {
      const parts = ["Abordagem anti-inflamatória com gorduras saudáveis, fibras e proteína moderada."];
      if (p.clinicalFlags.some(f => ["hypertension", "cardiovascular_risk"].includes(f))) parts.push("Perfil cardiovascular justifica dieta com gorduras mono/poliinsaturadas.");
      if (p.age > 45) parts.push("Idade favorece abordagem focada em saúde metabólica.");
      return parts.join(" ");
    },
    getKeyFactors: (p) => {
      const factors = [`Objetivo: ${GOAL_LABELS[p.goal] || p.goal}`];
      if (p.age > 45) factors.push(`Idade: ${p.age}`);
      if (p.clinicalFlags.length > 0) factors.push(`Flags: ${p.clinicalFlags.slice(0, 3).join(", ")}`);
      return factors;
    },
  },
  {
    id: "high_carb_performance",
    name: "High Carb Performance",
    slug: "high_carb_performance",
    icon: "⚡",
    proteinPerKg: 2.0,
    carbRatio: 0.55,
    fatRatio: 0.20,
    mealsPerDay: 6,
    kcalAdjustment: 300,
    applicableGoals: ["gain_muscle", "gain_weight", "athletic_performance"],
    tags: ["hipercalórico", "performance", "ganho de massa"],
    getScore: (p, bmi) => {
      let score = 40;
      if (p.goal === "gain_muscle") score += 25;
      if (p.goal === "gain_weight") score += 30;
      if (p.goal === "athletic_performance") score += 25;
      if (bmi < 22) score += 15;
      if (p.activityLevel === "active" || p.activityLevel === "very_active") score += 15;
      if (p.goal === "lose_weight") score -= 30;
      return Math.max(10, Math.min(100, score));
    },
    getRationale: (p, bmi) => {
      const parts = ["Carboidrato alto para maximizar glicogênio muscular e performance em treinos."];
      if (bmi < 22) parts.push(`IMC ${bmi} está baixo — superávit calórico é necessário.`);
      if (p.goal === "gain_weight") parts.push("Objetivo de ganho de peso requer alta disponibilidade energética.");
      return parts.join(" ");
    },
    getKeyFactors: (p, bmi) => [`Objetivo: ${GOAL_LABELS[p.goal] || p.goal}`, `IMC: ${bmi}`, `Atividade: ${p.activityLevel}`],
  },
  {
    id: "anti_compulsion",
    name: "Anti-Compulsão (Saciedade)",
    slug: "anti_compulsion",
    icon: "🧠",
    proteinPerKg: 1.8,
    carbRatio: 0.40,
    fatRatio: 0.35,
    mealsPerDay: 6,
    kcalAdjustment: -200,
    applicableGoals: ["lose_weight", "improve_health", "maintain"],
    tags: ["saciedade", "comportamental", "anti-compulsão"],
    getScore: (p) => {
      let score = 40;
      if (p.behavioralProfile?.cravingHours && p.behavioralProfile.cravingHours.length > 0) score += 30;
      if (p.clinicalFlags.some(f => ["compulsive_eating", "binge_risk", "emotional_eating"].includes(f))) score += 25;
      if (p.behavioralProfile?.weekendDietBreaks) score += 10;
      if (p.goal === "lose_weight") score += 10;
      return Math.max(20, Math.min(100, score));
    },
    getRationale: (p) => {
      const parts = ["Distribuição focada em saciedade com refeições frequentes e proteína/fibra em cada slot."];
      if (p.behavioralProfile?.cravingHours?.length) parts.push(`Compulsões reportadas em: ${p.behavioralProfile.cravingHours.join(", ")} — refeições estratégicas nesses horários.`);
      if (p.behavioralProfile?.weekendDietBreaks) parts.push("Inclui flexibilidade controlada no FDS para reduzir ciclo restrição-compulsão.");
      return parts.join(" ");
    },
    getKeyFactors: (p) => {
      const factors = [`Objetivo: ${GOAL_LABELS[p.goal] || p.goal}`];
      if (p.behavioralProfile?.cravingHours?.length) factors.push("Compulsões alimentares");
      if (p.behavioralProfile?.weekendDietBreaks) factors.push("Quebra dieta no FDS");
      return factors;
    },
  },
];

// ── Meal Preview Templates ──

const MEAL_PREVIEWS: Record<string, Record<string, StrategyMealPreview[]>> = {
  loss: {
    breakfast: [{ mealType: "breakfast", label: "☀️ Café da Manhã", description: "Pão integral + Ovo mexido + Café sem açúcar", calories: 230, protein: 12, carbs: 22, fat: 10 }],
    morning_snack: [{ mealType: "morning_snack", label: "🍎 Lanche AM", description: "1 banana + 1 col. aveia", calories: 130, protein: 3, carbs: 28, fat: 2 }],
    lunch: [{ mealType: "lunch", label: "🍽️ Almoço", description: "Frango grelhado + Arroz + Feijão + Salada", calories: 400, protein: 38, carbs: 38, fat: 8 }],
    afternoon_snack: [{ mealType: "afternoon_snack", label: "🍪 Lanche PM", description: "1 maçã + Iogurte natural", calories: 150, protein: 6, carbs: 26, fat: 4 }],
    dinner: [{ mealType: "dinner", label: "🌙 Jantar", description: "Tilápia grelhada + Batata cozida + Salada", calories: 310, protein: 32, carbs: 28, fat: 5 }],
    evening_snack: [{ mealType: "evening_snack", label: "🫖 Ceia", description: "1 pote iogurte natural", calories: 100, protein: 6, carbs: 8, fat: 4 }],
  },
  gain: {
    breakfast: [{ mealType: "breakfast", label: "☀️ Café da Manhã", description: "2 fatias pão integral + 2 ovos + Queijo + Café com leite", calories: 430, protein: 22, carbs: 38, fat: 16 }],
    morning_snack: [{ mealType: "morning_snack", label: "🍎 Lanche AM", description: "Pão integral + Ovo + Banana", calories: 280, protein: 12, carbs: 38, fat: 8 }],
    lunch: [{ mealType: "lunch", label: "🍽️ Almoço", description: "200g Frango + 5 col. Arroz + 3 col. Feijão + Salada", calories: 580, protein: 48, carbs: 55, fat: 12 }],
    afternoon_snack: [{ mealType: "afternoon_snack", label: "🍪 Lanche PM", description: "Banana + Pasta de amendoim + Leite", calories: 300, protein: 12, carbs: 34, fat: 12 }],
    dinner: [{ mealType: "dinner", label: "🌙 Jantar", description: "170g Frango + 4 col. Arroz + Salada verde", calories: 460, protein: 42, carbs: 42, fat: 8 }],
    evening_snack: [{ mealType: "evening_snack", label: "🫖 Ceia", description: "Leite + Aveia + Banana", calories: 230, protein: 8, carbs: 36, fat: 6 }],
  },
};

function isLossGoal(goal: string): boolean {
  return ["lose_weight", "maintain", "improve_health"].includes(goal);
}

function scaleMealPreview(preview: StrategyMealPreview, scaleFactor: number, mealsPerDay: number): StrategyMealPreview {
  const G = PHYSIOLOGICAL_GUARDRAILS;
  const scaled = {
    ...preview,
    calories: Math.round(preview.calories * scaleFactor),
    protein: Math.round(preview.protein * scaleFactor),
    carbs: Math.round(preview.carbs * scaleFactor),
    fat: Math.round(preview.fat * scaleFactor),
  };
  // Enforce per-meal guardrails on preview
  scaled.protein = Math.min(scaled.protein, G.maxProteinPerMeal);
  scaled.calories = Math.min(scaled.calories, G.maxKcalPerMeal);
  scaled.calories = Math.max(scaled.calories, G.minKcalPerMeal);
  return scaled;
}

// ── Build strategy with all 3 size variants ──

function buildStrategy(
  template: StrategyTemplate,
  score: number,
  profile: PatientProfile,
  bmi: number,
  tdee: number,
): NutritionalStrategy {
  const recommendedSize = recommendSizeByTDEE(tdee, profile.sex);
  const sizes: SizeVariant[] = ["small", "medium", "large"];
  const sizeVariants: SizeVariantProfile[] = [];
  let activeProfile: MacroProfile | null = null;

  for (const size of sizes) {
    const cfg = SIZE_VARIANT_CONFIG[size];
    const baseKcal = Math.round((tdee + template.kcalAdjustment) * cfg.kcalMultiplier);

    // Absolute protein target: 120g + offset (0/20/40), then clamp to guardrails
    const absoluteProtein = BASE_PROTEIN_G + cfg.proteinOffset;
    const proteinPerKg = absoluteProtein / profile.weight;

    const { kcal, proteinPerKg: clampedPpk, notes: guardrailNotes } = applyGuardrails(
      baseKcal, proteinPerKg, profile.weight, profile.sex, template.mealsPerDay,
    );

    const { macroProfile } = calculateMacrosWithGuardrails(
      kcal, clampedPpk, profile.weight, profile.sex,
      template.carbRatio, template.fatRatio, template.mealsPerDay,
    );

    sizeVariants.push({
      size,
      label: cfg.label,
      description: `${cfg.description} — ${macroProfile.protein}g proteína efetiva`,
      macroProfile,
    });

    if (size === recommendedSize) activeProfile = macroProfile;
  }

  // Fallback to medium if recommended size somehow didn't match
  if (!activeProfile) activeProfile = sizeVariants.find(v => v.size === "medium")!.macroProfile;

  // activeProfile already set above from recommended size

  // Build meal distribution
  const mealSplit: Record<string, number> = {
    breakfast: 0.18,
    morning_snack: 0.10,
    lunch: 0.28,
    afternoon_snack: 0.12,
    dinner: 0.22,
    evening_snack: 0.10,
  };
  if (template.mealsPerDay === 5) {
    delete mealSplit.evening_snack;
    mealSplit.dinner = 0.25;
    mealSplit.afternoon_snack = 0.15;
  }

  // Build preview meals (illustrative)
  const mealSet = isLossGoal(profile.goal) ? "loss" : "gain";
  const totalPreviewKcal = Object.values(MEAL_PREVIEWS[mealSet]).reduce(
    (sum, meals) => sum + (meals[0]?.calories || 0), 0,
  );
  const scaleFactor = totalPreviewKcal > 0 ? activeProfile.calories / totalPreviewKcal : 1;

  const previewMeals: StrategyMealPreview[] = Object.keys(mealSplit).map(mealType => {
    const base = MEAL_PREVIEWS[mealSet][mealType]?.[0];
    if (!base) {
      return {
        mealType, label: mealType, description: "—",
        calories: Math.round(activeProfile.calories * (mealSplit[mealType] || 0.15)),
        protein: Math.min(Math.round(activeProfile.protein * (mealSplit[mealType] || 0.15)), PHYSIOLOGICAL_GUARDRAILS.maxProteinPerMeal),
        carbs: Math.round(activeProfile.carbs * (mealSplit[mealType] || 0.15)),
        fat: Math.round(activeProfile.fat * (mealSplit[mealType] || 0.15)),
      };
    }
    return scaleMealPreview(base, scaleFactor, template.mealsPerDay);
  });

  // Collect guardrail notes from medium variant
  const { notes: mediumNotes } = applyGuardrails(
    Math.round((tdee + template.kcalAdjustment)), template.proteinPerKg, profile.weight, profile.sex, template.mealsPerDay,
  );

  return {
    id: template.id,
    name: template.name,
    slug: template.slug,
    icon: template.icon,
    rationale: template.getRationale(profile, bmi),
    keyFactors: template.getKeyFactors(profile, bmi),
    macroProfile: activeProfile,
    sizeVariants,
    activeSize: "medium",
    mealDistribution: {
      mealsPerDay: Object.keys(mealSplit).length,
      distribution: Object.fromEntries(Object.entries(mealSplit).map(([k, v]) => [k, Math.round(v * 100)])),
    },
    previewMeals,
    score,
    tags: template.tags,
    guardrailNotes: mediumNotes,
  };
}

// ── Helper: switch strategy to a different size variant ──

export function switchStrategySize(strategy: NutritionalStrategy, size: SizeVariant): NutritionalStrategy {
  const variant = strategy.sizeVariants.find(v => v.size === size);
  if (!variant) return strategy;

  // Rescale preview meals proportionally
  const kcalRatio = variant.macroProfile.calories / strategy.macroProfile.calories;
  const previewMeals = strategy.previewMeals.map(meal => ({
    ...meal,
    calories: Math.min(Math.round(meal.calories * kcalRatio), PHYSIOLOGICAL_GUARDRAILS.maxKcalPerMeal),
    protein: Math.min(Math.round(meal.protein * kcalRatio), PHYSIOLOGICAL_GUARDRAILS.maxProteinPerMeal),
    carbs: Math.round(meal.carbs * kcalRatio),
    fat: Math.round(meal.fat * kcalRatio),
  }));

  return {
    ...strategy,
    macroProfile: variant.macroProfile,
    activeSize: size,
    previewMeals,
  };
}

// ── Main Analysis Function ──

export function analyzePatientAndSuggestStrategies(profile: PatientProfile): StrategyAnalysis {
  const bmi = calculateBMI(profile.weight, profile.height);
  const bmiCategory = getBMICategory(bmi);
  const tmb = calculateTMB(profile.weight, profile.height, profile.age, profile.sex);
  const multiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel] || 1.375;
  const tdee = Math.round(tmb * multiplier);

  // Score and rank
  const scored = STRATEGY_TEMPLATES
    .filter(t => t.applicableGoals.includes(profile.goal))
    .map(template => ({ template, score: template.getScore(profile, bmi) }))
    .sort((a, b) => b.score - a.score);

  const top3 = scored.slice(0, 3);
  const strategies = top3.map(({ template, score }) => buildStrategy(template, score, profile, bmi, tdee));

  // Build profile summary
  const goalLabel = GOAL_LABELS[profile.goal] || profile.goal;
  const summaryParts: string[] = [];
  if (profile.goal === "lose_weight" && bmi >= 25) summaryParts.push(`Paciente com sobrepeso (IMC ${bmi}) buscando emagrecimento`);
  else if (profile.goal === "gain_muscle") summaryParts.push("Paciente com foco em hipertrofia");
  else summaryParts.push(`Paciente com objetivo de ${goalLabel.toLowerCase()}`);

  if (profile.clinicalFlags.some(f => ["diabetes_risk", "insulin_resistance"].includes(f))) summaryParts.push("com perfil de resistência insulínica");
  if (profile.activityLevel === "active" || profile.activityLevel === "very_active") summaryParts.push("e nível de atividade elevado");
  else if (profile.activityLevel === "sedentary") summaryParts.push("e estilo de vida sedentário");
  if (profile.behavioralProfile?.cravingHours?.length) summaryParts.push("— atenção a episódios de compulsão");

  let metabolicType = "Equilibrado";
  if (bmi >= 30) metabolicType = "Metabolismo desacelerado";
  else if (bmi < 20) metabolicType = "Metabolismo acelerado";
  else if (profile.activityLevel === "active" || profile.activityLevel === "very_active") metabolicType = "Alto gasto energético";

  return {
    profile: { summary: summaryParts.join(" ") + ".", metabolicType, bmi, bmiCategory, tmb, tdee },
    strategies,
    analysisTimestamp: new Date().toISOString(),
    previewDisclaimer: "⚠️ O preview é ilustrativo — mostra refeições representativas para comparação entre estratégias. O plano final será gerado pela engine oficial com os macros da estratégia escolhida como fonte de verdade.",
  };
}
