import type { Tables } from "@/integrations/supabase/types";

type MealPlanItem = Tables<"meal_plan_items">;

type ComparableMealPlanItem = {
  title: string;
  description: string;
  meal_type: string;
  day_of_week: number | null;
  calories_target: number | null;
  protein_target: number | null;
  carbs_target: number | null;
  fat_target: number | null;
};

type ComparableInput = Partial<
  Pick<
    MealPlanItem,
    | "title"
    | "description"
    | "meal_type"
    | "day_of_week"
    | "calories_target"
    | "protein_target"
    | "carbs_target"
    | "fat_target"
  >
>;

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").trim().replace(/\s+/g, " ");

const normalizeNumber = (value: number | null | undefined) =>
  value == null ? null : Number(Number(value).toFixed(3));

const compareItems = (a: ComparableMealPlanItem, b: ComparableMealPlanItem) =>
  [
    a.day_of_week ?? -1,
    a.meal_type,
    a.title,
    a.description,
    a.calories_target ?? -1,
    a.protein_target ?? -1,
    a.carbs_target ?? -1,
    a.fat_target ?? -1,
  ]
    .map(String)
    .join("|")
    .localeCompare(
      [
        b.day_of_week ?? -1,
        b.meal_type,
        b.title,
        b.description,
        b.calories_target ?? -1,
        b.protein_target ?? -1,
        b.carbs_target ?? -1,
        b.fat_target ?? -1,
      ]
        .map(String)
        .join("|")
    );

export function snapshotMealPlanItems(items: ComparableInput[]): ComparableMealPlanItem[] {
  return items
    .map((item) => ({
      title: normalizeText(item.title),
      description: normalizeText(item.description),
      meal_type: String(item.meal_type ?? ""),
      day_of_week: item.day_of_week ?? null,
      calories_target: normalizeNumber(item.calories_target),
      protein_target: normalizeNumber(item.protein_target),
      carbs_target: normalizeNumber(item.carbs_target),
      fat_target: normalizeNumber(item.fat_target),
    }))
    .sort(compareItems);
}

export function haveMealPlanCollectionsChanged(before: ComparableInput[], after: ComparableInput[]) {
  const left = snapshotMealPlanItems(before);
  const right = snapshotMealPlanItems(after);

  if (left.length !== right.length) return true;

  return left.some((item, index) => JSON.stringify(item) !== JSON.stringify(right[index]));
}

export function compareMealPlanCollections(expected: ComparableInput[], persisted: ComparableInput[]) {
  const expectedSnapshot = snapshotMealPlanItems(expected);
  const persistedSnapshot = snapshotMealPlanItems(persisted);
  const mismatchIndex = expectedSnapshot.findIndex(
    (item, index) => JSON.stringify(item) !== JSON.stringify(persistedSnapshot[index])
  );

  return {
    matches: mismatchIndex === -1 && expectedSnapshot.length === persistedSnapshot.length,
    expectedCount: expectedSnapshot.length,
    persistedCount: persistedSnapshot.length,
    mismatchIndex,
    expectedItem: mismatchIndex >= 0 ? expectedSnapshot[mismatchIndex] : null,
    persistedItem: mismatchIndex >= 0 ? persistedSnapshot[mismatchIndex] ?? null : null,
  };
}