import { Food, FoodCategory } from "./food-database";
import { MealType } from "./meal-distribution";
import { Marmita } from "./marmitas-database";
import { getSubstitutions, Substitution } from "./substitutions";

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
  substitutions?: any[]; 
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
  options: BuildMealOptions & { seed?: number } = {}
): PlannedMeal {
  const items: PlannedItem[] = [];
  const { restrictions = [], preferences = [], seed = Math.random() } = options;

  const isLunchOrDinner = type === "almoço" || type === "jantar";
  const isBreakfast = type === "cafe_da_manha";
  const isSnack = type.includes("lanche") || type === "ceia";

  let allowedDb = foodDb.filter(f => !restrictions.some(r => f.name.toLowerCase().includes(r.toLowerCase())));

  const findRandom = (db: Food[], predicate: (f: Food) => boolean) => {
    const matches = db.filter(predicate);
    if (matches.length === 0) return undefined;
    
    // Usar o seed para tornar a seleção determinística para o mesmo dia/paciente
    const index = Math.floor(Math.abs(Math.sin(seed * 10000)) * matches.length);
    return matches[index];
  };

  // 🛡️ Fator de escala blindado: clamp 0.4x – 2.5x (impede grams astronômicos como 24750g de frango)
  const rawScale = (targetMacros.kcal || 0) / 400;
  const scale = Number.isFinite(rawScale) && rawScale > 0
    ? Math.max(0.4, Math.min(2.5, rawScale))
    : 1;

  // PARTE 2 — TEMPLATES FUNCIONAIS (LOGICA DE PLOTAGEM DETERMINISTICA COM VARIEDADE)
  if (isBreakfast) {
    // Café Fitness: Pão integral 2 fatias (50g) + Ovos mexidos 2 unid (100g) + Banana M (90g)
    const pão = findRandom(allowedDb, f => f.name.toLowerCase().includes("pão integral")) || findRandom(allowedDb, f => f.name.toLowerCase().includes("pão"));
    const ovo = findRandom(allowedDb, f => f.name.toLowerCase().includes("ovo"));
    const banana = findRandom(allowedDb, f => f.name.toLowerCase().includes("banana"));

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

    const fruit = findRandom(allowedDb, f => f.category === "fruit") || findRandom(foodDb, f => f.category === "fruit");
    const dairy = findRandom(allowedDb, f => f.category === "dairy") || findRandom(foodDb, f => f.category === "dairy");
    const nut = findRandom(allowedDb, f => f.category === "fat" && (f.name.toLowerCase().includes("castanha") || f.name.toLowerCase().includes("amendoim")));
    const yogurt = findRandom(allowedDb, f => f.name.toLowerCase().includes("iogurte")) || dairy;
    const protein = findRandom(allowedDb, f => f.name.toLowerCase().includes("whey")) || 
                    findRandom(allowedDb, f => f.name.toLowerCase().includes("queijo minas")) ||
                    findRandom(allowedDb, f => f.name.toLowerCase().includes("ovo")) || dairy;

    if (isMorningSnack) {
      if (fruit) items.push(createPlannedItem(fruit, Math.min(300, Math.max(50, roundTo5(150 * scale)))));
      if (yogurt) items.push(createPlannedItem(yogurt, Math.min(400, Math.max(100, roundTo5(170 * scale)))));
    } else if (isAfternoonSnack) {
      if (yogurt) items.push(createPlannedItem(yogurt, Math.min(400, Math.max(100, roundTo5(170 * scale)))));
      if (fruit) items.push(createPlannedItem(fruit, Math.min(300, Math.max(50, roundTo5(100 * scale)))));
    } else if (isSupper) {
      // Ceia: Forçar opções leves (Iogurte ou Queijo ou Castanha). Sem carne ou excesso de ovos.
      const lightProtein = findRandom(allowedDb, f => f.name.toLowerCase().includes("iogurte") || f.name.toLowerCase().includes("queijo minas") || f.name.toLowerCase().includes("whey")) || yogurt;
      if (lightProtein) items.push(createPlannedItem(lightProtein, Math.min(250, Math.max(30, roundTo5(100 * scale)))));
      if (fruit && !lightProtein) items.push(createPlannedItem(fruit, Math.min(250, Math.max(30, roundTo5(80 * scale)))));
      if (nut) items.push(createPlannedItem(nut, Math.min(50, Math.max(5, roundTo5(15 * scale)))));
    } else {
      if (fruit) items.push(createPlannedItem(fruit, Math.min(300, Math.max(50, roundTo5(150 * scale)))));
      if (yogurt) items.push(createPlannedItem(yogurt, Math.min(400, Math.max(100, roundTo5(100 * scale)))));
    }

    return finalizeMeal(type, time, items, targetMacros);
  }

  if (isLunchOrDinner) {
    // Prato Fitness: Frango 150g + Arroz 100g + Feijão 100g + Brócolis 80g + Azeite 5g
    const protein = findRandom(allowedDb, f => f.name.toLowerCase().includes("frango")) || findRandom(allowedDb, f => f.name.toLowerCase().includes("carne")) || findRandom(allowedDb, f => f.name.toLowerCase().includes("peixe"));
    const carb = findRandom(allowedDb, f => f.name.toLowerCase().includes("arroz")) || findRandom(allowedDb, f => f.name.toLowerCase().includes("batata")) || findRandom(allowedDb, f => f.name.toLowerCase().includes("macarrão"));
    const legume = findRandom(allowedDb, f => f.name.toLowerCase().includes("feijão")) || findRandom(allowedDb, f => f.name.toLowerCase().includes("lentilha")) || findRandom(allowedDb, f => f.name.toLowerCase().includes("grão de bico"));
    const veg = findRandom(allowedDb, f => f.name.toLowerCase().includes("brócolis")) || findRandom(allowedDb, f => f.category === "vegetable");
    const fat = findRandom(allowedDb, f => f.name.toLowerCase().includes("azeite"));

    if (protein) items.push(createPlannedItem(protein, Math.min(250, Math.max(80, roundTo5(150 * scale)))));
    if (carb) items.push(createPlannedItem(carb, Math.min(300, Math.max(50, roundTo5(100 * scale)))));
    if (legume) items.push(createPlannedItem(legume, Math.min(200, Math.max(50, roundTo5(100 * scale)))));
    if (veg) items.push(createPlannedItem(veg, Math.min(200, Math.max(30, roundTo5(80 * scale)))));
    if (fat) items.push(createPlannedItem(fat, Math.min(15, Math.max(3, roundTo5(5 * scale)))));

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
  preferences: string[],
  seed: number = Math.random()
): Food | undefined {
  const available = db.filter(
    f => f.category === category && !restrictions.some(r => f.name.toLowerCase().includes(r.toLowerCase()))
  );

  if (available.length === 0) return undefined;

  // Priorizar preferências
  const preferred = available.filter(f =>
    preferences.some(p => f.name.toLowerCase().includes(p.toLowerCase()))
  );

  const pool = preferred.length > 0 ? preferred : available;

  // 🎲 Variedade Sistêmica Determinística: Usa o seed para evitar planos idênticos no mesmo loop
  const index = Math.floor(Math.abs(Math.sin(seed * 20000)) * pool.length);
  return pool[index];
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
