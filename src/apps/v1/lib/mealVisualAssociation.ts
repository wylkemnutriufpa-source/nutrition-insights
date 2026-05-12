/**
 * Auto-association engine for meal_visual_library v5.0.0
 * 
 * Resolution priority:
 *   1. Exact composite phrase match (e.g. "tapioca com ovo" → tapioca-com-ovo)
 *   2. Exact normalized alias match
 *   3. Multi-word sub-phrase scan (longest match first)
 *   4. Single keyword (protein > fruit > misc), skipping carbs
 *
 * Idempotent: never overwrites existing correct links.
 */
import { supabase } from "@v1/integrations/supabase/client";
import type { MealVisualAlias } from "@v1/types/mealVisualLibrary";

export interface AssociationReport {
  totalAnalyzed: number;
  totalLinked: number;
  totalAlreadyLinked: number;
  totalUnlinked: number;
  topUnrecognized: { name: string; count: number }[];
  details: {
    mealPlanItems: { analyzed: number; linked: number; skipped: number };
    savedMeals: { analyzed: number; linked: number; skipped: number };
  };
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Builds a lookup map from normalized alias → library_item_id
 */
async function buildAliasMap(): Promise<Map<string, string>> {
  const { data } = await supabase
    .from("meal_visual_aliases" as any)
    .select("library_item_id, normalized_alias");

  const map = new Map<string, string>();
  if (data) {
    for (const row of data as unknown as MealVisualAlias[]) {
      // First entry wins (avoids duplicate overwrite issues)
      if (!map.has(row.normalized_alias)) {
        map.set(row.normalized_alias, row.library_item_id);
      }
    }
  }
  return map;
}

/** Carb keywords to skip when doing single-keyword extraction */
const CARB_KEYWORDS = new Set([
  "arroz", "batata", "macarrao", "macarronada", "feijao",
  "pure", "mandioca", "inhame", "legumes", "salada", "brocolis",
  "macaxeira", "farinha", "farofa",
]);

const GENERIC_TITLES = new Set([
  "almoco", "jantar", "cafe da manha",
  "refeicao", "marmita",
  "lanche", "lanche da manha", "lanche da tarde",
  "lanche manha", "lanche tarde", "ceia",
]);

/** Accessory words to strip from titles before matching */
const ACCESSORY_WORDS = new Set([
  "marmita", "completa", "completo", "basico", "basica",
  "light", "fit", "proteico", "proteica", "simples",
  "do", "da", "de", "com", "e", "ao", "a", "o",
]);

/**
 * Extract food term from description lines (bullet points).
 * Stops before substitution sections.
 */
function extractFoodFromDescription(description: string, aliasMap: Map<string, string>): string | null {
  const lines = description.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes('Substituiç') || trimmed.includes('🔄')) break;
    if (!trimmed.startsWith('•') && !trimmed.startsWith('-')) continue;

    const normLine = normalize(trimmed);
    
    // Try composite phrases first from the alias map
    const phraseMatch = findBestAliasMatch(normLine, aliasMap);
    if (phraseMatch) return phraseMatch;
  }
  return null;
}

/**
 * Core matching function with strict priority ordering.
 */
function findMatch(title: string, aliasMap: Map<string, string>, description?: string): string | null {
  const norm = normalize(title);

  // Skip generic titles — try description extraction instead
  if (GENERIC_TITLES.has(norm)) {
    if (description) {
      const descMatch = extractFoodFromDescription(description, aliasMap);
      if (descMatch) return descMatch;
    }
    return null;
  }

  // === PRIORITY 1: Strict match via Alias Map (Verified Sources) ===
  if (aliasMap.has(norm)) return aliasMap.get(norm)!;

  // === PRIORITY 2: Longest sub-phrase match (Verified Sources) ===
  const phraseMatch = findBestAliasMatch(norm, aliasMap);
  if (phraseMatch) return phraseMatch;

  // === PRIORITY 3: Strict keyword matching (No generic fallbacks) ===
  const words = norm.split(/\s+/);
  for (const word of words) {
    if (CARB_KEYWORDS.has(word) || ACCESSORY_WORDS.has(word)) continue;
    if (word.length < 3) continue;
    
    // EXCLUSIVELY via alias map, no generic string fallbacks
    if (aliasMap.has(word)) return aliasMap.get(word)!;
  }

  return null;
}

/**
 * Finds the longest alias that appears as a substring of the input text.
 * This ensures "tapioca com ovo" matches before "ovo" alone.
 */
function findBestAliasMatch(text: string, aliasMap: Map<string, string>): string | null {
  let bestAlias: string | null = null;
  let bestLength = 0;

  for (const [alias, itemId] of aliasMap) {
    // Skip very short aliases (1-2 chars) to avoid false positives
    if (alias.length < 3) continue;
    
    // Check if alias appears as a whole-word substring
    if (text === alias) {
      // Exact match is always best
      return itemId;
    }
    
    if (alias.length > bestLength && isWholeWordSubstring(text, alias)) {
      bestAlias = alias;
      bestLength = alias.length;
    }
  }

  return bestAlias ? aliasMap.get(bestAlias)! : null;
}

/**
 * Check if `phrase` appears in `text` as whole words (not partial).
 * e.g. "ovo" matches in "tapioca com ovo" but not in "ovomaltine"
 */
function isWholeWordSubstring(text: string, phrase: string): boolean {
  const idx = text.indexOf(phrase);
  if (idx === -1) return false;
  
  const before = idx === 0 || text[idx - 1] === ' ';
  const after = (idx + phrase.length) >= text.length || text[idx + phrase.length] === ' ';
  
  return before && after;
}

/**
 * Run the full auto-association process.
 * Idempotent and safe — corrects wrong links and fills missing ones.
 */
export async function runAutoAssociation(): Promise<AssociationReport> {
  const aliasMap = await buildAliasMap();
  const unrecognizedMap = new Map<string, number>();

  const report: AssociationReport = {
    totalAnalyzed: 0,
    totalLinked: 0,
    totalAlreadyLinked: 0,
    totalUnlinked: 0,
    topUnrecognized: [],
    details: {
      mealPlanItems: { analyzed: 0, linked: 0, skipped: 0 },
      savedMeals: { analyzed: 0, linked: 0, skipped: 0 },
    },
  };

  // 1. Process meal_plan_items (all, not just unlinked — to fix wrong links)
  const { data: mealItems } = await supabase
    .from("meal_plan_items")
    .select("id, title, description, visual_library_item_id" as any)
    .limit(1000);

  if (mealItems) {
    for (const item of mealItems as any[]) {
      report.details.mealPlanItems.analyzed++;
      report.totalAnalyzed++;

      const match = findMatch(item.title || "", aliasMap, item.description || "");

      if (match && item.visual_library_item_id === match) {
        report.totalAlreadyLinked++;
        report.details.mealPlanItems.skipped++;
        continue;
      }

      if (match) {
        await supabase
          .from("meal_plan_items")
          .update({ visual_library_item_id: match } as any)
          .eq("id", item.id);
        report.totalLinked++;
        report.details.mealPlanItems.linked++;
      } else if (!GENERIC_TITLES.has(normalize(item.title || ""))) {
        report.totalUnlinked++;
        const norm = normalize(item.title || "");
        unrecognizedMap.set(norm, (unrecognizedMap.get(norm) || 0) + 1);
      }
    }
  }

  // 2. Process saved_meals
  const { data: savedMeals } = await supabase
    .from("saved_meals")
    .select("id, title, visual_library_item_id" as any)
    .limit(500);

  if (savedMeals) {
    for (const item of savedMeals as any[]) {
      report.details.savedMeals.analyzed++;
      report.totalAnalyzed++;

      const match = findMatch(item.title || "", aliasMap);

      if (match && item.visual_library_item_id === match) {
        report.totalAlreadyLinked++;
        report.details.savedMeals.skipped++;
        continue;
      }

      if (match) {
        await supabase
          .from("saved_meals")
          .update({ visual_library_item_id: match } as any)
          .eq("id", item.id);
        report.totalLinked++;
        report.details.savedMeals.linked++;
      } else {
        report.totalUnlinked++;
        const norm = normalize(item.title || "");
        unrecognizedMap.set(norm, (unrecognizedMap.get(norm) || 0) + 1);
      }
    }
  }

  // Build top unrecognized
  report.topUnrecognized = [...unrecognizedMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, count]) => ({ name, count }));

  return report;
}

/**
 * Try to auto-match a single title and return the library_item_id if found.
 */
export async function autoMatchSingle(title: string, description?: string): Promise<string | null> {
  const aliasMap = await buildAliasMap();
  return findMatch(title, aliasMap, description);
}
