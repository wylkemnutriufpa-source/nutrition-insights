/**
 * Strategy Advisor Engine v1.0.0
 * 
 * Analyzes patient clinical profile and suggests 3 nutritional strategies
 * with transparent rationale, macro targets, and meal distribution.
 * 
 * This replaces the opaque "just pick a goal" approach with a
 * clinician-facing decision support layer.
 */

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

export interface NutritionalStrategy {
  id: string;
  name: string;
  slug: string;
  icon: string;
  rationale: string;          // Why this strategy for this patient
  keyFactors: string[];       // Which patient variables drove this choice
  macroProfile: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    proteinPerKg: number;
    carbPercent: number;
    fatPercent: number;
  };
  mealDistribution: {
    mealsPerDay: number;
    distribution: Record<string, number>; // meal_type → kcal share %
  };
  previewMeals: StrategyMealPreview[];
  score: number;              // 0-100 fit score for this patient
  tags: string[];
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

// ── Strategy Definitions ──

interface StrategyTemplate {
  id: string;
  name: string;
  slug: string;
  icon: string;
  proteinPerKg: number;
  carbPercent: number;   // % of non-protein kcal
  fatPercent: number;    // % of non-protein kcal
  mealsPerDay: number;
  kcalAdjustment: number; // from TDEE
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
    carbPercent: 0.45,
    fatPercent: 0.30,
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
      const factors: string[] = [];
      factors.push(`Objetivo: ${GOAL_LABELS[p.goal] || p.goal}`);
      factors.push(`IMC: ${bmi}`);
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
    carbPercent: 0.25,
    fatPercent: 0.50,
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
      // Penalize for high activity (needs carbs)
      if (p.activityLevel === "active" || p.activityLevel === "very_active") score -= 15;
      if (p.goal === "gain_muscle" || p.goal === "athletic_performance") score -= 20;
      return Math.max(20, Math.min(100, score));
    },
    getRationale: (p, bmi) => {
      const parts: string[] = [];
      parts.push("Redução controlada de carboidratos para melhorar sensibilidade insulínica e saciedade.");
      if (p.clinicalFlags.some(f => ["diabetes_risk", "insulin_resistance"].includes(f))) {
        parts.push("Flags clínicas de resistência insulínica justificam abordagem low carb.");
      }
      if (bmi >= 30) parts.push(`IMC ${bmi} sugere benefício com menor carga glicêmica.`);
      if (p.activityLevel === "sedentary") parts.push("Atividade sedentária reduz necessidade de carboidratos.");
      return parts.join(" ");
    },
    getKeyFactors: (p, bmi) => {
      const factors: string[] = [];
      factors.push(`Objetivo: ${GOAL_LABELS[p.goal] || p.goal}`);
      factors.push(`IMC: ${bmi}`);
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
    carbPercent: 0.40,
    fatPercent: 0.35,
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
      // Penalize for sedentary
      if (p.activityLevel === "sedentary") score -= 15;
      return Math.max(20, Math.min(100, score));
    },
    getRationale: (p) => {
      const parts: string[] = [];
      parts.push("Periodização de carboidratos: dias high-carb em treino, low-carb em repouso.");
      if (p.behavioralProfile?.workoutTime) parts.push(`Treino às ${p.behavioralProfile.workoutTime} — carboidrato concentrado pré/pós-treino.`);
      if (p.behavioralProfile?.weekendDietBreaks) parts.push("Flexibilidade no fim de semana ajuda na adesão de longo prazo.");
      if (p.goal === "athletic_performance") parts.push("Otimiza performance com energia disponível nos dias de treino.");
      return parts.join(" ");
    },
    getKeyFactors: (p) => {
      const factors: string[] = [];
      factors.push(`Objetivo: ${GOAL_LABELS[p.goal] || p.goal}`);
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
    carbPercent: 0.45,
    fatPercent: 0.35,
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
      const parts: string[] = [];
      parts.push("Abordagem anti-inflamatória com gorduras saudáveis, fibras e proteína moderada.");
      if (p.clinicalFlags.some(f => ["hypertension", "cardiovascular_risk"].includes(f))) {
        parts.push("Perfil cardiovascular justifica dieta com gorduras mono/poliinsaturadas.");
      }
      if (p.age > 45) parts.push("Idade favorece abordagem focada em saúde metabólica.");
      return parts.join(" ");
    },
    getKeyFactors: (p) => {
      const factors: string[] = [];
      factors.push(`Objetivo: ${GOAL_LABELS[p.goal] || p.goal}`);
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
    carbPercent: 0.55,
    fatPercent: 0.20,
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
      const parts: string[] = [];
      parts.push("Carboidrato alto para maximizar glicogênio muscular e performance em treinos.");
      if (bmi < 22) parts.push(`IMC ${bmi} está baixo — superávit calórico é necessário.`);
      if (p.goal === "gain_weight") parts.push("Objetivo de ganho de peso requer alta disponibilidade energética.");
      return parts.join(" ");
    },
    getKeyFactors: (p, bmi) => {
      const factors: string[] = [];
      factors.push(`Objetivo: ${GOAL_LABELS[p.goal] || p.goal}`);
      factors.push(`IMC: ${bmi}`);
      factors.push(`Atividade: ${p.activityLevel}`);
      return factors;
    },
  },
  {
    id: "anti_compulsion",
    name: "Anti-Compulsão (Saciedade)",
    slug: "anti_compulsion",
    icon: "🧠",
    proteinPerKg: 1.8,
    carbPercent: 0.40,
    fatPercent: 0.35,
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
      const parts: string[] = [];
      parts.push("Distribuição focada em saciedade com refeições frequentes e proteína/fibra em cada slot.");
      if (p.behavioralProfile?.cravingHours?.length) {
        parts.push(`Compulsões reportadas em: ${p.behavioralProfile.cravingHours.join(", ")} — refeições estratégicas nesses horários.`);
      }
      if (p.behavioralProfile?.weekendDietBreaks) parts.push("Inclui flexibilidade controlada no FDS para reduzir ciclo restrição-compulsão.");
      return parts.join(" ");
    },
    getKeyFactors: (p) => {
      const factors: string[] = [];
      factors.push(`Objetivo: ${GOAL_LABELS[p.goal] || p.goal}`);
      if (p.behavioralProfile?.cravingHours?.length) factors.push("Compulsões alimentares");
      if (p.behavioralProfile?.weekendDietBreaks) factors.push("Quebra dieta no FDS");
      return factors;
    },
  },
];

// ── Meal Preview Templates ──

const MEAL_PREVIEWS: Record<string, Record<string, StrategyMealPreview[]>> = {
  loss: {
    breakfast: [
      { mealType: "breakfast", label: "☀️ Café da Manhã", description: "Pão integral + Ovo mexido + Café sem açúcar", calories: 230, protein: 12, carbs: 22, fat: 10 },
    ],
    morning_snack: [
      { mealType: "morning_snack", label: "🍎 Lanche AM", description: "1 banana + 1 col. aveia", calories: 130, protein: 3, carbs: 28, fat: 2 },
    ],
    lunch: [
      { mealType: "lunch", label: "🍽️ Almoço", description: "Frango grelhado + Arroz + Feijão + Salada", calories: 400, protein: 38, carbs: 38, fat: 8 },
    ],
    afternoon_snack: [
      { mealType: "afternoon_snack", label: "🍪 Lanche PM", description: "1 maçã + Iogurte natural", calories: 150, protein: 6, carbs: 26, fat: 4 },
    ],
    dinner: [
      { mealType: "dinner", label: "🌙 Jantar", description: "Tilápia grelhada + Batata cozida + Salada", calories: 310, protein: 32, carbs: 28, fat: 5 },
    ],
    evening_snack: [
      { mealType: "evening_snack", label: "🫖 Ceia", description: "1 pote iogurte natural", calories: 100, protein: 6, carbs: 8, fat: 4 },
    ],
  },
  gain: {
    breakfast: [
      { mealType: "breakfast", label: "☀️ Café da Manhã", description: "2 fatias pão integral + 2 ovos + Queijo + Café com leite", calories: 430, protein: 22, carbs: 38, fat: 16 },
    ],
    morning_snack: [
      { mealType: "morning_snack", label: "🍎 Lanche AM", description: "Pão integral + Ovo + Banana", calories: 280, protein: 12, carbs: 38, fat: 8 },
    ],
    lunch: [
      { mealType: "lunch", label: "🍽️ Almoço", description: "200g Frango + 5 col. Arroz + 3 col. Feijão + Salada", calories: 580, protein: 48, carbs: 55, fat: 12 },
    ],
    afternoon_snack: [
      { mealType: "afternoon_snack", label: "🍪 Lanche PM", description: "Banana + Pasta de amendoim + Leite", calories: 300, protein: 12, carbs: 34, fat: 12 },
    ],
    dinner: [
      { mealType: "dinner", label: "🌙 Jantar", description: "170g Frango + 4 col. Arroz + Salada verde", calories: 460, protein: 42, carbs: 42, fat: 8 },
    ],
    evening_snack: [
      { mealType: "evening_snack", label: "🫖 Ceia", description: "Leite + Aveia + Banana", calories: 230, protein: 8, carbs: 36, fat: 6 },
    ],
  },
};

function isLossGoal(goal: string): boolean {
  return ["lose_weight", "maintain", "improve_health"].includes(goal);
}

function scaleMealPreview(preview: StrategyMealPreview, scaleFactor: number): StrategyMealPreview {
  return {
    ...preview,
    calories: Math.round(preview.calories * scaleFactor),
    protein: Math.round(preview.protein * scaleFactor),
    carbs: Math.round(preview.carbs * scaleFactor),
    fat: Math.round(preview.fat * scaleFactor),
  };
}

// ── Main Analysis Function ──

export function analyzePatientAndSuggestStrategies(profile: PatientProfile): StrategyAnalysis {
  const bmi = calculateBMI(profile.weight, profile.height);
  const bmiCategory = getBMICategory(bmi);
  const tmb = calculateTMB(profile.weight, profile.height, profile.age, profile.sex);
  const multiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel] || 1.375;
  const tdee = Math.round(tmb * multiplier);

  // Score all strategies
  const scored = STRATEGY_TEMPLATES
    .filter(t => t.applicableGoals.includes(profile.goal))
    .map(template => ({
      template,
      score: template.getScore(profile, bmi),
    }))
    .sort((a, b) => b.score - a.score);

  // Pick top 3 (or pad if less)
  const top3 = scored.slice(0, 3);

  const strategies: NutritionalStrategy[] = top3.map(({ template, score }) => {
    const targetKcal = Math.max(
      profile.sex === "female" ? 1200 : 1500,
      Math.min(3500, tdee + template.kcalAdjustment)
    );
    const protein = Math.round(profile.weight * template.proteinPerKg);
    const proteinKcal = protein * 4;
    const remaining = targetKcal - proteinKcal;
    const carbs = Math.round((remaining * (template.carbPercent / (template.carbPercent + template.fatPercent))) / 4);
    const fat = Math.round((remaining * (template.fatPercent / (template.carbPercent + template.fatPercent))) / 9);

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

    // Build preview meals
    const mealSet = isLossGoal(profile.goal) ? "loss" : "gain";
    const totalPreviewKcal = Object.values(MEAL_PREVIEWS[mealSet]).reduce(
      (sum, meals) => sum + (meals[0]?.calories || 0), 0
    );
    const scaleFactor = totalPreviewKcal > 0 ? targetKcal / totalPreviewKcal : 1;

    const previewMeals: StrategyMealPreview[] = Object.keys(mealSplit).map(mealType => {
      const base = MEAL_PREVIEWS[mealSet][mealType]?.[0];
      if (!base) {
        return {
          mealType,
          label: mealType,
          description: "—",
          calories: Math.round(targetKcal * (mealSplit[mealType] || 0.15)),
          protein: Math.round(protein * (mealSplit[mealType] || 0.15)),
          carbs: Math.round(carbs * (mealSplit[mealType] || 0.15)),
          fat: Math.round(fat * (mealSplit[mealType] || 0.15)),
        };
      }
      return scaleMealPreview(base, scaleFactor);
    });

    return {
      id: template.id,
      name: template.name,
      slug: template.slug,
      icon: template.icon,
      rationale: template.getRationale(profile, bmi),
      keyFactors: template.getKeyFactors(profile, bmi),
      macroProfile: {
        calories: targetKcal,
        protein,
        carbs,
        fat,
        proteinPerKg: template.proteinPerKg,
        carbPercent: Math.round((carbs * 4 / targetKcal) * 100),
        fatPercent: Math.round((fat * 9 / targetKcal) * 100),
      },
      mealDistribution: {
        mealsPerDay: Object.keys(mealSplit).length,
        distribution: Object.fromEntries(
          Object.entries(mealSplit).map(([k, v]) => [k, Math.round(v * 100)])
        ),
      },
      previewMeals,
      score,
      tags: template.tags,
    };
  });

  // Build profile summary
  const goalLabel = GOAL_LABELS[profile.goal] || profile.goal;
  const summaryParts: string[] = [];
  
  if (profile.goal === "lose_weight" && bmi >= 25) {
    summaryParts.push(`Paciente com sobrepeso (IMC ${bmi}) buscando emagrecimento`);
  } else if (profile.goal === "gain_muscle") {
    summaryParts.push(`Paciente com foco em hipertrofia`);
  } else {
    summaryParts.push(`Paciente com objetivo de ${goalLabel.toLowerCase()}`);
  }

  if (profile.clinicalFlags.some(f => ["diabetes_risk", "insulin_resistance"].includes(f))) {
    summaryParts.push("com perfil de resistência insulínica");
  }
  if (profile.activityLevel === "active" || profile.activityLevel === "very_active") {
    summaryParts.push("e nível de atividade elevado");
  } else if (profile.activityLevel === "sedentary") {
    summaryParts.push("e estilo de vida sedentário");
  }
  if (profile.behavioralProfile?.cravingHours?.length) {
    summaryParts.push("— atenção a episódios de compulsão");
  }

  let metabolicType = "Equilibrado";
  if (bmi >= 30) metabolicType = "Metabolismo desacelerado";
  else if (bmi < 20) metabolicType = "Metabolismo acelerado";
  else if (profile.activityLevel === "active" || profile.activityLevel === "very_active") metabolicType = "Alto gasto energético";

  return {
    profile: {
      summary: summaryParts.join(" ") + ".",
      metabolicType,
      bmi,
      bmiCategory,
      tmb,
      tdee,
    },
    strategies,
    analysisTimestamp: new Date().toISOString(),
  };
}
