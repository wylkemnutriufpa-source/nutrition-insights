import type { Tables } from "@/integrations/supabase/types";

type MealPlanItem = Tables<"meal_plan_items">;

type ComparableMealPlanItem = {
  title: string;
  description: string;
  tipo_refeicao: string;
  day_of_week: number | null;
  meta_calorias: number | null;
  meta_proteinas: number | null;
  meta_carboidratos: number | null;
  meta_gorduras: number | null;
};

type ComparableInput = Partial<
  Pick<
    MealPlanItem,
    | "title"
    | "description"
    | "tipo_refeicao"
    | "day_of_week"
    | "meta_calorias"
    | "meta_proteinas"
    | "meta_carboidratos"
    | "meta_gorduras"
  >
>;

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").trim().replace(/\s+/g, " ");

const normalizeNumber = (value: number | null | undefined) =>
  value == null ? null : Number(Number(value).toFixed(3));

const compareItems = (a: ComparableMealPlanItem, b: ComparableMealPlanItem) =>
  [
    a.day_of_week ?? -1,
    a.tipo_refeicao,
    a.title,
    a.description,
    a.meta_calorias ?? -1,
    a.meta_proteinas ?? -1,
    a.meta_carboidratos ?? -1,
    a.meta_gorduras ?? -1,
  ]
    .map(String)
    .join("|")
    .localeCompare(
      [
        b.day_of_week ?? -1,
        b.tipo_refeicao,
        b.title,
        b.description,
        b.meta_calorias ?? -1,
        b.meta_proteinas ?? -1,
        b.meta_carboidratos ?? -1,
        b.meta_gorduras ?? -1,
      ]
        .map(String)
        .join("|")
    );

export function snapshotMealPlanItems(items: ComparableInput[]): ComparableMealPlanItem[] {
  return items
    .map((item) => ({
      title: normalizeText(item.title),
      description: normalizeText(item.description),
      tipo_refeicao: String(item.tipo_refeicao ?? ""),
      day_of_week: item.day_of_week ?? null,
      meta_calorias: normalizeNumber(item.meta_calorias),
      meta_proteinas: normalizeNumber(item.meta_proteinas),
      meta_carboidratos: normalizeNumber(item.meta_carboidratos),
      meta_gorduras: normalizeNumber(item.meta_gorduras),
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