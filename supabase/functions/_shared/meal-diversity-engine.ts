/**
 * Meal Diversity Engine v1.0.0
 * Prevents meal repetition across days and ensures protein variety.
 * Consults recent meal_plan_items to avoid stale patterns.
 */

import type { ResolvedTemplate } from "./template-resolver.ts";

export interface DiversityContext {
  patientId: string;
  recentMealItems: RecentMealItem[];
}

export interface RecentMealItem {
  title: string;
  meal_type: string;
  day_of_week: number;
  template_id?: string;
  created_at?: string;
}

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// ── Protein keywords for cross-meal variety ──
const PROTEIN_KEYWORDS = [
  "frango", "chicken", "peito de frango",
  "carne", "patinho", "acem", "alcatra", "coxao", "beef",
  "peixe", "tilapia", "sardinha", "fish",
  "ovo", "ovos", "egg",
  "porco", "suino", "lombo",
];

/**
 * Extract the dominant protein from a meal's foods_structure or title.
 */
function extractProteinSignature(template: ResolvedTemplate): string | null {
  // Check foods_structure first
  for (const food of template.foods_structure) {
    const norm = normalize(food.name);
    for (const kw of PROTEIN_KEYWORDS) {
      if (norm.includes(kw)) return kw;
    }
  }

  // Fallback: check template name
  const normName = normalize(template.name);
  for (const kw of PROTEIN_KEYWORDS) {
    if (normName.includes(kw)) return kw;
  }

  return null;
}

/**
 * Extract protein from a recent meal item title.
 */
function extractProteinFromTitle(title: string): string | null {
  const norm = normalize(title);
  for (const kw of PROTEIN_KEYWORDS) {
    if (norm.includes(kw)) return kw;
  }
  return null;
}

/**
 * Load recent meal items for diversity analysis.
 * Returns items from the patient's most recent active plan.
 */
export async function loadRecentMeals(
  client: any,
  patientId: string,
): Promise<RecentMealItem[]> {
  // Get the most recent active/published plan
  const { data: plans } = await client
    .from("meal_plans")
    .select("id")
    .eq("patient_id", patientId)
    .in("status", ["approved", "published", "published_to_patient"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (!plans || plans.length === 0) return [];

  const { data: items } = await client
    .from("meal_plan_items")
    .select("title, meal_type, day_of_week, edit_metadata, created_at")
    .eq("meal_plan_id", plans[0].id);

  if (!items) return [];

  return (items as any[]).map(item => ({
    title: item.title || "",
    meal_type: item.meal_type || "",
    day_of_week: item.day_of_week ?? 0,
    template_id: item.edit_metadata?._template_id,
    created_at: item.created_at,
  }));
}

/**
 * Score and reorder candidate templates to maximize diversity.
 * Penalizes templates that repeat recently used patterns.
 *
 * Returns candidates sorted by diversity score (highest = most diverse).
 */
export function ensureMealDiversity(
  candidates: ResolvedTemplate[],
  recentMeals: RecentMealItem[],
  currentDay: number,
  currentMealType: string,
  usedProteinsToday: Set<string>,
): ResolvedTemplate[] {
  if (candidates.length <= 1) return candidates;

  // Build recent usage maps
  const recentTemplateIds = new Set<string>();
  const recentProteinsByDay = new Map<number, Set<string>>();
  const adjacentDayProteins = new Set<string>();

  for (const meal of recentMeals) {
    if (meal.template_id) recentTemplateIds.add(meal.template_id);

    const protein = extractProteinFromTitle(meal.title);
    if (protein) {
      if (!recentProteinsByDay.has(meal.day_of_week)) {
        recentProteinsByDay.set(meal.day_of_week, new Set());
      }
      recentProteinsByDay.get(meal.day_of_week)!.add(protein);

      // Adjacent days (current ±1)
      if (Math.abs(meal.day_of_week - currentDay) <= 1 && meal.meal_type === currentMealType) {
        adjacentDayProteins.add(protein);
      }
    }
  }

  const scored = candidates.map(template => {
    let diversityScore = 50; // Base score

    const proteinSig = extractProteinSignature(template);

    // ── Rule 1: Same template used recently → -30 ──
    if (template.id && recentTemplateIds.has(template.id)) {
      diversityScore -= 30;
    }

    // ── Rule 2: Same protein on adjacent days → -25 ──
    if (proteinSig && adjacentDayProteins.has(proteinSig)) {
      diversityScore -= 25;
    }

    // ── Rule 3: Same protein already used today → -20 ──
    if (proteinSig && usedProteinsToday.has(proteinSig)) {
      diversityScore -= 20;
    }

    // ── Rule 4: Template not used recently → +15 ──
    if (template.id && !recentTemplateIds.has(template.id)) {
      diversityScore += 15;
    }

    // ── Rule 5: Unique protein for the day → +10 ──
    if (proteinSig && !usedProteinsToday.has(proteinSig)) {
      diversityScore += 10;
    }

    return { template, diversityScore, proteinSig };
  });

  scored.sort((a, b) => b.diversityScore - a.diversityScore);

  return scored.map(s => s.template);
}

/**
 * Track which proteins have been used for a given day during generation.
 */
export function trackProteinUsage(
  template: ResolvedTemplate,
  usedProteinsToday: Set<string>,
): void {
  const protein = extractProteinSignature(template);
  if (protein) {
    usedProteinsToday.add(protein);
  }
}
