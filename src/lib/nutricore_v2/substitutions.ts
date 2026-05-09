import { Food, FoodCategory } from "./food-database";

export interface Substitution {
  food: Food;
  grams: number;
  unit_label: string;
  kcal_diff: number; // Diferença calórica em relação ao original
  suggested_adjustment?: {
    foodName: string;
    gramsChange: number;
  };
}

/**
 * Calcula substituições baseadas na equivalência do macro principal da categoria.
 * Ex: Proteína para Proteínas, Carbo para Carbos.
 */
export function getSubstitutions(
  food: Food,
  foodDb: Food[],
  currentGrams: number,
  restrictions: string[] = []
): Substitution[] {
  const originalFactor = currentGrams / 100;
  const originalProtein = food.protein_100g * originalFactor;
  const originalCarb = food.carb_100g * originalFactor;
  const originalKcal = food.kcal_100g * originalFactor;
  
  // PARTE 3 — SUBSTITUIÇÕES (LOGICA DE EQUIVALÊNCIA EXATA)
  const name = food.name.toLowerCase();
  
  const candidates = foodDb.filter(f => 
    f.id !== food.id &&
    !restrictions.some(r => f.name.toLowerCase().includes(r.toLowerCase()))
  );

  const results: Substitution[] = candidates.map(candidate => {
    let gramsSub = 0;
    const candName = candidate.name.toLowerCase();
    
    // Regra de Ouro: Proteína com Proteína, Carbo com Carbo
    const isBaseProtein = name.includes('frango') || name.includes('carne') || name.includes('peixe') || name.includes('ovo');
    const isCandProtein = candName.includes('frango') || candName.includes('carne') || candName.includes('peixe') || candName.includes('ovo');
    
    const isBaseCarb = name.includes('arroz') || name.includes('batata') || name.includes('macarrão') || name.includes('pão');
    const isCandCarb = candName.includes('arroz') || candName.includes('batata') || candName.includes('macarrão') || candName.includes('pão') || candName.includes('tapioca') || candName.includes('cuscuz');

    if (isBaseProtein && isCandProtein) {
      gramsSub = (originalProtein / (candidate.protein_100g / 100));
    } else if (isBaseCarb && isCandCarb) {
      gramsSub = (originalCarb / (candidate.carb_100g / 100));
    } else if (candidate.category === food.category) {
      gramsSub = (originalKcal / (candidate.kcal_100g / 100));
    } else {
      return null; // Não sugerir se categorias não baterem clinicamente
    }

    // Arredondamento para múltiplos de 5g
    const roundedGrams = Math.round(gramsSub / 5) * 5;
    if (roundedGrams <= 0) return null;
    
    // Rótulo de unidade humanizado
    let unitLabel = `${roundedGrams}g`;
    if (candName.includes('ovo')) {
      const units = Math.round(roundedGrams / 50);
      unitLabel = `${units} ${units === 1 ? 'unidade' : 'unidades'} (${roundedGrams}g)`;
    } else if (candName.includes('pão integral')) {
      const units = Math.round(roundedGrams / 25);
      unitLabel = `${units} ${units === 1 ? 'fatia' : 'fatias'} (${roundedGrams}g)`;
    } else if (candName.includes('pão francês')) {
      const units = Math.round(roundedGrams / 50);
      unitLabel = `${units} unidade (${roundedGrams}g)`;
    } else if (candName.includes('frango') || candName.includes('carne')) {
      const filéType = roundedGrams >= 200 ? 'G' : (roundedGrams >= 150 ? 'M' : 'P');
      unitLabel = `1 filé ${filéType} (${roundedGrams}g)`;
    }

    const subKcal = (candidate.kcal_100g / 100) * roundedGrams;
    const kcalDiff = Math.round(subKcal - originalKcal);

    return {
      food: candidate,
      grams: roundedGrams,
      unit_label: unitLabel,
      kcal_diff: kcalDiff
    };
  }).filter((s): s is Substitution => s !== null);

  return results.sort((a, b) => Math.abs(a.kcal_diff) - Math.abs(b.kcal_diff)).slice(0, 5);
}
