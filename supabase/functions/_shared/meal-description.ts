/**
 * Meal Description Engine — Canonical Source of Truth
 * 
 * ALL description building, scaling, and finalization MUST use these functions.
 * Used by: generate-meal-plan, validate-meal-plan, autoFixEngine, mealItemBuilder
 * 
 * v1.0.0
 */

// ── Helpers ──────────────────────────────────────────────────
function normalize(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// ── Constants ────────────────────────────────────────────────
const BEVERAGE_KEYWORDS = ["cafe", "chá", "cha", "leite", "suco", "vitamina"];
const MAIN_PROTEIN_KEYWORDS = [
  "frango", "carne", "bife", "alcatra", "patinho", "tilapia", "tilápia",
  "peixe", "porco", "lombo", "sobrecoxa", "sardinha", "atum", "salmao",
  "salmão", "camarao", "camarão", "ovo", "ovos",
];

const MAIN_MEAL_TYPES = new Set(["lunch", "dinner"]);

// ── Protein portion standards ────────────────────────────────
export function standardProteinPortion(mealType: string, isGainGoal: boolean): number {
  if (mealType === "lunch") return isGainGoal ? 180 : 150;
  if (mealType === "dinner") return isGainGoal ? 170 : 140;
  return isGainGoal ? 180 : 150;
}

// ── Protein rebalancing shares/caps ──────────────────────────
export function getProteinDistribution(isGainGoal: boolean) {
  const shares: Record<string, number> = isGainGoal
    ? { breakfast: 0.16, morning_snack: 0.10, lunch: 0.26, afternoon_snack: 0.10, dinner: 0.24, evening_snack: 0.14 }
    : { breakfast: 0.15, morning_snack: 0.08, lunch: 0.27, afternoon_snack: 0.08, dinner: 0.27, evening_snack: 0.15 };
  const caps: Record<string, number> = isGainGoal
    ? { breakfast: 45, morning_snack: 24, lunch: 65, afternoon_snack: 24, dinner: 60, evening_snack: 35 }
    : { breakfast: 30, morning_snack: 18, lunch: 55, afternoon_snack: 18, dinner: 55, evening_snack: 30 };
  return { shares, caps };
}

// ── Detection helpers ────────────────────────────────────────
export function isMainMealType(mealType: string): boolean {
  return MAIN_MEAL_TYPES.has(mealType);
}

export function isProteinLine(line: string): boolean {
  const normalized = normalize(line);
  return MAIN_PROTEIN_KEYWORDS.some(kw => normalized.includes(normalize(kw)));
}

export function hasBeverage(description: string): boolean {
  const normalized = normalize(description);
  return BEVERAGE_KEYWORDS.some(kw => normalized.includes(normalize(kw)));
}

export function getDefaultBeverageLine(mealType: string): string | null {
  if (mealType === "breakfast") return "• Café com leite";
  if (mealType === "afternoon_snack") return "• Chá sem açúcar";
  return null;
}

// ── Quantity rounding ────────────────────────────────────────
export function roundScaledQuantity(value: number, unit: string): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const normalizedUnit = normalize(unit);

  if (normalizedUnit === "g" || normalizedUnit === "ml") {
    return value >= 20 ? Math.max(5, Math.round(value / 5) * 5) : Math.max(1, Math.round(value));
  }

  return value >= 10 ? Math.max(1, Math.round(value)) : Math.max(0.5, Math.round(value * 2) / 2);
}

// ── Scale description quantities ─────────────────────────────
export function scaleDescriptionQuantities(
  description: string | null | undefined,
  factor: number
): string | null | undefined {
  if (!description || !Number.isFinite(factor) || factor <= 0 || Math.abs(factor - 1) < 0.08) return description;

  const scaleToken = (rawValue: string, unit: string, spacer = "") => {
    const parsed = Number(rawValue.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return `${rawValue}${spacer}${unit}`;
    const scaled = roundScaledQuantity(parsed * factor, unit);
    const formatted = Number.isInteger(scaled)
      ? String(Math.trunc(scaled))
      : scaled.toFixed(1).replace(".0", "").replace(".", ",");
    return `${formatted}${spacer}${unit}`;
  };

  return description
    .replace(/(\d+(?:[.,]\d+)?)\s*(g|ml)\b/gi, (_, value: string, unit: string) => scaleToken(value, unit))
    .replace(/(\d+(?:[.,]\d+)?)\s*(col\.?\s*(?:sopa|cha|chá))\b/gi, (_, value: string, unit: string) => scaleToken(value, unit, " "));
}

// ── Normalize protein line in main meals ─────────────────────
function normalizeProteinLine(line: string, mealType: string, isGainGoal: boolean): string {
  if (!isMainMealType(mealType) || !isProteinLine(line)) return line;
  const targetGrams = standardProteinPortion(mealType, isGainGoal);
  if (!/(\d+(?:[.,]\d+)?)\s*g\b/i.test(line)) return line;
  return line.replace(/(\d+(?:[.,]\d+)?)\s*g\b/i, `${targetGrams}g`);
}

// ── Finalize meal description ────────────────────────────────
// Ensures protein normalization and beverage line are applied consistently
export function finalizeMealDescription(description: string, mealType: string, isGainGoal: boolean): string {
  const [mainSection, substitutionsSection] = description.split(/\n\n🔄 Substituições:\n/);
  const lines = (mainSection || "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  let proteinNormalized = false;
  const normalizedLines = lines.map(line => {
    if (!proteinNormalized && isMainMealType(mealType) && isProteinLine(line) && /(\d+(?:[.,]\d+)?)\s*g\b/i.test(line)) {
      proteinNormalized = true;
      return normalizeProteinLine(line, mealType, isGainGoal);
    }
    return line;
  });

  const beverageLine = getDefaultBeverageLine(mealType);
  if (beverageLine && !hasBeverage(normalizedLines.join("\n"))) {
    normalizedLines.push(beverageLine);
  }

  return normalizedLines.join("\n") + (substitutionsSection ? `\n\n🔄 Substituições:\n${substitutionsSection}` : "");
}

// ── Build food description from items ────────────────────────
// Creates bullet-point description from food array with portions
export function buildFoodDescriptionFromItems(
  foods: Array<{ food_name: string; portion_grams?: number; portion_reference?: string }>,
  scaleFactor: number = 1
): string {
  const clampedScale = Math.max(0.5, Math.min(2.0, scaleFactor));

  return foods.map(f => {
    const grams = Math.round((f.portion_grams || 100) * clampedScale);
    const basePortion = (f.portion_reference || `${f.portion_grams || 100}g`).trim();
    const scaledPortion = scaleDescriptionQuantities(basePortion, clampedScale) || basePortion;
    const resolvedPortion = scaledPortion === basePortion && !/(\d+(?:[.,]\d+)?)\s*(g|ml|col\.?)/i.test(basePortion)
      ? `${grams}g`
      : scaledPortion;
    return `• ${f.food_name} — ${resolvedPortion}`;
  }).join("\n");
}

// ── Check if description is generic/useless ──────────────────
export function isGenericDescription(desc: string): boolean {
  const trimmed = desc.trim();
  if (/^\d+\s*(g|ml|kcal)$/i.test(trimmed)) return true;
  if (/^Meta:/i.test(trimmed) && !trimmed.includes("•")) return true;
  return false;
}
