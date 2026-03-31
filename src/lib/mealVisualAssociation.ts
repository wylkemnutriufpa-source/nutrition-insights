/**
 * Auto-association engine for meal_visual_library.
 * Links existing meal_plan_items, saved_meals, and template items
 * to the visual library using alias matching.
 * 
 * Idempotent: never overwrites existing visual_library_item_id links.
 */
import { supabase } from "@/integrations/supabase/client";
import type { MealVisualAlias } from "@/types/mealVisualLibrary";

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
    .trim();
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
      map.set(row.normalized_alias, row.library_item_id);
    }
  }
  return map;
}

/** Primary protein keywords mapped to their base slug */
const PROTEIN_KEYWORDS: Record<string, string> = {
  frango: "frango",
  carne: "carne",
  bife: "carne",
  picanha: "picanha",
  costelinha: "costelinha",
  peixe: "peixe",
  tilapia: "peixe",
  salmao: "peixe",
  camarao: "camarao",
  ovo: "ovo",
  ovos: "ovo",
  omelete: "ovo",
};

/** Carb keywords to ignore when determining the visual */
const CARB_KEYWORDS = new Set([
  "arroz", "batata", "macarrao", "macarronada", "feijao",
  "pure", "mandioca", "inhame", "legumes", "salada",
]);

/**
 * Tries to find a match using multiple strategies:
 * 1. Exact normalized alias match
 * 2. Protein-first keyword extraction
 * 3. Partial match (alias contained in title or vice-versa)
 */
function findMatch(title: string, aliasMap: Map<string, string>): string | null {
  const norm = normalize(title);

  // Strategy 1: exact alias match
  if (aliasMap.has(norm)) return aliasMap.get(norm)!;

  // Strategy 2: protein-first keyword matching
  const words = norm.split(/\s+/);
  for (const word of words) {
    if (CARB_KEYWORDS.has(word)) continue;
    const proteinBase = PROTEIN_KEYWORDS[word];
    if (proteinBase) {
      // Find any alias that starts with the protein base
      for (const [alias, itemId] of aliasMap) {
        if (alias === proteinBase || alias.startsWith(proteinBase + " ")) {
          return itemId;
        }
      }
    }
  }

  // Strategy 3: partial match (fallback)
  for (const [alias, itemId] of aliasMap) {
    if (norm.includes(alias) || alias.includes(norm)) {
      return itemId;
    }
  }

  return null;
}

/**
 * Run the full auto-association process.
 * Idempotent and safe — never overwrites existing links.
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

  // 1. Process meal_plan_items
  const { data: mealItems } = await supabase
    .from("meal_plan_items")
    .select("id, title, visual_library_item_id" as any)
    .limit(1000);

  if (mealItems) {
    for (const item of mealItems as any[]) {
      report.details.mealPlanItems.analyzed++;
      report.totalAnalyzed++;

      if (item.visual_library_item_id) {
        report.totalAlreadyLinked++;
        report.details.mealPlanItems.skipped++;
        continue;
      }

      const match = findMatch(item.title || "", aliasMap);
      if (match) {
        await supabase
          .from("meal_plan_items")
          .update({ visual_library_item_id: match } as any)
          .eq("id", item.id);
        report.totalLinked++;
        report.details.mealPlanItems.linked++;
      } else {
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

      if (item.visual_library_item_id) {
        report.totalAlreadyLinked++;
        report.details.savedMeals.skipped++;
        continue;
      }

      const match = findMatch(item.title || "", aliasMap);
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
export async function autoMatchSingle(title: string): Promise<string | null> {
  const aliasMap = await buildAliasMap();
  return findMatch(title, aliasMap);
}
