import { Food, Meal } from '../types';

/**
 * Normaliza um alimento para garantir que ele siga o padrão Elite V3.
 * Cura inconsistências de campos ausentes e infere tipos se necessário.
 */
export function normalizeFood(food: any): Food {
  const f = { ...food };
  
  // Garantir macros consistentes (kcal vs calories)
  if (f.kcal === undefined && f.calories !== undefined) f.kcal = f.calories;
  if (f.calories === undefined && f.kcal !== undefined) f.calories = f.kcal;
  
  // Se ainda não tem macros, default para 0 (evita NaN)
  f.kcal = f.kcal || 0;
  f.calories = f.calories || 0;
  f.protein = f.protein || 0;
  f.carbs = f.carbs || 0;
  f.fat = f.fat || 0;

  // Garantir labels de porção
  if (!f.portionUnitLabel && f.portionUnit) f.portionUnitLabel = f.portionUnit;
  if (!f.portionUnit && f.portionUnitLabel) f.portionUnit = f.portionUnitLabel;
  if (!f.portionLabel && f.portionUnitLabel) f.portionLabel = `1 ${f.portionUnitLabel}`;

  // Inferência de measurementType se ausente
  if (!f.measurementType) {
    const name = (f.name || '').toLowerCase();
    
    // Tratamento especial para Ovo (prioridade Unidade)
    if (name.includes('ovo') || name === 'ovo' || name.includes('omelete')) {
      f.measurementType = 'unit';
      f.portionValue = 1;
      f.portionLabel = 'unidade';
    } else if (name.includes('leite') || name.includes('suco') || name.includes('bebida') || name.includes('água') || name.includes('ml')) {
      f.measurementType = 'ml';
    } else if (name.includes('aveia') || name.includes('granola') || name.includes('pasta') || name.includes('colher')) {
      f.measurementType = 'spoon';
    } else if (name.includes('arroz') || name.includes('feijão') || name.includes('carne') || name.includes('frango') || name.includes('macarrão') || name.includes('g') || name.includes('gramas')) {
      f.measurementType = 'gram';
    } else {
      f.measurementType = 'unit';
    }
  }

  // Garantir portionValue seguro e clinicamente coerente
  if (!f.portionValue || f.portionValue <= 0) {
    if (f.measurementType === 'gram' || f.measurementType === 'ml') {
      // No FitJourney V3, a base de macros (kcal_100g) é SEMPRE por 100g/100ml
      // para evitar o erro de multiplicação 25.000kcal (165kcal * 150g)
      f.portionValue = 100; 
    } else if (f.measurementType === 'spoon') {
      f.portionValue = 15; // média colher de sopa em gramas
    } else {
      f.portionValue = 1; // unidade é base 1
    }
  }

  return f as Food;
}

/**
 * Normaliza uma lista de refeições.
 */
export function normalizeMeals(meals: Meal[]): Meal[] {
  return (meals || []).map(meal => ({
    ...meal,
    items: (meal.items || []).map(item => ({
      ...normalizeFood(item),
      instanceId: item.instanceId || Math.random().toString(36).substring(2, 10),
      quantity: item.quantity !== undefined ? item.quantity : (
        item.measurementType === 'gram' ? 100 : 
        item.measurementType === 'ml' ? 200 : 1
      ),
      substitutions: item.substitutions || [] // Contrato V3: sempre array
    }))
  }));
}
