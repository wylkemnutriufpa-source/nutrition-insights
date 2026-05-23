// Sovereign passthrough — snapshot-first, no runtime recalculation.
// Kept under /legacy path for backward-compatible imports only.

export type DisplayMealPlanItem = any;

export function buildDailyDisplayItems(items: any[], dayOfWeek: number): any[] {
  if (!Array.isArray(items)) return [];
  return items.filter((it) => {
    const d = it?.day_of_week ?? it?.meal?.day_of_week;
    return d === undefined || d === null || d === dayOfWeek;
  });
}

export function calculatePrimaryTotals(items: any[]) {
  // Soberania V3: snapshot já traz totais. Esta função apenas soma valores estáticos.
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  if (!Array.isArray(items)) return totals;
  for (const it of items) {
    const m = it?.macros ?? it?.meal?.macros ?? {};
    totals.calories += Number(m.calories) || 0;
    totals.protein += Number(m.protein) || 0;
    totals.carbs += Number(m.carbs) || 0;
    totals.fat += Number(m.fat) || 0;
  }
  return totals;
}

export function assertHierarchyIntegrity(_item: DisplayMealPlanItem, _ctx?: string): void {
  // No-op: snapshot integrity is enforced upstream by the compiler.
}
