import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser } from "../_shared/auth-guard.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ──── Constants ────
const ENGINE_VERSION = "4.0.0";
const PROTOCOL_VERSION = "fitjourney_personalizado_v4";

const MEAL_KCAL_SPLIT: Record<string, number> = {
  breakfast: 0.20,
  morning_snack: 0.10,
  lunch: 0.30,
  afternoon_snack: 0.10,
  dinner: 0.22,
  evening_snack: 0.08,
};

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

// ──── Meal type to DB tag mapping ────
const MEAL_TYPE_TO_DB_TAG: Record<string, string[]> = {
  breakfast: ["cafe_da_manha"],
  morning_snack: ["lanche_manha", "lanche_tarde"],
  lunch: ["almoco"],
  afternoon_snack: ["lanche_tarde", "lanche_manha"],
  dinner: ["jantar", "almoco"],
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

const BLOCKED_FOODS = [
  "salmão", "salmon", "atum fresco", "kefir", "cottage", "ricota importada",
  "quinoa", "quinua", "amaranto", "castanha-do-pará", "castanha do pará",
  "macadâmia", "pistache", "framboesa", "mirtilo", "blueberry", "cranberry",
  "tofu", "tempeh", "edamame", "granola premium", "mix de nuts", "trail mix",
  "azeite trufado", "vinagre balsâmico", "manteiga de amêndoa",
  "wrap integral", "pão artesanal", "leite de amêndoa", "leite de coco",
  "leite de aveia", "abacate toast", "overnight oats", "cream cheese",
  "philadelphia", "iogurte grego importado", "coalhada", "kombucha",
  "hemp seed", "tahini", "hummus", "burrata", "brie", "camembert", "gorgonzola",
  "whey protein", "caseína",
];

// ═══════════════════════════════════════════════════════════════
// FALLBACK PRESETS (used when DB query fails or returns too few)
// ═══════════════════════════════════════════════════════════════

interface RealisticMeal {
  title: string;
  description: string;
  foods: string[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

const BREAKFAST_EMAG: RealisticMeal[] = [
  { title: "Café da Manhã", description: "• 1 fatia pão integral\n• 1 ovo mexido\n• Café sem açúcar", foods: ["pão integral", "ovo", "café"], kcal: 230, protein: 12, carbs: 22, fat: 10 },
  { title: "Café da Manhã", description: "• 1 tapioca média\n• 1 ovo\n• 1 fatia queijo minas", foods: ["tapioca", "ovo", "queijo minas"], kcal: 280, protein: 15, carbs: 30, fat: 11 },
  { title: "Café da Manhã", description: "• 1 fatia cuscuz\n• 1 ovo cozido\n• Café sem açúcar", foods: ["cuscuz", "ovo", "café"], kcal: 240, protein: 11, carbs: 32, fat: 8 },
  { title: "Café da Manhã", description: "• 1 pão francês\n• 1 fatia queijo muçarela\n• Café sem açúcar", foods: ["pão", "queijo", "café"], kcal: 250, protein: 10, carbs: 28, fat: 10 },
  { title: "Café da Manhã", description: "• 3 col. sopa aveia\n• 1 banana picada\n• 1 ovo cozido\n• Café sem açúcar", foods: ["aveia", "banana", "ovo", "café"], kcal: 290, protein: 12, carbs: 40, fat: 8 },
  { title: "Café da Manhã", description: "• 1 fatia pão integral\n• 1 col. requeijão light\n• 1 fatia queijo minas", foods: ["pão integral", "requeijão", "queijo"], kcal: 230, protein: 11, carbs: 24, fat: 9 },
  { title: "Café da Manhã", description: "• 1 tapioca média\n• 1 ovo cozido\n• 1 col. requeijão\n• Café sem açúcar", foods: ["tapioca", "ovo", "requeijão", "café"], kcal: 280, protein: 11, carbs: 32, fat: 10 },
];

const BREAKFAST_MASSA: RealisticMeal[] = [
  { title: "Café da Manhã Reforçado", description: "• 2 fatias pão integral\n• 2 ovos mexidos\n• 1 fatia queijo minas\n• Café com leite", foods: ["pão", "ovos", "queijo", "leite"], kcal: 420, protein: 24, carbs: 35, fat: 18 },
  { title: "Café da Manhã Reforçado", description: "• Omelete 3 ovos com queijo\n• 1 pão francês\n• Café com leite", foods: ["ovos", "queijo", "pão", "leite"], kcal: 450, protein: 26, carbs: 28, fat: 22 },
  { title: "Café da Manhã Reforçado", description: "• 1 tapioca grande\n• 2 ovos\n• Queijo coalho\n• Café com leite", foods: ["tapioca", "ovos", "queijo coalho", "leite"], kcal: 430, protein: 22, carbs: 38, fat: 16 },
  { title: "Café da Manhã Reforçado", description: "• 2 fatias cuscuz\n• 2 ovos\n• Requeijão\n• Café com leite", foods: ["cuscuz", "ovos", "requeijão", "leite"], kcal: 440, protein: 20, carbs: 45, fat: 15 },
  { title: "Café da Manhã Reforçado", description: "• 4 col. sopa aveia\n• 1 banana\n• 1 col. pasta de amendoim\n• Leite", foods: ["aveia", "banana", "amendoim", "leite"], kcal: 430, protein: 16, carbs: 52, fat: 14 },
];

const SNACKS: RealisticMeal[] = [
  { title: "Lanche", description: "• 1 banana média", foods: ["banana"], kcal: 90, protein: 1, carbs: 22, fat: 0 },
  { title: "Lanche", description: "• 1 maçã média", foods: ["maçã"], kcal: 80, protein: 0, carbs: 20, fat: 0 },
  { title: "Lanche", description: "• 1 fatia mamão", foods: ["mamão"], kcal: 70, protein: 1, carbs: 17, fat: 0 },
  { title: "Lanche", description: "• 1 laranja média", foods: ["laranja"], kcal: 60, protein: 1, carbs: 14, fat: 0 },
  { title: "Lanche", description: "• 1 goiaba média", foods: ["goiaba"], kcal: 65, protein: 1, carbs: 14, fat: 1 },
  { title: "Lanche", description: "• 1 pote iogurte natural", foods: ["iogurte"], kcal: 100, protein: 6, carbs: 8, fat: 4 },
  { title: "Lanche", description: "• 1 banana\n• 1 col. sopa aveia", foods: ["banana", "aveia"], kcal: 130, protein: 3, carbs: 28, fat: 2 },
  { title: "Lanche", description: "• 1 tangerina\n• 5 castanhas de caju", foods: ["tangerina", "castanha"], kcal: 120, protein: 3, carbs: 16, fat: 5 },
];

const SNACKS_MASSA: RealisticMeal[] = [
  { title: "Lanche Reforçado", description: "• 1 pão integral\n• 1 ovo cozido\n• 1 banana", foods: ["pão", "ovo", "banana"], kcal: 280, protein: 12, carbs: 38, fat: 8 },
  { title: "Lanche Reforçado", description: "• 1 tapioca\n• 1 fatia queijo\n• Suco natural", foods: ["tapioca", "queijo", "suco"], kcal: 260, protein: 8, carbs: 36, fat: 8 },
  { title: "Lanche Reforçado", description: "• 1 banana\n• 1 col. pasta de amendoim\n• 1 copo leite", foods: ["banana", "amendoim", "leite"], kcal: 300, protein: 12, carbs: 34, fat: 12 },
  { title: "Lanche Reforçado", description: "• 2 fatias pão integral\n• Requeijão\n• 1 fruta", foods: ["pão", "requeijão", "fruta"], kcal: 280, protein: 8, carbs: 40, fat: 8 },
];

const MAIN_EMAG: RealisticMeal[] = [
  { title: "Almoço", description: "• 150g peito de frango grelhado\n• 3 col. sopa arroz\n• Salada verde", foods: ["frango", "arroz", "salada"], kcal: 380, protein: 38, carbs: 35, fat: 8 },
  { title: "Almoço", description: "• 120g carne moída refogada\n• 2 col. sopa purê de batata\n• Salada", foods: ["carne moída", "purê", "salada"], kcal: 370, protein: 28, carbs: 30, fat: 12 },
  { title: "Almoço", description: "• 150g tilápia grelhada\n• 100g macaxeira cozida\n• Legumes refogados", foods: ["tilápia", "macaxeira", "legumes"], kcal: 350, protein: 35, carbs: 32, fat: 6 },
  { title: "Almoço", description: "• 120g bife de alcatra\n• 3 col. sopa arroz\n• 2 col. sopa feijão", foods: ["bife", "arroz", "feijão"], kcal: 420, protein: 32, carbs: 40, fat: 12 },
  { title: "Almoço", description: "• 120g frango desfiado\n• 100g macarrão\n• Molho de tomate", foods: ["frango", "macarrão", "molho"], kcal: 400, protein: 30, carbs: 42, fat: 10 },
  { title: "Almoço", description: "• 120g carne de panela\n• 100g batata cozida\n• Cenoura refogada", foods: ["carne", "batata", "cenoura"], kcal: 380, protein: 30, carbs: 28, fat: 14 },
  { title: "Almoço", description: "• 120g sobrecoxa assada\n• 3 col. sopa arroz\n• 2 col. sopa feijão\n• Salada", foods: ["sobrecoxa", "arroz", "feijão", "salada"], kcal: 430, protein: 28, carbs: 38, fat: 16 },
  { title: "Almoço", description: "• 150g filé de porco grelhado\n• 100g batata doce\n• Brócolis", foods: ["porco", "batata doce", "brócolis"], kcal: 370, protein: 34, carbs: 30, fat: 10 },
];

const MAIN_MASSA: RealisticMeal[] = [
  { title: "Almoço Reforçado", description: "• 200g peito de frango\n• 5 col. sopa arroz\n• 3 col. sopa feijão\n• Salada", foods: ["frango", "arroz", "feijão", "salada"], kcal: 580, protein: 48, carbs: 55, fat: 12 },
  { title: "Almoço Reforçado", description: "• 180g alcatra grelhada\n• 150g batata doce\n• Brócolis refogado", foods: ["alcatra", "batata doce", "brócolis"], kcal: 550, protein: 42, carbs: 45, fat: 16 },
  { title: "Almoço Reforçado", description: "• 150g carne moída\n• 120g macarrão\n• Molho de tomate\n• Salada", foods: ["carne moída", "macarrão", "molho", "salada"], kcal: 560, protein: 38, carbs: 52, fat: 16 },
  { title: "Almoço Reforçado", description: "• 200g tilápia\n• 5 col. sopa arroz\n• Legumes refogados", foods: ["tilápia", "arroz", "legumes"], kcal: 520, protein: 44, carbs: 50, fat: 10 },
  { title: "Almoço Reforçado", description: "• 200g frango grelhado\n• 150g macaxeira cozida\n• 2 col. sopa feijão\n• Salada", foods: ["frango", "macaxeira", "feijão", "salada"], kcal: 570, protein: 46, carbs: 48, fat: 14 },
  { title: "Almoço Reforçado", description: "• 180g sobrecoxa assada\n• 5 col. sopa arroz\n• 3 col. sopa feijão\n• Salada", foods: ["sobrecoxa", "arroz", "feijão", "salada"], kcal: 600, protein: 38, carbs: 56, fat: 20 },
];

const CEIA: RealisticMeal[] = [
  { title: "Ceia", description: "• 1 pote iogurte natural", foods: ["iogurte"], kcal: 100, protein: 6, carbs: 8, fat: 4 },
  { title: "Ceia", description: "• 1 copo leite morno", foods: ["leite"], kcal: 120, protein: 6, carbs: 10, fat: 6 },
  { title: "Ceia", description: "• 1 banana com canela", foods: ["banana"], kcal: 95, protein: 1, carbs: 23, fat: 0 },
  { title: "Ceia", description: "• Chá + 2 torradas integrais", foods: ["chá", "torrada"], kcal: 80, protein: 2, carbs: 16, fat: 1 },
];

const CEIA_MASSA: RealisticMeal[] = [
  { title: "Ceia", description: "• 1 pote iogurte natural\n• 1 col. granola", foods: ["iogurte", "granola"], kcal: 160, protein: 8, carbs: 18, fat: 5 },
  { title: "Ceia", description: "• 1 ovo cozido\n• 1 fatia pão integral", foods: ["ovo", "pão"], kcal: 170, protein: 10, carbs: 16, fat: 7 },
  { title: "Ceia", description: "• 1 copo leite\n• 1 col. aveia\n• 1 banana", foods: ["leite", "aveia", "banana"], kcal: 230, protein: 8, carbs: 36, fat: 6 },
];

const SUBSTITUTION_GROUPS: Record<string, string[]> = {
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

  if (!VISUAL_GENERIC_TITLES.has(normTitle)) {
    if (aliasMap.has(normTitle)) return aliasMap.get(normTitle)!;
    const titleMatch = findBestVisualAlias(normTitle, aliasMap);
    if (titleMatch) return titleMatch;
  }

  const lines = description.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes('Substituiç') || trimmed.includes('🔄')) break;
    if (!trimmed.startsWith('•') && !trimmed.startsWith('-')) continue;
    const normLine = normalize(trimmed);
    const phraseMatch = findBestVisualAlias(normLine, aliasMap);
    if (phraseMatch) return phraseMatch;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes('Substituiç') || trimmed.includes('🔄')) break;
    if (!trimmed.startsWith('•') && !trimmed.startsWith('-')) continue;
    const words = normalize(trimmed).split(/\s+/);
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
    case "lunch":
    case "dinner": return loss ? MAIN_EMAG : MAIN_MASSA;
    case "evening_snack": return loss ? CEIA : CEIA_MASSA;
    default: return SNACKS;
  }
}

const BEVERAGE_KEYWORDS = ["cafe", "chá", "cha", "leite", "suco", "vitamina"];
const MAIN_PROTEIN_KEYWORDS = [
  "frango", "carne", "bife", "alcatra", "patinho", "tilapia", "tilápia", "peixe", "porco", "lombo", "sobrecoxa", "sardinha",
];

function roundScaledQuantity(value: number, unit: string): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const normalizedUnit = normalize(unit);

  if (normalizedUnit === "g" || normalizedUnit === "ml") {
    return value >= 20 ? Math.max(5, Math.round(value / 5) * 5) : Math.max(1, Math.round(value));
  }

  return value >= 10 ? Math.max(1, Math.round(value)) : Math.max(0.5, Math.round(value * 2) / 2);
}

function scaleDescriptionQuantities(description: string | null | undefined, factor: number): string | null | undefined {
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

function isMainMealType(mealType: string): boolean {
  return mealType === "lunch" || mealType === "dinner";
}

function hasBeverage(description: string): boolean {
  const normalized = normalize(description);
  return BEVERAGE_KEYWORDS.some(keyword => normalized.includes(normalize(keyword)));
}

function getDefaultBeverageLine(mealType: string): string | null {
  if (mealType === "breakfast") return "• Café com leite";
  if (mealType === "afternoon_snack") return "• Chá sem açúcar";
  return null;
}

function standardMainProteinPortion(mealType: string, goal: string): number {
  const loss = isLossGoal(goal);
  if (mealType === "lunch") return loss ? 150 : 180;
  if (mealType === "dinner") return loss ? 140 : 170;
  return loss ? 150 : 180;
}

function isProteinLine(line: string): boolean {
  const normalized = normalize(line);
  return MAIN_PROTEIN_KEYWORDS.some(keyword => normalized.includes(normalize(keyword)));
}

function normalizeMainMealProteinLine(line: string, mealType: string, goal: string): string {
  if (!isMainMealType(mealType) || !isProteinLine(line)) return line;
  const targetGrams = standardMainProteinPortion(mealType, goal);
  if (!/(\d+(?:[.,]\d+)?)\s*g\b/i.test(line)) return line;
  return line.replace(/(\d+(?:[.,]\d+)?)\s*g\b/i, `${targetGrams}g`);
}

function finalizeMealDescription(description: string, mealType: string, goal: string): string {
  const sections = description.split(/\n\n🔄 Substituições:\n/);
  const mainLines = sections[0]
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let normalizedProteinApplied = false;
  const normalizedLines = mainLines.map((line) => {
    if (!normalizedProteinApplied && isMainMealType(mealType) && isProteinLine(line)) {
      normalizedProteinApplied = true;
      return normalizeMainMealProteinLine(line, mealType, goal);
    }
    return line;
  });

  const beverageLine = getDefaultBeverageLine(mealType);
  if (beverageLine && !hasBeverage(normalizedLines.join("\n"))) {
    normalizedLines.push(beverageLine);
  }

  return normalizedLines.join("\n") + (sections[1] ? `\n\n🔄 Substituições:\n${sections[1]}` : "");
}

function rebalanceProteinTargetsByMeal(dayItems: any[], dailyProteinTarget: number, goal: string) {
  if (!Number.isFinite(dailyProteinTarget) || dailyProteinTarget <= 0 || dayItems.length === 0) return;

  const loss = isLossGoal(goal);
  const proteinShares: Record<string, number> = loss
    ? { breakfast: 0.15, morning_snack: 0.08, lunch: 0.27, afternoon_snack: 0.08, dinner: 0.27, evening_snack: 0.15 }
    : { breakfast: 0.16, morning_snack: 0.10, lunch: 0.26, afternoon_snack: 0.10, dinner: 0.24, evening_snack: 0.14 };
  const proteinCaps: Record<string, number> = loss
    ? { breakfast: 30, morning_snack: 18, lunch: 55, afternoon_snack: 18, dinner: 55, evening_snack: 30 }
    : { breakfast: 45, morning_snack: 24, lunch: 65, afternoon_snack: 24, dinner: 60, evening_snack: 35 };
  const mealOrder = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"];
  const residualPriority = ["lunch", "dinner", "evening_snack", "breakfast", "morning_snack", "afternoon_snack"];

  const mealTargets = new Map<string, number>();
  let assigned = 0;

  for (const mealType of mealOrder) {
    const mealGroup = dayItems.filter((item) => item.meal_type === mealType);
    if (mealGroup.length === 0) continue;
    const baseTarget = Math.round(dailyProteinTarget * (proteinShares[mealType] || 0));
    const target = Math.min(proteinCaps[mealType] ?? baseTarget, baseTarget);
    mealTargets.set(mealType, target);
    assigned += target;
  }

  let residual = Math.round(dailyProteinTarget - assigned);
  for (const mealType of residualPriority) {
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

  if (residual !== 0 && mealTargets.size > 0) {
    const fallbackMeal = residualPriority.find((mealType) => mealTargets.has(mealType)) || mealOrder.find((mealType) => mealTargets.has(mealType));
    if (fallbackMeal) {
      mealTargets.set(fallbackMeal, (mealTargets.get(fallbackMeal) || 0) + residual);
    }
  }

  for (const [mealType, target] of mealTargets.entries()) {
    const mealGroup = dayItems.filter((item) => item.meal_type === mealType);
    if (mealGroup.length === 0) continue;
    const currentTotal = mealGroup.reduce((sum, item) => sum + (Number(item.protein_target) || 0), 0);

    if (currentTotal <= 0) {
      const base = Math.floor(target / mealGroup.length);
      let remaining = target;
      mealGroup.forEach((item, index) => {
        const next = index === mealGroup.length - 1 ? remaining : base;
        item.protein_target = next;
        remaining -= next;
      });
      continue;
    }

    let scaledSum = 0;
    let largestIndex = 0;
    let largestValue = 0;

    mealGroup.forEach((item, index) => {
      const current = Number(item.protein_target) || 0;
      const next = Math.round(current * (target / currentTotal));
      item.protein_target = next;
      scaledSum += next;
      if (current > largestValue) {
        largestValue = current;
        largestIndex = index;
      }
    });

    const correction = target - scaledSum;
    mealGroup[largestIndex].protein_target = (Number(mealGroup[largestIndex].protein_target) || 0) + correction;
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

function calculateMacros(kcal: number, goal: string, weight: number) {
  let proteinPerKg: number, carbsPct: number, fatPct: number;
  switch (goal) {
    case "lose_weight":
      proteinPerKg = 2.0; carbsPct = 0.35; fatPct = 0.30; break;
    case "gain_muscle":
    case "gain_weight":
      proteinPerKg = 2.2; carbsPct = 0.45; fatPct = 0.25; break;
    case "athletic_performance":
      proteinPerKg = 2.0; carbsPct = 0.50; fatPct = 0.25; break;
    default:
      proteinPerKg = 1.6; carbsPct = 0.45; fatPct = 0.30;
  }
  const protein = Math.round(weight * proteinPerKg);
  const proteinKcal = protein * 4;
  const remaining = kcal - proteinKcal;
  const carbs = Math.round((remaining * (carbsPct / (carbsPct + fatPct))) / 4);
  const fat = Math.round((remaining * (fatPct / (carbsPct + fatPct))) / 9);
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

/** Select foods for a specific meal type using DB tags, with patient-seeded variety */
function selectFoodsForMeal(
  availableFoods: DBFood[],
  mealType: string,
  goal: string,
  patientSeed: number,
  dayIndex: number,
): DBFood[] {
  const mealTags = MEAL_TYPE_TO_DB_TAG[mealType] || [];
  const goalTag = GOAL_TO_DB_TAG[goal] || "";
  const composition = MEAL_COMPOSITION[mealType] || { required: ["proteina"], optional: [] };

  const selected: DBFood[] = [];
  const usedCategories = new Set<string>();

  // For each required category, find matching foods
  for (const requiredCat of composition.required) {
    const candidates = availableFoods.filter(f => {
      if (f.category !== requiredCat) return false;
      // Prefer foods with matching meal tags
      const hasMealTag = mealTags.length === 0 || f.meal_tags_json.length === 0 || f.meal_tags_json.some((t: string) => mealTags.includes(t));
      return hasMealTag;
    });

    if (candidates.length === 0) {
      // Fallback: any food from this category
      const fallback = availableFoods.filter(f => f.category === requiredCat);
      if (fallback.length > 0) {
        // Sort by goal relevance
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
    const candidates = availableFoods.filter(f => f.category === optCat);
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

  const descriptionLines = foods.map(f => {
    const grams = Math.round((f.portion_grams || 100) * clampedScale);
    const basePortion = (f.portion_reference || `${f.portion_grams || 100}g`).trim();
    const scaledPortion = scaleDescriptionQuantities(basePortion, clampedScale) || basePortion;
    const resolvedPortion = scaledPortion === basePortion && !/(\d+(?:[.,]\d+)?)\s*(g|ml|col\.?)/i.test(basePortion)
      ? `${grams}g`
      : scaledPortion;
    return `• ${f.food_name} — ${resolvedPortion}`;
  });

  // Build substitution text from same categories
  const subLines: string[] = [];
  for (const food of foods) {
    const subs = SUBSTITUTION_GROUPS[
      food.category === "proteina" ? (mealType === "breakfast" ? "protein_breakfast" : "protein") :
      food.category === "carboidrato" ? (mealType === "breakfast" ? "carb_breakfast" : "carb") :
      food.category === "fruta" ? "fruit" : ""
    ];
    if (subs) {
      const normFood = normalize(food.food_name);
      const alts = subs.filter(s => !normFood.includes(normalize(s))).slice(0, 3);
      if (alts.length > 0) {
        subLines.push(`• ${food.food_name} → ${alts.join(", ")}`);
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
    calories_target: Math.round(totalKcal * clampedScale),
    protein_target: Math.round(foods.reduce((s, f) => s + (f.protein || 0), 0) * clampedScale),
    carbs_target: Math.round(foods.reduce((s, f) => s + (f.carbs || 0), 0) * clampedScale),
    fat_target: Math.round(foods.reduce((s, f) => s + (f.fats || 0), 0) * clampedScale),
  };
}

// ═══════════════════════════════════════════════════════════════
// PERSONALIZED PLAN GENERATOR v4.0
// Uses ifj_food_database with patient-specific seeded selection
// ═══════════════════════════════════════════════════════════════

function generatePersonalizedPlan(
  patientFoods: DBFood[],
  patientId: string,
  goal: string,
  kcalTarget: number,
  macros: { protein: number; carbs: number; fat: number },
  planOptionIndex: number = 0,
): any[] {
  const items: any[] = [];
  const mealTypes = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"];
  const patientSeed = generationSeed(patientId, planOptionIndex);

  for (let day = 0; day < 7; day++) {
    for (const mealType of mealTypes) {
      const targetKcal = Math.round(kcalTarget * (MEAL_KCAL_SPLIT[mealType] || 0.15));
      
      const selectedFoods = selectFoodsForMeal(
        patientFoods,
        mealType,
        goal,
        patientSeed,
        day,
      );

      if (selectedFoods.length > 0) {
        const mealItem = buildMealFromDBFoods(selectedFoods, mealType, day, targetKcal, goal);
        if (mealItem) items.push(mealItem);
      }
    }
  }

  return items;
}

// ═══════════════════════════════════════════════════════════════
// LEGACY FALLBACK GENERATOR (preset-based)
// Used only when DB has insufficient foods
// ═══════════════════════════════════════════════════════════════

function generateRealisticPlan(
  goal: string,
  kcalTarget: number,
  _macros: { protein: number; carbs: number; fat: number },
  restrictions: string[],
  disliked: string[],
  planOptionIndex: number = 0,
): any[] {
  const items: any[] = [];
  const mealTypes = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"];

  for (let day = 0; day < 7; day++) {
    for (const mealType of mealTypes) {
      const targetKcal = Math.round(kcalTarget * (MEAL_KCAL_SPLIT[mealType] || 0.15));
      const options = getMealOptions(mealType, goal);

      let validOptions = options.filter(opt => {
        const allText = normalize(opt.description + " " + opt.foods.join(" "));
        if (restrictions.includes("vegetarian") && /frango|carne|bife|tilapia|peixe|porco|sardinha|sobrecoxa|alcatra|patinho/.test(allText)) return false;
        if (restrictions.includes("vegan") && /frango|carne|bife|tilapia|peixe|porco|ovo|leite|queijo|iogurte|requeijao|manteiga|mel/.test(allText)) return false;
        if (restrictions.includes("lactose_free") && /leite|queijo|iogurte|requeijao|manteiga/.test(allText)) return false;
        if (restrictions.includes("gluten_free") && /pao|macarrao|aveia|trigo/.test(allText)) return false;
        for (const d of disliked) {
          const nd = normalize(d);
          if (nd.length >= 3 && allText.includes(nd)) return false;
        }
        return true;
      });

      if (validOptions.length === 0) validOptions = options;

      // Use time-based seed for variety across regenerations
      const regenSeed = generationSeed(String(planOptionIndex), day);
      const idx = (regenSeed + day) % validOptions.length;
      const selected = validOptions[idx];

      const scaleFactor = targetKcal / (selected.kcal || 1);
      const clampedScale = Math.max(0.6, Math.min(1.8, scaleFactor));

      const scaledBaseDescription = scaleDescriptionQuantities(selected.description, clampedScale) || selected.description;
      const finalizedBaseDescription = finalizeMealDescription(scaledBaseDescription, mealType, goal);
      const subs = buildSubstitutionText(selected.foods, mealType);
      const description = finalizedBaseDescription + (subs ? `\n\n🔄 Substituições:\n${subs}` : "");

      items.push({
        title: selected.title,
        description,
        meal_type: mealType,
        day_of_week: day,
        calories_target: Math.round(selected.kcal * clampedScale),
        protein_target: Math.round(selected.protein * clampedScale),
        carbs_target: Math.round(selected.carbs * clampedScale),
        fat_target: Math.round(selected.fat * clampedScale),
      });
    }
  }

  return items;
}

function buildSubstitutionText(foods: string[], _mealType: string): string {
  const subs: string[] = [];
  for (const food of foods) {
    const n = normalize(food);
    for (const [, group] of Object.entries(SUBSTITUTION_GROUPS)) {
      const match = group.find(item => n.includes(normalize(item)));
      if (match) {
        const alternatives = group.filter(item => normalize(item) !== normalize(match)).slice(0, 3);
        if (alternatives.length > 0) {
          subs.push(`• ${match} → ${alternatives.join(", ")}`);
        }
        break;
      }
    }
  }
  return subs.join("\n");
}

async function safeDeletePlan(client: any, planId: string) {
  const { error } = await client.from("meal_plans").delete().eq("id", planId);
  if (error) {
    console.error(`[generate-meal-plan] Failed to rollback orphan plan ${planId}:`, error);
  }
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
      const correctionTarget = nonBreakfastItems.length > 0
        ? nonBreakfastItems.reduce((max: any, i: any) => (i.protein_target > (max?.protein_target || 0) ? i : max), nonBreakfastItems[0])
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
    generation_method: usedDBFoods ? "db_personalized_v4" : "realistic_preset_meals_v3",
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

    if (!anamnesis && isPipeline) {
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
    const goal = body.goal || answers.goal || answers.objective || answers.main_goal;
    if (!goal) {
      return new Response(JSON.stringify({ error: "Objetivo do paciente não definido", code: "GOAL_MISSING" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    const finalKcal = physicalAssessment?.calories_target || kcalTarget;
    const finalMacros = {
      protein: physicalAssessment?.protein_target || macros.protein,
      carbs: physicalAssessment?.carbs_target || macros.carbs,
      fat: physicalAssessment?.fat_target || macros.fat,
    };
    const dataSource = physicalAssessment?.calories_target ? "physical_assessment" : "anamnesis_calculated";

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

    console.log(`[generate-meal-plan] Patient ${patient_id} | Mode: ${generationMode} | Goal: ${goal} | Kcal: ${finalKcal} | Restrictions: ${restrictions.join(",")} | Disliked: ${disliked.join(",")} | Allergies: ${allergies.join(",")}`);

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
    // LOAD FOOD DATABASE FOR SMART/CLINICAL MODES
    // Quick mode uses presets for speed; smart/clinical use DB
    // ═══════════════════════════════════════════════════════════
    
    let dbFoods: DBFood[] = [];
    let useDBDriven = false;

    if (generationMode !== "quick") {
      dbFoods = await loadFoodDatabase(serviceClient);
      if (dbFoods.length >= 30) {
        // Filter for this patient's restrictions/allergies/disliked
        dbFoods = filterFoodsForPatient(dbFoods, restrictions, disliked, allergies);
        useDBDriven = dbFoods.length >= 20;
        console.log(`[generate-meal-plan] DB foods loaded: ${dbFoods.length} (after patient filtering). DB-driven: ${useDBDriven}`);
      } else {
        console.warn(`[generate-meal-plan] DB has only ${dbFoods.length} foods — falling back to presets`);
      }
    }

    // ── Multi-plan flow ──
    if (isPipeline && planCount > 1 && !meal_plan_id) {
      const generatedPlans: any[] = [];
      const nutritionistId = requestedNutritionistId;

      for (let tplIdx = 0; tplIdx < planCount; tplIdx++) {
        let rawItems: any[];
        if (useDBDriven) {
          rawItems = generatePersonalizedPlan(dbFoods, patient_id, goal, finalKcal, finalMacros, tplIdx);
        } else {
          rawItems = generateRealisticPlan(goal, finalKcal, finalMacros, restrictions, disliked, tplIdx);
        }
        const planItems = reconcileDailyMacros(rawItems, finalKcal, finalMacros, goal);

        const genMeta = buildGenerationMetadata(
          tmb, tdee, tdeeFactor, finalKcal, goal, finalMacros, weight, height,
          age, sex, activityLevel, dataSource, restrictions, medicalConditions, disliked, useDBDriven
        );

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

        const itemsToInsert = planItems.map((item: any) => ({ ...item, meal_plan_id: newPlan.id }));
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
    
    let rawPlanItems: any[];
    if (useDBDriven) {
      rawPlanItems = generatePersonalizedPlan(dbFoods, patient_id, goal, finalKcal, finalMacros, planOptionIndex);
      console.log(`[generate-meal-plan] DB-driven plan generated: ${rawPlanItems.length} items`);
    } else {
      rawPlanItems = generateRealisticPlan(goal, finalKcal, finalMacros, restrictions, disliked, planOptionIndex);
      console.log(`[generate-meal-plan] Preset-based plan generated: ${rawPlanItems.length} items`);
    }
    
    // Smart mode: apply adjustments to RAW items BEFORE reconciliation
    // so that reconcileDailyMacros can normalize the final totals correctly
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

    // Reconcile with correct per-day targets
    const planItems = reconcileDailyMacros(rawPlanItems, weekdayKcal, finalMacros, goal);

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

    const itemsToInsert = planItems.map((item: any) => ({ ...item, meal_plan_id: finalMealPlanId }));
    const { data: existingItems } = await serviceClient
      .from("meal_plan_items")
      .select("id")
      .eq("meal_plan_id", finalMealPlanId);

    const previousItemIds = (existingItems || []).map((item: any) => item.id).filter(Boolean);
    const { error: insertErr } = await serviceClient.from("meal_plan_items").insert(itemsToInsert);

    if (insertErr) {
      if (isPipeline && !meal_plan_id) {
        await safeDeletePlan(serviceClient, finalMealPlanId);
      }
      throw new Error(`Falha ao inserir itens do plano ${finalMealPlanId}: ${insertErr.message}`);
    }

    if (previousItemIds.length > 0) {
      const { error: deleteErr } = await serviceClient
        .from("meal_plan_items")
        .delete()
        .in("id", previousItemIds);

      if (deleteErr) {
        console.error(`[generate-meal-plan] Failed to delete previous items for plan ${finalMealPlanId}:`, deleteErr);
        throw new Error(`Novos itens foram gerados, mas a limpeza dos itens antigos falhou no plano ${finalMealPlanId}: ${deleteErr.message}`);
      }
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
        generation_method: useDBDriven ? "db_personalized_v4" : "realistic_preset_meals_v3",
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
