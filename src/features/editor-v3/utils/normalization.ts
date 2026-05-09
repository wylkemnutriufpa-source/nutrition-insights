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

  const name = (f.name || '').toLowerCase();

  // PARTE 1 — MEDIDAS CASEIRAS (PADRONIZAÇÃO URGENTE)
  if (!f.measurementType || f.measurementType === 'gram') {
    if (name.includes('ovo') || name.includes('omelete')) {
      f.measurementType = 'unit';
      f.portionValue = 50; // Média (M) = 50g
      f.portionLabel = 'unidade';
      f.portionUnitLabel = 'unid';
    } else if (name.includes('banana')) {
      f.measurementType = 'unit';
      f.portionValue = 90; // Média = 90g
      f.portionLabel = 'unidade M';
    } else if (name.includes('maçã')) {
      f.measurementType = 'unit';
      f.portionValue = 150; // Média = 150g
      f.portionLabel = 'unidade M';
    } else if (name.includes('pão integral') || name.includes('pão de forma')) {
      f.measurementType = 'unit';
      f.portionValue = 25; // 1 fatia = 25g
      f.portionLabel = 'fatia';
    } else if (name.includes('pão francês')) {
      f.measurementType = 'unit';
      f.portionValue = 50; // 1 unid = 50g
      f.portionLabel = 'unidade';
    } else if (name.includes('azeite') || name.includes('manteiga')) {
      f.measurementType = 'spoon';
      f.portionValue = name.includes('azeite') ? 5 : 10; // Fio vs Sopa
      f.portionLabel = name.includes('azeite') ? 'fio' : 'colher de sopa';
    } else if (name.includes('arroz') || name.includes('feijão') || name.includes('macarrão')) {
      f.measurementType = 'spoon';
      f.portionValue = 25; // 1 colher sopa = 25g
      f.portionLabel = 'colher de sopa';
    } else if (name.includes('iogurte')) {
      f.measurementType = 'unit';
      f.portionValue = 170; // 1 pote = 170g
      f.portionLabel = 'pote';
    } else if (name.includes('whey') || name.includes('suplemento')) {
      f.measurementType = 'unit';
      f.portionValue = 30; // 1 scoop = 30g
      f.portionLabel = 'scoop';
    } else if (name.includes('frango') || name.includes('carne') || name.includes('peixe')) {
      f.measurementType = 'unit';
      f.portionValue = 150; // Filé M = 150g
      f.portionLabel = 'filé M';
    }
  }

  // Inferência genérica de measurementType se ainda ausente
  if (!f.measurementType) {
    if (name.includes('leite') || name.includes('suco') || name.includes('bebida') || name.includes('água') || name.includes('ml')) {
      f.measurementType = 'ml';
    } else if (name.includes('aveia') || name.includes('granola') || name.includes('pasta') || name.includes('colher')) {
      f.measurementType = 'spoon';
    } else {
      f.measurementType = 'gram';
    }
  }

  // Garantir labels de porção consistentemente
  if (!f.portionUnitLabel && f.portionUnit) f.portionUnitLabel = f.portionUnit;
  if (!f.portionUnit && f.portionUnitLabel) f.portionUnit = f.portionUnitLabel;
  if (!f.portionLabel && f.portionUnitLabel) f.portionLabel = `1 ${f.portionUnitLabel}`;

  // Garantir portionValue seguro e clinicamente coerente
  if (!f.portionValue || f.portionValue <= 0) {
    if (f.measurementType === 'gram' || f.measurementType === 'ml') {
      f.portionValue = 100; 
    } else if (f.measurementType === 'spoon') {
      f.portionValue = 15; 
    } else {
      f.portionValue = 1; 
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
      substitutions: item.substitutions || [] 
    }))
  }));
}
