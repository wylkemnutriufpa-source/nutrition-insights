// 🛡️ LEGADO V1/V2 - NÃO UTILIZAR PARA V3
// Este arquivo está mantido apenas para compatibilidade com planos antigos.
// Planos V3 utilizam Snapshot Soberano e não passam por esta normalização.

export type DisplayMealPlanItem = any;

export function isPrimaryMealItem(item: any): boolean {
  return item.is_primary !== false;
}

export function assertHierarchyIntegrity(item: any, context: string): void {
  // No-op para V3
}

export function calculatePrimaryTotals(items: any[]) {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

export function buildDailyDisplayItems(items: any[], requestedDay?: number) {
  return items;
}

export function buildWeeklyDisplayDays(items: any[]) {
  return [1, 2, 3, 4, 5, 6, 0].map(day => ({ day, items: [] }));
}

export function buildPdfItemsForDailyPlan(items: any[], requestedDay?: number) {
  return items;
}
