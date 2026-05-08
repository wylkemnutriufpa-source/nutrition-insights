import { Food, FoodCategory } from "./food-database";
import { MealType } from "./meal-distribution";
import { Marmita } from "./marmitas-database";

export interface PlannedItem {
  foodId: string;
  name: string;
  grams: number;
  macros: {
    protein_g: number;
    carb_g: number;
    fat_g: number;
    kcal: number;
  };
}

export interface PlannedMeal {
  type: MealType;
  time: string;
  items: PlannedItem[];
  totalMacros: {
    protein_g: number;
    carb_g: number;
    fat_g: number;
    kcal: number;
  };
}

export interface BuildMealOptions {
  restrictions?: string[]; // IDs ou nomes (usaremos nomes para facilitar aqui)
  preferences?: string[];  // IDs ou nomes
}

/**
 * Constrói uma refeição baseada em alvos de macros e banco de alimentos.
 */
export function buildMeal(
  type: MealType,
  time: string,
  targetMacros: { protein_g: number; carb_g: number; fat_g: number; kcal: number },
  foodDb: Food[],
  options: BuildMealOptions = {}
): PlannedMeal {
  const items: PlannedItem[] = [];
  const { restrictions = [], preferences = [] } = options;

  const isLunchOrDinner = type === "almoço" || type === "jantar";
  const isBreakfastOrSnack = type === "cafe_da_manha" || type.includes("lanche");

  // 1. PROTEÍNA PRIMEIRO
  const proteinFood = selectFood(foodDb, "protein", restrictions, preferences);
  let proteinGrams = 0;
  let proteinKcal = 0;

  if (proteinFood) {
    // meta_proteina / (proteína_por_100g / 100)
    proteinGrams = (targetMacros.protein_g / (proteinFood.protein_100g / 100));
    // Arredondar para 5g e Clamping razoável
    proteinGrams = roundTo5(Math.min(Math.max(proteinGrams, 80), 250));
    
    const item = createPlannedItem(proteinFood, proteinGrams);
    items.push(item);
    proteinKcal = item.macros.kcal;
  }

  // 2. GORDURA E VEGETAIS/FRUTAS
  let fixedKcal = 0;
  let currentFat = items.reduce((acc, i) => acc + i.macros.fat_g, 0);

  // Vegetais (100g fixos em almoço/jantar)
  if (isLunchOrDinner) {
    const vegFood = selectFood(foodDb, "vegetable", restrictions, preferences);
    if (vegFood) {
      const item = createPlannedItem(vegFood, 100);
      items.push(item);
      fixedKcal += item.macros.kcal;
    }
    
    // Ajuste de Gordura: Tenta atingir a meta da refeição
    const remainingFat = targetMacros.fat_g - currentFat;
    if (remainingFat > 0) {
      const fatFood = selectFood(foodDb, "fat", restrictions, preferences);
      if (fatFood) {
        // grams = remaining_fat / (fat_per_100g / 100)
        let fatGrams = remainingFat / (fatFood.fat_100g / 100);
        // Limite razoável para gordura adicionada (ex: 5g a 30g)
        fatGrams = Math.min(Math.max(fatGrams, 5), 30);
        const item = createPlannedItem(fatFood, fatGrams);
        items.push(item);
        fixedKcal += item.macros.kcal;
      }
    }
  }

  // Frutas/Laticínios em lanches
  if (isBreakfastOrSnack) {
    const fruitFood = selectFood(foodDb, "fruit", restrictions, preferences);
    if (fruitFood) {
      const item = createPlannedItem(fruitFood, 120);
      items.push(item);
      fixedKcal += item.macros.kcal;
    }
    
    if (type === "cafe_da_manha") {
      const butter = foodDb.find(f => f.name.toLowerCase().includes("manteiga") || f.name.toLowerCase().includes("azeite"));
      if (butter) {
        const item = createPlannedItem(butter, 8);
        items.push(item);
        fixedKcal += item.macros.kcal;
      }
    }
  }

  // 3. CARBOIDRATO COM O RESTANTE
  const currentKcal = items.reduce((acc, i) => acc + i.macros.kcal, 0);
  const remainingKcal = targetMacros.kcal - currentKcal;
  const carbFood = selectFood(foodDb, "carb", restrictions, preferences);
  
  if (carbFood && remainingKcal > 0) {
    let carbGrams = remainingKcal / (carbFood.kcal_100g / 100);
    carbGrams = roundTo5(Math.min(Math.max(carbGrams, 30), 500));
    items.push(createPlannedItem(carbFood, carbGrams));
  }

  // Calcular totais finais
  const totalMacros = items.reduce(
    (acc, item) => ({
      protein_g: round(acc.protein_g + item.macros.protein_g),
      carb_g: round(acc.carb_g + item.macros.carb_g),
      fat_g: round(acc.fat_g + item.macros.fat_g),
      kcal: round(acc.kcal + item.macros.kcal),
    }),
    { protein_g: 0, carb_g: 0, fat_g: 0, kcal: 0 }
  );

  return {
    type,
    time,
    items,
    totalMacros,
  };
}

function selectFood(
  db: Food[],
  category: FoodCategory,
  restrictions: string[],
  preferences: string[]
): Food | undefined {
  const available = db.filter(
    f => f.category === category && !restrictions.some(r => f.name.toLowerCase().includes(r.toLowerCase()))
  );

  if (available.length === 0) return undefined;

  // Priorizar preferências
  const preferred = available.filter(f =>
    preferences.some(p => f.name.toLowerCase().includes(p.toLowerCase()))
  );

  if (preferred.length > 0) return preferred[0];

  // Se não houver preferência, retorna o primeiro (determinístico)
  return available[0];
}

function createPlannedItem(food: Food, grams: number): PlannedItem {
  const factor = grams / 100;
  return {
    foodId: food.id,
    name: food.name,
    grams: round(grams),
    macros: {
      protein_g: round(food.protein_100g * factor),
      carb_g: round(food.carb_100g * factor),
      fat_g: round(food.fat_100g * factor),
      kcal: round(food.kcal_100g * factor),
    },
  };
}

export function buildMealWithMarmita(
  type: MealType,
  time: string,
  marmita: Marmita
): PlannedMeal {
  return {
    type,
    time,
    items: [
      {
        foodId: marmita.id,
        name: `Marmita: ${marmita.nome}`,
        grams: 1, // Representa 1 unidade/marmita
        macros: {
          protein_g: marmita.protein_g,
          carb_g: marmita.carbs_g,
          fat_g: marmita.fat_g,
          kcal: marmita.calories,
        },
      },
    ],
    totalMacros: {
      protein_g: marmita.protein_g,
      carb_g: marmita.carbs_g,
      fat_g: marmita.fat_g,
      kcal: marmita.calories,
    },
  };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function roundTo5(n: number): number {
  return Math.round(n / 5) * 5;
}
