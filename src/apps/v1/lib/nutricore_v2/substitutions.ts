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
  
  const candidates = foodDb.filter(f => 
    f.category === food.category && 
    f.id !== food.id &&
    !restrictions.some(r => f.name.toLowerCase().includes(r.toLowerCase()))
  );

  const results: Substitution[] = candidates.map(candidate => {
    let gramsSub = 0;
    
    // Regra: Equivalência por macro principal
    if (food.category === "protein") {
      gramsSub = (originalProtein / (candidate.protein_100g / 100));
    } else if (food.category === "carb" || food.category === "fruit") {
      gramsSub = (originalCarb / (candidate.carb_100g / 100));
    } else {
      // Outros: equivalência calórica como fallback
      gramsSub = (originalKcal / (candidate.kcal_100g / 100));
    }

    // Arredondamento para múltiplos de 5g
    const roundedGrams = Math.round(gramsSub / 5) * 5;
    
    // Rótulo de unidade
    let unitLabel = `${roundedGrams}g`;
    if (candidate.unit.includes("unidade") || candidate.unit.includes("fatias")) {
       const unitWeight = candidate.base_grams; 
       const units = Math.round(roundedGrams / unitWeight);
       if (units > 0) {
         unitLabel = `${roundedGrams}g (${units} ${candidate.unit.split(" ")[0]})`;
       }
    }

    const subKcal = (candidate.kcal_100g / 100) * roundedGrams;
    const kcalDiff = Math.round(subKcal - originalKcal);

    // Sugestão de ajuste (ex: se sobrou caloria, diminuir batata doce; se faltou, aumentar)
    // Usando 130 kcal/100g (Arroz) ou 86 kcal/100g (Batata Doce) como referência padrão de ajuste
    let suggested_adjustment;
    if (Math.abs(kcalDiff) > 20) {
       const adjustmentFood = "Batata Doce Cozida";
       const adjustmentKcalPer100g = 86;
       // Se kcalDiff > 0 (substituição mais calórica), gramsChange deve ser negativo
       const gramsChange = Math.round((-kcalDiff / (adjustmentKcalPer100g / 100)) / 5) * 5;
       if (Math.abs(gramsChange) >= 5) {
         suggested_adjustment = {
           foodName: adjustmentFood,
           gramsChange: gramsChange
         };
       }
    }

    return {
      food: candidate,
      grams: roundedGrams,
      unit_label: unitLabel,
      kcal_diff: kcalDiff,
      suggested_adjustment
    };
  });

  return results.slice(0, 5);
}
