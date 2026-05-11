import { convertGramsToHousehold } from './unit-converter';

type PortionLike = {
  name: string;
  quantity?: number;
  measurementType?: string;
  portionValue?: number;
  kcal?: number;
  calories?: number;
  kcal_100g?: number;
  calories_100g?: number;
};

export function resolveDisplayGrams(item: PortionLike): number {
  const quantity = Number(item.quantity) || 0;
  const rawGrams = item.measurementType === 'unit' || item.measurementType === 'spoon'
    ? quantity * (Number(item.portionValue) || 1)
    : quantity;

  const kcal100 = Number(item.kcal_100g ?? item.calories_100g ?? 0);
  const totalKcal = Number(item.kcal ?? item.calories ?? 0);
  const inferredGrams = kcal100 > 0 && totalKcal > 0
    ? Math.round((totalKcal / kcal100) * 100)
    : 0;

  const hasCoherentInference = inferredGrams >= 5 && inferredGrams <= 600;
  const rawLooksCorrupted = rawGrams > 600 || (hasCoherentInference && rawGrams > 250 && rawGrams / inferredGrams > 3);

  if (rawLooksCorrupted && hasCoherentInference) return inferredGrams;
  return Math.max(0, Math.round(rawGrams));
}

export function formatDisplayPortion(item: PortionLike): string {
  const grams = resolveDisplayGrams(item);
  const portion = convertGramsToHousehold(item.name, grams);

  if (portion.measurementType === 'gram' || portion.measurementType === 'ml') {
    return `${grams}g`;
  }

  return `${portion.quantity} ${portion.portionLabel} (${grams}g)`;
}