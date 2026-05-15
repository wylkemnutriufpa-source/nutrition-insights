/**
 * Smart Food Substitution v1.0.0
 * Client-side equivalent-food swap that preserves grams and meal type,
 * recalculating macros from the substitute's per-gram density.
 *
 * Used by the canvas/editor when the user clicks "Trocar por outro alimento".
 * Does NOT touch the original template — it just edits the current item.
 */
import { supabase } from "@/integrations/supabase/client";

export type SmartFoodCategory =
  | "protein_main"
  | "protein_breakfast"
  | "carb_main"
  | "carb_breakfast"
  | "legume"
  | "fruit"
  | "vegetable"
  | "dairy"
  | "fat"
  | "other";

const norm = (t: string) =>
  (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// ── Keyword sets per smart category ──
const KEYWORDS: Record<Exclude<SmartFoodCategory, "other">, string[]> = {
  protein_main: [
    "frango", "peito de frango", "coxa", "sobrecoxa", "carne", "patinho", "alcatra", "coxao",
    "musculo", "acem", "file mignon", "maminha", "fraldinha", "picanha", "porco", "lombo",
    "pernil", "tilapia", "pescada", "merluza", "salmao", "atum fresco", "peixe", "polvo",
    "camarao",
  ],
  protein_breakfast: [
    "ovo", "ovo mexido", "ovo cozido", "ovos", "queijo coalho", "queijo branco",
    "queijo muçarela", "queijo mucarela", "ricota", "frango desfiado", "atum em conserva",
    "peito de peru", "blanquet",
  ],
  carb_main: [
    "arroz", "arroz integral", "arroz branco", "macarrao", "macaxeira", "mandioca",
    "batata", "batata doce", "batata inglesa", "inhame", "pure", "polenta", "quinoa",
    "milho", "cuscuz salgado",
  ],
  carb_breakfast: [
    "pao", "pao integral", "pao frances", "pao de forma", "tapioca", "cuscuz",
    "aveia", "granola",
  ],
  legume: ["feijao", "lentilha", "grao de bico", "ervilha"],
  fruit: [
    "banana", "maca", "mamao", "laranja", "goiaba", "morango", "tangerina",
    "melancia", "abacaxi", "manga", "uva", "pera", "kiwi", "abacate", "melao",
  ],
  vegetable: [
    "alface", "tomate", "brocolis", "cenoura", "couve", "repolho", "chuchu",
    "abobrinha", "espinafre", "rucula", "pepino", "berinjela", "abobora",
  ],
  dairy: [
    "iogurte", "leite", "leite desnatado", "leite integral", "coalhada",
  ],
  fat: ["azeite", "abacate", "castanha", "amendoa", "nozes", "amendoim"],
};

// Foods we never offer as a swap target
const BLOCKED_AS_SUBSTITUTE = [
  "sardinha enlatada", "atum em lata", "salsicha", "presunto", "linguica",
  "mortadela", "bacon", "nuggets",
];

export function classifyFoodSmart(foodName: string): SmartFoodCategory {
  const n = norm(foodName);
  for (const [cat, kws] of Object.entries(KEYWORDS) as [
    Exclude<SmartFoodCategory, "other">, string[],
  ][]) {
    if (kws.some((kw) => n.includes(norm(kw)))) return cat;
  }
  return "other";
}

/** Map smart category to the meal context filter for the DB. */
function isCategoryAllowedForMeal(cat: SmartFoodCategory, mealType?: string): boolean {
  if (!mealType) return true;
  const isMain = mealType === "Almoço" || mealType === "Jantar";
  const isBreakfast = mealType === "Café da Manhã";
  const isSnack = mealType === "Lanche da Manhã" || mealType === "Lanche da Tarde" || mealType === "Ceia";

  if (cat === "protein_main" && !isMain) return false;
  if (cat === "carb_main" && !isMain) return false;
  if (cat === "protein_breakfast" && !(isBreakfast || isSnack)) return false;
  if (cat === "carb_breakfast" && !(isBreakfast || isSnack)) return false;
  return true;
}

interface DBFood {
  id: string;
  food_name: string;
  category: string | null;
  portion_grams: number | null;
  calories_per_gram: number | null;
  protein_per_gram: number | null;
  carbs_per_gram: number | null;
  fat_per_gram: number | null;
}

export interface SmartSwapResult {
  newName: string;
  newDescription: string;
  calories_target: number;
  protein_target: number;
  carbs_target: number;
  fat_target: number;
}

interface SwapInput {
  currentTitle: string;
  currentDescription?: string | null;
  currentGrams: number;
  mealType?: string;
  /** Foods to avoid (allergies, dislikes, last-used substitute). */
  excludeNames?: string[];
}

/**
 * Find an equivalent food in the DB and return a patch with recalculated macros
 * preserving the current grams. Returns null if nothing compatible is found.
 */
export async function smartSubstituteFood(input: SwapInput): Promise<SmartSwapResult | null> {
  const cat = classifyFoodSmart(input.currentTitle);
  if (cat === "other") return null;

  const allowedKeywords = KEYWORDS[cat as Exclude<SmartFoodCategory, "other">] || [];
  if (allowedKeywords.length === 0) return null;

  // Pull a generous candidate set from the DB
  const { data, error } = await supabase
    .from("ifj_food_database" as any)
    .select("id, food_name, category, portion_grams, calories_per_gram, protein_per_gram, carbs_per_gram, fat_per_gram")
    .eq("is_active", true)
    .limit(800);

  if (error || !data) return null;

  const exclude = new Set(
    (input.excludeNames || []).map(norm).filter((s) => s.length >= 3),
  );
  const currentN = norm(input.currentTitle);

  const candidates = (data as unknown as DBFood[]).filter((f) => {
    const n = norm(f.food_name);
    if (!n) return false;
    if (n === currentN) return false;
    if (exclude.has(n)) return false;
    if (BLOCKED_AS_SUBSTITUTE.some((b) => n.includes(norm(b)))) return false;
    if (!allowedKeywords.some((kw) => n.includes(norm(kw)))) return false;
    if (!isCategoryAllowedForMeal(cat, input.mealType)) return false;
    if (!f.calories_per_gram || !f.protein_per_gram) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  // Pick a random candidate so repeated clicks cycle variety
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const grams = Math.max(20, Math.round(input.currentGrams));

  const calories = Math.round((pick.calories_per_gram || 0) * grams);
  const protein = Math.round(((pick.protein_per_gram || 0) * grams) * 10) / 10;
  const carbs = Math.round(((pick.carbs_per_gram || 0) * grams) * 10) / 10;
  const fat = Math.round(((pick.fat_per_gram || 0) * grams) * 10) / 10;

  // Build description preserving the "Xg" tail
  const newName = pick.food_name;
  const newDescription = `${newName} ${grams}g`;

  return {
    newName,
    newDescription,
    calories_target: calories,
    protein_target: protein,
    carbs_target: carbs,
    fat_target: fat,
  };
}

/**
 * Standardize portions across all 7 days for the same (title, meal_type) pair.
 * Returns a Map of itemId → patch. Uses median grams to stop the 150/120/130 jitter.
 */
export function normalizePortionsAcrossDays<
  T extends {
    id: string;
    title: string | null;
    meal_type: string | null;
    description: string | null;
    calories_target: number | null;
    protein_target: number | null;
    carbs_target: number | null;
    fat_target: number | null;
  },
>(items: T[]): Map<string, Partial<T>> {
  const patches = new Map<string, Partial<T>>();
  if (items.length === 0) return patches;

  // Group by (normalized title + meal_type)
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const key = `${norm(it.title || "")}__${it.meal_type || ""}`;
    if (!key.startsWith("__")) {
      const arr = groups.get(key) || [];
      arr.push(it);
      groups.set(key, arr);
    }
  }

  const parseGrams = (it: T): number | null => {
    const m = (it.description || "").match(/(\d+(?:[.,]\d+)?)\s*g\b/i);
    return m ? Math.round(parseFloat(m[1].replace(",", "."))) : null;
  };

  for (const [, group] of groups) {
    if (group.length < 2) continue;
    const grams = group.map(parseGrams).filter((g): g is number => !!g && g > 0);
    if (grams.length < 2) continue;

    // Median is more robust than mean for outliers
    const sorted = [...grams].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const target = Math.max(20, median);

    for (const it of group) {
      const current = parseGrams(it);
      if (!current || current === target) continue;
      const ratio = target / current;
      const newDesc = (it.description || `${it.title} ${target}g`).replace(
        /(\d+(?:[.,]\d+)?)\s*g\b/i,
        `${target}g`,
      );
      patches.set(it.id, {
        description: newDesc,
        calories_target: Math.round((it.calories_target || 0) * ratio),
        protein_target: Math.round(((it.protein_target || 0) * ratio) * 10) / 10,
        carbs_target: Math.round(((it.carbs_target || 0) * ratio) * 10) / 10,
        fat_target: Math.round(((it.fat_target || 0) * ratio) * 10) / 10,
      } as Partial<T>);
    }
  }

  return patches;
}
