export interface RecipeIngredient {
  name: string;
  grams: number;
  macro_role?: "protein" | "carb" | "fat" | "fiber" | "fixed";
}

export interface MacroDensity {
  p: number; // per 1g
  c: number; // per 1g
  f: number; // per 1g
  kcal: number; // per 1g
}

/**
 * Common food macro densities (per 1g of cooked food)
 * Used as defaults when specific food data is missing.
 */
export const COMMON_DENSITIES: Record<string, MacroDensity> = {
  frango: { p: 0.27, c: 0, f: 0.03, kcal: 1.4 },
  carne: { p: 0.26, c: 0, f: 0.08, kcal: 1.8 },
  peixe: { p: 0.20, c: 0, f: 0.02, kcal: 1.0 },
  tilapia: { p: 0.20, c: 0, f: 0.02, kcal: 1.0 },
  patinho: { p: 0.28, c: 0, f: 0.05, kcal: 1.6 },
  arroz: { p: 0.025, c: 0.28, f: 0.002, kcal: 1.3 },
  feijao: { p: 0.05, c: 0.14, f: 0.005, kcal: 0.8 },
  batata: { p: 0.02, c: 0.20, f: 0.001, kcal: 0.9 },
  macarrao: { p: 0.05, c: 0.25, f: 0.01, kcal: 1.3 },
  legumes: { p: 0.01, c: 0.05, f: 0.001, kcal: 0.3 },
  brocolis: { p: 0.03, c: 0.04, f: 0.001, kcal: 0.3 },
  ovo: { p: 0.13, c: 0.01, f: 0.10, kcal: 1.5 },
  queijo: { p: 0.22, c: 0.03, f: 0.25, kcal: 3.2 },
  manteiga: { p: 0.01, c: 0.01, f: 0.80, kcal: 7.2 },
  azeite: { p: 0, c: 0, f: 1.0, kcal: 9.0 },
};

function getDensity(foodName: string): MacroDensity {
  const norm = foodName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [key, density] of Object.entries(COMMON_DENSITIES)) {
    if (norm.includes(key)) return density;
  }
  return { p: 0.1, c: 0.1, f: 0.05, kcal: 1.2 }; // Generic fallback
}

/**
 * Motor de Ajuste (Etapa 3)
 * Scales recipe ingredients to reach target macros precisely.
 */
export function scaleRecipeByMacros(
  ingredients: RecipeIngredient[],
  target: { protein: number; carbs: number; fat: number }
): { items: RecipeIngredient[]; totals: { cal: number; p: number; c: number; f: number } } {
  const result: RecipeIngredient[] = [];
  
  // Identify roles if missing
  const itemsWithRoles = ingredients.map(item => {
    let role = item.macro_role;
    if (!role) {
      const name = item.name.toLowerCase();
      if (name.includes("frango") || name.includes("carne") || name.includes("peixe") || name.includes("ovo") || name.includes("patinho") || name.includes("tilapia")) {
        role = "protein";
      } else if (name.includes("arroz") || name.includes("batata") || name.includes("macarrao") || name.includes("mandioca") || name.includes("cuscuz")) {
        role = "carb";
      } else if (name.includes("azeite") || name.includes("manteiga") || name.includes("oleo") || name.includes("castanha")) {
        role = "fat";
      } else if (name.includes("legumes") || name.includes("salada") || name.includes("brocolis") || name.includes("cenoura")) {
        role = "fiber";
      } else {
        role = "fixed";
      }
    }
    return { ...item, macro_role: role };
  });

  const proteinItems = itemsWithRoles.filter(i => i.macro_role === "protein");
  const carbItems = itemsWithRoles.filter(i => i.macro_role === "carb");
  const fatItems = itemsWithRoles.filter(i => i.macro_role === "fat");
  const others = itemsWithRoles.filter(i => i.macro_role !== "protein" && i.macro_role !== "carb" && i.macro_role !== "fat");

  // Initial pass: keep others fixed
  let currentP = 0, currentC = 0, currentF = 0;
  others.forEach(item => {
    const d = getDensity(item.name);
    currentP += item.grams * d.p;
    currentC += item.grams * d.c;
    currentF += item.grams * d.f;
    result.push({ ...item });
  });

  // Adjust Protein items
  if (proteinItems.length > 0) {
    const neededP = Math.max(5, target.protein - currentP);
    const totalBaseGrams = proteinItems.reduce((s, i) => s + i.grams, 0);
    proteinItems.forEach(item => {
      const d = getDensity(item.name);
      // If multiple protein sources, scale proportionally
      const share = totalBaseGrams > 0 ? item.grams / totalBaseGrams : 1 / proteinItems.length;
      const targetGramsForItem = d.p > 0 ? (neededP * share) / d.p : item.grams;
      const finalGrams = Math.round(Math.max(40, Math.min(250, targetGramsForItem)));
      
      currentP += finalGrams * d.p;
      currentC += finalGrams * d.c;
      currentF += finalGrams * d.f;
      result.push({ ...item, grams: finalGrams });
    });
  }

  // Adjust Carb items
  if (carbItems.length > 0) {
    const neededC = Math.max(5, target.carbs - currentC);
    const totalBaseGrams = carbItems.reduce((s, i) => s + i.grams, 0);
    carbItems.forEach(item => {
      const d = getDensity(item.name);
      const share = totalBaseGrams > 0 ? item.grams / totalBaseGrams : 1 / carbItems.length;
      const targetGramsForItem = d.c > 0 ? (neededC * share) / d.c : item.grams;
      const finalGrams = Math.round(Math.max(30, Math.min(300, targetGramsForItem)));
      
      currentP += finalGrams * d.p;
      currentC += finalGrams * d.c;
      currentF += finalGrams * d.f;
      result.push({ ...item, grams: finalGrams });
    });
  }

  // Adjust Fat items
  if (fatItems.length > 0) {
    const neededF = Math.max(0, target.fat - currentF);
    const totalBaseGrams = fatItems.reduce((s, i) => s + i.grams, 0);
    fatItems.forEach(item => {
      const d = getDensity(item.name);
      const share = totalBaseGrams > 0 ? item.grams / totalBaseGrams : 1 / fatItems.length;
      const targetGramsForItem = d.f > 0 ? (neededF * share) / d.f : item.grams;
      const finalGrams = Math.round(Math.max(5, Math.min(30, targetGramsForItem)));
      
      currentP += finalGrams * d.p;
      currentC += finalGrams * d.c;
      currentF += finalGrams * d.f;
      result.push({ ...item, grams: finalGrams });
    });
  }

  const totals = {
    p: Math.round(currentP),
    c: Math.round(currentC),
    f: Math.round(currentF),
    cal: Math.round(currentP * 4 + currentC * 4 + currentF * 9)
  };

  return { items: result, totals };
}
