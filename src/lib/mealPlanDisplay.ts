import type { Tables } from "@/integrations/supabase/types";

export type DisplayMealPlanItem = Tables<"meal_plan_items"> & {
  metadata?: Record<string, any> | null;
  edit_metadata?: Record<string, any> | null;
  substitution_group_id?: string | null;
  is_primary?: boolean | null;
};

export interface MealSubstitutionOption {
  id: string;
  title: string;
  description?: string | null;
  calories_target?: number | null;
  protein_target?: number | null;
  carbs_target?: number | null;
  fat_target?: number | null;
}

type GroupedMeal = {
  groupId: string;
  primary: DisplayMealPlanItem;
  substitutions: DisplayMealPlanItem[];
};

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MAX_PATIENT_SUBSTITUTIONS = 5;

function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getItemTime(item: DisplayMealPlanItem): string {
  return String((item as any).scheduled_time || item.created_at || item.id || "");
}

export function isPrimaryMealItem(item: DisplayMealPlanItem): boolean {
  return item.is_primary !== false;
}

export function sortPlanItems<T extends DisplayMealPlanItem>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aDay = a.day_of_week === 0 ? 7 : (a.day_of_week ?? 99);
    const bDay = b.day_of_week === 0 ? 7 : (b.day_of_week ?? 99);
    if (aDay !== bDay) return aDay - bDay;
    const aMeal = String(a.meal_type || "");
    const bMeal = String(b.meal_type || "");
    if (aMeal !== bMeal) return aMeal.localeCompare(bMeal);
    if (isPrimaryMealItem(a) !== isPrimaryMealItem(b)) return isPrimaryMealItem(a) ? -1 : 1;
    return getItemTime(a).localeCompare(getItemTime(b));
  });
}

function groupItems(items: DisplayMealPlanItem[]): GroupedMeal[] {
  const groups = new Map<string, DisplayMealPlanItem[]>();

  for (const item of sortPlanItems(items)) {
    const groupId = item.substitution_group_id || `orphan:${item.id}`;
    const current = groups.get(groupId) || [];
    current.push(item);
    groups.set(groupId, current);
  }

  return Array.from(groups.entries()).map(([groupId, groupItems]) => {
    const primary = groupItems.find(isPrimaryMealItem) || groupItems[0];
    const substitutions = groupItems
      .filter((item) => item.id !== primary.id)
      .filter((item) => !isPrimaryMealItem(item) || !!item.substitution_group_id)
      .slice(0, MAX_PATIENT_SUBSTITUTIONS);

    return { groupId, primary, substitutions };
  });
}

function withSubstitutionMetadata(group: GroupedMeal): DisplayMealPlanItem {
  const options: MealSubstitutionOption[] = group.substitutions.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    calories_target: item.calories_target,
    protein_target: item.protein_target,
    carbs_target: item.carbs_target,
    fat_target: item.fat_target,
  }));

  return {
    ...group.primary,
    metadata: {
      ...((group.primary as any).metadata || {}),
      substitution_group_id: group.groupId,
      substitution_options: options,
      substitution_count: options.length,
    },
  };
}

export function getAvailablePlanDays(items: DisplayMealPlanItem[]): number[] {
  const days = new Set<number>();
  for (const item of items) {
    if (item.day_of_week !== null && item.day_of_week !== undefined) days.add(item.day_of_week);
  }
  return DAY_ORDER.filter((day) => days.has(day));
}

export function selectCanonicalDayItems(items: DisplayMealPlanItem[], requestedDay?: number): DisplayMealPlanItem[] {
  if (items.length === 0) return [];

  const hasConcreteDays = items.some((item) => item.day_of_week !== null && item.day_of_week !== undefined);
  if (!hasConcreteDays) return items;

  if (requestedDay !== undefined) {
    const sameDay = items.filter((item) => item.day_of_week === requestedDay);
    if (sameDay.some(isPrimaryMealItem)) return sameDay;
  }

  const availableDays = getAvailablePlanDays(items);
  const fallbackDay = availableDays[0];
  return fallbackDay !== undefined ? items.filter((item) => item.day_of_week === fallbackDay) : items;
}

export function buildDailyDisplayItems(items: DisplayMealPlanItem[], requestedDay?: number): DisplayMealPlanItem[] {
  return groupItems(selectCanonicalDayItems(items, requestedDay))
    .filter((group) => isPrimaryMealItem(group.primary))
    .map(withSubstitutionMetadata);
}

export function buildWeeklyDisplayDays(items: DisplayMealPlanItem[]): Array<{ day: number; items: DisplayMealPlanItem[] }> {
  const canonicalGroups = groupItems(selectCanonicalDayItems(items));

  return DAY_ORDER.map((day, dayIndex) => ({
    day,
    items: canonicalGroups.map((group) => {
      const options = [group.primary, ...group.substitutions];
      const selected = options[dayIndex % Math.max(options.length, 1)] || group.primary;
      const isSubstitution = selected.id !== group.primary.id;
      const itemForDay: DisplayMealPlanItem = {
        ...group.primary,
        ...selected,
        id: group.primary.id,
        day_of_week: day,
        calories_target: group.primary.calories_target,
        protein_target: group.primary.protein_target,
        carbs_target: group.primary.carbs_target,
        fat_target: group.primary.fat_target,
        is_primary: true,
        metadata: {
          ...((group.primary as any).metadata || {}),
          substitution_group_id: group.groupId,
          substitution_options: group.substitutions.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            calories_target: item.calories_target,
            protein_target: item.protein_target,
            carbs_target: item.carbs_target,
            fat_target: item.fat_target,
          })),
          weekly_variant_source_id: selected.id,
          weekly_variant_is_substitution: isSubstitution,
        },
      };
      return itemForDay;
    }),
  }));
}

export function calculatePrimaryTotals(items: DisplayMealPlanItem[]) {
  const primaryItems = groupItems(items).map((group) => group.primary).filter(isPrimaryMealItem);
  return primaryItems.reduce(
    (acc, item) => ({
      calories: acc.calories + asNumber(item.calories_target ?? (item as any).metadata?.calories_target ?? (item as any).metadata?.calories),
      protein: acc.protein + asNumber(item.protein_target ?? (item as any).metadata?.protein_target ?? (item as any).metadata?.protein),
      carbs: acc.carbs + asNumber(item.carbs_target ?? (item as any).metadata?.carbs_target ?? (item as any).metadata?.carbs),
      fat: acc.fat + asNumber(item.fat_target ?? (item as any).metadata?.fat_target ?? (item as any).metadata?.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function buildPdfItemsForDailyPlan(items: DisplayMealPlanItem[], requestedDay?: number): DisplayMealPlanItem[] {
  const dayItems = selectCanonicalDayItems(items, requestedDay);
  return groupItems(dayItems).flatMap((group) => [group.primary, ...group.substitutions]);
}
