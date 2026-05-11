import { BASE_FOODS } from './food-database';
import { convertGramsToHousehold } from './unit-converter';

type PortionLike = {
  name: string;
  quantity?: number;
  grams?: number;
  suggestedQuantity?: number;
  measurementType?: string;
  portionValue?: number;
  portionLabel?: string;
  kcal?: number;
  calories?: number;
  kcal_100g?: number;
  calories_100g?: number;
};

const normalizeFoodName = (value: unknown) => String(value || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const parseGramsFromText = (value?: string) => {
  const match = String(value || "").match(/(\d+(?:[,.]\d+)?)\s*g\b/i);
  if (!match) return 0;
  return Math.round(Number(match[1].replace(",", ".")) || 0);
};

const lookupKcal100 = (item: PortionLike) => {
  const direct = Number(item.kcal_100g ?? item.calories_100g ?? 0);
  if (direct > 0) return direct;

  const normalized = normalizeFoodName(item.name);
  const base = BASE_FOODS.find((food) => {
    const candidate = normalizeFoodName(food.name);
    return candidate === normalized || candidate.includes(normalized) || normalized.includes(candidate);
  });
  if (base?.kcal_100g) return base.kcal_100g;

  if (item.measurementType === "gram" && Number(item.portionValue) === 100) {
    return Number(item.kcal ?? item.calories ?? 0);
  }

  return 0;
};

export function resolveDisplayGrams(item: PortionLike): number {
  const explicitGrams = Number(item.grams ?? item.suggestedQuantity ?? 0);
  if (explicitGrams > 0) return Math.round(explicitGrams);

  const quantity = Number(item.quantity) || 0;
  const hasQuantity = quantity > 0;
  const rawGrams = hasQuantity
    ? (item.measurementType === 'unit' || item.measurementType === 'spoon'
      ? quantity * (Number(item.portionValue) || 1)
      : quantity)
    : 0;

  const kcal100 = lookupKcal100(item);
  const totalKcal = Number(item.kcal ?? item.calories ?? 0);
  const inferredGrams = kcal100 > 0 && totalKcal > 0
    ? Math.round((totalKcal / kcal100) * 100)
    : 0;

  const hasCoherentInference = inferredGrams >= 5 && inferredGrams <= 600;
  const rawLooksCorrupted = rawGrams > 600 || (hasCoherentInference && rawGrams > 250 && rawGrams / inferredGrams > 3);

  if (!hasQuantity && hasCoherentInference) return inferredGrams;
  if (!hasQuantity) return parseGramsFromText(item.portionLabel) || Math.max(0, Math.round(Number(item.portionValue) || 0));
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