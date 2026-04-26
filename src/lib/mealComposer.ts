/**
 * Meal Composer Engine — FitJourney v1.0
 *
 * Compõe refeições dinamicamente a partir de blocos nutricionais,
 * ajustando gramagens para atingir metas de macros.
 */

import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────
export type FoodRole = "protein" | "carb" | "vegetable" | "fruit" | "fat" | "dairy" | "beverage" | "complement" | "soup";

export interface ComposerFood {
  id: string;
  food_name: string;
  category: string;
  portion_grams: number;
  calories_per_gram: number;
  protein_per_gram: number;
  carbs_per_gram: number;
  fat_per_gram: number;
  role: FoodRole;
}

export interface ComposedItem {
  food_id: string;
  food_name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  role: FoodRole;
}

export interface ComposedMeal {
  items: ComposedItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface MacroTarget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface PatientContext {
  patientId: string;
  allergies?: string[];
  intolerances?: string[];
  restrictions?: string[];
  dislikedFoods?: string[];
  clinicalFlags?: string[];
  objective?: string;
}

export type ComposerMode = "quick" | "smart" | "clinical";

type MealSlotType = "breakfast" | "morning_snack" | "lunch" | "afternoon_snack" | "dinner" | "evening_snack";

// ── Category → Role mapping ──────────────────────────────────
const CATEGORY_ROLE_MAP: Record<string, FoodRole> = {
  proteina: "protein",
  carboidrato: "carb",
  vegetal: "vegetable",
  verdura: "vegetable",
  fruta: "fruit",
  gordura: "fat",
  oleaginosa: "fat",
  laticinio: "dairy",
  bebida: "beverage",
  cafe_da_manha: "complement",
  lanche: "complement",
  acompanhamento: "complement",
  prato_composto: "protein",
  sopa: "soup",
  sobremesa: "fruit",
};

// ── Composition templates per meal type ──────────────────────
interface SlotTemplate {
  roles: FoodRole[];
  calorieShare: number[]; // approximate % each role gets
}

const SLOT_TEMPLATES: Record<MealSlotType, SlotTemplate[]> = {
  breakfast: [
    { roles: ["protein", "carb", "fruit"], calorieShare: [0.35, 0.40, 0.25] },
    { roles: ["dairy", "fruit", "carb"], calorieShare: [0.30, 0.30, 0.40] },
    { roles: ["protein", "carb", "beverage"], calorieShare: [0.40, 0.45, 0.15] },
  ],
  morning_snack: [
    { roles: ["fruit", "protein"], calorieShare: [0.50, 0.50] },
    { roles: ["dairy", "fruit"], calorieShare: [0.50, 0.50] },
  ],
  lunch: [
    { roles: ["protein", "carb", "vegetable"], calorieShare: [0.40, 0.35, 0.25] },
    { roles: ["protein", "carb", "complement", "vegetable"], calorieShare: [0.35, 0.30, 0.15, 0.20] },
  ],
  afternoon_snack: [
    { roles: ["fruit", "protein"], calorieShare: [0.50, 0.50] },
    { roles: ["carb", "protein"], calorieShare: [0.50, 0.50] },
  ],
  dinner: [
    { roles: ["protein", "carb", "vegetable"], calorieShare: [0.45, 0.30, 0.25] },
    { roles: ["protein", "vegetable", "fat"], calorieShare: [0.50, 0.30, 0.20] },
  ],
  evening_snack: [
    { roles: ["fruit"], calorieShare: [1.0] },
    { roles: ["dairy"], calorieShare: [1.0] },
    { roles: ["beverage", "carb"], calorieShare: [0.30, 0.70] },
  ],
};

// ── Helpers ──────────────────────────────────────────────────
function normalize(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function seededRandom(seed: string, index: number): number {
  let hash = 0;
  const str = seed + String(index);
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return (((hash >>> 0) % 10000) / 10000);
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed, i) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Food loading (cached) ────────────────────────────────────
let _foodCache: ComposerFood[] | null = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function loadFoods(): Promise<ComposerFood[]> {
  if (_foodCache && Date.now() - _cacheTime < CACHE_TTL) return _foodCache;

  const { data } = await supabase
    .from("ifj_food_database" as any)
    .select("id, food_name, category, portion_grams, calories_per_gram, protein_per_gram, carbs_per_gram, fat_per_gram")
    .eq("is_active", true);

  if (!data) return [];

  _foodCache = (data as any[])
    .filter(f => f.calories_per_gram != null && f.protein_per_gram != null)
    .map(f => ({
      ...f,
      portion_grams: f.portion_grams || 100,
      role: CATEGORY_ROLE_MAP[f.category] || "complement",
    }));
  _cacheTime = Date.now();
  return _foodCache;
}

// ── Patient filtering ────────────────────────────────────────
function filterForPatient(foods: ComposerFood[], ctx: PatientContext): ComposerFood[] {
  const blocked = new Set<string>();
  const lists = [ctx.allergies, ctx.intolerances, ctx.restrictions, ctx.dislikedFoods];
  for (const list of lists) {
    if (list) list.forEach(f => blocked.add(normalize(f)));
  }
  if (blocked.size === 0) return foods;

  return foods.filter(f => {
    const n = normalize(f.food_name);
    for (const b of blocked) {
      if (b.length >= 3 && (n.includes(b) || b.includes(n))) return false;
    }
    return true;
  });
}

// ── Clinical overrides ───────────────────────────────────────
function applyClinicalOverrides(target: MacroTarget, ctx: PatientContext): MacroTarget {
  const t = { ...target };
  const flags = ctx.clinicalFlags || [];

  if (flags.includes("diabetes_risk") || flags.includes("insulin_resistance")) {
    t.carbs = Math.round(t.carbs * 0.85);
    t.fat = Math.round(t.fat * 1.05);
  }
  if (flags.includes("renal_risk")) {
    t.protein = Math.min(t.protein, 60);
  }
  if (flags.includes("hypertension")) {
    // no macro change, but could filter high-sodium foods in the future
  }
  return t;
}

// ── Gram adjustment to hit calorie share ─────────────────────
function adjustGrams(food: ComposerFood, targetCalories: number): ComposedItem {
  const cpg = food.calories_per_gram || 1;
  const grams = Math.max(20, Math.min(400, Math.round(targetCalories / cpg)));

  return {
    food_id: food.id,
    food_name: food.food_name,
    grams,
    calories: Math.round(grams * cpg),
    protein: Math.round(grams * (food.protein_per_gram || 0) * 10) / 10,
    carbs: Math.round(grams * (food.carbs_per_gram || 0) * 10) / 10,
    fat: Math.round(grams * (food.fat_per_gram || 0) * 10) / 10,
    role: food.role,
  };
}

// ── Main composer ────────────────────────────────────────────
export async function composeMealForTarget(
  mealType: MealSlotType,
  targetMacros: MacroTarget,
  ctx: PatientContext,
  mode: ComposerMode = "quick"
): Promise<ComposedMeal> {
  const allFoods = await loadFoods();
  const available = filterForPatient(allFoods, ctx);

  // Apply clinical overrides in clinical mode
  const adjustedTarget = mode === "clinical"
    ? applyClinicalOverrides(targetMacros, ctx)
    : targetMacros;

  // Pick template
  const templates = SLOT_TEMPLATES[mealType] || SLOT_TEMPLATES.lunch;
  const seed = `${ctx.patientId}-${mealType}-${mode}`;
  const templateIdx = Math.floor(seededRandom(seed, 0) * templates.length);
  const template = templates[templateIdx];

  // Group available foods by role
  const byRole = new Map<FoodRole, ComposerFood[]>();
  for (const f of available) {
    const list = byRole.get(f.role) || [];
    list.push(f);
    byRole.set(f.role, list);
  }

  // Select one food per role
  const composedItems: ComposedItem[] = [];
  for (let i = 0; i < template.roles.length; i++) {
    const role = template.roles[i];
    const calShare = template.calorieShare[i];
    const roleFoods = byRole.get(role);
    if (!roleFoods || roleFoods.length === 0) continue;

    // Shuffle by seed for variety per patient
    const shuffled = seededShuffle(roleFoods, seed + role);

    // In smart/clinical mode, prefer variety within same seed
    const pick = mode === "quick" ? shuffled[0] : shuffled[i % shuffled.length];

    const targetCals = adjustedTarget.calories * calShare;
    composedItems.push(adjustGrams(pick, targetCals));
  }

  // Reconcile: adjust the protein source to better hit protein target
  if (composedItems.length > 0) {
    const currentProtein = composedItems.reduce((s, i) => s + i.protein, 0);
    const proteinDelta = adjustedTarget.protein - currentProtein;
    const proteinItem = composedItems.find(i => i.role === "protein");
    if (proteinItem && Math.abs(proteinDelta) > 3) {
      const food = available.find(f => f.id === proteinItem.food_id);
      if (food && food.protein_per_gram > 0) {
        const gramsAdjust = Math.round(proteinDelta / food.protein_per_gram);
        const newGrams = Math.max(30, Math.min(350, proteinItem.grams + gramsAdjust));
        const ratio = newGrams / proteinItem.grams;
        proteinItem.grams = newGrams;
        proteinItem.calories = Math.round(proteinItem.calories * ratio);
        proteinItem.protein = Math.round(proteinItem.protein * ratio * 10) / 10;
        proteinItem.carbs = Math.round(proteinItem.carbs * ratio * 10) / 10;
        proteinItem.fat = Math.round(proteinItem.fat * ratio * 10) / 10;
      }
    }
  }

  const totalCalories = composedItems.reduce((s, i) => s + i.calories, 0);
  const totalProtein = composedItems.reduce((s, i) => s + i.protein, 0);
  const totalCarbs = composedItems.reduce((s, i) => s + i.carbs, 0);
  const totalFat = composedItems.reduce((s, i) => s + i.fat, 0);

  return { items: composedItems, totalCalories, totalProtein, totalCarbs, totalFat };
}

/** Invalidate cached foods */
export function invalidateComposerCache(): void {
  _foodCache = null;
  _cacheTime = 0;
}
