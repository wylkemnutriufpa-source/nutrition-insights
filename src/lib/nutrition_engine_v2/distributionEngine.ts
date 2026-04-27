/**
 * Etapa 3: Distribuição Calórica Dinâmica
 */
import { MealStructure } from "./mealStructureBuilder";

export interface CaloricDistribution {
  meal_id: string;
  kcal_target: number;
  percentage: number;
}

export function buildDynamicDistribution(
  structure: MealStructure[],
  targetKcal: number
): CaloricDistribution[] {
  if (structure.length === 0) return [];

  // 1. Pesos base por tipo de refeição
  const weights = structure.map(meal => {
    let weight = 1.0; // Base: dividir igualmente
    
    if (meal.type_hint === 'lunch' || meal.type_hint === 'dinner') {
      weight = 1.2; // +20%
    } else if (meal.type_hint === 'snack') {
      weight = 0.9; // -10%
    }
    
    return weight;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // 2. Calcular distribuição
  const distribution = structure.map((meal, index) => {
    const percentage = weights[index] / totalWeight;
    return {
      meal_id: meal.id,
      kcal_target: Math.round(targetKcal * percentage * 10) / 10,
      percentage
    };
  });

  // 3. Ajuste fino para garantir que a soma total = targetKcal
  const currentTotal = distribution.reduce((sum, d) => sum + d.kcal_target, 0);
  const diff = targetKcal - currentTotal;
  
  if (Math.abs(diff) > 0.1) {
    // Adiciona a diferença na maior refeição (geralmente almoço)
    const maxIdx = weights.indexOf(Math.max(...weights));
    distribution[maxIdx].kcal_target = Math.round((distribution[maxIdx].kcal_target + diff) * 10) / 10;
  }

  return distribution;
}
