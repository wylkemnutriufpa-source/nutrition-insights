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

// ── Protein portion standards (guide only, clinical calculation takes precedence) ────
export function standardProteinPortion(mealType: string, isGainGoal: boolean): number {
  if (mealType === "lunch") return isGainGoal ? 180 : 150;
  if (mealType === "dinner") return isGainGoal ? 170 : 140;
  return isGainGoal ? 180 : 150;
}

// Protein distribution moved to _shared/food-rules.ts (canonical location for macro rules)

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

function clampProteinLineToStandardPortion(
  line: string,
  mealType: string,
  _isGainGoal: boolean,
): string {
  // Clinical calculation takes precedence — only clamp extreme outliers (>350g single protein)
  if (!isMainMealType(mealType) || !isProteinLine(line)) return line;

  const MAX_SINGLE_PROTEIN_PORTION = 350; // physiological safety ceiling
  const MIN_SINGLE_PROTEIN_PORTION = 50;  // minimum meaningful portion
  return line.replace(/(\d+(?:[.,]\d+)?)\s*(g)\b/i, (_match, rawValue: string, unit: string) => {
    const parsed = Number(rawValue.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return `${rawValue}${unit}`;
    if (parsed > MAX_SINGLE_PROTEIN_PORTION) return `${MAX_SINGLE_PROTEIN_PORTION}${unit}`;
    if (parsed < MIN_SINGLE_PROTEIN_PORTION) return `${MIN_SINGLE_PROTEIN_PORTION}${unit}`;
    return `${rawValue}${unit}`;
  });
}

export function syncProteinDescriptionPortions(
  description: string | null | undefined,
  mealType: string,
  nextProtein: number,
  previousProtein: number,
  isGainGoal: boolean,
): string | null | undefined {
  if (!description) return description;

  const ratio = Number.isFinite(nextProtein) && Number.isFinite(previousProtein) && previousProtein > 0
    ? nextProtein / previousProtein
    : 1;

  const [mainSection, substitutionsSection] = description.split(/\n\n🔄 Substituições:\n/);
  const syncedMain = (mainSection || "")
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || !isProteinLine(trimmed)) return trimmed;

      const scaledLine = !Number.isFinite(ratio) || ratio <= 0 || Math.abs(ratio - 1) < 0.08
        ? trimmed
        : (scaleDescriptionQuantities(trimmed, ratio) || trimmed);

      return clampProteinLineToStandardPortion(scaledLine, mealType, isGainGoal);
    })
    .filter(Boolean)
    .join("\n");

  return syncedMain + (substitutionsSection ? `\n\n🔄 Substituições:\n${substitutionsSection}` : "");
}

// ── Finalize meal description ────────────────────────────────
// Preserves scaled portions and only applies structural cleanup + beverage line.
export function finalizeMealDescription(description: string, mealType: string, isGainGoal: boolean): string {
  const [mainSection, substitutionsSection] = description.split(/\n\n🔄 Substituições:\n/);
  const normalizedLines = (mainSection || "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

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
