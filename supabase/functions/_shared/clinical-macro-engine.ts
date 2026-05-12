/**
 * Clinical Macro Engine v2.0 — SINGLE SOURCE OF TRUTH
 * @deprecated Use constants and types from clinical-engine-v2.ts
 */

export { 
  ACTIVITY_MULTIPLIERS, 
  GOAL_KCAL_ADJUSTMENT, 
  CLINICAL_PROTEIN_RANGES, 
  CLINICAL_FAT_RANGE 
} from "./clinical-engine-v2.ts";

// Mantendo exportações para retrocompatibilidade


// ──── TMB Calculator (Mifflin-St Jeor) ────
export function calculateTMB(weight: number, height: number, age: number, sex: string): number {
  if (sex === "female") return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
}

// ──── TDEE Calculator ────
export function calculateTDEE(tmb: number, activityLevel: string): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.375;
  return Math.round(tmb * multiplier);
}

// ──── Target Kcal with Goal Adjustment ────
export function calculateTargetKcal(tdee: number, goal: string, sex: string = "male"): number {
  const adjustment = GOAL_KCAL_ADJUSTMENT[goal] || 0;
  const raw = tdee + adjustment;
  const minKcal = sex === "female" ? 1200 : 1500;
  return Math.max(minKcal, Math.min(3500, raw));
}

// ──── Clinical Macro Calculator ────
export function calculateMacros(kcal: number, goal: string, weight: number): { protein: number; carbs: number; fat: number } {
  const proteinRange = CLINICAL_PROTEIN_RANGES[goal] || CLINICAL_PROTEIN_RANGES.maintain;
  let protein = Math.round(weight * proteinRange.ideal);
  let fat = Math.round(weight * CLINICAL_FAT_RANGE.ideal);

  const proteinKcal = protein * 4;
  const fatKcal = fat * 9;
  let carbsKcal = kcal - proteinKcal - fatKcal;

  if (carbsKcal < 0) {
    fat = Math.round(weight * CLINICAL_FAT_RANGE.min);
    carbsKcal = kcal - (protein * 4) - (fat * 9);
  }
  if (carbsKcal < 0) {
    protein = Math.round(weight * proteinRange.min);
    carbsKcal = kcal - (protein * 4) - (fat * 9);
  }

  const carbs = Math.max(0, Math.round(carbsKcal / 4));

  const actualProteinPerKg = protein / weight;
  if (actualProteinPerKg > proteinRange.max) {
    protein = Math.round(weight * proteinRange.max);
    console.warn(`[ClinicalMacroEngine] Protein capped at ${proteinRange.max}g/kg for goal=${goal}`);
  }

  return { protein, carbs, fat };
}

// ──── Enforce Clinical Ranges on External Overrides ────
export function enforceProteinRange(protein: number, weight: number, goal: string): number {
  const range = CLINICAL_PROTEIN_RANGES[goal] || CLINICAL_PROTEIN_RANGES.maintain;
  const perKg = protein / weight;
  if (perKg > range.max) return Math.round(weight * range.max);
  if (perKg < range.min) return Math.round(weight * range.min);
  return protein;
}

export function enforceFatRange(fat: number, weight: number): number {
  const perKg = fat / weight;
  if (perKg > CLINICAL_FAT_RANGE.max * 1.1) return Math.round(weight * CLINICAL_FAT_RANGE.max);
  return fat;
}

// ──── Normalization Helpers ────
export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const cleaned = value.replace(",", ".").trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function normalizeWeightKg(value: unknown): number | null {
  const parsed = toFiniteNumber(value);
  if (parsed === null || parsed <= 0) return null;
  if (parsed > 300) return parsed / 1000;
  return parsed;
}

export function normalizeHeightCm(value: unknown): number | null {
  const parsed = toFiniteNumber(value);
  if (parsed === null || parsed <= 0) return null;
  if (parsed > 0 && parsed < 3) return parsed * 100;
  return parsed;
}

export function normalizeAge(value: unknown, fallback = 30): number {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return fallback;
  const rounded = Math.round(parsed);
  if (rounded < 1 || rounded > 120) return fallback;
  return rounded;
}

export function normalizeGoal(value: unknown): string | null {
  if (!value || typeof value !== "string") return null;
  const raw = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s_]/g, "").trim();
  const GOAL_MAP: Record<string, string> = {
    "lose_weight": "lose_weight", "perder_peso": "lose_weight", "perder peso": "lose_weight",
    "emagrecer": "lose_weight", "emagrecimento": "lose_weight", "definicao": "lose_weight",
    "cutting": "lose_weight", "fat_loss": "lose_weight", "deficit": "lose_weight",
    "gain_weight": "gain_weight", "ganhar_peso": "gain_weight", "ganhar peso": "gain_weight",
    "ganho_de_massa": "gain_weight", "ganho de massa": "gain_weight", "hipertrofia": "gain_weight",
    "muscle_gain": "gain_weight", "bulking": "gain_weight", "massa muscular": "gain_weight",
    "maintain": "maintain", "manter_peso": "maintain", "manter peso": "maintain",
    "manutencao": "maintain", "manter": "maintain", "recomposicao": "maintain",
    "recomp": "maintain", "recomposition": "maintain",
    "performance": "performance", "desempenho": "performance", "esportivo": "performance",
    "saude": "maintain", "health": "maintain", "bem_estar": "maintain", "bem estar": "maintain",
    "qualidade_de_vida": "maintain", "qualidade de vida": "maintain",
  };
  if (GOAL_MAP[raw]) return GOAL_MAP[raw];
  if (raw.includes("emagrec") || raw.includes("perder") || raw.includes("deficit")) return "lose_weight";
  if (raw.includes("massa") || raw.includes("hipertro") || raw.includes("ganhar") || raw.includes("ganho")) return "gain_weight";
  if (raw.includes("manter") || raw.includes("manutenç") || raw.includes("manuten") || raw.includes("saude") || raw.includes("saúde")) return "maintain";
  return "maintain";
}

export function normalizeActivityLevel(value: unknown): string {
  const raw = String(value || "light").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s_]/g, "").trim();
  if (["sedentary", "sedentario"].includes(raw)) return "sedentary";
  if (["light", "leve"].includes(raw)) return "light";
  if (["moderate", "moderado"].includes(raw)) return "moderate";
  if (["active", "ativo", "intense", "intenso"].includes(raw)) return "active";
  if (["very_active", "very active", "muito ativo", "muito_ativo"].includes(raw)) return "very_active";
  return "light";
}
