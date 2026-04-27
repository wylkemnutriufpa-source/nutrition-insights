/**
 * Motor Determinístico V2 — Núcleo de cálculo
 *
 * Implementação direta de MOTOR_DETERMINISTICO.md (seções 2-3, 10).
 * Espelho client-side da edge function generate-meal-plan-v2.
 * Zero IA. Zero heurística. Apenas matemática auditável.
 */

import {
  ACTIVITY_MULTIPLIERS,
  GOAL_KCAL_ADJUSTMENT,
  GOAL_PROTEIN_PER_KG,
  MEAL_DISTRIBUTION,
  MEAL_LABELS,
  MEAL_ORDER,
  type ActivityLevel,
  type Goal,
  type MealType,
  type Sex,
} from "./constants";

export interface PatientInput {
  weight_kg: number;
  height_cm: number;
  sex: Sex;
  birth_date?: string | null;
  age?: number | null;
  activity_level: ActivityLevel;
  goal: Goal;
}

export interface EngineMetrics {
  age: number;
  imc: number;
  tmb: number;
  get: number;
  target_kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  meal_distribution: Record<MealType, number>;
  meal_labels: Record<MealType, string>;
  meal_targets: Array<{ type: MealType; name: string; kcal: number }>;
  engine_version: string;
}

/** Idade exata em anos a partir de data ISO (YYYY-MM-DD). Default 30 se ausente. */
export function calcAge(birthDate?: string | null): number {
  if (!birthDate) return 30;
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return 30;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/** Mifflin-St Jeor (1990). */
export function calcTMB(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const tmb = sex === "M" ? base + 5 : base - 161;
  return round1(tmb);
}

/** Pipeline determinístico completo. */
export function calcMetrics(p: PatientInput): EngineMetrics {
  const weight = Number(p.weight_kg) || 0;
  const height = Number(p.height_cm) || 0;
  const sex: Sex = p.sex === "F" ? "F" : "M";
  const age = p.age ?? calcAge(p.birth_date);
  const activity = (p.activity_level ?? "moderate") as ActivityLevel;
  const goal = (p.goal ?? "maintain") as Goal;

  const tmb = calcTMB(sex, weight, height, age);
  const mult = ACTIVITY_MULTIPLIERS[activity] ?? 1.55;
  const get = round1(tmb * mult);
  const targetKcal = round1(get + (GOAL_KCAL_ADJUSTMENT[goal] ?? 0));

  const proteinPerKg = GOAL_PROTEIN_PER_KG[goal] ?? 1.6;
  const proteinG = round1(weight * proteinPerKg);
  const fatG = round1((targetKcal * 0.25) / 9);
  const remainingKcal = targetKcal - proteinG * 4 - fatG * 9;
  const carbG = round1(Math.max(0, remainingKcal / 4));

  const imc = height > 0 ? round1(weight / Math.pow(height / 100, 2)) : 0;

  const mealTargets = MEAL_ORDER.map((type) => ({
    type,
    name: MEAL_LABELS[type],
    kcal: round1(targetKcal * MEAL_DISTRIBUTION[type]),
  }));

  return {
    age,
    imc,
    tmb,
    get,
    target_kcal: targetKcal,
    protein_g: proteinG,
    carb_g: carbG,
    fat_g: fatG,
    meal_distribution: { ...MEAL_DISTRIBUTION },
    meal_labels: { ...MEAL_LABELS },
    meal_targets: mealTargets,
    engine_version: "v2.0.0-deterministic",
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
