import type {
  FoodRef,
  SlotSpec,
  MealTargets,
} from "../../../supabase/functions/_shared/meal-assembler/mealAssembler.types.ts";

export const FOODS: Record<string, FoodRef> = {
  frango:  { id: "frango",  name: "Frango grelhado", macros_per_100g: { kcal: 165, protein_g: 31,  carbs_g: 0,    fat_g: 3.6 } },
  arroz:   { id: "arroz",   name: "Arroz integral",  macros_per_100g: { kcal: 124, protein_g: 2.6, carbs_g: 25.8, fat_g: 1.0 } },
  brocolis:{ id: "brocolis",name: "Brócolis",        macros_per_100g: { kcal: 34,  protein_g: 2.8, carbs_g: 7,    fat_g: 0.4 } },
  azeite:  { id: "azeite",  name: "Azeite extra",    macros_per_100g: { kcal: 884, protein_g: 0,   carbs_g: 0,    fat_g: 100 } },
  banana:  { id: "banana",  name: "Banana",          macros_per_100g: { kcal: 89,  protein_g: 1.1, carbs_g: 22.8, fat_g: 0.3 } },
};

export function lunchSlots(): SlotSpec[] {
  return [
    { role: "protein_lean", food: FOODS.frango,   base_grams: 150 },
    { role: "carb_complex", food: FOODS.arroz,    base_grams: 120 },
    { role: "vegetable",    food: FOODS.brocolis, base_grams: 100 },
    { role: "fat_source",   food: FOODS.azeite,   base_grams: 8   },
  ];
}

export function targetsFor(slots: SlotSpec[]): MealTargets {
  // Build "natural" targets ≈ totals of base_grams so reconciler converges.
  let kcal = 0, p = 0, c = 0, f = 0;
  for (const s of slots) {
    const k = s.base_grams / 100;
    kcal += s.food.macros_per_100g.kcal * k;
    p += s.food.macros_per_100g.protein_g * k;
    c += s.food.macros_per_100g.carbs_g * k;
    f += s.food.macros_per_100g.fat_g * k;
  }
  return { kcal: Math.round(kcal), protein_g: Math.round(p), carbs_g: Math.round(c), fat_g: Math.round(f) };
}
