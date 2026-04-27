/**
 * Motor Determinístico V2 — Constantes
 *
 * FONTE DA VERDADE: MOTOR_DETERMINISTICO.md
 * NÃO ALTERAR valores sem atualizar a documentação e os testes de paridade.
 */

export const ENGINE_V2_VERSION = "v2.0.0-deterministic";

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_MULTIPLIERS;

export const GOAL_KCAL_ADJUSTMENT = {
  lose: -500,
  maintain: 0,
  gain: 400,
} as const;

export const GOAL_PROTEIN_PER_KG = {
  lose: 1.8,
  maintain: 1.6,
  gain: 2.0,
} as const;

export type Goal = keyof typeof GOAL_KCAL_ADJUSTMENT;

export type Sex = "M" | "F";

/**
 * Distribuição calórica padrão por refeição (soma = 1.0).
 * Mapeado para o enum meal_type do banco existente.
 */
export const MEAL_DISTRIBUTION = {
  breakfast: 0.20,
  morning_snack: 0.10,
  lunch: 0.30,
  afternoon_snack: 0.10,
  dinner: 0.25,
  evening_snack: 0.05,
} as const;

export type MealType = keyof typeof MEAL_DISTRIBUTION;

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Café da Manhã",
  morning_snack: "Lanche da Manhã",
  lunch: "Almoço",
  afternoon_snack: "Lanche da Tarde",
  dinner: "Jantar",
  evening_snack: "Ceia",
};

export const MEAL_ORDER: MealType[] = [
  "breakfast",
  "morning_snack",
  "lunch",
  "afternoon_snack",
  "dinner",
  "evening_snack",
];
