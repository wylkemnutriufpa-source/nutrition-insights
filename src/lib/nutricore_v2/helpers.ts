
/**
 * NutriCore V2 - Helper functions for nutrition calculation and classification
 */

export const isProtein = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('frango') || n.includes('carne') || n.includes('peixe') || 
         n.includes('ovo') || n.includes('whey') || n.includes('patinho') || 
         n.includes('presunto') || n.includes('queijo') || n.includes('lombo') ||
         n.includes('músculo') || n.includes('alcatra') || n.includes('tilápia') ||
         n.includes('salmão') || n.includes('atum');
};

export const isCarb = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('arroz') || n.includes('batata') || n.includes('macarrão') || 
         n.includes('feijão') || n.includes('pão') || n.includes('aveia') || 
         n.includes('tapioca') || n.includes('cuscuz') || n.includes('mandioca') ||
         n.includes('milho') || n.includes('grão de bico') || n.includes('lentilha');
};

export const isFruit = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('banana') || n.includes('maçã') || n.includes('uva') || 
         n.includes('fruta') || n.includes('suco') || n.includes('laranja') ||
         n.includes('mamão') || n.includes('melão') || n.includes('melancia') ||
         n.includes('abacaxi') || n.includes('morango') || n.includes('manga') ||
         n.includes('pera') || n.includes('goiaba') || n.includes('tangerina');
};

export const calculateItemMacros = (item: any, quantity: number) => {
  const kcal100g = item.kcal_100g || item.calories || item.kcal || 0;
  const protein100g = item.protein_100g || item.protein || 0;
  const carbs100g = item.carb_100g || item.carbs || 0;
  const fat100g = item.fat_100g || item.fat || 0;

  // In NutriCore V2, most database items are per 100g
  // For units, we use portionValue as the weight of 1 unit
  const factor = quantity / 100;

  return {
    kcal: Math.round((kcal100g * factor) * 10) / 10,
    protein: Math.round((protein100g * factor) * 10) / 10,
    carbs: Math.round((carbs100g * factor) * 10) / 10,
    fat: Math.round((fat100g * factor) * 10) / 10
  };
};

export const getDeterministicSuggestions = (baseItemName: string, availableFoods: any[]): any[] => {
  const name = baseItemName.toLowerCase();
  let suggestions: any[] = [];

  if (isProtein(name)) {
    suggestions = availableFoods.filter(f => isProtein(f.name.toLowerCase()) && f.name.toLowerCase() !== name);
  } else if (isCarb(name)) {
    suggestions = availableFoods.filter(f => isCarb(f.name.toLowerCase()) && f.name.toLowerCase() !== name);
  } else if (isFruit(name)) {
    suggestions = availableFoods.filter(f => isFruit(f.name.toLowerCase()) && f.name.toLowerCase() !== name);
  }

  return suggestions.slice(0, 5);
};
