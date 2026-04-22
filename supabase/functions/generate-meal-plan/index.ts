// @ts-nocheck
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
// ──── UNIFIED ENGINE: Shared modules ────
import {
  calculateTMB as sharedCalculateTMB,
  calculateTDEE as sharedCalculateTDEE,
  calculateTargetKcal as sharedCalculateTargetKcal,
  calculateMacros as sharedCalculateMacros,
  enforceProteinRange,
  enforceFatRange,
  normalizeWeightKg as sharedNormalizeWeightKg,
  normalizeHeightCm as sharedNormalizeHeightCm,
  normalizeAge as sharedNormalizeAge,
  normalizeGoal,
  normalizeActivityLevel as sharedNormalizeActivityLevel,
  ACTIVITY_MULTIPLIERS as SHARED_ACTIVITY_MULTIPLIERS,
  CLINICAL_PROTEIN_RANGES as SHARED_CLINICAL_PROTEIN_RANGES,
  CLINICAL_FAT_RANGE as SHARED_CLINICAL_FAT_RANGE,
} from "../_shared/clinical-macro-engine.ts";
import { detectStrategy } from "../_shared/strategy-resolver.ts";
import { getStrategy, BB_PHASE_CONFIG, type StrategyId } from "../_shared/strategies.ts";
import {
  loadMealTemplates,
  resolveMealTemplates,
  scaleTemplateToTarget,
  buildMealItemFromTemplate,
  type ResolvedTemplate,
  type TemplateResolverParams,
} from "../_shared/template-resolver.ts";
import {
  generateTemplateVariation,
  type VariationContext,
} from "../_shared/template-variation-engine.ts";
import {
  ensureMealDiversity,
  loadRecentMeals,
  trackProteinUsage,
  type RecentMealItem,
} from "../_shared/meal-diversity-engine.ts";
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
// ──── UNIFIED ENGINE VERSION ────
const ENGINE_VERSION = "8.0.0-unified";
const PROTOCOL_VERSION = "clinical_nutrition_engine_v1";

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
// ──── FAIL-FAST: per-meal zero-candidate check (no arbitrary minimum) ────
// Validation happens per meal type during generation, not as a global pre-check

// ──── 2-Layer Architecture Constants ────
// Maximum deviation allowed between meal sum and total targets (3%)
const MAX_2LAYER_DEVIATION = 0.03;

// MEAL_KCAL_SPLIT imported from _shared/food-rules.ts (canonical source)
const MEAL_KCAL_SPLIT = CANONICAL_MEAL_KCAL_SPLIT;

// ──── UNIFIED: Use shared activity multipliers ────
const ACTIVITY_MULTIPLIERS = SHARED_ACTIVITY_MULTIPLIERS;

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

// ──── Restriction to clinical_tags mapping (structured tag-based filtering) ────
const RESTRICTION_TO_CLINICAL_TAG: Record<string, string> = {
  lactose: "contains_lactose",
  lactose_free: "contains_lactose",
  gluten: "contains_gluten",
  gluten_free: "contains_gluten",
  egg: "contains_egg",
  egg_free: "contains_egg",
  ovo: "contains_egg",
  nuts: "contains_nuts",
  nut_free: "contains_nuts",
  amendoim: "contains_nuts",
  castanha: "contains_nuts",
  soy: "contains_soy",
  soy_free: "contains_soy",
  soja: "contains_soy",
  seafood: "contains_seafood",
  shellfish_free: "contains_seafood",
  camarao: "contains_seafood",
  frutos_do_mar: "contains_seafood",
};

// Legacy mapping kept for backward compat references
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

export interface VisualLibraryItem {
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
  clinical_tags: string[];
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
    .select("id, slug, name, display_name, category, image_url, default_calories, default_protein, default_carbs, default_fat, base_recipe, tags, search_terms, clinical_tags")
    .eq("is_active", true)
    .not("image_url", "is", null);

  if (error || !data) {
    console.error("[generate-meal-plan] Failed to load visual library:", error);
    return [];
  }
  // Only items WITH image; ensure clinical_tags is always an array
  return (data as VisualLibraryItem[])
    .filter(item => item.image_url && item.image_url.length > 5)
    .map(item => ({ ...item, clinical_tags: item.clinical_tags || [] }));
}

/** Filter visual library items by patient restrictions/disliked/intolerances — TAG-BASED CLINICAL SAFETY v2.0 */
function filterVisualLibraryForPatient(
  items: VisualLibraryItem[],
  restrictions: string[],
  disliked: string[],
  allergies: string[],
): VisualLibraryItem[] {
  // ── STEP 1: Build excluded clinical_tags set from restrictions + allergies ──
  const excludedClinicalTags = new Set<string>();
  for (const r of [...restrictions, ...allergies]) {
    const nr = normalize(r);
    // Map restriction strings to clinical_tags
    for (const [key, clinicalTag] of Object.entries(RESTRICTION_TO_CLINICAL_TAG)) {
      if (nr.includes(key)) {
        excludedClinicalTags.add(clinicalTag);
      }
    }
  }

  // Vegetarian/vegan → exclude animal_protein tag
  const isVegetarian = restrictions.some(r => { const nr = normalize(r); return nr.includes("vegetarian") || nr.includes("vegetariano"); });
  const isVegan = restrictions.some(r => { const nr = normalize(r); return nr.includes("vegan") || nr.includes("vegano"); });
  if (isVegetarian || isVegan) {
    excludedClinicalTags.add("animal_protein");
  }
  if (isVegan) {
    excludedClinicalTags.add("contains_lactose");
    excludedClinicalTags.add("contains_egg");
  }

  // ── STEP 2: Build blocked keywords from disliked foods (still string-based for custom dislikes) ──
  const blocked = [...disliked].map(d => normalize(d)).filter(d => d.length >= 3);

  console.log(`[TAG-FILTER-v2] Excluded clinical_tags: [${[...excludedClinicalTags].join(', ')}], Blocked keywords: [${blocked.join(', ')}]`);

  return items.filter(item => {
    const itemTags = item.clinical_tags || [];

    // ── PRIMARY FILTER: Tag-based exclusion (100% reliable) ──
    for (const excludedTag of excludedClinicalTags) {
      if (itemTags.includes(excludedTag)) {
        return false;
      }
    }

    // ── SECONDARY FILTER: Disliked foods keyword match (custom preferences) ──
    if (blocked.length > 0) {
      const normName = normalize(item.display_name);
      const normSlug = normalize(item.slug);
      const searchTermsText = (item.search_terms || []).map(t => normalize(t)).join(" ");
      const fullText = normName + " " + normSlug + " " + searchTermsText;
      for (const b of blocked) {
        if (fullText.includes(b)) return false;
      }
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

// ──── UNIFIED: Normalization helpers delegated to shared engine ────
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

const normalizeWeightKg = sharedNormalizeWeightKg;
const normalizeHeightCm = sharedNormalizeHeightCm;
const normalizeAge = sharedNormalizeAge;
const normalizeActivityLevel = sharedNormalizeActivityLevel;

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

  // Load image URLs from visual library to copy into items
  const visualIds = [...new Set(updates.map(u => u.visual_library_item_id))];
  const { data: visualItems } = await client
    .from("meal_visual_library")
    .select("id, image_url")
    .in("id", visualIds);
  const visualImageMap = new Map<string, string>();
  if (visualItems) {
    for (const vi of visualItems) {
      if (vi.image_url) visualImageMap.set(vi.id, vi.image_url);
    }
  }

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
      .update({ visual_library_item_id: visualId, image_url: visualImageMap.get(visualId) || null })
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
  
  // First pass: account for non-scalable items (fixed marmitas)
  const nonScalableItems = dayItems.filter(i => i._is_scalable === false);
  const fixedProteinByMeal = new Map<string, number>();
  for (const item of nonScalableItems) {
    fixedProteinByMeal.set(item.meal_type, (fixedProteinByMeal.get(item.meal_type) || 0) + (item.protein_target || 0));
  }

  for (const mealType of MEAL_ORDER) {
    const mealGroup = dayItems.filter((item) => item.meal_type === mealType);
    if (mealGroup.length === 0) continue;
    
    // If meal group only contains non-scalable items, use their sum as the target
    if (mealGroup.every(i => i._is_scalable === false)) {
      const target = fixedProteinByMeal.get(mealType) || 0;
      mealTargets.set(mealType, target);
      assigned += target;
      continue;
    }

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
      // Skip scaling for non-scalable items
      if (item._is_scalable === false) {
        scaledSum += current;
        return;
      }
      
      const next = Math.max(0, Math.round(current * (target / currentTotal)));
      item.protein_target = next;
      scaledSum += next;
      if (current > largestValue) {
        largestValue = current;
        largestIndex = index;
      }
    });

    const correction = target - scaledSum;
    const scalableItems = mealGroup.filter(i => i._is_scalable !== false);
    const targetGroup = scalableItems.length > 0 ? scalableItems : mealGroup;
    const finalLargestIndex = scalableItems.length > 0 
      ? mealGroup.indexOf(scalableItems.reduce((a, b) => (Number(b.protein_target) || 0) > (Number(a.protein_target) || 0) ? b : a))
      : largestIndex;
    mealGroup[finalLargestIndex].protein_target = Math.max(0, (Number(mealGroup[finalLargestIndex].protein_target) || 0) + correction);
  }
}

// ──── UNIFIED: TMB/TDEE/Macros delegated to shared clinical-macro-engine ────
const calculateTMB = sharedCalculateTMB;
const calculateTDEE = sharedCalculateTDEE;
const calculateTargetKcal = sharedCalculateTargetKcal;
const calculateMacros = sharedCalculateMacros;
const CLINICAL_PROTEIN_RANGES = SHARED_CLINICAL_PROTEIN_RANGES;
const CLINICAL_FAT_RANGE = SHARED_CLINICAL_FAT_RANGE;

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

const ANIMAL_PROTEIN_KEYWORDS = [
  "frango", "carne", "bife", "alcatra", "patinho", "tilapia", "tilápia",
  "peixe", "porco", "lombo", "sobrecoxa", "sardinha", "atum", "salmao",
  "salmão", "camarao", "camarão", "fraldinha", "maminha", "bisteca", "pernil",
  "suino", "suína", "file de peixe", "filé de peixe",
];

function isAnimalProteinFood(food: DBFood): boolean {
  if (food.category !== "proteina") return false;
  const normName = normalize(food.food_name || food.normalized_name || "");
  return ANIMAL_PROTEIN_KEYWORDS.some((keyword) => normName.includes(normalize(keyword)));
}

function getProteinDensity(food: DBFood): number {
  const portionGrams = Number(food.portion_grams) || 0;
  const proteinPerPortion = Number(food.protein) || 0;
  if (portionGrams <= 0 || proteinPerPortion <= 0) return 0;
  return proteinPerPortion / portionGrams;
}

function roundServingGrams(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value >= 20) return Math.max(5, Math.round(value / 5) * 5);
  return Math.max(1, Math.round(value));
}

function clampComputedProteinServing(grams: number, mealType: string): number {
  // Clinical limits: main meals 80-150g, snacks 20-80g
  if (["lunch", "dinner"].includes(mealType)) {
    return Math.min(150, Math.max(80, roundServingGrams(grams)));
  }
  return Math.min(80, Math.max(20, roundServingGrams(grams)));
}

function resolveProteinFoodForItem(item: any, proteinFoods: DBFood[]): DBFood | null {
  const searchableText = normalize(`${item.title || ""}\n${item.description || ""}`);
  if (!searchableText) return null;

  let best: { food: DBFood; score: number } | null = null;

  for (const food of proteinFoods) {
    const aliases = Array.from(new Set([
      normalize(food.food_name || ""),
      normalize(food.normalized_name || ""),
    ].filter(Boolean)));

    let score = 0;
    for (const alias of aliases) {
      if (!alias) continue;
      if (searchableText.includes(alias)) {
        score = Math.max(score, alias.length + 20);
      }

      const parts = alias
        .split(/\s+/)
        .filter((part) => part.length >= 4 && !["com", "de", "ao", "a", "e", "grelhado", "cozido", "assado", "desfiado"].includes(part));
      const matchedParts = parts.filter((part) => searchableText.includes(part)).length;
      if (matchedParts > 0) {
        score = Math.max(score, matchedParts * 6 + alias.length);
      }
    }

    if (!best || score > best.score) {
      best = { food, score };
    }
  }

  return best && best.score > 0 ? best.food : null;
}

function replaceProteinLineWithServing(description: string, food: DBFood, grams: number): string {
  const [mainSection, substitutionsSection] = description.split(/\n\n🔄 Substituições:\n/);
  const aliases = Array.from(new Set([
    normalize(food.food_name || ""),
    normalize(food.normalized_name || ""),
  ].filter(Boolean)));

  let replaced = false;

  const nextMain = (mainSection || "")
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || replaced) return trimmed;

      const normalizedLine = normalize(trimmed);
      const matchesExactFood = aliases.some((alias) => alias && normalizedLine.includes(alias));
      const matchesProteinLine = ANIMAL_PROTEIN_KEYWORDS.some((keyword) => normalizedLine.includes(normalize(keyword)));

      if (!matchesExactFood && !matchesProteinLine) return trimmed;

      replaced = true;

      if (/(\d+(?:[.,]\d+)?)\s*g\b/i.test(trimmed)) {
        return trimmed.replace(/(\d+(?:[.,]\d+)?)\s*g\b/i, `${grams}g`);
      }

      if (/\s+[—-]\s+/.test(trimmed)) {
        return trimmed.replace(/\s+[—-]\s+.*$/, ` — ${grams}g`);
      }

      return `${trimmed} — ${grams}g`;
    })
    .filter(Boolean)
    .join("\n");

  const finalMain = replaced
    ? nextMain
    : [`• ${food.food_name} — ${grams}g`, nextMain].filter(Boolean).join("\n");

  return finalMain + (substitutionsSection ? `\n\n🔄 Substituições:\n${substitutionsSection}` : "");
}

function injectComputedProteinServings(items: any[], foods: DBFood[]): any[] {
  const proteinFoods = foods.filter(isAnimalProteinFood);
  if (proteinFoods.length === 0) return items;

  return items.map((item) => {
    const requiredProtein = Number(item.protein_target) || 0;
    if (requiredProtein <= 0 || !item.description) return item;

    const matchedFood = resolveProteinFoodForItem(item, proteinFoods);
    if (!matchedFood) return item;

    const density = getProteinDensity(matchedFood);
    if (!Number.isFinite(density) || density <= 0) return item;

    const computedServing = clampComputedProteinServing(requiredProtein / density, item.meal_type || "");
    if (!Number.isFinite(computedServing) || computedServing <= 0) return item;

    return {
      ...item,
      description: replaceProteinLineWithServing(item.description, matchedFood, computedServing),
    };
  });
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

/** Foods that should NEVER appear at lunch or dinner (main meals)
 *  Canned/preserved proteins are unsuitable for a main clinical meal.
 *  They can still appear in snacks if explicitly allowed elsewhere. */
const MAIN_MEAL_EXCLUDED_FOODS = new Set([
  "sardinha enlatada", "sardinha em lata", "sardinha em conserva", "sardinha em oleo", "sardinha em óleo",
  "atum enlatado", "atum em lata", "atum em conserva", "atum em oleo", "atum em óleo",
  "patê de atum", "pate de atum", "patê de sardinha", "pate de sardinha",
  "salsicha", "salsichão", "mortadela", "presunto", "blanquet", "peito de peru defumado",
  "nuggets", "hamburguer industrializado",
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

    // Lunch / Dinner: exclude canned and industrialized proteins (unsuitable for main meal)
    const isMainMeal = mealType === "lunch" || mealType === "dinner";
    if (isMainMeal && MAIN_MEAL_EXCLUDED_FOODS.has(normName)) return false;
    if (isMainMeal && (normName.includes("enlatad") || normName.includes("em lata") || normName.includes("em conserva"))) return false;

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
        const isMainMealFb = mealType === "lunch" || mealType === "dinner";
        if (isMainMealFb && MAIN_MEAL_EXCLUDED_FOODS.has(normName)) return false;
        if (isMainMealFb && (normName.includes("enlatad") || normName.includes("em lata") || normName.includes("em conserva"))) return false;
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

  // Filter out foods with absurdly small portions (< 15g after scaling) and apply MAX clamps
  const MIN_PORTION_GRAMS = 15;
  const MAX_PORTION_GRAMS_BY_CAT: Record<string, number> = {
    proteina: 180, carboidrato: 200, fruta: 250, verdura: 200,
    laticinio: 250, oleaginosa: 40, gordura: 15,
  };
  const validFoods = foods.filter(f => {
    const grams = Math.round((f.portion_grams || 100) * clampedScale);
    return grams >= MIN_PORTION_GRAMS;
  });
  if (validFoods.length === 0) return null;

  const descriptionLines = buildFoodDescriptionFromItems(validFoods, clampedScale)
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

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

// ═══════════════════════════════════════════════════════════════
// TEMPLATE-FIRST PLAN GENERATOR v1.0
// Attempts to fill meal slots from nutritionist_meal_templates.
// Any slots without matching templates fall through to visual library.
// ═══════════════════════════════════════════════════════════════

function generatePlanWithTemplates(
  templates: ResolvedTemplate[],
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
  strategy?: string,
  dbFoods?: any[],
  recentMeals?: RecentMealItem[],
): { items: any[]; templateHits: number; visualFallbacks: number } {
  const defaultMeals = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"];
  const mealTypes = enabledMeals && enabledMeals.length > 0 ? enabledMeals : defaultMeals;

  const items: any[] = [];
  let templateHits = 0;
  let visualFallbacks = 0;
  const usedTemplateIds = new Map<string, Set<string>>(); // per meal_type

  // ── Variation context for food swaps ──
  const variationCtx: VariationContext = {
    restrictions,
    dislikedFoods: disliked,
    allergies,
    seed: planOptionIndex * 31,
  };

  // ── Diversity: recent meals from previous plan ──
  const recentMealItems = recentMeals || [];

  // ── Stable backbone cache: same (template_id + mealType) → same scaled foods every day
  // Prevents 150g/120g/130g jitter for the same protein across the week.
  const stableBackbone = new Map<string, { foods: any[]; scaleFactor: number; picked: any }>();

  for (let day = 0; day < 7; day++) {
    const usedProteinsToday = new Set<string>();

    for (const mealType of mealTypes) {
      const targetKcal = Math.round(kcalTarget * (MEAL_KCAL_SPLIT[mealType] || 0.15));

      // ── STEP 1: Try template resolver ──
      if (!usedTemplateIds.has(mealType)) usedTemplateIds.set(mealType, new Set());
      const usedForType = usedTemplateIds.get(mealType)!;

      const resolverParams: TemplateResolverParams = {
        goal,
        mealType,
        strategy,
        excludeTemplateIds: Array.from(usedForType),
      };

      let matched = resolveMealTemplates(templates, resolverParams);

      // ── STEP 2: Apply diversity scoring ──
      if (matched.length > 1) {
        matched = ensureMealDiversity(matched, recentMealItems, day, mealType, usedProteinsToday);
      }

      if (matched.length > 0) {
        // Pick from top candidates with seeded variety
        const seed = generationSeed(String(planOptionIndex), day * 7 + defaultMeals.indexOf(mealType));
        const pickIdx = seed % Math.min(matched.length, 3); // pick from top 3
        let picked = matched[pickIdx];

        // ── GUARDRAIL 1: Pre-filter disliked foods from template foods_structure ──
        if (disliked.length > 0) {
          const normalizedDisliked = disliked.map(d => normalize(d)).filter(d => d.length >= 3);
          if (normalizedDisliked.length > 0) {
            picked = {
              ...picked,
              foods_structure: picked.foods_structure.filter(f => {
                const normName = normalize(f.name);
                return !normalizedDisliked.some(d => normName.includes(d));
              }),
            };
          }
        }

        // ── STABLE BACKBONE: reuse the SAME variation + scale across the week ──
        // Key by (template_id, mealType) so all 7 days of the same template
        // produce identical grams/macros — eliminates the 150/120/130 jitter.
        const backboneKey = `${picked.id}__${mealType}`;
        let scaledFoods: any[];
        let scaleFactor: number;

        const cached = stableBackbone.get(backboneKey);
        if (cached) {
          picked = cached.picked;
          scaledFoods = cached.foods;
          scaleFactor = cached.scaleFactor;
        } else {
          // ── STEP 3: Apply template variation ONCE per template (not per day) ──
          if (dbFoods && dbFoods.length > 0 && picked.foods_structure.length > 0) {
            const varSeed = seed; // no day-based jitter
            if (varSeed % 5 < 3) {
              picked = generateTemplateVariation(picked, dbFoods, { ...variationCtx, seed: varSeed, mealType });
            }
          }
          // Scale template to target kcal ONCE
          const scaled = scaleTemplateToTarget(picked, targetKcal);
          scaledFoods = scaled.foods;
          scaleFactor = scaled.scaleFactor;
          stableBackbone.set(backboneKey, { foods: scaledFoods, scaleFactor, picked });
        }

        if (scaledFoods.length > 0) {
          const item = buildMealItemFromTemplate(picked, scaledFoods, mealType, day, scaleFactor);

          // Add meal_time if available
          const mealTime = mealTimes?.[mealType] || null;
          if (mealTime) item.meal_time = mealTime;

          items.push(item);
          usedForType.add(picked.id);
          trackProteinUsage(picked, usedProteinsToday);
          // Reset if all used
          if (usedForType.size >= matched.length) usedForType.clear();
          templateHits++;
          continue; // Slot filled by template — skip visual library
        }
      }

      // ── STEP 4: Fallback to visual library (existing logic) ──
      visualFallbacks++;
    }
  }

  // If any slots were NOT filled by templates, generate remaining from visual library
  if (visualFallbacks > 0) {
    const filledSlots = new Set(items.map(i => `${i.day_of_week}_${i.meal_type}`));
    const visualItems = generatePlanFromVisualLibrary(
      visualLibrary, goal, kcalTarget, macros, restrictions, disliked, allergies,
      planOptionIndex, enabledMeals, mealTimes,
    );

    for (const vItem of visualItems) {
      const slotKey = `${vItem.day_of_week}_${vItem.meal_type}`;
      if (!filledSlots.has(slotKey)) {
        items.push(vItem);
        filledSlots.add(slotKey);
      }
    }
  }

  console.log(`[template-resolver] Template hits: ${templateHits}, Visual fallbacks: ${visualFallbacks}, Total items: ${items.length}`);
  return { items, templateHits, visualFallbacks };
}

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

  // ──── PER-MEAL AVAILABILITY CHECK (fail-fast on zero candidates) ────
  // Validation happens inside the generation loop per meal type.
  // If a meal type has 0 candidates after filtering → error thrown.
  // Having 1+ candidates is valid — the engine works with any non-zero count.

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

      // Build description from library item — ALWAYS with gram quantities
      let description = "";
      if (picked.base_recipe && typeof picked.base_recipe === "object") {
        const recipe = picked.base_recipe as any;
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
          description = recipe.ingredients.map((ing: string) => `• ${ing}`).join("\n");
          description = scaleDescriptionQuantities(description, clampedScale) || description;
        }
      }
      
      // Fallback: use default_portion or build portion from macros
      if (!description || description.trim().length === 0) {
        if (picked.default_portion && picked.default_portion.trim().length > 0) {
          // default_portion has text like "150g arroz + 120g frango" or "4 col. arroz + concha feijão + 120g frango"
          const portionText = picked.default_portion.trim();
          // Scale the quantities in the portion text
          const scaledPortion = scaleDescriptionQuantities(portionText, clampedScale) || portionText;
          // Split on " + " to create separate lines
          const portionParts = scaledPortion.split(/\s*\+\s*/);
          description = portionParts.map(part => `• ${part.trim()}`).join("\n");
        } else {
          // Last resort: build from display_name with calculated gram portion
          const scaledCalories = Math.round(baseCal * clampedScale);
          const scaledProtein = Math.round(baseP * clampedScale);
          // Estimate portion in grams from calories (rough: 1g protein ≈ 4kcal, mixed food ≈ 1.2-1.5 kcal/g)
          const estimatedGrams = Math.round(scaledCalories / 1.3);
          const portionGrams = Math.max(50, Math.min(500, Math.round(estimatedGrams / 5) * 5));
          description = `• ${picked.display_name} — ${portionGrams}g`;
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

// ═══════════════════════════════════════════════════════════════
// WEEKLY MARMITA GENERATOR v1.0
// Builds 7-day plan using meal_recipes for lunch/dinner (marmitas)
// and templates/visual library for breakfast & snacks.
// - Scales recipe ingredient grams to hit per-meal kcal target
// - Anti-repetition: no same protein on consecutive days
// - Variety: ensures min 4 different proteins per week
// - Image resolution via meal_visual_library by category match
// ═══════════════════════════════════════════════════════════════

export interface MarmitaRecipe {
  id: string;
  name: string;
  meal_type: string; // 'almoço' | 'jantar'
  foods_json: Array<{ name: string; grams: number }>;
  is_fixed?: boolean;
  is_scalable?: boolean;
  fixed_calories?: number | null;
  fixed_protein?: number | null;
  fixed_carbs?: number | null;
  fixed_fat?: number | null;
}

const PROTEIN_KEYWORDS: Array<{ key: string; matches: string[] }> = [
  { key: "frango", matches: ["frango", "sobrecoxa", "peito de frango", "coxa"] },
  { key: "carne_bovina", matches: ["patinho", "alcatra", "acém", "carne moída", "carne bovina", "almôndega", "hambúrguer de boi", "estrogonofe", "bife"] },
  { key: "peixe", matches: ["peixe", "tilápia", "salmão", "merluza", "pescada", "atum"] },
  { key: "porco", matches: ["porco", "lombo", "pernil"] },
  { key: "ovo", matches: ["ovo", "omelete"] },
  { key: "vegetariano", matches: ["grão de bico", "lentilha", "feijão preto", "soja", "tofu", "proteína vegetal"] },
  { key: "frutos_mar", matches: ["camarão", "lula", "polvo", "fruto do mar"] },
];

function detectRecipeProtein(recipe: MarmitaRecipe): string {
  const text = (recipe.name + " " + (recipe.foods_json || []).map(f => f.name).join(" ")).toLowerCase();
  for (const p of PROTEIN_KEYWORDS) {
    if (p.matches.some(m => text.includes(m))) return p.key;
  }
  return "outros";
}

function recipeViolatesRestrictions(
  recipe: MarmitaRecipe,
  disliked: string[],
  allergies: string[],
): boolean {
  const text = (recipe.name + " " + (recipe.foods_json || []).map(f => f.name).join(" ")).toLowerCase();
  const blocked = [...disliked, ...allergies].map(s => s.toLowerCase().trim()).filter(Boolean);
  return blocked.some(b => b.length > 2 && text.includes(b));
}

/** Hard block: canned / industrialized proteins are never acceptable in a marmita main meal. */
function recipeIsCannedProtein(recipe: MarmitaRecipe): boolean {
  const text = (recipe.name + " " + (recipe.foods_json || []).map(f => f.name).join(" ")).toLowerCase();
  if (text.includes("enlatad") || text.includes("em lata") || text.includes("em conserva")) return true;
  // Catch standalone canned-style names
  if (/\bsardinha\b/.test(text) && !text.includes("fresca") && !text.includes("assada") && !text.includes("grelhada")) return true;
  if (/\bpat[eê] de (atum|sardinha)\b/.test(text)) return true;
  return false;
}

function findVisualForRecipe(recipe: MarmitaRecipe, visualLibrary: VisualLibraryItem[]): VisualLibraryItem | null {
  const targetCategories = recipe.meal_type === "almoço" ? ["almoco"] : ["jantar", "almoco"];
  const candidates = visualLibrary.filter(v => targetCategories.includes(v.category) && v.image_url);
  if (candidates.length === 0) return null;
  // Try fuzzy match on name keywords
  const recipeText = recipe.name.toLowerCase();
  const tokens = recipeText.split(/[\s,/-]+/).filter(t => t.length >= 4);
  let best: VisualLibraryItem | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const cText = (c.display_name || c.name || "").toLowerCase();
    const score = tokens.reduce((s, t) => s + (cText.includes(t) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best || candidates[0];
}

export function estimateRecipeMacros(recipe: MarmitaRecipe): { cal: number; p: number; c: number; f: number } {
  // Priority 1: Use fixed values if provided (at least calories and protein)
  if (recipe.fixed_calories != null && recipe.fixed_protein != null) {
    return {
      cal: recipe.fixed_calories,
      p: recipe.fixed_protein,
      c: recipe.fixed_carbs || 0,
      f: recipe.fixed_fat || 0
    };
  }

  // Priority 2: Rough estimate from total grams: ~1.3 kcal/g, with macros from defaults
  const totalGrams = (recipe.foods_json || []).reduce((s, f) => s + (Number(f.grams) || 0), 0);
  const estimatedCal = Math.round(totalGrams * 1.3);
  const cal = Math.max(estimatedCal, 350); // Minimum floor for a main meal
  const protein = recipe.meal_type === "almoço" ? 35 : 28;
  const carbs = Math.round(cal * 0.45 / 4);
  const fat = Math.round(cal * 0.25 / 9);
  return { cal, p: protein, c: carbs, f: fat };
}

async function loadMealRecipes(client: any, nutritionistId: string, opts?: { onlyFixed?: boolean }): Promise<MarmitaRecipe[]> {
  // Load recipes owned by this nutritionist + global ones (nutritionist_id IS NULL)
  let query = client
    .from("meal_recipes")
    .select("id, name, meal_type, foods_json, nutritionist_id, is_fixed, is_scalable, fixed_calories, fixed_protein, fixed_carbs, fixed_fat")
    .eq("is_active", true)
    .or(`nutritionist_id.eq.${nutritionistId},nutritionist_id.is.null`);
  if (opts?.onlyFixed) {
    query = query.eq("is_fixed", true);
  }
  const { data, error } = await query;
  if (error || !data) {
    console.error("[loadMealRecipes] Error:", error);
    return [];
  }
  return (data as any[]).map(r => ({
    id: r.id,
    name: r.name,
    meal_type: r.meal_type,
    foods_json: Array.isArray(r.foods_json) ? r.foods_json : [],
    is_fixed: !!r.is_fixed,
    is_scalable: r.is_scalable !== false,
    fixed_calories: r.fixed_calories != null ? Number(r.fixed_calories) : null,
    fixed_protein: r.fixed_protein != null ? Number(r.fixed_protein) : null,
    fixed_carbs: r.fixed_carbs != null ? Number(r.fixed_carbs) : null,
    fixed_fat: r.fixed_fat != null ? Number(r.fixed_fat) : null,
  })).filter(r => r.foods_json.length > 0);
}

export function generateWeeklyMarmitaPlan(
  recipes: MarmitaRecipe[],
  templates: ResolvedTemplate[],
  visualLibrary: VisualLibraryItem[],
  goal: string,
  kcalTarget: number,
  macros: { protein: number; carbs: number; fat: number },
  restrictions: string[],
  disliked: string[],
  allergies: string[],
  enabledMeals?: string[],
  mealTimes?: Record<string, string>,
  strategy?: string,
  patientFoodDatabase?: any[],
  recentMeals?: RecentMealItem[],
): { items: any[]; marmitasUsed: string[] } {
  const defaultMeals = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"];
  const mealTypes = enabledMeals && enabledMeals.length > 0 ? enabledMeals : defaultMeals;

  const filteredRecipes = recipes
    .filter(r => !recipeViolatesRestrictions(r, disliked, allergies))
    .filter(r => !recipeIsCannedProtein(r));
  const lunchRecipes = filteredRecipes.filter(r => r.meal_type === "almoço");
  const dinnerRecipes = filteredRecipes.filter(r => r.meal_type === "jantar");

  if (lunchRecipes.length === 0 || dinnerRecipes.length === 0) {
    throw new Error(`[weekly_marmita] Receitas insuficientes (almoço: ${lunchRecipes.length}, jantar: ${dinnerRecipes.length}). Cadastre receitas em meal_recipes.`);
  }

  // Pre-compute proteins for each recipe pool
  const lunchByProtein = new Map<string, MarmitaRecipe[]>();
  const dinnerByProtein = new Map<string, MarmitaRecipe[]>();
  for (const r of lunchRecipes) {
    const p = detectRecipeProtein(r);
    if (!lunchByProtein.has(p)) lunchByProtein.set(p, []);
    lunchByProtein.get(p)!.push(r);
  }
  for (const r of dinnerRecipes) {
    const p = detectRecipeProtein(r);
    if (!dinnerByProtein.has(p)) dinnerByProtein.set(p, []);
    dinnerByProtein.get(p)!.push(r);
  }

  const items: any[] = [];
  const marmitasUsedSet = new Set<string>();
  const proteinsUsedThisWeek = new Set<string>();
  let prevLunchProtein: string | null = null;
  let prevDinnerProtein: string | null = null;

  // For non-marmita meals (breakfast/snacks), reuse template/visual library generator output
  const nonMarmitaMealTypes = mealTypes.filter(m => m !== "lunch" && m !== "dinner");
  let shadowItems: any[] = [];
  if (nonMarmitaMealTypes.length > 0) {
    const hasTpl = templates.length > 0;
    if (hasTpl) {
      const result = generatePlanWithTemplates(
        templates, visualLibrary, goal, kcalTarget, macros,
        restrictions, disliked, allergies, 0, nonMarmitaMealTypes, mealTimes,
        strategy, patientFoodDatabase, recentMeals,
      );
      shadowItems = result.items;
    } else {
      shadowItems = generatePlanFromVisualLibrary(
        visualLibrary, goal, kcalTarget, macros,
        restrictions, disliked, allergies, 0, nonMarmitaMealTypes, mealTimes,
      );
    }
  }

  // Compute kcal targets per slot
  const lunchKcal = Math.round(kcalTarget * (MEAL_KCAL_SPLIT["lunch"] || 0.30));
  const dinnerKcal = Math.round(kcalTarget * (MEAL_KCAL_SPLIT["dinner"] || 0.22));
  // Compute residual macros for marmita slots = daily target − sum(shadow snacks day 0)
  const day0Shadow = shadowItems.filter(i => i.day_of_week === 0);
  const shadowProtein = day0Shadow.reduce((s, i) => s + (i.protein_target || 0), 0);
  const shadowCarbs = day0Shadow.reduce((s, i) => s + (i.carbs_target || 0), 0);
  const shadowFat = day0Shadow.reduce((s, i) => s + (i.fat_target || 0), 0);
  const marmitaProteinPool = Math.max(0, macros.protein - shadowProtein);
  const marmitaCarbsPool = Math.max(0, macros.carbs - shadowCarbs);
  const marmitaFatPool = Math.max(0, macros.fat - shadowFat);
  const lunchShare = lunchKcal / Math.max(1, lunchKcal + dinnerKcal);
  const lunchProteinTarget = Math.round(marmitaProteinPool * lunchShare);
  const dinnerProteinTarget = Math.max(0, marmitaProteinPool - lunchProteinTarget);
  const lunchCarbsTarget = Math.round(marmitaCarbsPool * lunchShare);
  const dinnerCarbsTarget = Math.max(0, marmitaCarbsPool - lunchCarbsTarget);
  const lunchFatTarget = Math.round(marmitaFatPool * lunchShare);
  const dinnerFatTarget = Math.max(0, marmitaFatPool - lunchFatTarget);

  for (let day = 0; day < 7; day++) {
    for (const it of shadowItems.filter(i => i.day_of_week === day)) {
      items.push(it);
    }

    // Lunch — avoid yesterday's lunch AND yesterday's dinner protein
    if (mealTypes.includes("lunch")) {
      const avoidSet = new Set<string>();
      if (prevLunchProtein) avoidSet.add(prevLunchProtein);
      if (prevDinnerProtein) avoidSet.add(prevDinnerProtein);
      const picked = pickMarmita(lunchByProtein, lunchRecipes, avoidSet, day);
      const protein = detectRecipeProtein(picked);
      proteinsUsedThisWeek.add(protein);
      marmitasUsedSet.add(picked.name);
      items.push(buildMarmitaItem(picked, "lunch", day, lunchKcal, goal, visualLibrary, mealTimes,
        { protein: lunchProteinTarget, carbs: lunchCarbsTarget, fat: lunchFatTarget }));
      prevLunchProtein = protein;
    }

    // Dinner — different protein than today's lunch AND yesterday's dinner
    if (mealTypes.includes("dinner")) {
      const avoidSet = new Set<string>();
      if (prevLunchProtein) avoidSet.add(prevLunchProtein);
      if (prevDinnerProtein) avoidSet.add(prevDinnerProtein);
      // Use a varying seed so we cycle through proteins instead of repeating the modulo result
      const picked = pickMarmita(dinnerByProtein, dinnerRecipes, avoidSet, day * 7 + 13);
      const protein = detectRecipeProtein(picked);
      proteinsUsedThisWeek.add(protein);
      marmitasUsedSet.add(picked.name);
      items.push(buildMarmitaItem(picked, "dinner", day, dinnerKcal, goal, visualLibrary, mealTimes,
        { protein: dinnerProteinTarget, carbs: dinnerCarbsTarget, fat: dinnerFatTarget }));
      prevDinnerProtein = protein;
    }
  }

  if (proteinsUsedThisWeek.size < 4) {
    console.warn(`[weekly_marmita] Only ${proteinsUsedThisWeek.size} distinct proteins used this week — recipe pool may be too narrow.`);
  }

  console.log(`[weekly_marmita] ✅ Generated ${items.length} items | Marmitas used: ${marmitasUsedSet.size} | Proteins/week: ${proteinsUsedThisWeek.size}`);
  return { items, marmitasUsed: Array.from(marmitasUsedSet) };
}

function pickMarmita(
  byProtein: Map<string, MarmitaRecipe[]>,
  allRecipes: MarmitaRecipe[],
  avoidProteins: Set<string> | string | null,
  seed: number,
): MarmitaRecipe {
  const avoidSet = avoidProteins instanceof Set
    ? avoidProteins
    : (avoidProteins ? new Set([avoidProteins]) : new Set<string>());
  const proteins = Array.from(byProtein.keys());
  const candidateProteins = proteins.filter(p => !avoidSet.has(p));
  const useProteins = candidateProteins.length > 0 ? candidateProteins : proteins;
  const proteinIdx = seed % useProteins.length;
  const chosenProtein = useProteins[proteinIdx];
  const pool = byProtein.get(chosenProtein) || allRecipes;
  return pool[seed % pool.length];
}

export function buildMarmitaItem(
  recipe: MarmitaRecipe,
  mealType: string,
  day: number,
  targetKcal: number,
  goal: string,
  visualLibrary: VisualLibraryItem[],
  mealTimes?: Record<string, string>,
  macroTarget?: { protein: number; carbs: number; fat: number },
): any {
  const baseMacros = estimateRecipeMacros(recipe);
  const scaleFactor = baseMacros.cal > 0 ? targetKcal / baseMacros.cal : 1;
  // If recipe is not scalable, force scale to 1.0 (preserve grammages)
  const clampedScale = recipe.is_scalable === false ? 1 : Math.max(0.5, Math.min(2.5, scaleFactor));

  // Seasonings/condiments are exempt from the 20g minimum portion rule
  const SEASONING_KEYWORDS = ["orégano", "oregano", "sal", "pimenta", "noz-moscada", "açafrão", "acafrao", "cominho", "alho em pó", "ervas finas", "páprica", "paprica", "limão", "limao", "vinagre", "molho de pimenta", "tempero"];
  function isSeasoning(name: string): boolean {
    const n = name.toLowerCase();
    return SEASONING_KEYWORDS.some(k => n.includes(k));
  }

  // Scale ingredient grams proportionally — preserve composition
  // Non-seasoning ingredients have a 20g floor; seasonings keep their small amount
  const scaledFoods = (recipe.foods_json || []).map(f => {
    const scaled = Math.round((Number(f.grams) || 0) * clampedScale);
    const minGrams = isSeasoning(f.name) ? 1 : 20;
    return { name: f.name, grams: Math.max(minGrams, scaled) };
  });

  const baseDesc = scaledFoods.map(f => `• ${f.grams}g ${f.name}`).join("\n");
  const finalDescription = finalizeMealDescription(baseDesc, mealType, goal) + "\n\n⏱️ Prática: Aqueça por 3-5 min no micro-ondas.";

  const visual = findVisualForRecipe(recipe, visualLibrary);

  // If macroTarget provided, prefer it (the engine already split daily macros across slots),
  // UNLESS the recipe is non-scalable (in which case we must use the actual recipe macros).
  const useMacroTarget = recipe.is_scalable !== false;
  const proteinFinal = (useMacroTarget && macroTarget?.protein != null) ? macroTarget.protein : Math.round(baseMacros.p * clampedScale);
  const carbsFinal = (useMacroTarget && macroTarget?.carbs != null) ? macroTarget.carbs : Math.round(baseMacros.c * clampedScale);
  const fatFinal = (useMacroTarget && macroTarget?.fat != null) ? macroTarget.fat : Math.round(baseMacros.f * clampedScale);

  return {
    title: `🍱 ${recipe.name}`,
    description: finalDescription,
    meal_type: mealType,
    day_of_week: day,
    calories_target: Math.round(baseMacros.cal * clampedScale) || 350,
    protein_target: proteinFinal,
    carbs_target: carbsFinal,
    fat_target: fatFinal,
    visual_library_item_id: visual?.id || null,
    meal_time: mealTimes?.[mealType] || null,
    _source: "meal_recipe",
    _recipe_id: recipe.id,
    _recipe_name: recipe.name,
    _is_scalable: recipe.is_scalable !== false,
    _scale_factor: clampedScale,
    _image_url: visual?.image_url || null,
  };
}


// ═══════════════════════════════════════════════════════════════
// FIXED MARMITA MODE — frozen products, immutable macros
// Marmitas are NEVER scaled. Only breakfast/snacks/ceia adjust.
// ═══════════════════════════════════════════════════════════════
function buildFixedMarmitaItem(
  recipe: MarmitaRecipe,
  mealType: string,
  day: number,
  goal: string,
  visualLibrary: VisualLibraryItem[],
  mealTimes?: Record<string, string>,
): any {
  // ⚠️ NO SCALING. Use fixed_* macros if present, else estimate ONCE and freeze.
  let cal: number, p: number, c: number, f: number;
  if (recipe.fixed_calories != null && recipe.fixed_protein != null) {
    cal = Math.round(recipe.fixed_calories);
    p = Math.round(recipe.fixed_protein);
    c = Math.round(recipe.fixed_carbs ?? 0);
    f = Math.round(recipe.fixed_fat ?? 0);
  } else {
    const est = estimateRecipeMacros(recipe);
    cal = est.cal; p = est.p; c = est.c; f = est.f;
  }

  // Description uses ORIGINAL grams — no scaling allowed
  const description = (recipe.foods_json || []).map(food => `• ${food.grams}g ${food.name}`).join("\n");
  const finalDescription = finalizeMealDescription(description, mealType, goal);
  const visual = findVisualForRecipe(recipe, visualLibrary);

  return {
    title: `🍱 ${recipe.name} (Marmita Fixa)`,
    description: finalDescription,
    meal_type: mealType,
    day_of_week: day,
    calories_target: cal,
    protein_target: p,
    carbs_target: c,
    fat_target: f,
    visual_library_item_id: visual?.id || null,
    meal_time: mealTimes?.[mealType] || null,
    _source: "meal_recipe",
    _recipe_id: recipe.id,
    _recipe_name: recipe.name,
    _is_fixed: true,
    _is_scalable: false,
    _scale_factor: 1, // forced — no scaling
    _image_url: visual?.image_url || null,
  };
}

function generateFixedMarmitaPlan(
  fixedRecipes: MarmitaRecipe[],
  templates: ResolvedTemplate[],
  visualLibrary: VisualLibraryItem[],
  goal: string,
  kcalTarget: number,
  macros: { protein: number; carbs: number; fat: number },
  restrictions: string[],
  disliked: string[],
  allergies: string[],
  enabledMeals?: string[],
  mealTimes?: Record<string, string>,
  strategy?: string,
  patientFoodDatabase?: any[],
  recentMeals?: RecentMealItem[],
): { items: any[]; marmitasUsed: string[]; warning?: string } {
  const defaultMeals = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"];
  const mealTypes = enabledMeals && enabledMeals.length > 0 ? enabledMeals : defaultMeals;

  const filteredRecipes = fixedRecipes
    .filter(r => !recipeViolatesRestrictions(r, disliked, allergies))
    .filter(r => !recipeIsCannedProtein(r));
  const lunchRecipes = filteredRecipes.filter(r => r.meal_type === "almoço");
  const dinnerRecipes = filteredRecipes.filter(r => r.meal_type === "jantar");

  if (lunchRecipes.length === 0 || dinnerRecipes.length === 0) {
    throw new Error(`[fixed_marmita] Marmitas fixas insuficientes (almoço: ${lunchRecipes.length}, jantar: ${dinnerRecipes.length}). Cadastre marmitas com is_fixed=true.`);
  }

  // Pre-compute proteins (for variety)
  const lunchByProtein = new Map<string, MarmitaRecipe[]>();
  const dinnerByProtein = new Map<string, MarmitaRecipe[]>();
  for (const r of lunchRecipes) {
    const p = detectRecipeProtein(r);
    if (!lunchByProtein.has(p)) lunchByProtein.set(p, []);
    lunchByProtein.get(p)!.push(r);
  }
  for (const r of dinnerRecipes) {
    const p = detectRecipeProtein(r);
    if (!dinnerByProtein.has(p)) dinnerByProtein.set(p, []);
    dinnerByProtein.get(p)!.push(r);
  }

  // Pick representative marmitas to compute "fixed kcal cost" per day (use day 0 picks as reference)
  // Marmitas are FIXED — we pick once per day, get their macros, and the REMAINDER goes to snacks.
  const items: any[] = [];
  const marmitasUsedSet = new Set<string>();
  const proteinsUsedThisWeek = new Set<string>();
  let prevLunchProtein: string | null = null;
  let prevDinnerProtein: string | null = null;
  let warning: string | undefined;

  for (let day = 0; day < 7; day++) {
    let dayMarmitaCal = 0;
    let dayMarmitaP = 0;
    let dayMarmitaC = 0;
    let dayMarmitaF = 0;

    // Lunch (FIXED)
    if (mealTypes.includes("lunch")) {
      const avoid = new Set<string>();
      if (prevLunchProtein) avoid.add(prevLunchProtein);
      if (prevDinnerProtein) avoid.add(prevDinnerProtein);
      const picked = pickMarmita(lunchByProtein, lunchRecipes, avoid, day);
      const proteinKey = detectRecipeProtein(picked);
      proteinsUsedThisWeek.add(proteinKey);
      marmitasUsedSet.add(picked.name);
      const item = buildFixedMarmitaItem(picked, "lunch", day, goal, visualLibrary, mealTimes);
      items.push(item);
      dayMarmitaCal += item.calories_target;
      dayMarmitaP += item.protein_target;
      dayMarmitaC += item.carbs_target;
      dayMarmitaF += item.fat_target;
      prevLunchProtein = proteinKey;
    }

    // Dinner (FIXED)
    if (mealTypes.includes("dinner")) {
      const avoid = new Set<string>();
      if (prevLunchProtein) avoid.add(prevLunchProtein);
      if (prevDinnerProtein) avoid.add(prevDinnerProtein);
      const picked = pickMarmita(dinnerByProtein, dinnerRecipes, avoid, day * 7 + 13);
      const proteinKey = detectRecipeProtein(picked);
      proteinsUsedThisWeek.add(proteinKey);
      marmitasUsedSet.add(picked.name);
      const item = buildFixedMarmitaItem(picked, "dinner", day, goal, visualLibrary, mealTimes);
      items.push(item);
      dayMarmitaCal += item.calories_target;
      dayMarmitaP += item.protein_target;
      dayMarmitaC += item.carbs_target;
      dayMarmitaF += item.fat_target;
      prevDinnerProtein = proteinKey;
    }

    // Compute REMAINDER for snacks/breakfast/ceia
    const remainderKcal = kcalTarget - dayMarmitaCal;
    const remainderP = Math.max(0, macros.protein - dayMarmitaP);
    const remainderC = Math.max(0, macros.carbs - dayMarmitaC);
    const remainderF = Math.max(0, macros.fat - dayMarmitaF);

    if (remainderKcal <= 0) {
      warning = `As marmitas fixas selecionadas (${dayMarmitaCal} kcal) excedem a meta calórica diária do paciente (${kcalTarget} kcal). Considere meta maior ou marmitas menores.`;
      console.warn(`[fixed_marmita] day ${day}: ${warning}`);
      // Still emit snacks with minimum allocation so plan is not empty
    }

    // Generate adjustable meals (breakfast/snacks/ceia) for this day to absorb the remainder
    const nonMarmitaMealTypes = mealTypes.filter(m => m !== "lunch" && m !== "dinner");
    if (nonMarmitaMealTypes.length > 0 && remainderKcal > 0) {
      const remainderMacros = { protein: remainderP, carbs: remainderC, fat: remainderF };
      // Build using template/visual library — single-day generation by passing day-restricted offset
      const dayItems = generateAdjustableMealsForDay(
        templates, visualLibrary, goal, remainderKcal, remainderMacros,
        restrictions, disliked, allergies, nonMarmitaMealTypes, mealTimes,
        strategy, patientFoodDatabase, recentMeals, day,
      );
      for (const it of dayItems) items.push(it);
    }
  }

  if (proteinsUsedThisWeek.size < 4) {
    console.warn(`[fixed_marmita] Only ${proteinsUsedThisWeek.size} distinct proteins used this week.`);
  }

  console.log(`[fixed_marmita] ✅ Generated ${items.length} items | Fixed marmitas used: ${marmitasUsedSet.size} | Proteins/week: ${proteinsUsedThisWeek.size}`);
  return { items, marmitasUsed: Array.from(marmitasUsedSet), warning };
}

// Helper: generate adjustable (non-marmita) meals for a SINGLE day
function generateAdjustableMealsForDay(
  templates: ResolvedTemplate[],
  visualLibrary: VisualLibraryItem[],
  goal: string,
  remainderKcal: number,
  remainderMacros: { protein: number; carbs: number; fat: number },
  restrictions: string[],
  disliked: string[],
  allergies: string[],
  mealTypes: string[],
  mealTimes: Record<string, string> | undefined,
  strategy: string | undefined,
  patientFoodDatabase: any[] | undefined,
  recentMeals: RecentMealItem[] | undefined,
  targetDay: number,
): any[] {
  const hasTpl = templates.length > 0;
  let result: any[];
  if (hasTpl) {
    const r = generatePlanWithTemplates(
      templates, visualLibrary, goal, remainderKcal, remainderMacros,
      restrictions, disliked, allergies, targetDay, mealTypes, mealTimes,
      strategy, patientFoodDatabase, recentMeals,
    );
    result = r.items;
  } else {
    result = generatePlanFromVisualLibrary(
      visualLibrary, goal, remainderKcal, remainderMacros,
      restrictions, disliked, allergies, targetDay, mealTypes, mealTimes,
    );
  }
  // Filter only this day and remap day_of_week if needed
  return result
    .filter(i => i.day_of_week === 0 || i.day_of_week === targetDay)
    .map(i => ({ ...i, day_of_week: targetDay }));
}


function validatePlanBeforeSave(
  items: any[],
  dailyKcal: number,
  dailyMacros: { protein: number; carbs: number; fat: number },
  weight: number,
  goal: string,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Rule 1: Every item must have visual_library_item_id, _template_id OR _recipe_id (marmita)
  const missingSource = items.filter(i => !i.visual_library_item_id && !i._template_id && !i._recipe_id);
  if (missingSource.length > 0) {
    errors.push(`${missingSource.length} items missing visual_library_item_id, _template_id and _recipe_id`);
  }

  // Rule 2: Visual library items must have image (template items don't need it)
  const visualItems = items.filter(i => i._source === "visual_library");
  const missingImage = visualItems.filter(i => !i._image_url || i._image_url.length < 5);
  if (missingImage.length > 0) {
    errors.push(`${missingImage.length} visual_library items missing image_url`);
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

  // Rule 5: Every item must have a valid _source
  const VALID_SOURCES = new Set(["visual_library", "template_resolver", "meal_recipe"]);
  const wrongSource = items.filter(i => !VALID_SOURCES.has(i._source));
  if (wrongSource.length > 0) {
    errors.push(`${wrongSource.length} items have invalid source`);
  }

  // Rule 6 (IFJ Blueprint Layer 8): No item can have empty title
  const emptyTitles = items.filter(i => !i.title || i.title.trim().length === 0);
  if (emptyTitles.length > 0) {
    errors.push(`${emptyTitles.length} items have empty/null title`);
  }

  // Rule 7 (IFJ Blueprint Layer 8): No "• — Xg" pattern in descriptions
  const brokenDescriptions = items.filter(i => {
    if (!i.description) return false;
    return /•\s*[—-]\s*\d+g/i.test(i.description);
  });
  if (brokenDescriptions.length > 0) {
    errors.push(`${brokenDescriptions.length} items have broken description pattern (empty food name)`);
  }

  // Rule 8 (IFJ Blueprint Layer 5): No absurd single-item portions (> 500g protein)
  const absurdPortions = items.filter(i => {
    if (!i.description) return false;
    const matches = [...i.description.matchAll(/•\s*(.+?)\s*[—-]\s*(\d+)g/g)];
    return matches.some(m => {
      const grams = parseInt(m[2]);
      return grams > 500;
    });
  });
  if (absurdPortions.length > 0) {
    errors.push(`${absurdPortions.length} items have portions exceeding 500g`);
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
      // Respect non-scalable items (Marmita Mode / Patient Mode)
      const isScalable = item._is_scalable !== false;
      const fC = isScalable ? calFactor : 1;
      const fP = isScalable ? pFactor : 1;
      const fCarb = isScalable ? cFactor : 1;
      const fFat = isScalable ? fFactor : 1;

      scaledItems.push({
        ...item,
        calories_target: Math.round((item.calories_target || 0) * fC),
        protein_target: Math.round((item.protein_target || 0) * fP),
        carbs_target: Math.round((item.carbs_target || 0) * fCarb),
        fat_target: Math.round((item.fat_target || 0) * fFat),
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
        // If all items have 0 for this macro, distribute proportionally by meal share
        if (c.actual === 0 && c.target > 0) {
          for (const item of dayItems) {
            const share = mealShares[item.meal_type] || (1 / dayItems.length);
            item[c.macro] = Math.round(c.target * share);
          }
        } else {
          const factor = c.target / (c.actual || 1);
          for (const item of dayItems) {
            if (item._is_scalable !== false) {
              item[c.macro] = Math.round((item[c.macro] || 0) * factor);
            }
          }
        }
        const newSum = dayItems.reduce((s: number, i: any) => s + (i[c.macro] || 0), 0);
        const diff = c.target - newSum;
        if (diff !== 0 && dayItems.length > 0) {
          // Only apply correction to scalable items if possible
          const scalableItems = dayItems.filter(i => i._is_scalable !== false);
          const targetPool = scalableItems.length > 0 ? scalableItems : dayItems;
          const largest = targetPool.reduce((a: any, b: any) => ((b[c.macro] || 0) > (a[c.macro] || 0) ? b : a));
          largest[c.macro] += diff;
        }
      }
    }
  }
  return items;
}

// ═══════════════════════════════════════════════════════════════
// GUARDRAIL ENGINE — Post-generation sanitization (MANDATORY)
// Runs AFTER item generation, BEFORE macro reconciliation
// ═══════════════════════════════════════════════════════════════

/**
 * GUARDRAIL 1: Remove disliked foods from item descriptions.
 * Scans each item's description for disliked food keywords and removes matching lines.
 * If ALL lines are removed, the item gets a generic fallback description.
 */
function sanitizeDislikedFoodsFromItems(items: any[], dislikedFoods: string[]): any[] {
  if (!dislikedFoods || dislikedFoods.length === 0) return items;
  const normalizedDisliked = dislikedFoods.map(d => normalize(d)).filter(d => d.length >= 3);
  if (normalizedDisliked.length === 0) return items;

  let totalRemoved = 0;

  const sanitized = items.map(item => {
    if (!item.description) return item;

    const [mainSection, subSection] = item.description.split(/\n\n🔄 Substituições:\n/);
    const lines = (mainSection || "").split("\n");
    
    const cleanLines = lines.filter((line: string) => {
      const normLine = normalize(line);
      const isDisliked = normalizedDisliked.some(d => normLine.includes(d));
      if (isDisliked) totalRemoved++;
      return !isDisliked;
    });

    // Also clean substitution section
    let cleanSubs = "";
    if (subSection) {
      const subLines = subSection.split("\n").filter((line: string) => {
        const normLine = normalize(line);
        return !normalizedDisliked.some(d => normLine.includes(d));
      });
      if (subLines.length > 0) cleanSubs = `\n\n🔄 Substituições:\n${subLines.join("\n")}`;
    }

    const newDesc = cleanLines.length > 0
      ? cleanLines.join("\n") + cleanSubs
      : `• ${item.title || "Refeição"}`;

    return { ...item, description: newDesc };
  });

  if (totalRemoved > 0) {
    console.log(`[GUARDRAIL-1] Removed ${totalRemoved} disliked food lines from plan items`);
  }
  return sanitized;
}

/**
 * GUARDRAIL 2: Enforce minimum AND maximum portion sizes per food category.
 * Scans description lines and fixes absurd portions (too small or too large).
 */
function clampMinimumPortionsInDescriptions(items: any[]): any[] {
  const PORTION_LIMITS: Record<string, { min: number; max: number }> = {
    frango: { min: 60, max: 180 }, carne: { min: 60, max: 180 }, bife: { min: 60, max: 180 },
    tilapia: { min: 60, max: 180 }, peixe: { min: 60, max: 180 }, porco: { min: 60, max: 180 },
    sardinha: { min: 60, max: 180 }, alcatra: { min: 60, max: 180 }, sobrecoxa: { min: 60, max: 180 },
    lombo: { min: 60, max: 180 }, patinho: { min: 60, max: 180 },
    ovo: { min: 50, max: 150 }, omelete: { min: 50, max: 150 },
    arroz: { min: 30, max: 200 }, macarrao: { min: 30, max: 200 }, batata: { min: 30, max: 200 },
    macaxeira: { min: 30, max: 200 }, inhame: { min: 30, max: 200 },
    pao: { min: 40, max: 100 }, tapioca: { min: 40, max: 100 }, cuscuz: { min: 40, max: 100 },
    banana: { min: 80, max: 250 }, maca: { min: 80, max: 250 }, mamao: { min: 80, max: 250 },
    laranja: { min: 80, max: 250 }, morango: { min: 80, max: 250 }, goiaba: { min: 80, max: 250 },
    alface: { min: 50, max: 200 }, tomate: { min: 50, max: 200 }, brocolis: { min: 50, max: 200 },
    cenoura: { min: 50, max: 200 }, couve: { min: 50, max: 200 },
    iogurte: { min: 100, max: 250 }, leite: { min: 100, max: 250 }, queijo: { min: 30, max: 100 },
    azeite: { min: 5, max: 15 }, oleo: { min: 5, max: 15 },
    castanha: { min: 10, max: 40 }, amendoim: { min: 10, max: 40 }, amendoa: { min: 10, max: 40 },
  };

  return items.map(item => {
    if (!item.description) return item;

    const newDesc = item.description.replace(
      /•\s*(.+?)\s*[—-]\s*(\d+)g/g,
      (_match: string, foodName: string, gramsStr: string) => {
        const grams = parseInt(gramsStr);
        const normFood = normalize(foodName);
        
        let minGrams = 20;
        let maxGrams = 500;
        for (const [keyword, limits] of Object.entries(PORTION_LIMITS)) {
          if (normFood.includes(keyword)) {
            minGrams = Math.max(minGrams, limits.min);
            maxGrams = Math.min(maxGrams, limits.max);
            break;
          }
        }

        const clamped = Math.max(minGrams, Math.min(maxGrams, grams));
        if (clamped !== grams) {
          return `• ${foodName} — ${clamped}g`;
        }
        return `• ${foodName} — ${gramsStr}g`;
      }
    );

    return { ...item, description: newDesc };
  });
}

/**
 * GUARDRAIL 3: Remove items with empty/null/undefined titles or descriptions.
 * Items with "• — Xg" pattern (no food name) are discarded.
 */
function removeEmptyNameItems(items: any[]): any[] {
  const before = items.length;
  let linesRemoved = 0;

  const processed = items.map(item => {
    if (!item.description) return item;

    const allLines = item.description.split("\n");
    const cleanedLines = allLines.filter((l: string) => {
      const trimmed = l.trim();
      // Remove lines with empty food name: "• — 52g" or "•  — 52g"
      if (/^•\s*[—-]\s*\d+g?\s*$/.test(trimmed)) { linesRemoved++; return false; }
      // Remove empty bullet lines
      if (/^•\s*$/.test(trimmed)) { linesRemoved++; return false; }
      return true;
    });

    return { ...item, description: cleanedLines.join("\n") };
  });

  // Now discard items with no title or no remaining food lines
  const filtered = processed.filter(item => {
    if (!item.title || item.title.trim().length === 0) return false;
    if (item.description) {
      const foodLines = item.description.split("\n").filter((l: string) => l.trim().startsWith("•"));
      if (foodLines.length === 0) return false;
    }
    return true;
  });

  if (before !== filtered.length || linesRemoved > 0) {
    console.log(`[GUARDRAIL-3] Removed ${linesRemoved} empty-name lines, discarded ${before - filtered.length} fully empty items`);
  }
  return filtered;
}

/**
 * GUARDRAIL 4: Validate meal composition structure.
 * Each main meal (lunch/dinner) MUST have protein+carb+vegetable lines.
 * Breakfast MUST have protein+carb. Snacks MUST have at least 1 food line.
 * Logs warnings but does not discard items (structural issues should be caught earlier).
 */
function validateMealComposition(items: any[]): any[] {
  const COMPOSITION_RULES: Record<string, string[]> = {
    lunch: ["proteina", "carboidrato"],
    dinner: ["proteina", "carboidrato"],
    breakfast: ["proteina"],
  };
  const CATEGORY_DETECT: Record<string, string[]> = {
    proteina: ["frango", "carne", "bife", "tilapia", "peixe", "porco", "sardinha", "ovo", "omelete", "queijo"],
    carboidrato: ["arroz", "macarrao", "batata", "pao", "tapioca", "cuscuz", "macaxeira", "inhame"],
    verdura: ["alface", "tomate", "brocolis", "cenoura", "couve", "repolho", "salada", "rucula"],
  };

  let warnings = 0;
  for (const item of items) {
    const rules = COMPOSITION_RULES[item.meal_type];
    if (!rules) continue;
    
    const desc = normalize(item.description || "");
    for (const requiredCat of rules) {
      const keywords = CATEGORY_DETECT[requiredCat] || [];
      const hasCat = keywords.some(kw => desc.includes(kw));
      if (!hasCat) {
        warnings++;
      }
    }
  }
  if (warnings > 0) {
    console.warn(`[GUARDRAIL-4] ${warnings} meal composition warnings detected (missing expected food categories)`);
  }
  return items;
}

/**
 * Master guardrail function — runs all guardrails in sequence.
 * Order: 1. Disliked foods → 2. Portion clamps → 3. Empty names → 4. Composition check
 */
function applyPostGenerationGuardrails(items: any[], dislikedFoods: string[]): any[] {
  let result = sanitizeDislikedFoodsFromItems(items, dislikedFoods);
  result = clampMinimumPortionsInDescriptions(result);
  result = removeEmptyNameItems(result);
  result = validateMealComposition(result);
  return result;
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

export async function generateMealPlanHandler(req: Request) {
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
    let generationMode: "quick" | "smart" | "clinical" | "weekly_marmita" | "fixed_marmita" = body.generationMode || "quick";
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

    // Load patient profile to check identity and modes (Marmita Mode)
    const { data: patientProfile } = await serviceClient
      .from("profiles")
      .select("id, user_id, marmita_mode")
      .or(`id.eq.${patient_id},user_id.eq.${patient_id}`)
      .maybeSingle();

    // IF patient is in Marmita Mode, force generation to use marmita logic unless an explicit non-default mode was requested
    if (patientProfile?.marmita_mode && (generationMode === "quick" || generationMode === "smart")) {
      console.log(`[generate-meal-plan] 🍱 Overriding generationMode to weekly_marmita for patient ${patient_id} (Marmita Mode active)`);
      generationMode = "weekly_marmita";
    }

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

    // ── PROFESSIONAL OVERRIDE ──
    // When a nutritionist (or admin) is the caller, they can provide
    // body.professionalOverride = { weight, height, age, sex, goal, activityLevel, restrictions, enabledMeals }
    // to bypass missing/incomplete anamnesis. This unblocks clinical work
    // when the patient has not (yet) completed onboarding.
    const callerIsProfessional =
      caller.roles.includes("admin") ||
      caller.roles.includes("nutritionist") ||
      (userId !== patient_id && userId === requestedNutritionistId);
    const profOverride = (body.professionalOverride && typeof body.professionalOverride === "object")
      ? body.professionalOverride
      : null;
    const allowProfOverride = callerIsProfessional && !!profOverride;

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

    // If nutritionist provided override, synthesize a minimal anamnesis stub.
    if (!anamnesis && allowProfOverride) {
      console.log(`[generate-meal-plan] ⚙️ Professional override engaged for patient ${patient_id} by ${userId}`);
      anamnesis = {
        id: null,
        user_id: patient_id,
        status: "professional_override",
        answers: {
          weight: profOverride.weight,
          height: profOverride.height,
          age: profOverride.age ?? 30,
          sex: profOverride.sex || "male",
          goal: profOverride.goal,
          objective: profOverride.goal,
          activity_level: profOverride.activityLevel || "moderate",
          restrictions: profOverride.restrictions || [],
          enabled_meals: profOverride.enabledMeals || null,
        },
      } as any;
    }

    if (!anamnesis) {
      return new Response(JSON.stringify({
        error: "Anamnese concluída não encontrada. O nutricionista pode preencher os dados manualmente para gerar o plano.",
        code: "ANAMNESIS_MISSING",
        professional_override_supported: true,
      }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const answers = (anamnesis.answers || {}) as Record<string, any>;

    // ── 2. Validate weight + height ──
    // Professional override takes precedence so the nutritionist can ALWAYS proceed.
    const weight = normalizeWeightKg(
      profOverride?.weight ?? body.weight ?? latestPipeline?.weight ?? answers.weight
    );
    const height = normalizeHeightCm(
      profOverride?.height ?? body.height ?? latestPipeline?.height ?? answers.height
    );
    if (!weight || weight < 20 || !height || height < 80) {
      console.warn(`[generate-meal-plan] Invalid body data for patient ${patient_id}`, {
        rawBodyWeight: body.weight ?? null, rawBodyHeight: body.height ?? null,
        pipelineWeight: latestPipeline?.weight ?? null, pipelineHeight: latestPipeline?.height ?? null,
        anamnesisWeight: answers.weight ?? null, anamnesisHeight: answers.height ?? null,
        overrideWeight: profOverride?.weight ?? null, overrideHeight: profOverride?.height ?? null,
        normalizedWeight: weight, normalizedHeight: height,
      });
      return new Response(JSON.stringify({
        error: "Peso e altura válidos são obrigatórios. Informe-os manualmente para gerar o plano.",
        code: "BODY_DATA_MISSING",
        professional_override_supported: true,
      }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. Goal ──
    const rawGoal = profOverride?.goal || body.goal || answers.goal || answers.objective || answers.main_goal;
    const goal = normalizeGoal(rawGoal);
    if (!goal) {
      return new Response(JSON.stringify({
        error: "Objetivo do paciente não definido. Selecione um objetivo manualmente.",
        code: "GOAL_MISSING",
        professional_override_supported: true,
      }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof rawGoal === "string" && rawGoal !== goal) {
      console.log(`[generate-meal-plan] Goal normalized from "${rawGoal}" to "${goal}"`);
    }

    // ── 4. Calculate TMB / TDEE / macros ──
    const age = normalizeAge(profOverride?.age ?? answers.age, 30);
    const sex = String(profOverride?.sex || answers.sex || answers.gender || "male").toLowerCase() === "female" ? "female" : "male";
    const activityLevel = normalizeActivityLevel(profOverride?.activityLevel || answers.activity_level || body.activityLevel || latestPipeline?.food_preferences?.activity_level);

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
    const disliked = (typeof rawDisliked === "string" ? rawDisliked : "")
      .toLowerCase()
      .split(/[,;]+|\s+e\s+/)
      .map((s: string) => s.trim())
      .filter(Boolean);
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

    // ═══════════════════════════════════════════════════════════
    // UNIFIED ENGINE: STRATEGY DETECTION & APPLICATION
    // ═══════════════════════════════════════════════════════════
    
    // Detect strategy based on request params, protocols, and flags
    const bbPhase = body.bb_phase || body.bbPhase || null;
    
    // Load active protocols/programs for strategy detection
    const [{ data: activeProtocolsForStrategy }, { data: activeProgramsForStrategy }] = await Promise.all([
      serviceClient.from("patient_protocols").select("nutrition_protocols(name)")
        .eq("patient_id", patient_id).eq("status", "active"),
      serviceClient.from("program_enrollments").select("programs(slug)")
        .eq("patient_id", patient_id).eq("status", "active"),
    ]);
    
    const activeProtocolNames = (activeProtocolsForStrategy || [])
      .map((p: any) => p?.nutrition_protocols?.name).filter(Boolean) as string[];
    const programSlugs = (activeProgramsForStrategy || [])
      .map((p: any) => p?.programs?.slug).filter(Boolean) as string[];

    const resolvedStrategy = detectStrategy({
      requestedStrategy: body.strategy || body.requestedStrategy,
      generationMode,
      bbPhase,
      activeProtocolNames,
      clinicalFlags: [],  // will be populated below if clinical mode
      programSlugs,
    });

    const strategy = getStrategy(resolvedStrategy.strategyId);
    const strategyParams = { goal, weight, sex, activityLevel, bbPhase, clinicalFlags: [] as string[] };
    
    console.log(`[UNIFIED-ENGINE] Strategy: ${resolvedStrategy.strategyId} (${resolvedStrategy.reason}) | Version: ${strategy.version}`);

    // Apply strategy-specific calorie adjustment if applicable
    if (resolvedStrategy.strategyId === "bikini_protocol" && bbPhase) {
      const bbAdjustment = strategy.getCalorieAdjustment(strategyParams);
      if (typeof bbAdjustment === "number") {
        finalKcal = Math.max(1000, Math.min(3500, tdee + bbAdjustment));
        console.log(`[UNIFIED-ENGINE] BB calorie adjustment applied: TDEE=${tdee} + adjustment=${bbAdjustment} → ${finalKcal}kcal`);
      }
      // Apply BB-specific protein
      const bbProteinPerKg = strategy.getProteinPerKg(strategyParams);
      if (bbProteinPerKg) {
        finalMacros.protein = Math.round(weight * bbProteinPerKg);
        console.log(`[UNIFIED-ENGINE] BB protein override: ${bbProteinPerKg}g/kg → ${finalMacros.protein}g`);
      }
      // Apply BB macro distribution
      const bbDist = strategy.getMacroDistribution(strategyParams);
      if (bbDist) {
        const proteinKcal = finalMacros.protein * 4;
        const remaining = finalKcal - proteinKcal;
        finalMacros.carbs = Math.round((remaining * (bbDist.carbPct / (bbDist.carbPct + bbDist.fatPct))) / 4);
        finalMacros.fat = Math.round((remaining * (bbDist.fatPct / (bbDist.carbPct + bbDist.fatPct))) / 9);
      }
      dataSource = "bb_phase_calculated";
    }

    // Apply strategy extra restrictions
    const strategyRestrictions = strategy.getExtraRestrictions(strategyParams);
    restrictions.push(...strategyRestrictions);

    console.log(`[generate-meal-plan] Patient ${patient_id} | Mode: ${generationMode} | Strategy: ${resolvedStrategy.strategyId} | Goal: ${goal} | Kcal: ${finalKcal} | Restrictions: ${restrictions.join(",")} | Disliked: ${disliked.join(",")} | Allergies: ${allergies.join(",")} | EnabledMeals: ${enabledMeals?.join(",") || "default"} | MealTimes: ${mealTimes ? JSON.stringify(mealTimes) : "none"}`);

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
    } else if (generationMode === "clinical" || resolvedStrategy.strategyId === "clinical_standard") {
      const [{ data: clinicalFlags }, { data: activeProtocol }] = await Promise.all([
        serviceClient.from("patient_clinical_flags").select("flag_key, severity")
          .eq("patient_id", patient_id).eq("is_active", true),
        serviceClient.from("patient_protocols").select("protocol_id, nutrition_protocols(name, macro_rules)")
          .eq("patient_id", patient_id).eq("status", "active").limit(1).maybeSingle(),
      ]);
      
      const flagKeys = (clinicalFlags || []).map((f: any) => f.flag_key);
      const severityFlags = (clinicalFlags || []).filter((f: any) => f.severity === "high" || f.severity === "critical");
      const protocolMacroRules = (activeProtocol as any)?.nutrition_protocols?.macro_rules;
      
      // Update strategy params with clinical flags
      strategyParams.clinicalFlags = flagKeys;
      
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
    // LOAD VISUAL LIBRARY + MEAL TEMPLATES (TEMPLATE-FIRST PIPELINE)
    // Templates from nutritionist_meal_templates are the primary source.
    // Visual library serves as fallback for unfilled meal slots.
    // ═══════════════════════════════════════════════════════════
    
    const [visualLibrary, mealTemplates] = await Promise.all([
      loadVisualLibrary(serviceClient),
      loadMealTemplates(serviceClient, requestedNutritionistId),
    ]);
    const foodDatabase = await loadFoodDatabase(serviceClient);
    const patientFoodDatabase = filterFoodsForPatient(foodDatabase, restrictions, disliked, allergies);
    const useDBDriven = visualLibrary.length >= 5;
    const hasTemplates = mealTemplates.length > 0;

    // ── Load recent meals for diversity engine ──
    const recentMeals = patient_id ? await loadRecentMeals(serviceClient, patient_id) : [];
    console.log(`[generate-meal-plan] Visual library: ${visualLibrary.length} items | Templates: ${mealTemplates.length} | DB-exclusive: ${useDBDriven} | Recent meals for diversity: ${recentMeals.length}`);

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
        // CAMADA 2: Template-first → Visual Library fallback → reconciled with Layer 1 macros
        const { items: rawItems, templateHits, visualFallbacks } = hasTemplates
          ? generatePlanWithTemplates(mealTemplates, visualLibrary, goal, finalKcal, finalMacros, restrictions, disliked, allergies, tplIdx, enabledMeals, mealTimes, resolvedStrategy.strategyId, patientFoodDatabase, recentMeals)
          : { items: generatePlanFromVisualLibrary(visualLibrary, goal, finalKcal, finalMacros, restrictions, disliked, allergies, tplIdx, enabledMeals, mealTimes), templateHits: 0, visualFallbacks: 42 };
        console.log(`[Multi-plan ${tplIdx}] Templates: ${templateHits}, Visual fallbacks: ${visualFallbacks}`);
        // ── GUARDRAILS (MANDATORY) ──
        const guardedItems = applyPostGenerationGuardrails(rawItems, disliked);
        const reconciledItems = enforceCrossDayConsistency(reconcileDailyMacros(guardedItems, finalKcal, finalMacros, goal), finalMacros, finalKcal);
        let planItems = syncPlanDescriptionsWithProteinTargets(guardedItems, reconciledItems, goal);
        planItems = injectComputedProteinServings(planItems, patientFoodDatabase);

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

        const itemsToInsert = planItems.map((item: any) => { const { _image_url, _source, _category_used, _scale_factor, _template_id, _recipe_id, _recipe_name, meal_time, ...rest } = item; return { ...rest, meal_plan_id: newPlan.id, image_url: _image_url || rest.image_url || null }; });
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
    
    // ── TEMPLATE-FIRST PIPELINE: Templates → Visual Library fallback ──
    let rawPlanItems: any[];
    let templateHitsCount = 0;
    let visualFallbacksCount = 0;
    let marmitasUsedList: string[] = [];

    if (generationMode === "weekly_marmita") {
      // ── WEEKLY MARMITA MODE (escalável) ──
      const mealRecipes = await loadMealRecipes(serviceClient, requestedNutritionistId);
      console.log(`[generate-meal-plan] weekly_marmita: ${mealRecipes.length} recipes loaded`);
      const result = generateWeeklyMarmitaPlan(
        mealRecipes, mealTemplates, visualLibrary, goal, finalKcal, finalMacros,
        restrictions, disliked, allergies, enabledMeals, mealTimes,
        resolvedStrategy.strategyId, patientFoodDatabase, recentMeals,
      );
      rawPlanItems = result.items;
      marmitasUsedList = result.marmitasUsed;
      templateHitsCount = rawPlanItems.filter((i: any) => i._source === "meal_recipe").length;
      visualFallbacksCount = rawPlanItems.length - templateHitsCount;
    } else if (generationMode === "fixed_marmita") {
      // ── FIXED MARMITA MODE (congelada — NUNCA escala) ──
      const fixedRecipes = await loadMealRecipes(serviceClient, requestedNutritionistId, { onlyFixed: true });
      console.log(`[generate-meal-plan] fixed_marmita: ${fixedRecipes.length} fixed recipes loaded`);
      const result = generateFixedMarmitaPlan(
        fixedRecipes, mealTemplates, visualLibrary, goal, finalKcal, finalMacros,
        restrictions, disliked, allergies, enabledMeals, mealTimes,
        resolvedStrategy.strategyId, patientFoodDatabase, recentMeals,
      );
      rawPlanItems = result.items;
      marmitasUsedList = result.marmitasUsed;
      if (result.warning) console.warn(`[fixed_marmita] ${result.warning}`);
      templateHitsCount = rawPlanItems.filter((i: any) => i._source === "meal_recipe").length;
      visualFallbacksCount = rawPlanItems.length - templateHitsCount;
    } else if (hasTemplates) {
      const result = generatePlanWithTemplates(mealTemplates, visualLibrary, goal, finalKcal, finalMacros, restrictions, disliked, allergies, planOptionIndex, enabledMeals, mealTimes, resolvedStrategy.strategyId, patientFoodDatabase, recentMeals);
      rawPlanItems = result.items;
      templateHitsCount = result.templateHits;
      visualFallbacksCount = result.visualFallbacks;
    } else {
      rawPlanItems = generatePlanFromVisualLibrary(visualLibrary, goal, finalKcal, finalMacros, restrictions, disliked, allergies, planOptionIndex, enabledMeals, mealTimes);
      visualFallbacksCount = rawPlanItems.length;
    }
    console.log(`[generate-meal-plan] Plan generated: ${rawPlanItems.length} items (templates: ${templateHitsCount}, visual: ${visualFallbacksCount})`);
    
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

    // ── GUARDRAILS (MANDATORY) ──
    const guardedPlanItems = applyPostGenerationGuardrails(rawPlanItems, disliked);

    // ── CAMADA 2: Reconcile template items with Layer 1 macros ──
    const reconciledPlanItems = enforceCrossDayConsistency(reconcileDailyMacros(guardedPlanItems, weekdayKcal, finalMacros, goal), finalMacros, weekdayKcal);
    let planItems = syncPlanDescriptionsWithProteinTargets(guardedPlanItems, reconciledPlanItems, goal);
    planItems = injectComputedProteinServings(planItems, patientFoodDatabase);

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
      architecture: "2-layer-template-first-v8",
      layer1_source: "clinical_macro_engine",
      layer2_role: hasTemplates ? "template_resolver_with_visual_fallback" : "visual_library_structure_only",
      two_layer_validated: true,
      meal_source: hasTemplates ? "template_first" : "visual_library_exclusive",
      template_hits: templateHitsCount,
      visual_fallbacks: visualFallbacksCount,
      marmitas_used: marmitasUsedList,
      final_validation_passed: true,
      enabled_meals: enabledMeals || "default",
      meal_times: mealTimes || null,
    };

    let finalMealPlanId = meal_plan_id;

    const MODE_TITLES: Record<string, string> = {
      quick: "Plano Rápido",
      smart: "Plano Inteligente",
      clinical: "Plano Clínico",
      weekly_marmita: "Cardápio Semanal de Marmitas",
      fixed_marmita: "Cardápio com Marmitas Fixas (Congeladas)",
    };
    const MODE_SOURCES: Record<string, string> = {
      quick: "smart_quick_v4",
      smart: "smart_intelligent_v4",
      clinical: "smart_clinical_v4",
      weekly_marmita: "weekly_marmita_v1",
      fixed_marmita: "fixed_marmita_v1",
    };
    const planTitle = MODE_TITLES[generationMode] || "Plano Alimentar";
    const genSource = MODE_SOURCES[generationMode] || "protocol_fitjourney_v4";

    if (!meal_plan_id) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      // ── Clean up old draft_auto_generated plans for this patient ──
      try {
        const { data: staleDrafts } = await serviceClient
          .from("meal_plans")
          .select("id")
          .eq("patient_id", patient_id)
          .eq("plan_status", "draft_auto_generated")
          .eq("is_active", false);

        if (staleDrafts && staleDrafts.length > 0) {
          const staleDraftIds = staleDrafts.map((d: any) => d.id);
          await serviceClient.from("meal_plan_items").delete().in("meal_plan_id", staleDraftIds);
          await serviceClient.from("meal_plans").delete().in("id", staleDraftIds);
          console.log(`[ENGINE] Cleaned ${staleDraftIds.length} stale draft_auto_generated plans`);
        }
      } catch (cleanupErr) {
        console.warn("[ENGINE] Draft cleanup non-blocking error:", cleanupErr);
      }

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
      const { _image_url, _source, _category_used, _scale_factor, _template_id, _recipe_id, _recipe_name, meal_time, ...rest } = item;
      return { ...rest, meal_plan_id: finalMealPlanId, image_url: _image_url || rest.image_url || null };
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
}

if (import.meta.main) {
  serve(generateMealPlanHandler);
}
