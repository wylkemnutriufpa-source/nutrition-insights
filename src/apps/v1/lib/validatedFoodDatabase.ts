/**
 * Banco de Alimentos Validados — FitJourney v4.0
 * 
 * FONTE ÚNICA DE VERDADE para alimentos permitidos no sistema.
 * Baseado exclusivamente nos itens da tabela meal_visual_library.
 * 
 * REGRA: Nenhum alimento fora desta lista pode ser usado em:
 * - Templates
 * - Geração automática
 * - Correção automática (AutoFix)
 * - Substituições
 * - Sugestões por anamnese
 */

import { supabase } from "@/integrations/supabase/client";

// ── Cache local do banco validado ──
let _validatedFoodsCache: Set<string> | null = null;
let _validatedFoodsMap: Map<string, string> | null = null; // normalized -> display_name
let _lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/**
 * Load validated foods from meal_visual_library + aliases.
 * Caches results for 5 minutes.
 */
export async function loadValidatedFoods(): Promise<Set<string>> {
  if (_validatedFoodsCache && Date.now() - _lastFetch < CACHE_TTL) {
    return _validatedFoodsCache;
  }

  const foods = new Set<string>();
  const foodMap = new Map<string, string>();

  // Load ONLY production-ready items from meal_visual_library:
  // is_active = true AND has image AND has macros
  const { data: items } = await supabase
    .from("meal_visual_library" as any)
    .select("name, display_name, image_url, image_path, default_calories, default_protein, default_carbs, default_fat")
    .eq("is_active", true);

  if (items) {
    for (const item of items as any[]) {
      // PRODUCTION-READY FILTER: must have image + all 4 macros
      const hasImage = !!(item.image_url || item.image_path);
      const hasMacros = item.default_calories != null && item.default_protein != null 
        && item.default_carbs != null && item.default_fat != null;
      if (!hasImage || !hasMacros) {
        console.warn(`[ValidatedFoodDB] Skipping incomplete item: ${item.display_name || item.name} (image=${hasImage}, macros=${hasMacros})`);
        continue;
      }

      const n = normalize(item.display_name || item.name);
      foods.add(n);
      foodMap.set(n, item.display_name || item.name);
      // Also add the slug-style name
      const slug = normalize((item.name || "").replace(/-/g, " "));
      if (slug) {
        foods.add(slug);
        foodMap.set(slug, item.display_name || item.name);
      }
    }
  }

  // Load aliases
  const { data: aliases } = await supabase
    .from("meal_visual_aliases" as any)
    .select("alias, normalized_alias");

  if (aliases) {
    for (const a of aliases as any[]) {
      const n = normalize(a.alias || a.normalized_alias);
      if (n) {
        foods.add(n);
      }
    }
  }

  _validatedFoodsCache = foods;
  _validatedFoodsMap = foodMap;
  _lastFetch = Date.now();

  console.log(`[ValidatedFoodDB] Loaded ${foods.size} validated food terms`);
  return foods;
}

/**
 * Check if a food name exists in the validated database.
 * Uses substring matching for compound names.
 */
export async function isFoodValidated(foodName: string): Promise<boolean> {
  const db = await loadValidatedFoods();
  const n = normalize(foodName);
  
  // Exact match
  if (db.has(n)) return true;
  
  // Check if any validated food is contained in the name or vice versa
  for (const validated of db) {
    if (validated.length >= 3 && (n.includes(validated) || validated.includes(n))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Filter a list of food names, returning only validated ones.
 */
export async function filterValidatedFoods(foods: string[]): Promise<{
  valid: string[];
  invalid: string[];
}> {
  const db = await loadValidatedFoods();
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const food of foods) {
    const n = normalize(food);
    let found = db.has(n);
    
    if (!found) {
      for (const validated of db) {
        if (validated.length >= 3 && (n.includes(validated) || validated.includes(n))) {
          found = true;
          break;
        }
      }
    }

    if (found) {
      valid.push(food);
    } else {
      invalid.push(food);
    }
  }

  return { valid, invalid };
}

/**
 * Get the closest validated food name for a given input.
 * Returns null if no match found.
 */
export async function getClosestValidatedFood(foodName: string): Promise<string | null> {
  const db = await loadValidatedFoods();
  const map = _validatedFoodsMap;
  const n = normalize(foodName);

  // Exact match
  if (db.has(n) && map?.has(n)) return map.get(n)!;

  // Substring match — prefer longest match
  let bestMatch = "";
  let bestLen = 0;
  for (const validated of db) {
    if (validated.length >= 3 && n.includes(validated) && validated.length > bestLen) {
      bestMatch = validated;
      bestLen = validated.length;
    }
  }

  if (bestMatch && map?.has(bestMatch)) return map.get(bestMatch)!;
  return bestMatch || null;
}

/**
 * Invalidate the cache (e.g., after adding new items to the library).
 */
export function invalidateValidatedFoodsCache(): void {
  _validatedFoodsCache = null;
  _validatedFoodsMap = null;
  _lastFetch = 0;
}

// ── ALIMENTOS EXPLICITAMENTE PROIBIDOS ──
// Estes alimentos NÃO devem ser usados mesmo que existam em algum lugar.
// São itens que o nutricionista rejeitou explicitamente.
export const EXPLICITLY_BANNED_FOODS = [
  "queijo minas",
  "cottage",
  "queijo cottage",
  "peito de peru",
  "peru defumado",
  "blanquet",
  "blanquet de peru",
  "ricota",
  "ricota importada",
  "salmão",
  "salmon",
  "atum fresco",
  "kefir",
  "quinoa",
  "quinua",
  "amaranto",
  "macadâmia",
  "pistache",
  "framboesa",
  "mirtilo",
  "blueberry",
  "cranberry",
  "tofu",
  "tempeh",
  "edamame",
  "granola premium",
  "mix de nuts",
  "trail mix",
  "azeite trufado",
  "vinagre balsâmico",
  "pasta de amendoim importada",
  "manteiga de amêndoa",
  "whey protein",
  "caseína",
  "wrap integral",
  "pão artesanal",
  "leite de amêndoa",
  "leite de coco",
  "leite de aveia",
  "abacate toast",
  "overnight oats",
  "cream cheese",
  "philadelphia",
  "iogurte grego importado",
  "coalhada",
  "kombucha",
  "semente de chia importada",
  "hemp seed",
  "tahini",
  "hummus",
  "burrata",
  "brie",
  "camembert",
  "gorgonzola",
];

/**
 * Check if a food is explicitly banned.
 */
export function isExplicitlyBanned(foodName: string): boolean {
  const n = normalize(foodName);
  return EXPLICITLY_BANNED_FOODS.some(banned => n.includes(normalize(banned)));
}
