/**
 * Template Variation Engine v1.0.0
 * Generates food-level variations of meal templates using ifj_food_database.
 * Swaps individual food items within a template while preserving structure and macro targets.
 */

import type { ResolvedTemplate, FoodStructureItem } from "./template-resolver.ts";
import { BLOCKED_FOODS, COMPLEX_PREP_KEYWORDS, PREMIUM_KEYWORDS, normalize as normalizeRule } from "./food-rules.ts";

// ── Food category mapping ──
const FOOD_CATEGORY_MAP: Record<string, string[]> = {
  protein: ["proteina", "protein", "carne", "frango", "peixe", "ovo", "meat", "chicken", "fish", "egg"],
  carb: ["carboidrato", "carb", "arroz", "batata", "macarrao", "pao", "rice", "potato", "bread", "pasta"],
  legume: ["leguminosa", "legume", "feijao", "lentilha", "grao de bico", "bean", "lentil"],
  vegetable: ["vegetal", "verdura", "legume_verdura", "salada", "brocolis", "vegetable", "greens"],
  fat: ["gordura", "fat", "azeite", "castanha", "oleaginosa", "nuts", "oil"],
  fruit: ["fruta", "fruit", "banana", "maca", "mamao"],
  dairy: ["laticinio", "dairy", "iogurte", "leite", "yogurt", "milk"],
};

interface DBFoodItem {
  id: string;
  food_name: string;
  normalized_name: string;
  category: string;
  portion_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meal_tags_json?: string[];
  restriction_tags_json?: string[];
}

export interface VariationContext {
  restrictions: string[];
  dislikedFoods: string[];
  allergies: string[];
  seed: number;
  mealType?: string;
}

const BLOCKED_VARIATION_KEYWORDS = [
  "canjica",
  "óleo de abacate",
  "oleo de abacate",
  "óleo de coco",
  "oleo de coco",
  "pastel",
  "prato feito",
  "pf ",
  "salada caesar",
  "colageno",
  "colágeno",
  "barra proteica",
  "suco verde",
];

const SAFE_VARIATION_DB_CATEGORIES = new Set([
  "proteina",
  "carboidrato",
  "leguminosa",
  "verdura",
  "vegetal",
  "fruta",
  "laticinio",
  "gordura",
  "oleaginosa",
  "cafe_da_manha",
]);

const MEAL_TYPE_ALLOWED_TAGS: Record<string, string[]> = {
  breakfast: ["cafe_da_manha"],
  morning_snack: ["lanche", "lanche_manha"],
  lunch: ["almoco"],
  afternoon_snack: ["lanche", "lanche_tarde"],
  dinner: ["jantar", "almoco", "refeicao"],
  evening_snack: ["ceia", "lanche"],
};

const CATEGORY_MEALTYPE_DENYLIST: Record<string, string[]> = {
  lunch: ["cafe_da_manha"],
  dinner: ["cafe_da_manha"],
  breakfast: ["almoco", "jantar", "ceia", "refeicao"],
  morning_snack: ["almoco", "jantar", "refeicao"],
  afternoon_snack: ["almoco", "jantar", "refeicao"],
  evening_snack: ["almoco", "jantar", "cafe_da_manha", "refeicao"],
};

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function hasBlockedKeyword(foodName: string): boolean {
  const norm = normalize(foodName);
  return [
    ...BLOCKED_VARIATION_KEYWORDS,
    ...BLOCKED_FOODS,
    ...PREMIUM_KEYWORDS,
    ...COMPLEX_PREP_KEYWORDS,
  ].some((kw) => norm.includes(normalizeRule(kw)));
}

function classifyFood(foodName: string, dbCategory?: string): string {
  const norm = normalize(foodName);
  const cat = normalize(dbCategory || "");

  for (const [category, keywords] of Object.entries(FOOD_CATEGORY_MAP)) {
    if (keywords.some(kw => norm.includes(kw) || cat.includes(kw))) {
      return category;
    }
  }

  return "other";
}

function tagsMatchMealType(food: DBFoodItem, mealType?: string): boolean {
  if (!mealType) return true;
  const tags = (food.meal_tags_json || []).map(normalize);
  const category = normalize(food.category || "");
  const allowed = (MEAL_TYPE_ALLOWED_TAGS[mealType] || []).map(normalize);
  const denied = (CATEGORY_MEALTYPE_DENYLIST[mealType] || []).map(normalize);

  if (category && denied.includes(category)) return false;
  if (category && allowed.includes(category)) return true;
  if (tags.some((tag) => denied.includes(tag))) return false;
  if (tags.length === 0) return true;
  return tags.some((tag) => allowed.includes(tag));
}

function isVariationCategorySafe(food: DBFoodItem): boolean {
  const category = normalize(food.category || "");
  return SAFE_VARIATION_DB_CATEGORIES.has(category);
}

/**
 * Calculate macro density similarity between two foods (0-1 scale).
 */
function macroDensitySimilarity(
  a: { calories: number; protein: number; carbs: number; fat: number; portion_grams: number },
  b: { calories: number; protein: number; carbs: number; fats: number; portion_grams: number },
): number {
  if (a.portion_grams <= 0 || b.portion_grams <= 0) return 0;

  const aDensity = {
    cal: a.calories / a.portion_grams,
    p: a.protein / a.portion_grams,
    c: a.carbs / a.portion_grams,
    f: a.fat / a.portion_grams,
  };
  const bDensity = {
    cal: b.calories / b.portion_grams,
    p: b.protein / b.portion_grams,
    c: b.carbs / b.portion_grams,
    f: b.fats / b.portion_grams,
  };

  const diffs = [
    Math.abs(aDensity.cal - bDensity.cal) / Math.max(aDensity.cal, bDensity.cal, 0.01),
    Math.abs(aDensity.p - bDensity.p) / Math.max(aDensity.p, bDensity.p, 0.01),
    Math.abs(aDensity.c - bDensity.c) / Math.max(aDensity.c, bDensity.c, 0.01),
    Math.abs(aDensity.f - bDensity.f) / Math.max(aDensity.f, bDensity.f, 0.01),
  ];

  const avgDiff = diffs.reduce((s, d) => s + d, 0) / diffs.length;
  return Math.max(0, 1 - avgDiff);
}

/**
 * Check if a food is compatible with patient restrictions.
 */
function isFoodCompatible(food: DBFoodItem, ctx: VariationContext): boolean {
  const norm = normalize(food.food_name);

  if (hasBlockedKeyword(food.food_name)) return false;
  if (!isVariationCategorySafe(food)) return false;
  if (!tagsMatchMealType(food, ctx.mealType)) return false;

  // Disliked check
  if (ctx.dislikedFoods.some(d => {
    const nd = normalize(d);
    return nd.length >= 3 && (norm.includes(nd) || nd.includes(norm));
  })) return false;

  // Allergy check via restriction_tags
  const tags = food.restriction_tags_json || [];
  for (const allergy of ctx.allergies) {
    const normA = normalize(allergy);
    if (tags.some(t => normalize(t).includes(normA))) return false;
    if (norm.includes(normA)) return false;
  }

  return true;
}

/**
 * Find compatible substitutions for a food item from the DB.
 * Returns up to `maxCandidates` foods sorted by macro density similarity.
 */
export function findSubstitutions(
  originalFood: FoodStructureItem,
  dbFoods: DBFoodItem[],
  ctx: VariationContext,
  maxCandidates: number = 5,
): DBFoodItem[] {
  const originalCategory = classifyFood(originalFood.name);
  const normOriginal = normalize(originalFood.name);

  if (originalCategory === "other" || hasBlockedKeyword(originalFood.name)) {
    return [];
  }

  const candidates = dbFoods
    .filter(f => {
      // Same category
      if (classifyFood(f.food_name, f.category) !== originalCategory) return false;
      // Not the same food
      if (normalize(f.food_name) === normOriginal) return false;
      // Compatible with patient
      if (!isFoodCompatible(f, ctx)) return false;
      return true;
    })
    .map(f => ({
      food: f,
      similarity: macroDensitySimilarity(
        { calories: originalFood.calories, protein: originalFood.protein, carbs: originalFood.carbs, fat: originalFood.fat, portion_grams: originalFood.portion_grams },
        f,
      ),
    }))
    .filter(c => c.similarity >= 0.4) // Minimum 40% similarity
    .sort((a, b) => b.similarity - a.similarity);

  return candidates.slice(0, maxCandidates).map(c => c.food);
}

/**
 * Generate a variation of a template by swapping foods with compatible alternatives.
 * Only swaps 1-2 foods per variation to maintain structural integrity.
 */
export function generateTemplateVariation(
  template: ResolvedTemplate,
  dbFoods: DBFoodItem[],
  ctx: VariationContext,
): ResolvedTemplate {
  if (template.foods_structure.length === 0) return template;

  // Determine how many foods to swap (1-2, never more than half)
  const maxSwaps = Math.min(2, Math.ceil(template.foods_structure.length / 2));

  // Use seed for deterministic but varied selection
  const swapIndices: number[] = [];
  for (let i = 0; i < template.foods_structure.length && swapIndices.length < maxSwaps; i++) {
    const idx = (ctx.seed + i * 7) % template.foods_structure.length;
    if (!swapIndices.includes(idx)) {
      swapIndices.push(idx);
    }
  }

  const newFoods = [...template.foods_structure];

  for (const idx of swapIndices) {
    const original = newFoods[idx];
    const subs = findSubstitutions(original, dbFoods, ctx);

    if (subs.length === 0) continue;

    // Pick substitute using seed
    const pickIdx = ctx.seed % subs.length;
    const sub = subs[pickIdx];

    // Scale substitute to match original portion's macro target
    const origPortion = Number(original.portion_grams) || 100;
    const subPortion = Number(sub.portion_grams) || 100;
    const portionRatio = origPortion / subPortion;

    newFoods[idx] = {
      name: sub.food_name,
      portion_grams: origPortion,
      calories: Math.round(sub.calories * portionRatio),
      protein: Math.round(sub.protein * portionRatio * 10) / 10,
      carbs: Math.round(sub.carbs * portionRatio * 10) / 10,
      fat: Math.round(sub.fats * portionRatio * 10) / 10,
      protein_per_gram: sub.protein / subPortion,
      carbs_per_gram: sub.carbs / subPortion,
      fat_per_gram: sub.fats / subPortion,
      calories_per_gram: sub.calories / subPortion,
      food_id: sub.id,
    };
  }

  const invalidCrossMealMix = ctx.mealType
    ? newFoods.some((food) => hasBlockedKeyword(food.name))
    : false;

  if (invalidCrossMealMix) {
    return template;
  }

  // Recalculate template base macros
  const totalCal = newFoods.reduce((s, f) => s + f.calories, 0);
  const totalP = newFoods.reduce((s, f) => s + f.protein, 0);
  const totalC = newFoods.reduce((s, f) => s + f.carbs, 0);
  const totalF = newFoods.reduce((s, f) => s + f.fat, 0);

  return {
    ...template,
    name: `${template.name} (var)`,
    foods_structure: newFoods,
    kcal_base: totalCal,
    protein_base: totalP,
    carbs_base: totalC,
    fat_base: totalF,
  };
}
