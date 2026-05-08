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
  const isBreakfast = type === "cafe_da_manha";
  const isSnack = type.includes("lanche") || type === "ceia";

  // 1. FILTRAGEM POR REFEIÇÃO (REGRAS CLÍNICAS)
  let allowedDb = foodDb.filter(f => !restrictions.some(r => f.name.toLowerCase().includes(r.toLowerCase())));

  if (isBreakfast) {
    // Café da Manhã: Pão, Ovo, Queijo, Iogurte, Fruta (Sem arroz/feijão/carne pesada)
    allowedDb = allowedDb.filter(f => 
      f.category === "fruit" || 
      f.name.toLowerCase().includes("pão") || 
      f.name.toLowerCase().includes("ovo") || 
      f.name.toLowerCase().includes("queijo") || 
      f.name.toLowerCase().includes("iogurte") ||
      f.name.toLowerCase().includes("manteiga") ||
      f.name.toLowerCase().includes("aveia")
    );
  } else if (isSnack) {
    // Lanches: Frutas, Iogurtes, Whey, Queijos leves
    allowedDb = allowedDb.filter(f => 
      f.category === "fruit" || 
      f.name.toLowerCase().includes("iogurte") || 
      f.name.toLowerCase().includes("whey") || 
      f.name.toLowerCase().includes("queijo") ||
      f.name.toLowerCase().includes("aveia") ||
      f.name.toLowerCase().includes("castanha")
    );
  }

  // 2. PROTEÍNA PRIMEIRO (Em todas as refeições)
  const proteinFood = selectFood(allowedDb, "protein", [], preferences) || selectFood(foodDb, "protein", restrictions, preferences);
  let proteinGrams = 0;

  if (proteinFood) {
    proteinGrams = (targetMacros.protein_g / (proteinFood.protein_100g / 100));
    // Limites de gramas baseados no tipo de refeição
    const minG = isSnack ? 30 : 80;
    const maxG = isSnack ? 150 : 250;
    proteinGrams = roundTo5(Math.min(Math.max(proteinGrams, minG), maxG));
    
    const item = createPlannedItem(proteinFood, proteinGrams);
    items.push(item);
  }

  // 3. VEGETAIS E FRUTAS (Componentes fixos)
  if (isLunchOrDinner) {
    const vegFood = selectFood(allowedDb, "vegetable", [], preferences) || selectFood(foodDb, "vegetable", restrictions, preferences);
    if (vegFood) {
      items.push(createPlannedItem(vegFood, 100)); // 100g fixos
    }
  }

  if (isBreakfast || isSnack) {
    const fruitFood = selectFood(allowedDb, "fruit", [], preferences) || selectFood(foodDb, "fruit", restrictions, preferences);
    if (fruitFood) {
      const grams = type === "ceia" ? 80 : 120; // Fruta menor na ceia
      items.push(createPlannedItem(fruitFood, grams));
    }
  }

  // 4. GORDURA (Foco em Almoço/Jantar ou Café)
  const currentFat = items.reduce((acc, i) => acc + i.macros.fat_g, 0);
  const remainingFat = targetMacros.fat_g - currentFat;
  if (remainingFat > 2 && (isLunchOrDinner || isBreakfast)) {
    const fatFood = selectFood(allowedDb, "fat", [], preferences) || selectFood(foodDb, "fat", restrictions, preferences);
    if (fatFood) {
      let fatGrams = remainingFat / (fatFood.fat_100g / 100);
      fatGrams = Math.min(Math.max(fatGrams, 5), 15);
      items.push(createPlannedItem(fatFood, fatGrams));
    }
  }

  // 5. CARBOIDRATO (Completa as calorias)
  const currentKcal = items.reduce((acc, i) => acc + i.macros.kcal, 0);
  const remainingKcal = targetMacros.kcal - currentKcal;
  const carbFood = selectFood(allowedDb, "carb", [], preferences) || selectFood(foodDb, "carb", restrictions, preferences);
  
  if (carbFood && remainingKcal > 15) {
    let carbGrams = remainingKcal / (carbFood.kcal_100g / 100);
    // Limites de carbo
    const maxCarb = isLunchOrDinner ? 300 : 150;
    carbGrams = roundTo5(Math.min(Math.max(carbGrams, 20), maxCarb));
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
