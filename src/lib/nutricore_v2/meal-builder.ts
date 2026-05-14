import { Food, FoodCategory } from "./food-database";
import { MealType } from "./meal-distribution";
import { Marmita } from "./marmitas-database";
import { getSubstitutions, Substitution } from "./substitutions";
import { 
  isBreadLike, isBreakfastProtein, isHeavyProtein, 
  isComplexCarb, isLegume, isVegetable 
} from "./helpers";

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

  // 🛡️ CLINICAL BREAKFAST GUARD: Strictly exclude heavy proteins/lunch items from breakfast
  if (isBreakfast) {
    allowedDb = allowedDb.filter(f => {
      const n = f.name.toLowerCase();
      const isHeavy = n.includes("arroz") || n.includes("feijão") || n.includes("carne") || 
                      n.includes("peixe") || n.includes("frango") || n.includes("tilápia") ||
                      n.includes("estrogonoff") || n.includes("macarrão") || n.includes("lentilha");
      return !isHeavy;
    });
  }

  // 🛡️ CLINICAL BREAKFAST GUARD: Strictly exclude heavy proteins/lunch items from breakfast
  if (isBreakfast) {
    allowedDb = allowedDb.filter(f => {
      const n = f.name.toLowerCase();
      const isHeavy = n.includes("arroz") || n.includes("feijão") || n.includes("carne") || 
                      n.includes("peixe") || n.includes("frango") || n.includes("tilápia") ||
                      n.includes("estrogonoff") || n.includes("macarrão");
      return !isHeavy;
    });
  }

  const findRandom = (db: Food[], predicate: (f: Food) => boolean) => {
    const matches = db.filter(predicate);
    if (matches.length === 0) return undefined;
    
    // Usar o seed para tornar a seleção determinística para o mesmo dia/paciente
    const index = Math.floor(Math.abs(Math.sin(seed * 10000)) * matches.length);
    return matches[index];
  };

  // 🛡️ Fator de escala blindado: calculado dinamicamente com base nos alvos da refeição
  // Evita o magic number 400 que causava explosão linear em metas altas.
  // Base aproximada de uma refeição padrão (Frango 150g, Arroz 100g, Feijão 100g) ≈ 550kcal
  const BASE_MEAL_KCAL = isLunchOrDinner ? 550 : isBreakfast ? 350 : 200;
  const rawScale = (targetMacros.kcal || 0) / BASE_MEAL_KCAL;
  const scale = Number.isFinite(rawScale) && rawScale > 0
    ? Math.max(0.4, Math.min(2.5, rawScale)) // Clamp 0.4x - 2.5x para segurança clínica
    : 1;

  // PARTE 2 — TEMPLATES FUNCIONAIS (LOGICA DE PLOTAGEM DETERMINISTICA COM VARIEDADE)
  if (isBreakfast) {
    // Café da Manhã: Carboidrato (Pão/Tapioca) + Proteína (Ovo/Queijo) + Fruta
    const pão = findRandom(allowedDb, f => isBreadLike(f.name)) || findRandom(allowedDb, f => f.category === "carb");
    const ovo = findRandom(allowedDb, f => isBreakfastProtein(f.name)) || findRandom(allowedDb, f => f.category === "protein");
    const fruit = findRandom(allowedDb, f => f.category === "fruit");

    if (pão) items.push(createPlannedItem(pão, Math.min(150, Math.max(25, roundTo5(50 * scale))), foodDb, type));
    if (ovo) items.push(createPlannedItem(ovo, Math.min(250, Math.max(50, roundTo5(100 * scale))), foodDb, type));
    if (fruit) items.push(createPlannedItem(fruit, Math.min(180, Math.max(40, roundTo5(90 * scale))), foodDb, type));
    
    return finalizeMeal(type, time, items, targetMacros);
  }

  if (isSnack) {
    const fruit = findRandom(allowedDb, f => f.category === "fruit");
    const protein = findRandom(allowedDb, f => f.category === "dairy" || isBreakfastProtein(f.name)) || 
                    findRandom(allowedDb, f => f.category === "protein");
    const fat = findRandom(allowedDb, f => f.category === "fat");

    if (type === "ceia") {
      // Ceia: Mais leve, prioriza laticínios ou oleaginosas
      if (protein) items.push(createPlannedItem(protein, Math.min(300, Math.max(30, roundTo5(100 * scale))), foodDb, type));
      if (fat) items.push(createPlannedItem(fat, Math.min(60, Math.max(5, roundTo5(15 * scale))), foodDb, type));
    } else {
      if (fruit) items.push(createPlannedItem(fruit, Math.min(350, Math.max(50, roundTo5(150 * scale))), foodDb, type));
      if (protein) items.push(createPlannedItem(protein, Math.min(450, Math.max(100, roundTo5(150 * scale))), foodDb, type));
    }

    return finalizeMeal(type, time, items, targetMacros);
  }

  if (isLunchOrDinner) {
    // Almoço/Jantar: Proteína + Carboidrato + Leguminosa + Vegetal + Gordura
    const protein = findRandom(allowedDb, f => isHeavyProtein(f.name)) || findRandom(allowedDb, f => f.category === "protein");
    const carb = findRandom(allowedDb, f => isComplexCarb(f.name)) || findRandom(allowedDb, f => f.category === "carb");
    const legume = findRandom(allowedDb, f => isLegume(f.name)) || findRandom(allowedDb, f => f.category === "legume");
    const veg = findRandom(allowedDb, f => isVegetable(f.name)) || findRandom(allowedDb, f => f.category === "vegetable");
    const fat = findRandom(allowedDb, f => f.category === "fat");

    if (protein) items.push(createPlannedItem(protein, Math.min(350, Math.max(80, roundTo5(150 * scale))), foodDb, type));
    if (carb) items.push(createPlannedItem(carb, Math.min(450, Math.max(50, roundTo5(100 * scale))), foodDb, type));
    if (legume) items.push(createPlannedItem(legume, Math.min(250, Math.max(50, roundTo5(100 * scale))), foodDb, type));
    if (veg) items.push(createPlannedItem(veg, Math.min(250, Math.max(30, roundTo5(80 * scale))), foodDb, type));
    if (fat) items.push(createPlannedItem(fat, Math.min(25, Math.max(3, roundTo5(5 * scale))), foodDb, type));

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

function createPlannedItem(food: Food, grams: number, foodDb: Food[] = [], mealType?: string): PlannedItem {
  const factor = grams / 100;
  
  // Calcular substituições automaticamente para garantir que sempre existam
  const substitutions = foodDb.length > 0 
    ? getSubstitutions(food, foodDb, grams, [], mealType).map(s => ({
        id: s.food.id,
        name: s.food.name,
        kcal: s.food.kcal_100g * (s.grams / 100),
        protein: s.food.protein_100g * (s.grams / 100),
        carbs: s.food.carb_100g * (s.grams / 100),
        fat: s.food.fat_100g * (s.grams / 100),
        portionValue: s.grams,
        portionLabel: s.unit_label,
        measurementType: s.food.name.toLowerCase().includes('ovo') ? 'unit' : 'gram'
      }))
    : [];

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
    substitutions
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
