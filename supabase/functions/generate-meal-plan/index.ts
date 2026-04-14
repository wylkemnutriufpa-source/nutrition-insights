import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser } from "../_shared/auth-guard.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import {
  BLOCKED_FOODS as CANONICAL_BLOCKED_FOODS,
  MEAL_KCAL_SPLIT as CANONICAL_MEAL_KCAL_SPLIT,
  REPLACEMENTS,
  SUBSTITUTION_GROUPS,
  isBlockedFood as canonicalIsBlockedFood,
  getProteinDistribution,
  MEAL_ORDER,
  RESIDUAL_PRIORITY,
} from "../_shared/food-rules.ts";
import {
  scaleDescriptionQuantities,
  finalizeMealDescription as canonicalFinalizeMealDescription,
  buildFoodDescriptionFromItems,
  syncProteinDescriptionPortions,
} from "../_shared/meal-description.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ──── Constants ────
const ENGINE_VERSION = "7.0.0";
const PROTOCOL_VERSION = "fitjourney_db_exclusive_v7_strict";

// ──── FEATURE FLAG: DB-EXCLUSIVE MODE (MANDATORY) ────
const USE_DB_EXCLUSIVE_V6 = true;

// ──── VALID MEAL CATEGORIES ────
const VALID_MEAL_CATEGORIES = new Set(["cafe_da_manha", "lanche", "almoco", "jantar", "ceia", "refeicao"]);

// ──── INTOLERANCE KEYWORD MAPS (CLINICAL SAFETY) ────
const INTOLERANCE_KEYWORDS: Record<string, string[]> = {
  lactose: ["leite", "queijo", "iogurte", "requeijao", "whey", "nata", "creme de leite", "manteiga", "cream cheese", "coalhada", "ricota", "mucarela", "mussarela", "parmesao", "provolone", "cottage"],
  gluten: ["pao", "macarrao", "trigo", "aveia", "cevada", "centeio", "biscoito", "bolacha", "torrada", "cuscuz de trigo", "farinha de trigo", "massa"],
  ovo: ["ovo", "omelete", "clara", "gema", "ovos"],
  soja: ["soja", "tofu", "edamame", "missô", "shoyu"],
  amendoim: ["amendoim", "pasta de amendoim", "paçoca"],
  nozes: ["nozes", "castanha", "amêndoa", "amendoa", "pistache", "macadamia", "pecan", "avel"],
  crustaceos: ["camarao", "lagosta", "caranguejo", "siri", "lula"],
  peixe: ["peixe", "tilapia", "salmao", "sardinha", "atum", "bacalhau", "dourado", "pintado", "tambaqui"],
};

// ──── MIN CANDIDATES PER MEAL TYPE ────
const MIN_CANDIDATES_PER_MEAL = 3;

// ──── 2-Layer Architecture Constants ────
// Maximum deviation allowed between meal sum and total targets (3%)
const MAX_2LAYER_DEVIATION = 0.03;

// MEAL_KCAL_SPLIT imported from _shared/food-rules.ts (canonical source)
const MEAL_KCAL_SPLIT = CANONICAL_MEAL_KCAL_SPLIT;

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_KCAL_ADJUSTMENT: Record<string, number> = {
  lose_weight: -500,
  maintain: 0,
  gain_muscle: 300,
  gain_weight: 500,
  improve_health: -200,
  athletic_performance: 200,
};

const GOAL_STRATEGY: Record<string, { calorie: string; macro: string }> = {
  lose_weight: { calorie: "calorie_deficit", macro: "high_protein_cut" },
  maintain: { calorie: "maintenance", macro: "balanced" },
  gain_muscle: { calorie: "calorie_surplus_moderate", macro: "high_protein_bulk" },
  gain_weight: { calorie: "calorie_surplus_high", macro: "high_carb_bulk" },
  improve_health: { calorie: "slight_deficit", macro: "anti_inflammatory" },
  athletic_performance: { calorie: "calorie_surplus_moderate", macro: "performance_endurance" },
};

// ──── Goal to DB tag mapping ────
const GOAL_TO_DB_TAG: Record<string, string> = {
  lose_weight: "emagrecimento",
  maintain: "manutencao",
  gain_muscle: "ganho_massa",
  gain_weight: "ganho_massa",
  improve_health: "saude_geral",
  athletic_performance: "performance",
};

const GOAL_ALIASES: Record<string, string> = {
  health: "improve_health",
  healthy: "improve_health",
  wellness: "improve_health",
  well_being: "improve_health",
  saude: "improve_health",
  improvehealth: "improve_health",
  weight_loss: "lose_weight",
  lose_fat: "lose_weight",
  emagrecimento: "lose_weight",
  perda_peso: "lose_weight",
  perder_peso: "lose_weight",
  maintain_weight: "maintain",
  manutencao: "maintain",
  maintenance: "maintain",
  gain_mass: "gain_muscle",
  muscle_gain: "gain_muscle",
  hipertrofia: "gain_muscle",
  ganho_massa: "gain_muscle",
  ganhar_massa: "gain_muscle",
  performance: "athletic_performance",
  athlete_performance: "athletic_performance",
  high_performance: "athletic_performance",
};

// ──── Meal type to DB tag mapping ────
const MEAL_TYPE_TO_DB_TAG: Record<string, string[]> = {
  breakfast: ["cafe_da_manha"],
  morning_snack: ["lanche_manha", "lanche_tarde"],
  lunch: ["almoco"],
  afternoon_snack: ["lanche_tarde", "lanche_manha"],
  dinner: ["jantar"],
  evening_snack: ["ceia", "lanche_tarde"],
};

// ──── Restriction to DB tag mapping ────
const RESTRICTION_TO_DB_EXCLUDE_TAG: Record<string, string[]> = {
  lactose_free: ["alergia_leite"],
  gluten_free: ["alergia_gluten"],
  egg_free: ["alergia_ovo"],
  nut_free: ["alergia_nozes", "alergia_amendoim"],
  soy_free: ["alergia_soja"],
  shellfish_free: ["alergia_crustaceos"],
};

// ──── Category-based composition rules ────
const MEAL_COMPOSITION: Record<string, { required: string[]; optional: string[] }> = {
  breakfast: {
    required: ["carboidrato", "proteina"],
    optional: ["fruta", "laticinio", "gordura"],
  },
  morning_snack: {
    required: ["fruta"],
    optional: ["laticinio", "oleaginosa"],
  },
  lunch: {
    required: ["proteina", "carboidrato", "verdura"],
    optional: ["gordura"],
  },
  afternoon_snack: {
    required: ["fruta"],
    optional: ["laticinio", "oleaginosa", "cafe_da_manha"],
  },
  dinner: {
    required: ["proteina", "carboidrato", "verdura"],
    optional: ["gordura"],
  },
  evening_snack: {
    required: ["laticinio"],
    optional: ["fruta", "carboidrato"],
  },
};

// BLOCKED_FOODS imported from _shared/food-rules.ts (canonical source)
const BLOCKED_FOODS = CANONICAL_BLOCKED_FOODS;

// ═══════════════════════════════════════════════════════════════
// VISUAL LIBRARY TYPES & LOADER
// All meal generation is EXCLUSIVELY from meal_visual_library
// ═══════════════════════════════════════════════════════════════

interface VisualLibraryItem {
  id: string;
  slug: string;
  name: string;
  display_name: string;
  category: string;
  image_url: string | null;
  default_calories: number | null;
  default_protein: number | null;
  default_carbs: number | null;
  default_fat: number | null;
  base_recipe: any;
  tags: string[];
  search_terms: string[];
}

/** Map meal_type to visual library categories */
const MEAL_TYPE_TO_VISUAL_CATEGORY: Record<string, string[]> = {
  breakfast: ["cafe_da_manha"],
  morning_snack: ["lanche"],
  lunch: ["almoco"],
  afternoon_snack: ["lanche"],
  dinner: ["jantar", "almoco", "refeicao"], // jantar first, almoco as fallback
  evening_snack: ["ceia", "lanche"],
};

/** Default macros for library items missing data */
const CATEGORY_DEFAULT_MACROS: Record<string, { cal: number; p: number; c: number; f: number }> = {
  cafe_da_manha: { cal: 220, p: 10, c: 28, f: 7 },
  lanche: { cal: 150, p: 5, c: 20, f: 5 },
  almoco: { cal: 450, p: 30, c: 50, f: 12 },
  jantar: { cal: 350, p: 28, c: 30, f: 10 },
  ceia: { cal: 100, p: 4, c: 15, f: 2 },
  refeicao: { cal: 300, p: 20, c: 35, f: 10 },
};

async function loadVisualLibrary(client: any): Promise<VisualLibraryItem[]> {
  const { data, error } = await client
    .from("meal_visual_library")
    .select("id, slug, name, display_name, category, image_url, default_calories, default_protein, default_carbs, default_fat, base_recipe, tags, search_terms")
    .eq("is_active", true)
    .not("image_url", "is", null);

  if (error || !data) {
    console.error("[generate-meal-plan] Failed to load visual library:", error);
    return [];
  }
  // Only items WITH image
  return (data as VisualLibraryItem[]).filter(item => item.image_url && item.image_url.length > 5);
}

/** Filter visual library items by patient restrictions/disliked/intolerances — STRICT CLINICAL SAFETY */
function filterVisualLibraryForPatient(
  items: VisualLibraryItem[],
  restrictions: string[],
  disliked: string[],
  allergies: string[],
): VisualLibraryItem[] {
  const blocked = [...disliked, ...allergies].map(d => normalize(d)).filter(d => d.length >= 3);

  // Build intolerance keyword set from restrictions + allergies
  const intoleranceKeywords: string[] = [];
  for (const r of [...restrictions, ...allergies]) {
    const nr = normalize(r);
    for (const [key, keywords] of Object.entries(INTOLERANCE_KEYWORDS)) {
      if (nr.includes(key) || nr.includes(key + "_free") || nr.includes("alergia_" + key)) {
        intoleranceKeywords.push(...keywords);
      }
    }
    // Direct restriction mappings
    if (nr.includes("lactose") || nr.includes("lactose_free")) intoleranceKeywords.push(...INTOLERANCE_KEYWORDS.lactose);
    if (nr.includes("gluten") || nr.includes("gluten_free")) intoleranceKeywords.push(...INTOLERANCE_KEYWORDS.gluten);
  }
  const uniqueIntoleranceKws = [...new Set(intoleranceKeywords.map(k => normalize(k)))];

  // Vegetarian/vegan check
  const isVegetarian = restrictions.some(r => { const nr = normalize(r); return nr.includes("vegetarian") || nr.includes("vegetariano"); });
  const isVegan = restrictions.some(r => { const nr = normalize(r); return nr.includes("vegan") || nr.includes("vegano"); });
  const meatKeywords = ["frango", "carne", "bife", "peixe", "tilapia", "porco", "costel", "sardinha", "atum", "camarao", "salmao", "sobrecoxa", "alcatra", "picanha", "linguica", "bacon", "presunto", "peito de peru", "peru"];
  const animalKeywords = [...meatKeywords, "ovo", "leite", "queijo", "iogurte", "mel", "whey", "requeijao"];

  return items.filter(item => {
    const normName = normalize(item.display_name);
    const normSlug = normalize(item.slug);
    const searchTermsText = (item.search_terms || []).map(t => normalize(t)).join(" ");
    const allText = normName + " " + normSlug + " " + searchTermsText;

    // Extract recipe ingredients text for deep check
    let recipeText = "";
    if (item.base_recipe && typeof item.base_recipe === "object") {
      const recipe = item.base_recipe as any;
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        recipeText = recipe.ingredients.map((ing: string) => normalize(ing)).join(" ");
      }
    }
    const fullText = allText + " " + recipeText;

    // Check disliked/allergies (direct keyword match)
    for (const b of blocked) {
      if (fullText.includes(b)) return false;
    }

    // STRICT INTOLERANCE FILTER — check display_name, slug, search_terms, AND base_recipe.ingredients
    for (const kw of uniqueIntoleranceKws) {
      if (kw.length < 3) continue;
      if (fullText.includes(kw)) return false;
    }

    // Vegetarian/vegan enforcement
    if (isVegetarian) {
      for (const mk of meatKeywords) { if (fullText.includes(mk)) return false; }
    }
    if (isVegan) {
      for (const ak of animalKeywords) { if (fullText.includes(ak)) return false; }
    }

    return true;
  });
}

// ── Legacy substitution groups (kept for description text) ──
const SUBSTITUTION_GROUPS_LEGACY: Record<string, string[]> = {
  protein: ["frango", "carne moída", "bife", "tilápia", "porco", "sardinha", "sobrecoxa"],
  carb: ["arroz", "macarrão", "batata", "macaxeira", "batata doce", "inhame"],
  carb_breakfast: ["pão integral", "tapioca", "cuscuz", "pão francês"],
  protein_breakfast: ["ovo mexido", "ovo cozido", "queijo minas", "queijo coalho"],
  fruit: ["banana", "maçã", "mamão", "laranja", "goiaba", "morango", "tangerina"],
};

// ═══════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function normalize(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, " ");
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const cleaned = value.replace(",", ".").trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeWeightKg(value: unknown): number | null {
  const parsed = toFiniteNumber(value);
  if (parsed === null || parsed <= 0) return null;
  if (parsed > 300) return parsed / 1000;
  return parsed;
}

function normalizeHeightCm(value: unknown): number | null {
  const parsed = toFiniteNumber(value);
  if (parsed === null || parsed <= 0) return null;
  if (parsed > 0 && parsed < 3) return parsed * 100;
  return parsed;
}

function normalizeAge(value: unknown, fallback = 30): number {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return fallback;
  const rounded = Math.round(parsed);
  if (rounded < 1 || rounded > 120) return fallback;
  return rounded;
}

function normalizeActivityLevel(value: unknown): string {
  const raw = normalize(String(value || "light"));
  if (["sedentary", "sedentario"].includes(raw)) return "sedentary";
  if (["light", "leve"].includes(raw)) return "light";
  if (["moderate", "moderado"].includes(raw)) return "moderate";
  if (["active", "ativo", "intense", "intenso"].includes(raw)) return "active";
  if (["very_active", "very active", "muito ativo", "muito_ativo"].includes(raw)) return "very_active";
  return "light";
}

// ── Seeded pseudo-random for patient-specific variety ──
// Uses time-based entropy so each generation produces different results
function seedHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Generate a unique seed per generation call — combines patient identity with current time */
function generationSeed(patientId: string, optionOffset: number = 0): number {
  const base = seedHash(patientId);
  // Use minutes since epoch so each call (even seconds apart) gets a different seed
  const timePart = Math.floor(Date.now() / 60000);
  return base + timePart * 31 + optionOffset * 997;
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ── Visual Resolution Engine (server-side) ──
const VISUAL_CARB_KEYWORDS = new Set([
  "arroz", "batata", "macarrao", "feijao", "pure", "mandioca", "inhame",
  "legumes", "salada", "brocolis", "macaxeira", "farinha", "farofa",
]);

const VISUAL_GENERIC_TITLES = new Set([
  "almoco", "jantar", "cafe da manha", "lanche",
  "lanche da manha", "lanche da tarde", "ceia",
  "refeicao", "marmita", "almoco reforcado", "cafe da manha reforcado",
  "lanche reforcado",
]);

function resolveVisualFromDescription(
  title: string,
  description: string,
  aliasMap: Map<string, string>,
): string | null {
  const normTitle = normalize(title);

  // First: try exact title match (e.g. "Pão com Ovo" → pao com ovo alias)
  if (!VISUAL_GENERIC_TITLES.has(normTitle)) {
    if (aliasMap.has(normTitle)) return aliasMap.get(normTitle)!;
    const titleMatch = findBestVisualAlias(normTitle, aliasMap);
    if (titleMatch) return titleMatch;
  }

  const lines = description.split('\n');
  const ingredientLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes('Substituiç') || trimmed.includes('🔄')) break;
    if (!trimmed.startsWith('•') && !trimmed.startsWith('-')) continue;
    ingredientLines.push(normalize(trimmed));
  }

  // NEW: Cross-line composition detection
  // Build a combined "ingredient bag" from all lines, then try composed aliases (longest first)
  // This catches cases like pão on line 1 + ovo on line 2 → "pao com ovo" alias
  const ingredientBag = ingredientLines.join(' ');
  
  // Sort aliases by length descending so we prefer the most specific composed match
  const sortedAliases = Array.from(aliasMap.entries())
    .filter(([alias]) => alias.length >= 5 && alias.includes(' '))
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [alias, itemId] of sortedAliases) {
    // For composed aliases like "pao com ovo", check if ALL key words exist in the ingredient bag
    const aliasParts = alias.split(/\s+/).filter(p => p.length >= 3 && p !== 'com' && p !== 'de' && p !== 'e');
    if (aliasParts.length < 2) continue;
    const allPartsPresent = aliasParts.every(part => {
      const idx = ingredientBag.indexOf(part);
      if (idx === -1) return false;
      const before = idx === 0 || ingredientBag[idx - 1] === ' ';
      const after = (idx + part.length) >= ingredientBag.length || ingredientBag[idx + part.length] === ' ';
      return before && after;
    });
    if (allPartsPresent) return itemId;
  }

  // Second: scan individual lines for single-line composed matches
  let bestMatch: string | null = null;
  let bestAliasLength = 0;
  
  for (const normLine of ingredientLines) {
    for (const [alias, itemId] of aliasMap) {
      if (alias.length < 3) continue;
      if (normLine.includes(alias) && alias.length > bestAliasLength) {
        const idx = normLine.indexOf(alias);
        const before = idx === 0 || normLine[idx - 1] === ' ';
        const after = (idx + alias.length) >= normLine.length || normLine[idx + alias.length] === ' ';
        if (before && after) {
          bestMatch = itemId;
          bestAliasLength = alias.length;
        }
      }
    }
  }
  
  if (bestMatch) return bestMatch;

  // Fallback: word-by-word scan (excluding carb keywords)
  for (const normLine of ingredientLines) {
    const words = normLine.split(/\s+/);
    for (const word of words) {
      if (VISUAL_CARB_KEYWORDS.has(word) || word.length < 3) continue;
      if (aliasMap.has(word)) return aliasMap.get(word)!;
    }
  }

  return null;
}

function findBestVisualAlias(text: string, aliasMap: Map<string, string>): string | null {
  let bestAlias: string | null = null;
  let bestLength = 0;

  for (const [alias, itemId] of aliasMap) {
    if (alias.length < 3) continue;
    if (text === alias) return itemId;
    if (alias.length > bestLength) {
      const idx = text.indexOf(alias);
      if (idx !== -1) {
        const before = idx === 0 || text[idx - 1] === ' ';
        const after = (idx + alias.length) >= text.length || text[idx + alias.length] === ' ';
        if (before && after) {
          bestAlias = alias;
          bestLength = alias.length;
        }
      }
    }
  }

  return bestAlias ? aliasMap.get(bestAlias)! : null;
}

async function loadVisualAliasMap(client: any): Promise<Map<string, string>> {
  const { data } = await client
    .from("meal_visual_aliases")
    .select("library_item_id, normalized_alias");

  const map = new Map<string, string>();
  if (data) {
    for (const row of data) {
      if (!map.has(row.normalized_alias)) {
        map.set(row.normalized_alias, row.library_item_id);
      }
    }
  }
  return map;
}

async function resolveVisualForItems(client: any, planId: string, _items: any[]): Promise<number> {
  const aliasMap = await loadVisualAliasMap(client);

  const { data: insertedItems } = await client
    .from("meal_plan_items")
    .select("id, title, description")
    .eq("meal_plan_id", planId);

  if (!insertedItems || insertedItems.length === 0) return 0;

  const updates: { id: string; visual_library_item_id: string }[] = [];
  for (const item of insertedItems) {
    const visualId = resolveVisualFromDescription(item.title || "", item.description || "", aliasMap);
    if (visualId) {
      updates.push({ id: item.id, visual_library_item_id: visualId });
    }
  }

  if (updates.length === 0) return 0;

  const groupedByVisual = new Map<string, string[]>();
  for (const u of updates) {
    if (!groupedByVisual.has(u.visual_library_item_id)) {
      groupedByVisual.set(u.visual_library_item_id, []);
    }
    groupedByVisual.get(u.visual_library_item_id)!.push(u.id);
  }

  const updatePromises = Array.from(groupedByVisual.entries()).map(([visualId, ids]) =>
    client
      .from("meal_plan_items")
      .update({ visual_library_item_id: visualId })
      .in("id", ids)
  );
  await Promise.all(updatePromises);

  return updates.length;
}

function isBlockedFood(name: string): boolean {
  // Uses local normalize (strips non-alphanumeric) for consistency with this engine's text processing
  const n = normalize(name);
  return BLOCKED_FOODS.some(blocked => n.includes(normalize(blocked)));
}

function isLossGoal(goal: string): boolean {
  return ["lose_weight", "maintain", "improve_health"].includes(goal);
}

function getMealOptions(mealType: string, goal: string): RealisticMeal[] {
  const loss = isLossGoal(goal);
  switch (mealType) {
    case "breakfast": return loss ? BREAKFAST_EMAG : BREAKFAST_MASSA;
    case "morning_snack": return loss ? SNACKS : SNACKS_MASSA;
    case "afternoon_snack": return loss ? SNACKS : SNACKS_MASSA;
    case "lunch": return loss ? MAIN_EMAG : MAIN_MASSA;
    case "dinner": return loss ? DINNER_EMAG : DINNER_MASSA;
    case "evening_snack": return loss ? CEIA : CEIA_MASSA;
    default: return SNACKS;
  }
}

// Description functions imported from _shared/meal-description.ts (canonical source)
// Wrapper to adapt isGainGoal boolean to goal string for backward compatibility
function finalizeMealDescription(description: string, mealType: string, goal: string): string {
  return canonicalFinalizeMealDescription(description, mealType, !isLossGoal(goal));
}

function rebalanceProteinTargetsByMeal(dayItems: any[], dailyProteinTarget: number, goal: string) {
  if (!Number.isFinite(dailyProteinTarget) || dailyProteinTarget <= 0 || dayItems.length === 0) return;

  const { shares: proteinShares, caps: proteinCaps } = getProteinDistribution(!isLossGoal(goal));

  const mealTargets = new Map<string, number>();
  let assigned = 0;

  for (const mealType of MEAL_ORDER) {
    const mealGroup = dayItems.filter((item) => item.meal_type === mealType);
    if (mealGroup.length === 0) continue;
    const baseTarget = Math.round(dailyProteinTarget * (proteinShares[mealType] || 0));
    const target = Math.min(proteinCaps[mealType] ?? baseTarget, baseTarget);
    mealTargets.set(mealType, target);
    assigned += target;
  }

  let residual = Math.round(dailyProteinTarget - assigned);
  for (const mealType of RESIDUAL_PRIORITY) {
    if (residual <= 0) break;
    if (!mealTargets.has(mealType)) continue;
    const current = mealTargets.get(mealType) || 0;
    const cap = proteinCaps[mealType] ?? current;
    const room = Math.max(0, cap - current);
    if (room <= 0) continue;
    const add = Math.min(room, residual);
    mealTargets.set(mealType, current + add);
    residual -= add;
  }

  if (residual > 0) {
    console.warn(`[generate-meal-plan] Daily protein target ${dailyProteinTarget}g exceeded distributable per-meal caps by ${residual}g; preserving meal caps`);
  }

  for (const [mealType, rawTarget] of mealTargets.entries()) {
    const mealGroup = dayItems.filter((item) => item.meal_type === mealType);
    if (mealGroup.length === 0) continue;

    const mealCap = proteinCaps[mealType] ?? rawTarget;
    const target = Math.max(0, Math.min(rawTarget, mealCap));
    const currentTotal = mealGroup.reduce((sum, item) => sum + (Number(item.protein_target) || 0), 0);

    if (currentTotal <= 0) {
      const base = Math.floor(target / mealGroup.length);
      let remaining = target;
      mealGroup.forEach((item, index) => {
        const next = index === mealGroup.length - 1 ? remaining : base;
        item.protein_target = Math.max(0, next);
        remaining -= next;
      });
      continue;
    }

    let scaledSum = 0;
    let largestIndex = 0;
    let largestValue = 0;

    mealGroup.forEach((item, index) => {
      const current = Number(item.protein_target) || 0;
      const next = Math.max(0, Math.round(current * (target / currentTotal)));
      item.protein_target = next;
      scaledSum += next;
      if (current > largestValue) {
        largestValue = current;
        largestIndex = index;
      }
    });

    const correction = target - scaledSum;
    mealGroup[largestIndex].protein_target = Math.max(0, (Number(mealGroup[largestIndex].protein_target) || 0) + correction);
  }
}

// ──── TMB Calculator (Mifflin-St Jeor) ────
function calculateTMB(weight: number, height: number, age: number, sex: string): number {
  if (sex === "female") return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
}

function calculateTDEE(tmb: number, activityLevel: string): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.375;
  return Math.round(tmb * multiplier);
}

function calculateTargetKcal(tdee: number, goal: string, sex: string = "male"): number {
  const adjustment = GOAL_KCAL_ADJUSTMENT[goal] || 0;
  const raw = tdee + adjustment;
  const minKcal = sex === "female" ? 1200 : 1500;
  return Math.max(minKcal, Math.min(3500, raw));
}

function normalizeGoal(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!normalized) return null;
  return GOAL_ALIASES[normalized] || normalized;
}

/**
 * Clinical Macro Calculator v2.0 — Physiological Rules
 * 
 * REGRAS INVIOLÁVEIS:
 * - Proteína: 1.6–2.2 g/kg (déficit) | 1.8–2.5 g/kg (hipertrofia)
 * - Gordura: 0.8–1.0 g/kg (universal)
 * - Carboidrato: completa o restante calórico
 * - PROIBIDO ultrapassar faixas de proteína
 */
const CLINICAL_PROTEIN_RANGES: Record<string, { min: number; max: number; ideal: number }> = {
  lose_weight:            { min: 1.6, max: 2.2, ideal: 2.0 },
  improve_health:         { min: 1.4, max: 2.0, ideal: 1.6 },
  maintain:               { min: 1.4, max: 2.0, ideal: 1.6 },
  gain_muscle:            { min: 1.8, max: 2.5, ideal: 2.2 },
  gain_weight:            { min: 1.8, max: 2.5, ideal: 2.2 },
  athletic_performance:   { min: 1.6, max: 2.2, ideal: 2.0 },
};
const CLINICAL_FAT_RANGE = { min: 0.8, max: 1.0, ideal: 0.9 };

function calculateMacros(kcal: number, goal: string, weight: number) {
  const proteinRange = CLINICAL_PROTEIN_RANGES[goal] || CLINICAL_PROTEIN_RANGES.maintain;
  const proteinPerKg = proteinRange.ideal;
  let protein = Math.round(weight * proteinPerKg);

  // Gordura fixa: 0.8–1.0 g/kg
  let fat = Math.round(weight * CLINICAL_FAT_RANGE.ideal);

  // Carboidrato: completa o restante
  const proteinKcal = protein * 4;
  const fatKcal = fat * 9;
  let carbsKcal = kcal - proteinKcal - fatKcal;

  // Se carbs ficou negativo, reduzir gordura ao mínimo
  if (carbsKcal < 0) {
    fat = Math.round(weight * CLINICAL_FAT_RANGE.min);
    carbsKcal = kcal - (protein * 4) - (fat * 9);
  }
  // Se ainda negativo, reduzir proteína ao mínimo da faixa
  if (carbsKcal < 0) {
    protein = Math.round(weight * proteinRange.min);
    carbsKcal = kcal - (protein * 4) - (fat * 9);
  }

  const carbs = Math.max(0, Math.round(carbsKcal / 4));

  // Validação final: proteína dentro da faixa
  const actualProteinPerKg = protein / weight;
  if (actualProteinPerKg > proteinRange.max) {
    protein = Math.round(weight * proteinRange.max);
    console.warn(`[ClinicalMacro] Protein capped at ${proteinRange.max}g/kg for goal=${goal}`);
  }

  return { protein, carbs, fat };
}

// ═══════════════════════════════════════════════════════════════
// DATABASE-DRIVEN FOOD SELECTION ENGINE v4.0
// ═══════════════════════════════════════════════════════════════

interface DBFood {
  id: string;
  food_name: string;
  normalized_name: string;
  category: string;
  portion_reference: string;
  portion_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meal_tags_json: string[];
  goal_tags_json: string[];
  restriction_tags_json: string[];
}

/** Load all active foods from ifj_food_database */
async function loadFoodDatabase(client: any): Promise<DBFood[]> {
  const { data, error } = await client
    .from("ifj_food_database")
    .select("id, food_name, normalized_name, category, portion_reference, portion_grams, calories, protein, carbs, fats, meal_tags_json, goal_tags_json, restriction_tags_json")
    .eq("is_active", true);

  if (error || !data) {
    console.error("[generate-meal-plan] Failed to load food database:", error);
    return [];
  }
  return data as DBFood[];
}

/** Filter foods based on patient restrictions, allergies, and disliked foods */
function filterFoodsForPatient(
  foods: DBFood[],
  restrictions: string[],
  dislikedFoods: string[],
  allergies: string[],
): DBFood[] {
  const normalizedDisliked = dislikedFoods.map(d => normalize(d));

  return foods.filter(food => {
    const normName = normalize(food.food_name);

    // Check blocked foods
    if (isBlockedFood(food.food_name)) return false;

    // Check disliked foods (fuzzy match)
    if (normalizedDisliked.some(d => d.length >= 3 && (normName.includes(d) || d.includes(normName)))) return false;

    // Check allergies via restriction_tags
    const foodRestrTags = food.restriction_tags_json || [];
    for (const allergy of allergies) {
      const normAllergy = normalize(allergy);
      // Direct tag match
      if (foodRestrTags.some((t: string) => normalize(t).includes(normAllergy))) return false;
      // Name-based allergy check
      if (normAllergy.includes("leite") || normAllergy.includes("lactose")) {
        if (["laticinio"].includes(food.category)) return false;
        if (normName.includes("leite") || normName.includes("queijo") || normName.includes("iogurte") || normName.includes("requeijao")) return false;
      }
      if (normAllergy.includes("gluten")) {
        if (normName.includes("pao") || normName.includes("macarrao") || normName.includes("aveia") || normName.includes("trigo")) return false;
      }
      if (normAllergy.includes("ovo")) {
        if (normName.includes("ovo") || normName.includes("omelete")) return false;
      }
    }

    // Check dietary restrictions
    for (const restriction of restrictions) {
      const normRestr = normalize(restriction);
      if (normRestr.includes("lactose") || normRestr.includes("lactose_free")) {
        if (["laticinio"].includes(food.category)) return false;
        if (normName.includes("leite") || normName.includes("queijo") || normName.includes("iogurte") || normName.includes("requeijao")) return false;
      }
      if (normRestr.includes("vegetarian") || normRestr.includes("vegetariano")) {
        if (food.category === "proteina" && (normName.includes("frango") || normName.includes("carne") || normName.includes("bife") || normName.includes("tilapia") || normName.includes("peixe") || normName.includes("porco") || normName.includes("sobrecoxa") || normName.includes("alcatra") || normName.includes("sardinha") || normName.includes("linguica"))) return false;
      }
      if (normRestr.includes("vegan") || normRestr.includes("vegano")) {
        if (["proteina", "laticinio"].includes(food.category) && (normName.includes("frango") || normName.includes("carne") || normName.includes("ovo") || normName.includes("leite") || normName.includes("queijo") || normName.includes("iogurte"))) return false;
      }
    }

    return true;
  });
}

/** Foods that should NEVER appear at breakfast */
const BREAKFAST_EXCLUDED_FOODS = new Set([
  "picanha", "alcatra", "bife", "carne moida", "tilapia", "sardinha", "sobrecoxa",
  "mostarda", "rucula", "brocolis", "tomate", "pepino", "cenoura",
  "oleo de coco", "amendoim", "castanha",
  "atum em lata", "atum enlatado", "atum", "camarao cozido", "camarao",
  "carne de sol desfiada", "carne seca", "carne seca desfiada", "carne moida magra",
  "lula cozida", "cordeiro assado", "lombo suino assado", "bisteca suina grelhada",
  "fraldinha grelhada", "maminha grelhada", "musculo cozido", "patinho grelhado",
  "coxao duro grelhado", "dourado grelhado", "pintado grelhado", "tambaqui assado",
  "hamburguer", "hamburguer artesanal", "hamburguer bovino", "linguica", "linguica de frango",
  "pf completo", "bowl de frango", "carne bovina alcatra", "carne bovina coxao mole",
  "carne bovina patinho", "carne de porco lombo",
]);

/** Foods that make sense at breakfast in Brazilian context */
const BREAKFAST_PREFERRED_CATEGORIES = new Set(["carboidrato", "proteina", "laticinio", "fruta"]);
const BREAKFAST_PREFERRED_PROTEINS = new Set([
  "ovo", "ovo mexido", "ovo cozido", "clara de ovo cozida",
  "queijo", "queijo coalho", "queijo minas", "queijo minas frescal", "queijo mucarela",
  "frango desfiado", "peito de peru", "omelete", "requeijao",
]);
const BREAKFAST_PREFERRED_CARBS = new Set(["pao", "pao integral", "pao frances", "tapioca", "cuscuz", "aveia", "granola", "pao sirio integral"]);

/** Select foods for a specific meal type using DB tags, with patient-seeded variety */
function selectFoodsForMeal(
  availableFoods: DBFood[],
  mealType: string,
  goal: string,
  patientSeed: number,
  dayIndex: number,
  usedProteinIds?: Set<string>,
): DBFood[] {
  const mealTags = MEAL_TYPE_TO_DB_TAG[mealType] || [];
  const goalTag = GOAL_TO_DB_TAG[goal] || "";
  const composition = MEAL_COMPOSITION[mealType] || { required: ["proteina"], optional: [] };

  // ── Dinner rule: exclude beans/legumes for lighter meal ──
  const isDinner = mealType === "dinner";
  const isBreakfast = mealType === "breakfast";
  const dinnerExcludeKeywords = ["feijao", "feijão", "lentilha", "feijoada", "feijao verde"];

  const selected: DBFood[] = [];
  const usedCategories = new Set<string>();

  /**
   * STRICT MEAL_TAGS FILTER — applies to ALL meal types.
   * A food is eligible for a meal slot ONLY if:
   *   1. It has matching meal_tags for this slot, OR
   *   2. It has NO tags at all AND passes the whitelist check for that slot.
   * This prevents "atum no café da manhã" and similar cultural mismatches.
   */
  function isFoodEligibleForMeal(f: DBFood, requiredCat: string): boolean {
    const normName = normalize(f.food_name);

    // ── Anti-repetition: skip proteins already used this week for same meal type ──
    if (requiredCat === "proteina" && usedProteinIds && usedProteinIds.has(f.id)) return false;

    // ── Breakfast: strictest filtering ──
    if (isBreakfast) {
      if (BREAKFAST_EXCLUDED_FOODS.has(normName)) return false;
      // If food has meal_tags, it MUST include cafe_da_manha
      if (f.meal_tags_json.length > 0 && !f.meal_tags_json.includes("cafe_da_manha")) return false;
      // If food has NO tags, only allow known breakfast items
      if (f.meal_tags_json.length === 0) {
        if (requiredCat === "proteina" && !BREAKFAST_PREFERRED_PROTEINS.has(normName)) return false;
        if (requiredCat === "carboidrato" && !BREAKFAST_PREFERRED_CARBS.has(normName)) return false;
      }
      return true;
    }

    // ── ALL other meals: STRICT tag enforcement ──
    // If food HAS meal_tags, it MUST match the current meal slot
    if (f.meal_tags_json.length > 0) {
      const hasMatchingTag = f.meal_tags_json.some((t: string) => mealTags.includes(t));
      if (!hasMatchingTag) return false;
    }
    // If food has NO meal_tags, allow it only for main categories (proteina, carboidrato, verdura)
    // but NOT for slots where it could cause cultural mismatches
    if (f.meal_tags_json.length === 0) {
      // For snacks/ceia, untagged foods are suspicious — only allow fruits and dairy
      if (["morning_snack", "afternoon_snack", "evening_snack"].includes(mealType)) {
        if (!["fruta", "laticinio", "oleaginosa"].includes(f.category)) return false;
      }
    }

    // Dinner: exclude beans/legumes
    if (isDinner) {
      if (dinnerExcludeKeywords.some(kw => normName.includes(normalize(kw)))) return false;
    }

    return true;
  }

  // For each required category, find matching foods
  for (const requiredCat of composition.required) {
    let candidates = availableFoods.filter(f => {
      if (f.category !== requiredCat) return false;
      return isFoodEligibleForMeal(f, requiredCat);
    });

    if (candidates.length === 0) {
      // Fallback: relax anti-repetition but keep meal_tags enforcement
      const fallback = availableFoods.filter(f => {
        if (f.category !== requiredCat) return false;
        const normName = normalize(f.food_name);
        if (isBreakfast && BREAKFAST_EXCLUDED_FOODS.has(normName)) return false;
        if (isDinner && dinnerExcludeKeywords.some(kw => normName.includes(normalize(kw)))) return false;
        // Still enforce meal_tags in fallback (but relax anti-repetition)
        if (f.meal_tags_json.length > 0) {
          if (!f.meal_tags_json.some((t: string) => mealTags.includes(t))) return false;
        }
        return true;
      });
      if (fallback.length > 0) {
        const sorted = fallback.sort((a, b) => {
          const aGoal = a.goal_tags_json.includes(goalTag) ? 1 : 0;
          const bGoal = b.goal_tags_json.includes(goalTag) ? 1 : 0;
          return bGoal - aGoal;
        });
        const shuffled = seededShuffle(sorted, patientSeed + dayIndex * 7 + requiredCat.charCodeAt(0));
        selected.push(shuffled[0]);
        usedCategories.add(requiredCat);
      }
      continue;
    }

    // Prioritize goal-matching foods, then shuffle with seed
    const goalMatching = candidates.filter(f => f.goal_tags_json.includes(goalTag));
    const pool = goalMatching.length >= 2 ? goalMatching : candidates;
    const shuffled = seededShuffle(pool, patientSeed + dayIndex * 13 + requiredCat.charCodeAt(0));
    selected.push(shuffled[0]);
    usedCategories.add(requiredCat);
  }

  // Add one optional food if available
  for (const optCat of composition.optional) {
    if (usedCategories.has(optCat)) continue;
    let candidates = availableFoods.filter(f => {
      if (f.category !== optCat) return false;
      return isFoodEligibleForMeal(f, optCat);
    });
    if (candidates.length > 0) {
      const shuffled = seededShuffle(candidates, patientSeed + dayIndex * 17 + optCat.charCodeAt(0));
      selected.push(shuffled[0]);
      usedCategories.add(optCat);
      break; // only one optional
    }
  }

  return selected;
}

/** Build a meal item from selected DB foods */
function buildMealFromDBFoods(
  foods: DBFood[],
  mealType: string,
  dayOfWeek: number,
  mealKcalTarget: number,
  goal: string,
): any {
  if (foods.length === 0) return null;

  const totalKcal = foods.reduce((s, f) => s + (f.calories || 0), 0);
  const scaleFactor = totalKcal > 0 ? mealKcalTarget / totalKcal : 1;
  const clampedScale = Math.max(0.5, Math.min(2.0, scaleFactor));

  const mealTitles: Record<string, string> = {
    breakfast: isLossGoal(goal) ? "Café da Manhã" : "Café da Manhã Reforçado",
    morning_snack: "Lanche da Manhã",
    lunch: isLossGoal(goal) ? "Almoço" : "Almoço Reforçado",
    afternoon_snack: "Lanche da Tarde",
    dinner: isLossGoal(goal) ? "Jantar" : "Jantar Reforçado",
    evening_snack: "Ceia",
  };

  // Filter out foods with absurdly small portions (< 15g after scaling)
  const MIN_PORTION_GRAMS = 15;
  const validFoods = foods.filter(f => {
    const grams = Math.round((f.portion_grams || 100) * clampedScale);
    return grams >= MIN_PORTION_GRAMS;
  });
  if (validFoods.length === 0) return null;

  const descriptionLines = validFoods.map(f => {
    const grams = Math.max(MIN_PORTION_GRAMS, Math.round((f.portion_grams || 100) * clampedScale));
    const basePortion = (f.portion_reference || `${f.portion_grams || 100}g`).trim();
    const scaledPortion = scaleDescriptionQuantities(basePortion, clampedScale) || basePortion;
    const resolvedPortion = scaledPortion === basePortion && !/(\d+(?:[.,]\d+)?)\s*(g|ml|col\.?)/i.test(basePortion)
      ? `${grams}g`
      : scaledPortion;
    return `• ${f.food_name} — ${resolvedPortion}`;
  });

  // Build substitution text from same categories — WITH portion quantities
  const subLines: string[] = [];
  for (const food of validFoods) {
    const groupKey =
      food.category === "proteina" ? (mealType === "breakfast" ? "protein_breakfast" : "protein") :
      food.category === "carboidrato" ? (mealType === "breakfast" ? "carb_breakfast" : "carb") :
      food.category === "fruta" ? "fruit" : "";
    const subs = SUBSTITUTION_GROUPS[groupKey];
    if (subs) {
      const normFood = normalize(food.food_name);
      const foodGrams = Math.max(MIN_PORTION_GRAMS, Math.round((food.portion_grams || 100) * clampedScale));
      const alts = subs.filter(s => !normFood.includes(normalize(s))).slice(0, 3);
      if (alts.length > 0) {
        const altsWithPortion = alts.map(a => `${a} (${foodGrams}g)`);
        subLines.push(`• ${food.food_name} → ${altsWithPortion.join(", ")}`);
      }
    }
  }

  const baseDescription = finalizeMealDescription(descriptionLines.join("\n"), mealType, goal);
  const description = baseDescription + (subLines.length > 0 ? `\n\n🔄 Substituições:\n${subLines.join("\n")}` : "");

  return {
    title: mealTitles[mealType] || "Refeição",
    description,
    meal_type: mealType,
    day_of_week: dayOfWeek,
    calories_target: Math.round(validFoods.reduce((s, f) => s + (f.calories || 0), 0) * clampedScale),
    protein_target: Math.round(validFoods.reduce((s, f) => s + (f.protein || 0), 0) * clampedScale),
    carbs_target: Math.round(validFoods.reduce((s, f) => s + (f.carbs || 0), 0) * clampedScale),
    fat_target: Math.round(validFoods.reduce((s, f) => s + (f.fats || 0), 0) * clampedScale),
  };
}

// ═══════════════════════════════════════════════════════════════
// DB-EXCLUSIVE PLAN GENERATOR v7.0 — STRICT MODE
// ALL meals come from meal_visual_library — NO fallbacks
// Onboarding-compliant: respects enabled_meals, meal_times, restrictions
// ═══════════════════════════════════════════════════════════════

function generatePlanFromVisualLibrary(
  visualLibrary: VisualLibraryItem[],
  goal: string,
  kcalTarget: number,
  macros: { protein: number; carbs: number; fat: number },
  restrictions: string[],
  disliked: string[],
  allergies: string[],
  planOptionIndex: number = 0,
  enabledMeals?: string[],
  mealTimes?: Record<string, string>,
): any[] {
  // ──── FEATURE FLAG CHECK ────
  if (!USE_DB_EXCLUSIVE_V6) {
    throw new Error("[STRICT] USE_DB_EXCLUSIVE_V6 must be true. DB-exclusive mode is mandatory.");
  }

  // ──── STRICT FILTERING ────
  const filtered = filterVisualLibraryForPatient(visualLibrary, restrictions, disliked, allergies);
  console.log(`[DB-Exclusive-v7] Filtered library: ${filtered.length}/${visualLibrary.length} items passed restriction/intolerance filter`);

  // ──── MEAL STRUCTURE FROM ONBOARDING ────
  const defaultMeals = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"];
  const mealTypes = enabledMeals && enabledMeals.length > 0 ? enabledMeals : defaultMeals;

  if (mealTypes.length === 0) {
    throw new Error("[STRICT] No enabled meals defined in patient onboarding. Cannot generate plan.");
  }

  // Group library items by category
  const byCategory = new Map<string, VisualLibraryItem[]>();
  for (const item of filtered) {
    if (!VALID_MEAL_CATEGORIES.has(item.category)) {
      console.warn(`[DB-Exclusive-v7] Skipping item with invalid category: ${item.category} (${item.display_name})`);
      continue;
    }
    const list = byCategory.get(item.category) || [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  // ──── DYNAMIC AVAILABILITY CHECK ────
  for (const mealType of mealTypes) {
    const categories = MEAL_TYPE_TO_VISUAL_CATEGORY[mealType] || ["refeicao"];
    let totalCandidates = 0;
    for (const cat of categories) {
      totalCandidates += (byCategory.get(cat) || []).length;
    }
    if (totalCandidates < MIN_CANDIDATES_PER_MEAL) {
      throw new Error(`[STRICT] Insufficient visual library items for meal type "${mealType}": found ${totalCandidates}, minimum ${MIN_CANDIDATES_PER_MEAL} required after filtering. Check patient restrictions.`);
    }
  }

  const items: any[] = [];
  const usedPerMealType = new Map<string, Set<string>>();

  for (let day = 0; day < 7; day++) {
    for (const mealType of mealTypes) {
      const targetKcal = Math.round(kcalTarget * (MEAL_KCAL_SPLIT[mealType] || 0.15));
      const categories = MEAL_TYPE_TO_VISUAL_CATEGORY[mealType] || ["refeicao"];

      // Collect candidates from matching categories — NO FALLBACK
      let candidates: VisualLibraryItem[] = [];
      for (const cat of categories) {
        const catItems = byCategory.get(cat) || [];
        candidates.push(...catItems);
      }

      // ──── NO_FALLBACK: Throw error instead of improvising ────
      if (candidates.length === 0) {
        throw new Error(`[STRICT] No visual library items found for meal type "${mealType}" on day ${day}. No fallback allowed.`);
      }

      // Anti-repetition tracking
      if (!usedPerMealType.has(mealType)) usedPerMealType.set(mealType, new Set());
      const usedSet = usedPerMealType.get(mealType)!;
      if (usedSet.size >= candidates.length) usedSet.clear();

      // Seeded shuffle for variety
      const seed = generationSeed(String(planOptionIndex), day * 7 + defaultMeals.indexOf(mealType));
      const shuffled = seededShuffle(candidates, seed);

      // Pick first unused item
      let picked: VisualLibraryItem | null = null;
      for (const c of shuffled) {
        if (!usedSet.has(c.id)) { picked = c; break; }
      }
      if (!picked) picked = shuffled[0];
      usedSet.add(picked.id);

      // ──── STRICT_DB_EXCLUSIVE: Validate item has image ────
      if (!picked.image_url || picked.image_url.length < 5) {
        throw new Error(`[STRICT] Visual library item "${picked.display_name}" (${picked.id}) has no image_url. All items MUST have images.`);
      }

      // Get macros (use defaults if library item lacks data)
      const catDefaults = CATEGORY_DEFAULT_MACROS[picked.category] || CATEGORY_DEFAULT_MACROS.refeicao;
      const baseCal = picked.default_calories || catDefaults.cal;
      const baseP = picked.default_protein || catDefaults.p;
      const baseC = picked.default_carbs || catDefaults.c;
      const baseF = picked.default_fat || catDefaults.f;

      // ──── MACRO_SCALING_ONLY: Scale 0.5x–2.5x, no composition changes ────
      const scaleFactor = baseCal > 0 ? targetKcal / baseCal : 1;
      const clampedScale = Math.max(0.5, Math.min(2.5, scaleFactor));

      // Build description from library item
      let description = `• ${picked.display_name}`;
      if (picked.base_recipe && typeof picked.base_recipe === "object") {
        const recipe = picked.base_recipe as any;
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
          description = recipe.ingredients.map((ing: string) => `• ${ing}`).join("\n");
          description = scaleDescriptionQuantities(description, clampedScale) || description;
        }
      }

      const finalDescription = finalizeMealDescription(description, mealType, goal);

      // ──── MEAL_TIME_SUPPORT ────
      const mealTime = mealTimes?.[mealType] || null;

      items.push({
        title: picked.display_name,
        description: finalDescription,
        meal_type: mealType,
        day_of_week: day,
        calories_target: Math.round(baseCal * clampedScale),
        protein_target: Math.round(baseP * clampedScale),
        carbs_target: Math.round(baseC * clampedScale),
        fat_target: Math.round(baseF * clampedScale),
        visual_library_item_id: picked.id,
        meal_time: mealTime,
        // ──── STRUCTURED_LOGGING ────
        _source: "visual_library",
        _category_used: picked.category,
        _scale_factor: clampedScale,
        _image_url: picked.image_url, // transient — for logging only
      });
    }
  }

  console.log(`[DB-Exclusive-v7] Generated ${items.length} items from visual library (${filtered.length} available, ${mealTypes.length} meal types)`);
  return items;
}

// ──── FINAL VALIDATION (MANDATORY before persisting) ────
function validatePlanBeforeSave(
  items: any[],
  dailyKcal: number,
  dailyMacros: { protein: number; carbs: number; fat: number },
  weight: number,
  goal: string,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Rule 1: Every item must have visual_library_item_id
  const missingVisual = items.filter(i => !i.visual_library_item_id);
  if (missingVisual.length > 0) {
    errors.push(`${missingVisual.length} items missing visual_library_item_id`);
  }

  // Rule 2: Every item must have image (checked via _image_url transient field)
  const missingImage = items.filter(i => !i._image_url || i._image_url.length < 5);
  if (missingImage.length > 0) {
    errors.push(`${missingImage.length} items missing image_url`);
  }

  // Rule 3: Calorie deviation <= 5%
  const day0Items = items.filter(i => i.day_of_week === 0);
  if (day0Items.length > 0) {
    const sumCal = day0Items.reduce((s: number, i: any) => s + (i.calories_target || 0), 0);
    const calDev = dailyKcal > 0 ? Math.abs(sumCal - dailyKcal) / dailyKcal : 0;
    if (calDev > 0.05) {
      errors.push(`Calorie deviation ${(calDev * 100).toFixed(1)}% exceeds 5% tolerance (sum=${sumCal}, target=${dailyKcal})`);
    }

    // Rule 4: Protein within clinical range
    const sumP = day0Items.reduce((s: number, i: any) => s + (i.protein_target || 0), 0);
    const proteinPerKg = sumP / weight;
    const proteinRange = CLINICAL_PROTEIN_RANGES[goal] || CLINICAL_PROTEIN_RANGES.maintain;
    if (proteinPerKg < proteinRange.min * 0.9 || proteinPerKg > proteinRange.max * 1.1) {
      errors.push(`Protein ${proteinPerKg.toFixed(2)}g/kg outside clinical range ${proteinRange.min}-${proteinRange.max}g/kg for goal=${goal}`);
    }
  }

  // Rule 5: Every item must have _source = visual_library
  const wrongSource = items.filter(i => i._source !== "visual_library");
  if (wrongSource.length > 0) {
    errors.push(`${wrongSource.length} items have non-visual_library source`);
  }

  return { valid: errors.length === 0, errors };
}

async function safeDeletePlan(client: any, planId: string) {
  const { error } = await client.from("meal_plans").delete().eq("id", planId);
  if (error) {
    console.error(`[generate-meal-plan] Failed to rollback orphan plan ${planId}:`, error);
  }
}

// ══════════════════════════════════════════════════════════════
// 2-LAYER VALIDATION (MANDATORY before persisting any plan)
// Ensures meal macro sums match clinical engine totals (3% max)
// ══════════════════════════════════════════════════════════════
function validate2LayerIntegrity(
  items: any[],
  dailyKcal: number,
  dailyMacros: { protein: number; carbs: number; fat: number },
): { valid: boolean; deviations: Record<string, number>; errors: string[] } {
  // Check day 0 as representative
  const day0Items = items.filter((i: any) => i.day_of_week === 0);
  if (day0Items.length === 0) return { valid: true, deviations: {}, errors: [] };

  const sumCal = day0Items.reduce((s: number, i: any) => s + (i.calories_target || 0), 0);
  const sumP = day0Items.reduce((s: number, i: any) => s + (i.protein_target || 0), 0);
  const sumC = day0Items.reduce((s: number, i: any) => s + (i.carbs_target || 0), 0);
  const sumF = day0Items.reduce((s: number, i: any) => s + (i.fat_target || 0), 0);

  const deviations = {
    calories: dailyKcal > 0 ? Math.abs(sumCal - dailyKcal) / dailyKcal : 0,
    protein: dailyMacros.protein > 0 ? Math.abs(sumP - dailyMacros.protein) / dailyMacros.protein : 0,
    carbs: dailyMacros.carbs > 0 ? Math.abs(sumC - dailyMacros.carbs) / dailyMacros.carbs : 0,
    fat: dailyMacros.fat > 0 ? Math.abs(sumF - dailyMacros.fat) / dailyMacros.fat : 0,
  };

  const errors: string[] = [];
  if (deviations.calories > MAX_2LAYER_DEVIATION) errors.push(`Calorie deviation ${(deviations.calories * 100).toFixed(1)}%`);
  if (deviations.protein > MAX_2LAYER_DEVIATION) errors.push(`Protein deviation ${(deviations.protein * 100).toFixed(1)}%`);
  if (deviations.carbs > MAX_2LAYER_DEVIATION) errors.push(`Carbs deviation ${(deviations.carbs * 100).toFixed(1)}%`);
  if (deviations.fat > MAX_2LAYER_DEVIATION) errors.push(`Fat deviation ${(deviations.fat * 100).toFixed(1)}%`);

  return { valid: errors.length === 0, deviations, errors };
}

// ──── Post-generation macro reconciliation ────
function reconcileDailyMacros(
  items: any[],
  dailyKcalTarget: number,
  dailyMacros: { protein: number; carbs: number; fat: number },
  goal: string = "",
): any[] {
  const byDay = new Map<number, any[]>();
  for (const item of items) {
    const day = item.day_of_week;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(item);
  }

  const reconciled: any[] = [];
  for (const [, dayItems] of byDay) {
    // Step 1: Scale all items proportionally to hit daily targets
    const totalCals = dayItems.reduce((s: number, i: any) => s + (i.calories_target || 0), 0);
    const totalP = dayItems.reduce((s: number, i: any) => s + (i.protein_target || 0), 0);
    const totalC = dayItems.reduce((s: number, i: any) => s + (i.carbs_target || 0), 0);
    const totalF = dayItems.reduce((s: number, i: any) => s + (i.fat_target || 0), 0);

    const calFactor = totalCals > 0 ? dailyKcalTarget / totalCals : 1;
    const pFactor = totalP > 0 ? dailyMacros.protein / totalP : 1;
    const cFactor = totalC > 0 ? dailyMacros.carbs / totalC : 1;
    const fFactor = totalF > 0 ? dailyMacros.fat / totalF : 1;

    const scaledItems: any[] = [];
    for (const item of dayItems) {
      scaledItems.push({
        ...item,
        calories_target: Math.round((item.calories_target || 0) * calFactor),
        protein_target: Math.round((item.protein_target || 0) * pFactor),
        carbs_target: Math.round((item.carbs_target || 0) * cFactor),
        fat_target: Math.round((item.fat_target || 0) * fFactor),
      });
    }

    // Step 2: Redistribute protein by meal role instead of inflating lunch/dinner blindly
    rebalanceProteinTargetsByMeal(scaledItems, dailyMacros.protein, goal);

    // Step 3: Final rounding correction — ensure daily total matches target exactly
    const finalItems = [...scaledItems];
    const finalProteinSum = finalItems.reduce((s: number, i: any) => s + (i.protein_target || 0), 0);
    const proteinDiff = dailyMacros.protein - finalProteinSum;
    if (proteinDiff !== 0 && finalItems.length > 0) {
      // Apply rounding correction to the largest non-breakfast meal
      const nonBfast = finalItems.filter((i: any) => i.meal_type !== "breakfast");
      const correctionTarget = nonBfast.length > 0
        ? nonBfast.reduce((max: any, i: any) => (i.protein_target > (max?.protein_target || 0) ? i : max), nonBfast[0])
        : finalItems[0];
      correctionTarget.protein_target += proteinDiff;
    }

    // Same rounding correction for calories
    const finalCalSum = finalItems.reduce((s: number, i: any) => s + (i.calories_target || 0), 0);
    const calDiff = dailyKcalTarget - finalCalSum;
    if (calDiff !== 0 && finalItems.length > 0) {
      const largestMeal = finalItems.reduce((max: any, i: any) => (i.calories_target > (max?.calories_target || 0) ? i : max), finalItems[0]);
      largestMeal.calories_target += calDiff;
    }

    reconciled.push(...finalItems);
  }
  return reconciled;
}

function syncPlanDescriptionsWithProteinTargets(originalItems: any[], adjustedItems: any[], goal: string): any[] {
  return adjustedItems.map((item, index) => {
    const original = originalItems[index];
    if (!original?.description) return item;

    return {
      ...item,
      description: syncProteinDescriptionPortions(
        original.description,
        item.meal_type,
        Number(item.protein_target) || 0,
        Number(original.protein_target) || 0,
        !isLossGoal(goal),
      ) || item.description,
    };
  });
}

// ──── Cross-day consistency enforcement (3% protein, 5% other macros) ────
function enforceCrossDayConsistency(items: any[], dailyMacros: { protein: number; carbs: number; fat: number }, dailyKcal: number): any[] {
  // ── Pre-check: detect per-item calorie inflation (e.g. daily total on each item) ──
  const MAX_SINGLE_ITEM_KCAL = 1200;
  const mealShares = MEAL_KCAL_SPLIT;
  for (const item of items) {
    if ((item.calories_target || 0) > MAX_SINGLE_ITEM_KCAL) {
      console.warn(`[enforceCDC] Inflated calories_target=${item.calories_target} on "${item.title}". Fixing.`);
      const share = mealShares[item.meal_type] || 0.20;
      item.calories_target = Math.round(dailyKcal * share);
    }
  }

  const byDay = new Map<number, any[]>();
  for (const item of items) {
    const d = item.day_of_week;
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(item);
  }

  for (const [, dayItems] of byDay) {
    const totalP = dayItems.reduce((s: number, i: any) => s + (i.protein_target || 0), 0);
    const totalC = dayItems.reduce((s: number, i: any) => s + (i.carbs_target || 0), 0);
    const totalF = dayItems.reduce((s: number, i: any) => s + (i.fat_target || 0), 0);
    const totalCal = dayItems.reduce((s: number, i: any) => s + (i.calories_target || 0), 0);

    const corrections = [
      { macro: "protein_target", actual: totalP, target: dailyMacros.protein, tolerance: 0.03 },
      { macro: "carbs_target", actual: totalC, target: dailyMacros.carbs, tolerance: 0.05 },
      { macro: "fat_target", actual: totalF, target: dailyMacros.fat, tolerance: 0.05 },
      { macro: "calories_target", actual: totalCal, target: dailyKcal, tolerance: 0.03 },
    ];

    for (const c of corrections) {
      const deviation = c.target > 0 ? Math.abs(c.actual - c.target) / c.target : 0;
      if (deviation > c.tolerance) {
        const factor = c.target / (c.actual || 1);
        for (const item of dayItems) {
          item[c.macro] = Math.round((item[c.macro] || 0) * factor);
        }
        const newSum = dayItems.reduce((s: number, i: any) => s + (i[c.macro] || 0), 0);
        const diff = c.target - newSum;
        if (diff !== 0 && dayItems.length > 0) {
          const largest = dayItems.reduce((a: any, b: any) => ((b[c.macro] || 0) > (a[c.macro] || 0) ? b : a));
          largest[c.macro] += diff;
        }
      }
    }
  }
  return items;
}

// ──── Deterministic tips engine ────
function generateTips(answers: Record<string, any>): { tip: string; category: string; icon: string }[] {
  const tips: { tip: string; category: string; icon: string }[] = [];
  if (answers.water_intake && answers.water_intake < 8)
    tips.push({ tip: "Você bebe menos de 2L de água/dia. Tente aumentar gradualmente.", category: "hydration", icon: "💧" });
  if (answers.sleep_time && answers.wake_time) {
    const sleep = parseInt(answers.sleep_time.split(":")[0]);
    const wake = parseInt(answers.wake_time.split(":")[0]);
    const hours = sleep > wake ? (24 - sleep + wake) : (wake - sleep);
    if (hours < 7) tips.push({ tip: "Menos de 7h de sono. Essencial para metabolismo ativo.", category: "sleep", icon: "😴" });
  }
  if (answers.activity_level === "sedentary")
    tips.push({ tip: "Comece com 20min de caminhada, 3x/semana.", category: "exercise", icon: "🚶" });
  if (answers.goal === "lose_weight")
    tips.push({ tip: "Coma devagar e mastigue bem para saciedade.", category: "nutrition", icon: "🍽️" });
  if (answers.goal === "gain_muscle")
    tips.push({ tip: "Distribua proteína ao longo do dia.", category: "nutrition", icon: "💪" });
  if (answers.meals_per_day && answers.meals_per_day < 4)
    tips.push({ tip: "Faça pelo menos 4 refeições/dia.", category: "nutrition", icon: "🕐" });
  if (answers.bowel_function === "irregular" || answers.bowel_function === "constipated")
    tips.push({ tip: "Aumente fibras e água para regularizar intestino.", category: "digestion", icon: "🌿" });
  return tips;
}

// ──── Build standardized generation_metadata ────
function buildGenerationMetadata(
  tmb: number, tdee: number, tdeeFactor: number, kcalTarget: number, goal: string,
  macros: { protein: number; carbs: number; fat: number }, weight: number, height: number,
  age: number, sex: string, activityLevel: string, dataSource: string,
  restrictions: string[], medicalConditions: string[], disliked: string[],
  usedDBFoods: boolean,
): Record<string, any> {
  const strategy = GOAL_STRATEGY[goal] || { calorie: "unknown", macro: "unknown" };
  return {
    engine_version: ENGINE_VERSION,
    protocol_version: PROTOCOL_VERSION,
    generation_method: "db_exclusive_visual_library_v7_strict",
    bmr_formula: "mifflin_st_jeor",
    bmr_value: tmb,
    tdee_factor: tdeeFactor,
    tdee_value: tdee,
    goal,
    goal_strategy: strategy.calorie,
    calorie_target: kcalTarget,
    macro_strategy: strategy.macro,
    macros: {
      protein_g: macros.protein,
      carbs_g: macros.carbs,
      fat_g: macros.fat,
    },
    patient_data: { weight, height, age, sex, activity_level: activityLevel },
    data_sources: dataSource === "physical_assessment"
      ? ["anamnesis", "physical_assessment"]
      : ["anamnesis"],
    restrictions,
    medical_conditions: medicalConditions,
    disliked_foods: disliked,
    food_rules: {
      blocked_foods_enforced: true,
      regional_focus: "brasil_popular",
      db_driven: usedDBFoods,
    },
    generated_at: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
// SERVE
// ═══════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const caller = await requireUser(req);
    const userId = caller.id;

    const rl = await checkRateLimit("generate-meal-plan", userId, 10, 10);
    if (!rl.allowed) return rateLimitResponse();

    const body = await req.json();
    const patient_id = body.patient_id || body.patientId;
    const meal_plan_id = body.meal_plan_id;
    const isPipeline = body.isPipeline || false;
    const planCount = Math.min(Math.max(body.planCount || 1, 1), 3);
    const requestedNutritionistId = body.nutritionistId || userId;
    const generationMode: "quick" | "smart" | "clinical" = body.generationMode || "quick";
    const saveAsTemplate = body.saveAsTemplate || false;

    if (!patient_id || typeof patient_id !== "string" || patient_id.length < 10) {
      return new Response(JSON.stringify({ error: "patient_id é obrigatório", code: "PATIENT_ID_MISSING" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve tenant_id
    const { data: tenantProfile } = await serviceClient
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", requestedNutritionistId)
      .maybeSingle();
    let resolvedTenantId = tenantProfile?.tenant_id || null;

    // Authorization guard
    if (!caller.roles.includes("admin")) {
      const callerIsPatient = userId === patient_id;
      const callerIsResponsibleProfessional = userId === requestedNutritionistId;

      if (!callerIsPatient && !callerIsResponsibleProfessional) {
        return new Response(JSON.stringify({
          error: "Usuário não autorizado para gerar plano deste paciente",
          code: "PLAN_AUTH_FORBIDDEN",
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: patientProfile } = await serviceClient
        .from("profiles")
        .select("id, user_id")
        .or(`id.eq.${patient_id},user_id.eq.${patient_id}`)
        .maybeSingle();

      const patientIdentityIds = Array.from(new Set([
        patient_id,
        patientProfile?.id,
        patientProfile?.user_id,
      ].filter(Boolean)));

      const { data: activeLink } = await serviceClient
        .from("nutritionist_patients")
        .select("id")
        .in("patient_id", patientIdentityIds)
        .eq("nutritionist_id", requestedNutritionistId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (!activeLink) {
        return new Response(JSON.stringify({
          error: "Paciente não está vinculado ao profissional responsável",
          code: "PATIENT_LINK_MISSING",
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fallback tenant
    if (!resolvedTenantId) {
      const { data: fallbackTenant } = await serviceClient
        .from("tenants")
        .select("id")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      resolvedTenantId = fallbackTenant?.id || null;
    }

    const { data: latestPipeline } = isPipeline
      ? await serviceClient
          .from("onboarding_pipelines")
          .select("id, weight, height, meal_count, cooking_preference, food_preferences, wake_time, sleep_time, status")
          .eq("patient_id", patient_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null };

    // ── 1. Get completed anamnesis ──
    let { data: anamnesis, error: anamErr } = await serviceClient
      .from("patient_anamnesis")
      .select("*")
      .eq("user_id", patient_id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (anamErr) {
      console.error("Anamnesis query error:", anamErr);
      return new Response(JSON.stringify({ error: "Erro ao buscar anamnese", code: "ANAMNESIS_QUERY_ERROR" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!anamnesis) {
      const { data: fallbackAnamnesis, error: fallbackAnamErr } = await serviceClient
        .from("patient_anamnesis")
        .select("*")
        .eq("user_id", patient_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackAnamErr) {
        console.error("Fallback anamnesis query error:", fallbackAnamErr);
      } else if (fallbackAnamnesis?.answers) {
        anamnesis = fallbackAnamnesis;
        console.warn(`[generate-meal-plan] Using fallback anamnesis with status=${fallbackAnamnesis.status} for patient ${patient_id}`);
      }
    }

    if (!anamnesis) {
      return new Response(JSON.stringify({ error: "Anamnese concluída não encontrada", code: "ANAMNESIS_MISSING" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const answers = (anamnesis.answers || {}) as Record<string, any>;

    // ── 2. Validate weight + height ──
    const weight = normalizeWeightKg(body.weight ?? latestPipeline?.weight ?? answers.weight);
    const height = normalizeHeightCm(body.height ?? latestPipeline?.height ?? answers.height);
    if (!weight || weight < 20 || !height || height < 80) {
      console.warn(`[generate-meal-plan] Invalid body data for patient ${patient_id}`, {
        rawBodyWeight: body.weight ?? null, rawBodyHeight: body.height ?? null,
        pipelineWeight: latestPipeline?.weight ?? null, pipelineHeight: latestPipeline?.height ?? null,
        anamnesisWeight: answers.weight ?? null, anamnesisHeight: answers.height ?? null,
        normalizedWeight: weight, normalizedHeight: height,
      });
      return new Response(JSON.stringify({ error: "Peso e altura válidos são obrigatórios", code: "BODY_DATA_MISSING" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. Goal ──
    const rawGoal = body.goal || answers.goal || answers.objective || answers.main_goal;
    const goal = normalizeGoal(rawGoal);
    if (!goal) {
      return new Response(JSON.stringify({ error: "Objetivo do paciente não definido", code: "GOAL_MISSING" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof rawGoal === "string" && rawGoal !== goal) {
      console.log(`[generate-meal-plan] Goal normalized from "${rawGoal}" to "${goal}"`);
    }

    // ── 4. Calculate TMB / TDEE / macros ──
    const age = normalizeAge(answers.age, 30);
    const sex = String(answers.sex || answers.gender || "male").toLowerCase() === "female" ? "female" : "male";
    const activityLevel = normalizeActivityLevel(answers.activity_level || body.activityLevel || latestPipeline?.food_preferences?.activity_level);

    const tmb = calculateTMB(weight, height, age, sex);
    const tdeeFactor = ACTIVITY_MULTIPLIERS[activityLevel] || 1.375;
    const tdee = calculateTDEE(tmb, activityLevel);
    const kcalTarget = calculateTargetKcal(tdee, goal, sex);
    const macros = calculateMacros(kcalTarget, goal, weight);

    // Physical assessment override
    const { data: physicalAssessment } = await serviceClient
      .from("physical_assessments")
      .select("calories_target, protein_target, carbs_target, fat_target, tdee, bmr")
      .eq("patient_id", patient_id)
      .order("assessment_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    // ── Strategy Override (highest priority — nutritionist's explicit choice) ──
    const strategyOverride = body.strategyOverride;
    let finalKcal: number;
    let finalMacros: { protein: number; carbs: number; fat: number };
    let dataSource: string;

    if (strategyOverride?.targetCalories && strategyOverride?.targetProtein) {
      // Strategy Advisor — but MUST respect clinical protein/fat ranges (Layer 1 immutable)
      finalKcal = strategyOverride.targetCalories;
      let overrideProtein = strategyOverride.targetProtein;
      let overrideFat = strategyOverride.targetFat || macros.fat;
      
      // ENFORCE clinical ranges — strategy cannot bypass Layer 1
      const proteinRange = CLINICAL_PROTEIN_RANGES[goal] || CLINICAL_PROTEIN_RANGES.maintain;
      const proteinPerKg = overrideProtein / weight;
      if (proteinPerKg > proteinRange.max) {
        overrideProtein = Math.round(weight * proteinRange.max);
        console.warn(`[2-Layer] Strategy protein capped: ${strategyOverride.targetProtein}g → ${overrideProtein}g (max ${proteinRange.max}g/kg)`);
      }
      if (proteinPerKg < proteinRange.min) {
        overrideProtein = Math.round(weight * proteinRange.min);
        console.warn(`[2-Layer] Strategy protein raised: ${strategyOverride.targetProtein}g → ${overrideProtein}g (min ${proteinRange.min}g/kg)`);
      }
      const fatPerKg = overrideFat / weight;
      if (fatPerKg > CLINICAL_FAT_RANGE.max * 1.1) {
        overrideFat = Math.round(weight * CLINICAL_FAT_RANGE.max);
        console.warn(`[2-Layer] Strategy fat capped: ${strategyOverride.targetFat}g → ${overrideFat}g`);
      }
      
      finalMacros = {
        protein: overrideProtein,
        carbs: strategyOverride.targetCarbs || macros.carbs,
        fat: overrideFat,
      };
      dataSource = `strategy_advisor:${strategyOverride.strategyId || "custom"}`;
      console.log(`[generate-meal-plan] ✅ Strategy Override (Layer 1 enforced): ${strategyOverride.strategyName} | Kcal: ${finalKcal} | P: ${finalMacros.protein}g | C: ${finalMacros.carbs}g | F: ${finalMacros.fat}g`);
    } else if (physicalAssessment?.calories_target) {
      finalKcal = physicalAssessment.calories_target;
      // Physical assessment also enforced by Layer 1 ranges
      let paProtein = physicalAssessment.protein_target || macros.protein;
      const paProteinPerKg = paProtein / weight;
      const paProteinRange = CLINICAL_PROTEIN_RANGES[goal] || CLINICAL_PROTEIN_RANGES.maintain;
      if (paProteinPerKg > paProteinRange.max) paProtein = Math.round(weight * paProteinRange.max);
      if (paProteinPerKg < paProteinRange.min) paProtein = Math.round(weight * paProteinRange.min);
      
      finalMacros = {
        protein: paProtein,
        carbs: physicalAssessment.carbs_target || macros.carbs,
        fat: physicalAssessment.fat_target || macros.fat,
      };
      dataSource = "physical_assessment";
    } else {
      finalKcal = kcalTarget;
      finalMacros = { protein: macros.protein, carbs: macros.carbs, fat: macros.fat };
      dataSource = "anamnesis_calculated";
    }

    // Pipeline overrides
    const pipelineOverrides: Record<string, unknown> = isPipeline ? {
      cooking_preference: body.cookingPreference ?? latestPipeline?.cooking_preference,
      food_preferences: body.foodPreferences ?? latestPipeline?.food_preferences,
      wake_time: body.wakeTime ?? latestPipeline?.wake_time,
      sleep_time: body.sleepTime ?? latestPipeline?.sleep_time,
      meal_count: body.mealCount ?? latestPipeline?.meal_count,
    } : {};
    const mergedAnswers = { ...(answers as Record<string, unknown>), ...pipelineOverrides } as Record<string, any>;

    // ── Parse restrictions, allergies, disliked foods ──
    const rawRestrictions = mergedAnswers.restrictions || [];
    const restrictions: string[] = Array.isArray(rawRestrictions) 
      ? rawRestrictions.filter((r: string) => r !== "none") 
      : [];
    const medicalConditions = mergedAnswers.medical_conditions || mergedAnswers.health_conditions || [];
    const rawDisliked = mergedAnswers.disliked_foods || "";
    const disliked = (typeof rawDisliked === "string" ? rawDisliked : "").toLowerCase().split(",").map((s: string) => s.trim()).filter(Boolean);
    const rawAllergies = mergedAnswers.allergies || [];
    const allergies: string[] = Array.isArray(rawAllergies) 
      ? rawAllergies.filter((a: string) => a !== "none")
      : [];

    // ── Parse enabled meals and meal times from onboarding ──
    const rawEnabledMeals = mergedAnswers.enabled_meals || mergedAnswers.meals_enabled || null;
    const enabledMeals: string[] | undefined = Array.isArray(rawEnabledMeals) && rawEnabledMeals.length > 0
      ? rawEnabledMeals.filter((m: string) => typeof m === "string" && m.length > 0)
      : undefined;
    const mealTimes: Record<string, string> | undefined = mergedAnswers.meal_times && typeof mergedAnswers.meal_times === "object"
      ? mergedAnswers.meal_times as Record<string, string>
      : undefined;

    console.log(`[generate-meal-plan] Patient ${patient_id} | Mode: ${generationMode} | Goal: ${goal} | Kcal: ${finalKcal} | Restrictions: ${restrictions.join(",")} | Disliked: ${disliked.join(",")} | Allergies: ${allergies.join(",")} | EnabledMeals: ${enabledMeals?.join(",") || "default"} | MealTimes: ${mealTimes ? JSON.stringify(mealTimes) : "none"}`);

    // ── Mode-specific enhancements ──
    let modeEnhancements: Record<string, any> = {};
    
    if (generationMode === "smart") {
      const [{ data: behavProfile }, { data: prevPlans }] = await Promise.all([
        serviceClient.from("behavioral_profile").select("*").eq("patient_id", patient_id).maybeSingle(),
        serviceClient.from("meal_plans").select("generation_metadata, template_slug")
          .eq("patient_id", patient_id).order("created_at", { ascending: false }).limit(3),
      ]);
      
      const wakeTime = behavProfile?.wake_up_time || mergedAnswers.wake_time;
      const workoutTime = behavProfile?.workout_time;
      const motivationStyle = behavProfile?.motivation_style;
      
      const usedIndices = (prevPlans || []).map((_: any, i: number) => i);
      const varietyOffset = usedIndices.length > 0 ? usedIndices.length : 0;
      
      modeEnhancements = {
        mode: "smart",
        varietyOffset,
        wakeTime,
        workoutTime,
        motivationStyle,
        weekendDietBreaks: behavProfile?.weekend_diet_breaks || false,
        cravingHours: behavProfile?.craving_hours || [],
      };
    } else if (generationMode === "clinical") {
      const [{ data: clinicalFlags }, { data: activeProtocol }] = await Promise.all([
        serviceClient.from("patient_clinical_flags").select("flag_key, severity")
          .eq("patient_id", patient_id).eq("is_active", true),
        serviceClient.from("patient_protocols").select("protocol_id, nutrition_protocols(name, macro_rules)")
          .eq("patient_id", patient_id).eq("status", "active").limit(1).maybeSingle(),
      ]);
      
      const flagKeys = (clinicalFlags || []).map((f: any) => f.flag_key);
      const severityFlags = (clinicalFlags || []).filter((f: any) => f.severity === "high" || f.severity === "critical");
      const protocolMacroRules = (activeProtocol as any)?.nutrition_protocols?.macro_rules;
      
      modeEnhancements = {
        mode: "clinical",
        clinicalFlags: flagKeys,
        severityFlags: severityFlags.length,
        protocolName: (activeProtocol as any)?.nutrition_protocols?.name || null,
        protocolMacroRules: protocolMacroRules || null,
        strictMacroAdherence: true,
      };
      
      // Apply clinical flag-based macro overrides
      if (flagKeys.includes("diabetes_risk") || flagKeys.includes("insulin_resistance")) {
        finalMacros.carbs = Math.round(finalMacros.carbs * 0.85);
        finalMacros.fat = Math.round(finalMacros.fat * 1.1);
      }
      if (flagKeys.includes("hypertension") || flagKeys.includes("cardiovascular_risk")) {
        restrictions.push("low_sodium");
      }
      if (flagKeys.includes("renal_risk")) {
        finalMacros.protein = Math.min(finalMacros.protein, Math.round(weight * 0.8));
      }
    } else {
      modeEnhancements = { mode: "quick" };
    }

    const startDate = new Date().toISOString().split("T")[0];

    // ═══════════════════════════════════════════════════════════
    // LOAD VISUAL LIBRARY (EXCLUSIVE SOURCE OF MEALS)
    // ALL meals come from meal_visual_library — no presets allowed
    // ═══════════════════════════════════════════════════════════
    
    const visualLibrary = await loadVisualLibrary(serviceClient);
    const useDBDriven = visualLibrary.length >= 5;
    console.log(`[generate-meal-plan] Visual library loaded: ${visualLibrary.length} items with images. DB-exclusive: ${useDBDriven}`);

    if (visualLibrary.length < 5) {
      return new Response(JSON.stringify({
        error: "Biblioteca visual insuficiente para gerar plano. Mínimo 5 itens com imagem necessários.",
        code: "VISUAL_LIBRARY_INSUFFICIENT",
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Multi-plan flow ──
    if (isPipeline && planCount > 1 && !meal_plan_id) {
      const generatedPlans: any[] = [];
      const nutritionistId = requestedNutritionistId;

      for (let tplIdx = 0; tplIdx < planCount; tplIdx++) {
        // CAMADA 2: Template structure → reconciled with Layer 1 macros
        const rawItems = generatePlanFromVisualLibrary(visualLibrary, goal, finalKcal, finalMacros, restrictions, disliked, allergies, tplIdx, enabledMeals, mealTimes);
        const reconciledItems = enforceCrossDayConsistency(reconcileDailyMacros(rawItems, finalKcal, finalMacros, goal), finalMacros, finalKcal);
        let planItems = syncPlanDescriptionsWithProteinTargets(rawItems, reconciledItems, goal);

        // 2-Layer validation for multi-plan
        const check = validate2LayerIntegrity(planItems, finalKcal, finalMacros);
        if (!check.valid) {
          planItems = enforceCrossDayConsistency(planItems, finalMacros, finalKcal);
          console.warn(`[2-Layer Multi] Option ${tplIdx}: corrected deviations`);
        }

        // ──── FINAL VALIDATION (MANDATORY) ────
        const finalCheck = validatePlanBeforeSave(planItems, finalKcal, finalMacros, weight, goal);
        if (!finalCheck.valid) {
          console.error(`[STRICT Multi] Option ${tplIdx} failed final validation: ${finalCheck.errors.join("; ")}`);
          continue; // Skip this option, don't save invalid plan
        }

        const genMeta = {
          ...buildGenerationMetadata(
            tmb, tdee, tdeeFactor, finalKcal, goal, finalMacros, weight, height,
            age, sex, activityLevel, dataSource, restrictions, medicalConditions, disliked, useDBDriven
          ),
          architecture: "2-layer-db-exclusive-v7-strict",
          two_layer_validated: true,
          meal_source: "visual_library_exclusive",
          final_validation_passed: true,
        };

        const optionLabels = ["Simples", "Variada", "Alternativa"];
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        const { data: newPlan, error: planErr } = await serviceClient
          .from("meal_plans")
          .insert({
            title: `Opção ${tplIdx + 1} — ${optionLabels[tplIdx] || "Extra"}`,
            description: `Plano personalizado v${ENGINE_VERSION}. Meta: ${finalKcal}kcal/dia. Comida brasileira popular.`,
            patient_id,
            nutritionist_id: nutritionistId,
            start_date: startDate,
            end_date: endDate.toISOString().split("T")[0],
            is_active: false,
            plan_status: "draft_auto_generated",
            generation_source: "protocol_fitjourney_v4",
            generated_by: userId,
            generation_metadata: genMeta,
            tenant_id: resolvedTenantId,
          })
          .select("id")
          .single();

        if (planErr || !newPlan) {
          console.error("Failed to create plan option:", planErr);
          continue;
        }

        if (planItems.length === 0) {
          await serviceClient.from("meal_plans").delete().eq("id", newPlan.id);
          continue;
        }

        const itemsToInsert = planItems.map((item: any) => { const { _image_url, _source, ...rest } = item; return { ...rest, meal_plan_id: newPlan.id }; });
        const { error: itemsErr } = await serviceClient.from("meal_plan_items").insert(itemsToInsert);

        if (itemsErr) {
          await serviceClient.from("meal_plans").delete().eq("id", newPlan.id);
          continue;
        }

        const visualResolved = await resolveVisualForItems(serviceClient, newPlan.id, planItems);
        console.log(`Plan ${newPlan.id}: ${visualResolved}/${planItems.length} items visually resolved`);

        generatedPlans.push({
          mealPlanId: newPlan.id,
          templateName: optionLabels[tplIdx] || "Extra",
          score: 100 - tplIdx * 5,
          itemsCount: planItems.length,
        });
      }

      if (generatedPlans.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: "Nenhuma opção de plano foi gerada com sucesso. Tente novamente." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tips = generateTips(mergedAnswers);
      await serviceClient.from("patient_tips").delete().eq("user_id", patient_id);
      if (tips.length > 0) {
        await serviceClient.from("patient_tips").insert(tips.map((t) => ({ user_id: patient_id, ...t })));
      }

      await serviceClient.from("patient_anamnesis").update({
        computed_tmb: tmb, computed_kcal_target: finalKcal,
        computed_protein: finalMacros.protein, computed_carbs: finalMacros.carbs, computed_fat: finalMacros.fat,
      }).eq("id", anamnesis.id);

      await serviceClient.from("patient_timeline").insert({
        patient_id,
        event_type: "meal_plan",
        title: "Planos Alimentares Personalizados Gerados",
        description: `${generatedPlans.length} opções geradas pelo Protocolo FitJourney v${ENGINE_VERSION}. Meta: ${finalKcal}kcal/dia.`,
        metadata: {
          type: "multi_plan_generated",
          protocol: PROTOCOL_VERSION,
          engine_version: ENGINE_VERSION,
          plan_count: generatedPlans.length,
          db_driven: useDBDriven,
          plans: generatedPlans.map(p => ({ id: p.mealPlanId, template: p.templateName })),
        },
        created_by: userId,
      });

      return new Response(
        JSON.stringify({
          success: true,
          multiPlan: true,
          plans: generatedPlans,
          mealPlanId: generatedPlans[0]?.mealPlanId,
          plan_status: "draft_auto_generated",
          items_count: generatedPlans.reduce((s: number, p: any) => s + p.itemsCount, 0),
          tips_count: tips.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Single plan flow ──
    const planOptionIndex = modeEnhancements.varietyOffset || 0;
    
    // ── DB-EXCLUSIVE: All meals from visual library ──
    const rawPlanItems = generatePlanFromVisualLibrary(visualLibrary, goal, finalKcal, finalMacros, restrictions, disliked, allergies, planOptionIndex, enabledMeals, mealTimes);
    console.log(`[generate-meal-plan] DB-Exclusive plan generated: ${rawPlanItems.length} items from visual library`);
    
    // Smart mode: apply adjustments to RAW items BEFORE reconciliation
    if (generationMode === "smart" && modeEnhancements.weekendDietBreaks) {
      for (const item of rawPlanItems) {
        if (item.day_of_week >= 5) {
          item.calories_target = Math.round((item.calories_target || 0) * 1.10);
          item.carbs_target = Math.round((item.carbs_target || 0) * 1.12);
        }
      }
    }

    if (generationMode === "smart" && modeEnhancements.workoutTime) {
      const workoutHour = parseInt(modeEnhancements.workoutTime.split(":")[0] || "0");
      const postWorkoutMeal = workoutHour < 12 ? "lunch" : workoutHour < 17 ? "afternoon_snack" : "dinner";
      for (const item of rawPlanItems) {
        if (item.meal_type === postWorkoutMeal) {
          item.protein_target = Math.round((item.protein_target || 0) * 1.15);
        }
      }
    }

    // Determine per-day targets (weekend may differ in smart mode)
    const weekdayKcal = finalKcal;
    const weekendKcal = (generationMode === "smart" && modeEnhancements.weekendDietBreaks)
      ? Math.round(finalKcal * 1.10) : finalKcal;
    const weekendMacros = (generationMode === "smart" && modeEnhancements.weekendDietBreaks)
      ? { protein: finalMacros.protein, carbs: Math.round(finalMacros.carbs * 1.12), fat: finalMacros.fat }
      : finalMacros;

    // ── CAMADA 2: Reconcile template items with Layer 1 macros ──
    const reconciledPlanItems = enforceCrossDayConsistency(reconcileDailyMacros(rawPlanItems, weekdayKcal, finalMacros, goal), finalMacros, weekdayKcal);
    const planItems = syncPlanDescriptionsWithProteinTargets(rawPlanItems, reconciledPlanItems, goal);

    // ── 2-LAYER VALIDATION (MANDATORY) ──
    const twoLayerCheck = validate2LayerIntegrity(planItems, finalKcal, finalMacros);
    if (!twoLayerCheck.valid) {
      console.warn(`[2-Layer] Deviation detected after reconciliation: ${twoLayerCheck.errors.join(", ")}. Running final correction...`);
      const correctedItems = enforceCrossDayConsistency(planItems, finalMacros, finalKcal);
      const recheck = validate2LayerIntegrity(correctedItems, finalKcal, finalMacros);
      if (!recheck.valid) {
        console.warn(`[2-Layer] Still has deviation after correction: ${recheck.errors.join(", ")}. Proceeding with best-effort.`);
      } else {
        console.log(`[2-Layer] ✅ Final correction resolved all deviations.`);
      }
      planItems.splice(0, planItems.length, ...correctedItems);
    } else {
      console.log(`[2-Layer] ✅ Plan validated: all macros within 3% tolerance.`);
    }

    // ──── FINAL VALIDATION (MANDATORY — FAIL_FAST) ────
    const finalValidation = validatePlanBeforeSave(planItems, finalKcal, finalMacros, weight, goal);
    if (!finalValidation.valid) {
      console.error(`[STRICT] Final validation FAILED: ${finalValidation.errors.join("; ")}`);
      return new Response(JSON.stringify({
        error: `Plano falhou na validação final: ${finalValidation.errors.join("; ")}`,
        code: "FINAL_VALIDATION_FAILED",
        details: finalValidation.errors,
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`[STRICT] ✅ Final validation passed. All ${planItems.length} items are DB-exclusive with images.`);

    if (planItems.length === 0) {
      return new Response(JSON.stringify({
        error: "Nenhuma refeição foi gerada para este paciente. Revise os dados clínicos e tente novamente.",
        code: "NO_PLAN_ITEMS_GENERATED",
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const generationMetadata = {
      ...buildGenerationMetadata(
        tmb, tdee, tdeeFactor, finalKcal, goal, finalMacros, weight, height,
        age, sex, activityLevel, dataSource, restrictions, medicalConditions, disliked, useDBDriven
      ),
      generation_mode: generationMode,
      mode_enhancements: modeEnhancements,
      architecture: "2-layer-db-exclusive-v7-strict",
      layer1_source: "clinical_macro_engine",
      layer2_role: "visual_library_structure_only",
      two_layer_validated: true,
      meal_source: "visual_library_exclusive",
      final_validation_passed: true,
      enabled_meals: enabledMeals || "default",
      meal_times: mealTimes || null,
    };

    let finalMealPlanId = meal_plan_id;

    const MODE_TITLES: Record<string, string> = {
      quick: "Plano Rápido",
      smart: "Plano Inteligente",
      clinical: "Plano Clínico",
    };
    const MODE_SOURCES: Record<string, string> = {
      quick: "smart_quick_v4",
      smart: "smart_intelligent_v4",
      clinical: "smart_clinical_v4",
    };
    const planTitle = MODE_TITLES[generationMode] || "Plano Alimentar";
    const genSource = MODE_SOURCES[generationMode] || "protocol_fitjourney_v4";

    if (!meal_plan_id) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const { data: newPlan, error: planErr } = await serviceClient
        .from("meal_plans")
        .insert({
          title: planTitle,
          description: `Gerado pelo Protocolo FitJourney v${ENGINE_VERSION} (${generationMode}). Meta: ${finalKcal}kcal/dia. ${useDBDriven ? "Personalizado com banco alimentar." : "Comida brasileira popular."}`,
          patient_id,
          nutritionist_id: requestedNutritionistId,
          start_date: startDate,
          end_date: endDate.toISOString().split("T")[0],
          is_active: false,
          plan_status: "draft_auto_generated",
          generation_source: genSource,
          generated_by: userId,
          generation_metadata: generationMetadata,
          tenant_id: resolvedTenantId,
        })
        .select("id")
        .single();

      if (planErr || !newPlan) throw new Error("Falha ao criar plano alimentar: " + planErr?.message);
      finalMealPlanId = newPlan.id;
    } else if (finalMealPlanId) {
      const { data: existingPlan } = await serviceClient
        .from("meal_plans")
        .select("plan_status")
        .eq("id", finalMealPlanId)
        .single();

      if (existingPlan?.plan_status === "published_to_patient" || existingPlan?.plan_status === "approved") {
        return new Response(JSON.stringify({
          error: "Não é possível regenerar plano já aprovado/publicado. Crie um novo plano.",
          code: "PLAN_ALREADY_APPROVED",
        }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await serviceClient.from("meal_plans").update({
        plan_status: "draft_auto_generated",
        generation_source: genSource,
        generated_by: userId,
        generation_metadata: generationMetadata,
      }).eq("id", finalMealPlanId);
    }

    if (!finalMealPlanId) {
      return new Response(JSON.stringify({ error: "meal_plan_id é obrigatório", code: "NO_PLAN_ID" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const itemsToInsert = planItems.map((item: any) => {
      const { _image_url, _source, ...rest } = item;
      return { ...rest, meal_plan_id: finalMealPlanId };
    });

    // Delete existing items FIRST to prevent duplicate accumulation from concurrent calls
    const { error: deleteErr } = await serviceClient
      .from("meal_plan_items")
      .delete()
      .eq("meal_plan_id", finalMealPlanId);

    if (deleteErr) {
      console.error(`[generate-meal-plan] Failed to delete previous items for plan ${finalMealPlanId}:`, deleteErr);
      // Continue anyway — inserting new items is more important
    }

    const { error: insertErr } = await serviceClient.from("meal_plan_items").insert(itemsToInsert);

    if (insertErr) {
      if (isPipeline && !meal_plan_id) {
        await safeDeletePlan(serviceClient, finalMealPlanId);
      }
      throw new Error(`Falha ao inserir itens do plano ${finalMealPlanId}: ${insertErr.message}`);
    }

    const visualResolved = await resolveVisualForItems(serviceClient, finalMealPlanId, planItems);
    console.log(`Single plan ${finalMealPlanId}: ${visualResolved}/${planItems.length} items visually resolved`);

    await serviceClient.from("patient_anamnesis").update({
      computed_tmb: tmb, computed_kcal_target: finalKcal,
      computed_protein: finalMacros.protein, computed_carbs: finalMacros.carbs, computed_fat: finalMacros.fat,
    }).eq("id", anamnesis.id);

    const tips = generateTips(mergedAnswers);
    await serviceClient.from("patient_tips").delete().eq("user_id", patient_id);
    if (tips.length > 0) {
      await serviceClient.from("patient_tips").insert(tips.map((t) => ({ user_id: patient_id, ...t })));
    }

    if (saveAsTemplate && finalMealPlanId) {
      try {
        await serviceClient.from("meal_plans").update({
          template_slug: `auto_${generationMode}_${Date.now()}`,
          template_version: 1,
        }).eq("id", finalMealPlanId);
      } catch (tplErr) {
        console.warn("[generate-meal-plan] Failed to save as template:", tplErr);
      }
    }

    await serviceClient.from("patient_timeline").insert({
      patient_id,
      event_type: "meal_plan",
      title: `${planTitle} Gerado`,
      description: `Protocolo FitJourney v${ENGINE_VERSION} (${generationMode}) | Meta: ${finalKcal}kcal/dia | ${finalMacros.protein}g prot / ${finalMacros.carbs}g carb / ${finalMacros.fat}g gord`,
      metadata: {
        type: "plan_generated",
        protocol: PROTOCOL_VERSION,
        engine_version: ENGINE_VERSION,
        generation_mode: generationMode,
        meal_plan_id: finalMealPlanId,
        items_count: planItems.length,
        data_source: dataSource,
        generation_method: "db_exclusive_visual_library_v6",
        db_driven: useDBDriven,
      },
      created_by: userId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        mealPlanId: finalMealPlanId,
        plan_status: "draft_auto_generated",
        items_count: planItems.length,
        tips_count: tips.length,
        generation_mode: generationMode,
        db_driven: useDBDriven,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("generate-meal-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
