
import { Meal, MealItem } from "../types";

/**
 * V3 Visual Engine — Description Generator
 * ----------------------------------------------------------------
 * Transforma a estrutura técnica da Biblioteca V3 em uma 
 * descrição textual premium para o PDF e Dashboard.
 */
export function generateV3MealDescription(meal: Meal): string {
  if (!meal.items || meal.items.length === 0) return meal.description || "";

  // 1. Identificar se é uma refeição da Biblioteca V3
  const isV3 = meal.items.some(it => it.isVisualLibraryItem);
  if (!isV3) return meal.description || "";

  // 2. Montar lista textual organizada
  const lines = meal.items.map(item => {
    const quantityStr = item.portionMode === 'free' 
      ? 'livre' 
      : `${item.quantity}${item.display_unit || 'g'}`;
    
    return `• ${item.name} — ${quantityStr}`;
  });

  // 3. Adicionar Macros Sumarizados (Opcional, dependendo da UI)
  const totalKcal = Math.round(meal.items.reduce((sum, it) => sum + (it.kcal || 0), 0));
  const totalProtein = Math.round(meal.items.reduce((sum, it) => sum + (it.protein || 0), 0));

  return `${lines.join('\n')}\n\n[ ${totalKcal} kcal | ${totalProtein}g proteína ]`;
}
