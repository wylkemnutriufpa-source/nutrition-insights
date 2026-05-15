/**
 * Meal Composer Engine — FitJourney v1.0
 *
 * Compõe refeições dinamicamente a partir de blocos nutricionais.
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

type MealSlotType = "Café da Manhã" | "Lanche da Manhã" | "Almoço" | "Lanche da Tarde" | "Jantar" | "Ceia";

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
  calorieShare: number[];
}

const SLOT_TEMPLATES: Record<MealSlotType, SlotTemplate[]> = {
  "Café da Manhã": [
    { roles: ["protein", "carb", "fruit"], calorieShare: [0.35, 0.40, 0.25] },
    { roles: ["dairy", "fruit", "carb"], calorieShare: [0.30, 0.30, 0.40] },
  ],
  "Lanche da Manhã": [
    { roles: ["fruit", "protein"], calorieShare: [0.50, 0.50] },
  ],
  "Almoço": [
    { roles: ["protein", "carb", "vegetable"], calorieShare: [0.40, 0.35, 0.25] },
  ],
  "Lanche da Tarde": [
    { roles: ["fruit", "protein"], calorieShare: [0.50, 0.50] },
    { roles: ["carb", "protein"], calorieShare: [0.50, 0.50] },
  ],
  "Jantar": [
    { roles: ["protein", "carb", "vegetable"], calorieShare: [0.45, 0.30, 0.25] },
    { roles: ["protein", "vegetable", "fat"], calorieShare: [0.50, 0.30, 0.20] },
  ],
  "Ceia": [
    { roles: ["fruit"], calorieShare: [1.0] },
    { roles: ["dairy"], calorieShare: [1.0] },
  ],
};

// ── Helpers ──────────────────────────────────────────────────
function normalize(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function seededRandom(seed: string, index: number): number {
  let hash = 0;
  const str = seed + String(index);
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
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
  const { data } = await supabase.from("ifj_food_database" as any).select("*").eq("is_active", true);
  if (!data) return [];
  _foodCache = (data as any[]).filter(f => f.calories_per_gram != null).map(f => ({
    ...f,
    portion_grams: f.portion_grams || 100,
    role: CATEGORY_ROLE_MAP[f.category] || "complement",
  }));
  _cacheTime = Date.now();
  return _foodCache;
}

function filterForPatient(foods: ComposerFood[], ctx: PatientContext): ComposerFood[] {
  return foods; // Simplified: nutritionist has sovereignty
}

function adjustGrams(food: ComposerFood, targetCalories: number): ComposedItem {
  const cpg = food.calories_per_gram || 1;
  const grams = Math.max(10, Math.min(1000, Math.round(targetCalories / cpg)));
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

export async function composeMealForTarget(mealType: MealSlotType, targetMacros: MacroTarget, ctx: PatientContext, mode: ComposerMode = "quick"): Promise<ComposedMeal> {
  const allFoods = await loadFoods();
  const available = allFoods;
  const templates = SLOT_TEMPLATES[mealType] || SLOT_TEMPLATES["Almoço"];
  const seed = `${ctx.patientId}-${mealType}`;
  const templateIdx = Math.floor(seededRandom(seed, 0) * templates.length);
  const template = templates[templateIdx];
  const byRole = new Map<FoodRole, ComposerFood[]>();
  for (const f of available) {
    const list = byRole.get(f.role) || [];
    list.push(f);
    byRole.set(f.role, list);
  }
  const composedItems: ComposedItem[] = [];
  for (let i = 0; i < template.roles.length; i++) {
    const role = template.roles[i];
    const calShare = template.calorieShare[i];
    const roleFoods = byRole.get(role);
    if (!roleFoods || roleFoods.length === 0) continue;
    const shuffled = seededShuffle(roleFoods, seed + role);
    const pick = shuffled[0];
    const targetCals = targetMacros.calories * calShare;
    composedItems.push(adjustGrams(pick, targetCals));
  }
  const totalCalories = composedItems.reduce((s, i) => s + i.calories, 0);
  const totalProtein = composedItems.reduce((s, i) => s + i.protein, 0);
  const totalCarbs = composedItems.reduce((s, i) => s + i.carbs, 0);
  const totalFat = composedItems.reduce((s, i) => s + i.fat, 0);
  return { items: composedItems, totalCalories, totalProtein, totalCarbs, totalFat };
}
