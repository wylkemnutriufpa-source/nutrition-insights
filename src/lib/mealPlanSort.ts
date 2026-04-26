import type { Tables } from "@/integrations/supabase/types";

export type MealPlanItem = Tables<"meal_plan_items">;

/**
 * Deterministic sorting for meal plan items.
 * Criteria:
 * 1. Primary items first
 * 2. Calories target (descending)
 * 3. ID (alphabetical) for stable tie-breaking
 */
export function sortMealPlanItems(items: MealPlanItem[]): MealPlanItem[] {
  return [...items].sort((a, b) => {
    // 1. Primary items first
    const aPri = (a as any).is_primary ? 1 : 0;
    const bPri = (b as any).is_primary ? 1 : 0;
    if (aPri !== bPri) return bPri - aPri;

    // 2. calories_target (descending)
    const aCal = Number(a.calories_target) || 0;
    const bCal = Number(b.calories_target) || 0;
    if (aCal !== bCal) return bCal - aCal;

    // 3. Stable tie-breaker: ID
    return (a.id || "").localeCompare(b.id || "");
  });
}
