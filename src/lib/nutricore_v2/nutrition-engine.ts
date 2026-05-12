/**
 * Motor Determinístico de Cálculos Nutricionais
 *
 * 100% baseado em fórmulas científicas validadas:
 * - Mifflin-St Jeor (padrão para população geral)
 * - Harris-Benedict (revisado, alternativa)
 * - Cunningham (atletas com massa magra conhecida)
 *
 * Sem IA. Sem caixa preta. Mesmo input = mesmo output, sempre.
 */

export type Sex = "masculino" | "feminino" | "outro";
export type ActivityLevel =
  | "sedentario"
  | "leve"
  | "moderado"
  | "intenso"
  | "muito_intenso";
export type Goal =
  | "emagrecimento"
  | "manutencao"
  | "hipertrofia"
  | "performance"
  | "saude"
  | "recomposicao";
export type Formula = "mifflin_st_jeor" | "harris_benedict" | "cunningham";

export interface BMRInput {
  weight_kg: number;
  height_cm: number;
  age_years: number;
  sex: Sex;
  lean_mass_kg?: number | null;
  formula?: Formula;
}

export interface MacroSplit {
  protein_pct: number;
  carb_pct: number;
  fat_pct: number;
}

export interface MacroTargets {
  protein_g: number;
  carb_g: number;
  fat_g: number;
  protein_kcal: number;
  carb_kcal: number;
  fat_kcal: number;
}

export interface EngineInput {
  // antropométricos
  weight_kg: number;
  height_cm: number;
  age_years: number;
  sex: Sex;
  lean_mass_kg?: number | null;
  // estilo de vida
  activity_level: ActivityLevel;
  // objetivo
  goal: Goal;
  weekly_change_kg?: number | null; // ex: -0.5 para perder 500g/semana
  // override de fórmula
  formula?: Formula;
  // override de distribuição de macros
  macro_split?: MacroSplit;
  // proteína por kg (override) — útil para esportivo
  protein_per_kg?: number | null;
}

export interface EngineResult {
  bmr_kcal: number;
  tdee_kcal: number;
  target_kcal: number;
  macros: MacroTargets;
  formula_used: Formula;
  rationale: string[]; // explicações para o profissional
}

// ----------------------------------------------------------------------
// FATORES DE ATIVIDADE (PAL — Physical Activity Level)
// ----------------------------------------------------------------------
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  intenso: 1.725,
  muito_intenso: 1.9,
};

// ----------------------------------------------------------------------
// AJUSTES POR OBJETIVO (% sobre o TDEE)
// ----------------------------------------------------------------------
export const GOAL_KCAL_ADJUSTMENT: Record<Goal, number> = {
  emagrecimento: -0.2, // déficit de 20%
  manutencao: 0,
  hipertrofia: 0.1, // superávit de 10%
  performance: 0.05,
  saude: 0,
  recomposicao: -0.1,
};

// ----------------------------------------------------------------------
// DISTRIBUIÇÃO PADRÃO DE MACROS POR OBJETIVO
// ----------------------------------------------------------------------
export const DEFAULT_MACRO_SPLITS: Record<Goal, MacroSplit> = {
  emagrecimento: { protein_pct: 0.35, carb_pct: 0.4, fat_pct: 0.25 },
  manutencao: { protein_pct: 0.25, carb_pct: 0.5, fat_pct: 0.25 },
  hipertrofia: { protein_pct: 0.3, carb_pct: 0.5, fat_pct: 0.2 },
  performance: { protein_pct: 0.2, carb_pct: 0.6, fat_pct: 0.2 },
  saude: { protein_pct: 0.2, carb_pct: 0.55, fat_pct: 0.25 },
  recomposicao: { protein_pct: 0.35, carb_pct: 0.35, fat_pct: 0.3 },
};

// ----------------------------------------------------------------------
// PROTEÍNA RECOMENDADA POR KG (sobrescreve % se definido)
// ----------------------------------------------------------------------
export const DEFAULT_PROTEIN_PER_KG: Record<Goal, number> = {
  emagrecimento: 2.0,
  manutencao: 1.6,
  hipertrofia: 2.0,
  performance: 1.8,
  saude: 1.4,
  recomposicao: 2.2,
};

// ======================================================================
// FÓRMULAS DE TMB
// ======================================================================

/** Mifflin-St Jeor (1990) — mais precisa para a maioria. */
export function bmrMifflinStJeor(input: Omit<BMRInput, "formula">): number {
  const base = 10 * input.weight_kg + 6.25 * input.height_cm - 5 * input.age_years;
  if (input.sex === "masculino") return base + 5;
  if (input.sex === "feminino") return base - 161;
  return base - 78; // média para "outro"
}

/** Harris-Benedict revisada (Roza & Shizgal, 1984). */
export function bmrHarrisBenedict(input: Omit<BMRInput, "formula">): number {
  if (input.sex === "masculino") {
    return (
      88.362 +
      13.397 * input.weight_kg +
      4.799 * input.height_cm -
      5.677 * input.age_years
    );
  }
  if (input.sex === "feminino") {
    return (
      447.593 +
      9.247 * input.weight_kg +
      3.098 * input.height_cm -
      4.33 * input.age_years
    );
  }
  return (
    267.978 + 11.322 * input.weight_kg + 3.949 * input.height_cm - 5.0 * input.age_years
  );
}

/** Cunningham (1980) — para atletas, exige massa magra. */
export function bmrCunningham(leanMassKg: number): number {
  return 500 + 22 * leanMassKg;
}

export function calculateBMR(input: BMRInput): { kcal: number; formula: Formula } {
  const formula =
    input.formula ?? (input.lean_mass_kg ? "cunningham" : "mifflin_st_jeor");

  if (formula === "cunningham" && input.lean_mass_kg) {
    return { kcal: bmrCunningham(input.lean_mass_kg), formula };
  }
  if (formula === "harris_benedict") {
    return { kcal: bmrHarrisBenedict(input), formula };
  }
  return { kcal: bmrMifflinStJeor(input), formula: "mifflin_st_jeor" };
}

// ======================================================================
// MACROS
// ======================================================================

export function calculateMacros(params: {
  target_kcal: number;
  weight_kg: number;
  goal: Goal;
  split?: MacroSplit;
  protein_per_kg?: number | null;
}): MacroTargets {
  const split = params.split ?? DEFAULT_MACRO_SPLITS[params.goal];
  const proteinPerKg =
    params.protein_per_kg ?? DEFAULT_PROTEIN_PER_KG[params.goal];

  // Estratégia: proteína fixada por kg (mais segura clinicamente)
  // O resto das calorias é distribuído entre carb e gordura mantendo a proporção do split.
  const protein_g = proteinPerKg * params.weight_kg;
  const protein_kcal = protein_g * 4;

  const remaining_kcal = Math.max(0, params.target_kcal - protein_kcal);
  const carbFatTotal = split.carb_pct + split.fat_pct;
  const carbRatio = carbFatTotal > 0 ? split.carb_pct / carbFatTotal : 0.6;
  const fatRatio = 1 - carbRatio;

  const carb_kcal = remaining_kcal * carbRatio;
  const fat_kcal = remaining_kcal * fatRatio;

  return {
    protein_g: round(protein_g),
    carb_g: round(carb_kcal / 4),
    fat_g: round(fat_kcal / 9),
    protein_kcal: round(protein_kcal),
    carb_kcal: round(carb_kcal),
    fat_kcal: round(fat_kcal),
  };
}

// ======================================================================
// MOTOR PRINCIPAL
// ======================================================================

export function runEngine(input: EngineInput): EngineResult {
  const rationale: string[] = [];

  const { kcal: bmr, formula } = calculateBMR({
    weight_kg: input.weight_kg,
    height_cm: input.height_cm,
    age_years: input.age_years,
    sex: input.sex,
    lean_mass_kg: input.lean_mass_kg,
    formula: input.formula,
  });

  rationale.push(
    `TMB = ${round(bmr)} kcal (fórmula ${formulaLabel(formula)}).`,
  );

  const pal = ACTIVITY_FACTORS[input.activity_level];
  const tdee = bmr * pal;
  rationale.push(
    `TDEE = TMB × ${pal} (atividade ${input.activity_level}) = ${round(tdee)} kcal.`,
  );

  // Ajuste por objetivo
  let target = tdee * (1 + GOAL_KCAL_ADJUSTMENT[input.goal]);

  // Se o usuário definiu ritmo semanal, sobrescreve o ajuste
  if (input.weekly_change_kg && input.goal !== "manutencao") {
    // 1 kg de gordura ≈ 7700 kcal → kcal/dia
    const dailyDelta = (input.weekly_change_kg * 7700) / 7;
    target = tdee + dailyDelta;
    rationale.push(
      `Ritmo de ${input.weekly_change_kg} kg/semana = ${round(dailyDelta)} kcal/dia. Meta = ${round(target)} kcal.`,
    );
  } else {
    rationale.push(
      `Ajuste para objetivo "${input.goal}": ${(GOAL_KCAL_ADJUSTMENT[input.goal] * 100).toFixed(0)}%. Meta = ${round(target)} kcal.`,
    );
  }

  // Garantia mínima (não recomendar abaixo de ~1200 kcal sem critério clínico)
  if (target < 1200) {
    rationale.push(
      `⚠ Meta calculada abaixo de 1200 kcal. Ajustada para mínimo seguro de 1200 kcal.`,
    );
    target = 1200;
  }

  const macros = calculateMacros({
    target_kcal: target,
    weight_kg: input.weight_kg,
    goal: input.goal,
    split: input.macro_split,
    protein_per_kg: input.protein_per_kg,
  });

  rationale.push(
    `Macros: ${macros.protein_g}g PTN (${(macros.protein_g / input.weight_kg).toFixed(1)}g/kg) · ${macros.carb_g}g CHO · ${macros.fat_g}g LIP.`,
  );

  return {
    bmr_kcal: round(bmr),
    tdee_kcal: round(tdee),
    target_kcal: round(target),
    macros,
    formula_used: formula,
    rationale,
  };
}

// ======================================================================
// IMC (BMI)
// ======================================================================

export function calculateBMI(weight_kg: number, height_cm: number): number {
  if (!height_cm) return 0;
  const m = height_cm / 100;
  return round(weight_kg / (m * m));
}

export function classifyBMI(bmi: number): {
  label: string;
  color: "success" | "warning" | "danger";
} {
  if (bmi < 18.5) return { label: "Abaixo do peso", color: "warning" };
  if (bmi < 25) return { label: "Peso normal", color: "success" };
  if (bmi < 30) return { label: "Sobrepeso", color: "warning" };
  return { label: "Obesidade", color: "danger" };
}

// ----------------------------------------------------------------------
// helpers
// ----------------------------------------------------------------------
function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function formulaLabel(f: Formula): string {
  switch (f) {
    case "mifflin_st_jeor":
      return "Mifflin-St Jeor";
    case "harris_benedict":
      return "Harris-Benedict";
    case "cunningham":
      return "Cunningham";
  }
}

export function ageFromBirthDate(isoDate: string | null | undefined): number {
  if (!isoDate) return 0;
  const dob = new Date(isoDate);
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}
