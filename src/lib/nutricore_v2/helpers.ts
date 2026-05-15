// Stub: nutricore_v2 helpers.
export function calculateItemMacros(item: any, quantity: number = 100) {
  const factor = quantity / 100;
  return {
    kcal: (item?.kcal_per_100g ?? item?.kcal ?? 0) * factor,
    protein: (item?.protein_per_100g ?? item?.protein ?? 0) * factor,
    carbs: (item?.carbs_per_100g ?? item?.carbs ?? 0) * factor,
    fat: (item?.fat_per_100g ?? item?.fat ?? 0) * factor,
  };
}
