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

  // 2. REGRAS ESPECÍFICAS DE ESTRUTURA
  if (isBreakfast) {
    // Café da Manhã: Pão, Tapioca ou Cuscuz + Ovo ou Queijo + Fruta
    const options = [
      { bread: "pão", protein: "ovo" },
      { bread: "tapioca", protein: "queijo" },
      { bread: "cuscuz", protein: "ovo" },
      { bread: "pão", protein: "queijo" },
      { bread: "tapioca", protein: "ovo" },
      { bread: "cuscuz", protein: "queijo" }
    ];

    const combo = options[Math.floor(Math.random() * options.length)];

    const carb = allowedDb.find(f => f.name.toLowerCase().includes(combo.bread)) || selectFood(allowedDb, "carb", [], preferences);
    const protein = allowedDb.find(f => f.name.toLowerCase().includes(combo.protein)) || selectFood(allowedDb, "protein", [], preferences);
    const fruit = allowedDb.find(f => f.category === "fruit") || selectFood(allowedDb, "fruit", [], preferences);

    if (carb) {
      const g = carb.name.toLowerCase().includes("pão") ? 50 : 80;
      items.push(createPlannedItem(carb, g));
    }
    if (protein) {
      const g = protein.name.toLowerCase().includes("ovo") ? 50 : 30;
      items.push(createPlannedItem(protein, g));
    }
    if (fruit) {
      items.push(createPlannedItem(fruit, 120));
    }
    
    return finalizeMeal(type, time, items, targetMacros);
  }

  if (isSnack) {
    // Lanches: SOMENTE Frutas
    const fruits = allowedDb.filter(f => f.category === "fruit");
    if (fruits.length > 0) {
      const fruit = fruits[Math.floor(Math.random() * fruits.length)];
      items.push(createPlannedItem(fruit, 150));
    }
    return finalizeMeal(type, time, items, targetMacros);
  }

  if (isLunchOrDinner) {
    // Almoço e Jantar: Arroz, Feijão, Salada, Proteína
    const protein = selectFood(allowedDb, "protein", [], preferences) || selectFood(foodDb, "protein", restrictions, preferences);
    const rice = allowedDb.find(f => f.name.toLowerCase().includes("arroz")) || selectFood(allowedDb, "carb", [], preferences);
    const beans = allowedDb.find(f => f.name.toLowerCase().includes("feijão")) || foodDb.find(f => f.name.toLowerCase().includes("feijão"));
    const salad = allowedDb.find(f => f.category === "vegetable") || selectFood(allowedDb, "vegetable", [], preferences);

    if (protein) items.push(createPlannedItem(protein, 150));
    if (rice) items.push(createPlannedItem(rice, 120));
    if (beans) items.push(createPlannedItem(beans, 80));
    if (salad) items.push(createPlannedItem(salad, 100));

    return finalizeMeal(type, time, items, targetMacros);
  }

  // Fallback para outras refeições
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
