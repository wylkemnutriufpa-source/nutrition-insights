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
  return items.reduce((acc, item) => ({
    calories: acc.calories + (Number(item.meta_calorias) || Number(item.kcal) || 0),
    protein: acc.protein + (Number(item.meta_proteinas) || Number(item.protein) || 0),
    carbs: acc.carbs + (Number(item.meta_carboidratos) || Number(item.carbs) || 0),
    fat: acc.fat + (Number(item.meta_gorduras) || Number(item.fat) || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

export function buildDailyDisplayItems(items: any[], requestedDay?: number) {
  return items;
}

export function buildWeeklyDisplayDays(items: any[]) {
  return [1, 2, 3, 4, 5, 6, 0].map(day => ({ 
    day, 
    items: items.filter(i => (i.day_of_week ?? 0) === day) 
  }));
}

export function buildPdfItemsForDailyPlan(items: any[], requestedDay?: number) {
  return items;
}
