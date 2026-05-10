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

  let allowedDb = foodDb.filter(f => !restrictions.some(r => f.name.toLowerCase().includes(r.toLowerCase())));

  // PARTE 2 — TEMPLATES FUNCIONAIS (LOGICA DE PLOTAGEM DETERMINISTICA)
  if (isBreakfast) {
    // Café Fitness: Pão integral 2 fatias (50g) + Ovos mexidos 2 unid (100g) + Banana M (90g)
    const pão = allowedDb.find(f => f.name.toLowerCase().includes("pão integral")) || allowedDb.find(f => f.name.toLowerCase().includes("pão"));
    const ovo = allowedDb.find(f => f.name.toLowerCase().includes("ovo"));
    const banana = allowedDb.find(f => f.name.toLowerCase().includes("banana"));

    if (pão) items.push(createPlannedItem(pão, 50));
    if (ovo) items.push(createPlannedItem(ovo, 100));
    if (banana) items.push(createPlannedItem(banana, 90));
    
    return finalizeMeal(type, time, items, targetMacros);
  }

  if (isSnack) {
    // Lanches: FRUTAS + LATICÍNIO (se couber nos macros)
    const isMorningSnack = type === "lanche_da_manha";
    const isAfternoonSnack = type === "lanche_da_tarde";
    const isSupper = type === "ceia";

    const fruit = allowedDb.find(f => f.category === "fruit") || foodDb.find(f => f.category === "fruit");
    const dairy = allowedDb.find(f => f.category === "dairy") || foodDb.find(f => f.category === "dairy");
    const nut = allowedDb.find(f => f.category === "fat" && (f.name.toLowerCase().includes("castanha") || f.name.toLowerCase().includes("amendoim")));

    if (isMorningSnack) {
      if (fruit) items.push(createPlannedItem(fruit, 150));
    } else if (isAfternoonSnack) {
      if (dairy) items.push(createPlannedItem(dairy, 170));
      if (fruit) items.push(createPlannedItem(fruit, 100));
    } else if (isSupper) {
      if (dairy) items.push(createPlannedItem(dairy, 100));
      if (nut) items.push(createPlannedItem(nut, 15));
    } else {
      // Fallback genérico para lanche
      if (fruit) items.push(createPlannedItem(fruit, 150));
    }

    return finalizeMeal(type, time, items, targetMacros);
  }

  if (isLunchOrDinner) {
    // Prato Fitness: Frango 150g + Arroz 100g + Feijão 100g + Brócolis 80g + Azeite 5g
    const frango = allowedDb.find(f => f.name.toLowerCase().includes("frango"));
    const arroz = allowedDb.find(f => f.name.toLowerCase().includes("arroz"));
    const feijão = allowedDb.find(f => f.name.toLowerCase().includes("feijão"));
    const brócolis = allowedDb.find(f => f.name.toLowerCase().includes("brócolis"));
    const azeite = allowedDb.find(f => f.name.toLowerCase().includes("azeite"));

    if (frango) items.push(createPlannedItem(frango, 150));
    if (arroz) items.push(createPlannedItem(arroz, 100));
    if (feijão) items.push(createPlannedItem(feijão, 100));
    if (brócolis) items.push(createPlannedItem(brócolis, 80));
    if (azeite) items.push(createPlannedItem(azeite, 5));

    return finalizeMeal(type, time, items, targetMacros);
  }

  return finalizeMeal(type, time, items, targetMacros);
}

function finalizeMeal(type: MealType, time: string, items: PlannedItem[], targetMacros: any): PlannedMeal {
  const totalMacros = items.reduce(
    (acc, item) => ({
      protein_g: round(acc.protein_g + item.macros.protein_g),
      carb_g: round(acc.carb_g + item.macros.carb_g),
      fat_g: round(acc.fat_g + item.macros.fat_g),
      kcal: round(acc.kcal + item.macros.kcal),
    }),
    { protein_g: 0, carb_g: 0, fat_g: 0, kcal: 0 }
  );

  return { type, time, items, totalMacros };
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
