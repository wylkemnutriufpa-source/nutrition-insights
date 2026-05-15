import type { Tables } from "@/integrations/supabase/types";

export type MealPlanItem = Tables<"meal_plan_items">;

/**
 * Deterministic sorting for meal plan items.
 * Criteria:
 * 1. Primary items first
 * 2. Calories target (descending)
 * 3. ID (alphabetical) for stable tie-breaking
 */
export const MEAL_TYPE_ORDER: Record<string, number> = {
  breakfast: 0,
  morning_snack: 1,
  lunch: 2,
  afternoon_snack: 3,
  dinner: 4,
  evening_snack: 5,
};

// Map day of week to sortable integer (1=Mon ... 0=Sun)
// We want 1, 2, 3, 4, 5, 6, 0
const getDayOrder = (day: number | null | undefined): number => {
  if (day === null || day === undefined) return 99;
  if (day === 0) return 7; // Sunday last
  return day;
};

export function sortMealPlanItems(items: MealPlanItem[]): MealPlanItem[] {
  return [...items].sort((a, b) => {
    // 0. Day of week
    const aDay = getDayOrder(a.day_of_week);
    const bDay = getDayOrder(b.day_of_week);
    if (aDay !== bDay) return aDay - bDay;

    // 1. Meal type
    const aType = MEAL_TYPE_ORDER[a.tipo_refeicao || ""] ?? 99;
    const bType = MEAL_TYPE_ORDER[b.tipo_refeicao || ""] ?? 99;
    if (aType !== bType) return aType - bType;

    // 2. Primary items first
    const aPri = (a as any).is_primary ? 1 : 0;
    const bPri = (b as any).is_primary ? 1 : 0;
    if (aPri !== bPri) return bPri - aPri;

    // 3. meta_calorias (descending)
    const aCal = Number(a.meta_calorias) || 0;
    const bCal = Number(b.meta_calorias) || 0;
    if (aCal !== bCal) return bCal - aCal;

    // 4. Stable tie-breaker: ID
    return (a.id || "").localeCompare(b.id || "");
  });
}
