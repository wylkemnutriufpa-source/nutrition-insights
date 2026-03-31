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

/** Primary protein/food keywords mapped to their base slug */
const PROTEIN_KEYWORDS: Record<string, string> = {
  frango: "frango", peito: "frango", sobrecoxa: "sobrecoxa", coxa: "sobrecoxa",
  carne: "carne", bife: "carne", alcatra: "carne", patinho: "carne",
  acem: "acem", maminha: "maminha",
  picanha: "picanha", costelinha: "costelinha",
  costela: "costela-suina",
  porco: "porco", suino: "porco", lombo: "lombo-suino",
  peixe: "peixe", tilapia: "file-de-tilapia", salmao: "peixe", pescada: "peixe", merluza: "peixe",
  camarao: "camarao",
  ovo: "ovo", ovos: "ovo", omelete: "ovo",
};

/** Fruit keywords mapped to their visual slug */
const FRUIT_KEYWORDS: Record<string, string> = {
  abacaxi: "abacaxi", morango: "morango", melao: "melao", goiaba: "goiaba",
  pera: "pera", uva: "uva", laranja: "laranja", melancia: "melancia",
  manga: "manga", maca: "maca", mamao: "mamao", banana: "banana",
  abacate: "abacate",
};

/** Misc food keywords mapped to their visual slug */
const MISC_FOOD_KEYWORDS: Record<string, string> = {
  gelatina: "gelatina",
  wrap: "wrap-integral", rap10: "wrap-integral", tortilha: "wrap-integral",
  azeite: "azeite",
};

/** Carb keywords to ignore when determining the visual */
const CARB_KEYWORDS = new Set([
  "arroz", "batata", "macarrao", "macarronada", "feijao",
  "pure", "mandioca", "inhame", "legumes", "salada", "brocolis", "macaxeira",
]);

const GENERIC_TITLES = new Set([
  "almoco", "jantar", "cafe da manha", "lanche",
  "lanche da manha", "lanche da tarde", "ceia",
]);

function extractFoodFromDescription(description: string): string | null {
  const lines = description.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes('Substituiç') || trimmed.includes('🔄')) break;
    if (!trimmed.startsWith('•') && !trimmed.startsWith('-')) continue;
    const normLine = normalize(trimmed);
    if (normLine.includes("carne moida")) return "carne moida";
    if (normLine.includes("carne de panela")) return "carne de panela";
    if (normLine.includes("carne assada")) return "carne assada";
    const words = normLine.split(/\s+/);
    for (const word of words) {
      if (CARB_KEYWORDS.has(word)) continue;
      if (PROTEIN_KEYWORDS[word]) return PROTEIN_KEYWORDS[word];
      if (FRUIT_KEYWORDS[word]) return FRUIT_KEYWORDS[word];
    }
  }
  return null;
}

/**
 * Tries to find a match using multiple strategies:
 * 1. Exact normalized alias match
 * 2. Protein-first keyword extraction
 * 3. Partial match (alias contained in title or vice-versa)
 */
function findMatch(title: string, aliasMap: Map<string, string>, description?: string): string | null {
  const norm = normalize(title);

  // If title is generic (e.g. "Almoço"), extract protein from description
  if (GENERIC_TITLES.has(norm) && description) {
    const food = extractFoodFromDescription(description);
    if (food) {
      if (aliasMap.has(food)) return aliasMap.get(food)!;
      for (const [alias, itemId] of aliasMap) {
        if (alias === food || alias.startsWith(food + " ")) return itemId;
      }
    }
    return null;
  }

  // Strategy 1: exact alias match
  if (aliasMap.has(norm)) return aliasMap.get(norm)!;

  // Strategy 2: protein-first keyword matching
  const words = norm.split(/\s+/);
  for (const word of words) {
    if (CARB_KEYWORDS.has(word)) continue;
    const foodBase = PROTEIN_KEYWORDS[word] || FRUIT_KEYWORDS[word];
    if (foodBase) {
      for (const [alias, itemId] of aliasMap) {
        if (alias === foodBase || alias.startsWith(foodBase + " ")) {
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
