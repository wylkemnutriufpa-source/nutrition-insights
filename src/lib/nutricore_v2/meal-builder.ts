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

  // 🛡️ Fator de escala blindado: clamp 0.4x – 2.5x (impede grams astronômicos como 24750g de frango)
  const rawScale = (targetMacros.kcal || 0) / 400;
  const scale = Number.isFinite(rawScale) && rawScale > 0
    ? Math.max(0.4, Math.min(2.5, rawScale))
    : 1;

  // PARTE 2 — TEMPLATES FUNCIONAIS (LOGICA DE PLOTAGEM DETERMINISTICA)
  if (isBreakfast) {
    // Café Fitness: Pão integral 2 fatias (50g) + Ovos mexidos 2 unid (100g) + Banana M (90g)
    const pão = allowedDb.find(f => f.name.toLowerCase().includes("pão integral")) || allowedDb.find(f => f.name.toLowerCase().includes("pão"));
    const ovo = allowedDb.find(f => f.name.toLowerCase().includes("ovo"));
    const banana = allowedDb.find(f => f.name.toLowerCase().includes("banana"));

    if (pão) items.push(createPlannedItem(pão, Math.min(100, Math.max(25, roundTo5(50 * scale)))));
    if (ovo) items.push(createPlannedItem(ovo, Math.min(200, Math.max(50, roundTo5(100 * scale)))));
    if (banana) items.push(createPlannedItem(banana, Math.min(180, Math.max(40, roundTo5(90 * scale)))));
    
    return finalizeMeal(type, time, items, targetMacros);
  }

  if (isSnack) {
    // Lanches: FRUTAS + PROTEÍNA LEVE (Iogurte, Whey, Ovo, Queijo)
    const isMorningSnack = type === "lanche_da_manha";
    const isAfternoonSnack = type === "lanche_da_tarde";
    const isSupper = type === "ceia";

    const fruit = allowedDb.find(f => f.category === "fruit") || foodDb.find(f => f.category === "fruit");
    const dairy = allowedDb.find(f => f.category === "dairy") || foodDb.find(f => f.category === "dairy");
    const nut = allowedDb.find(f => f.category === "fat" && (f.name.toLowerCase().includes("castanha") || f.name.toLowerCase().includes("amendoim")));
    const yogurt = allowedDb.find(f => f.name.toLowerCase().includes("iogurte")) || dairy;
    const protein = allowedDb.find(f => f.name.toLowerCase().includes("whey")) || allowedDb.find(f => f.name.toLowerCase().includes("ovo")) || dairy;

    if (isMorningSnack) {
      if (fruit) items.push(createPlannedItem(fruit, roundTo5(150 * scale)));
      if (yogurt) items.push(createPlannedItem(yogurt, roundTo5(170 * scale)));
    } else if (isAfternoonSnack) {
      if (yogurt) items.push(createPlannedItem(yogurt, roundTo5(170 * scale)));
      if (fruit) items.push(createPlannedItem(fruit, roundTo5(100 * scale)));
    } else if (isSupper) {
      if (protein) items.push(createPlannedItem(protein, roundTo5(type === 'ceia' && protein?.name.toLowerCase().includes('ovo') ? 50 : 100 * scale)));
      if (fruit && !protein?.name.toLowerCase().includes('ovo')) items.push(createPlannedItem(fruit, roundTo5(80 * scale)));
      if (nut) items.push(createPlannedItem(nut, roundTo5(15 * scale)));
    } else {
      if (fruit) items.push(createPlannedItem(fruit, roundTo5(150 * scale)));
      if (yogurt) items.push(createPlannedItem(yogurt, roundTo5(100 * scale)));
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

    if (frango) items.push(createPlannedItem(frango, Math.min(250, Math.max(80, roundTo5(150 * scale)))));
    if (arroz) items.push(createPlannedItem(arroz, Math.min(300, Math.max(50, roundTo5(100 * scale)))));
    if (feijão) items.push(createPlannedItem(feijão, Math.min(200, Math.max(50, roundTo5(100 * scale)))));
    if (brócolis) items.push(createPlannedItem(brócolis, Math.min(200, Math.max(30, roundTo5(80 * scale)))));
    if (azeite) items.push(createPlannedItem(azeite, Math.min(15, Math.max(3, roundTo5(5 * scale)))));

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
