import { supabase } from '@/integrations/supabase/client';
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
  const wasGram = f.measurementType === 'gram' || !f.measurementType;
  const initialQuantity = f.quantity;

  // PARTE 1 — MEDIDAS CASEIRAS (PADRONIZAÇÃO URGENTE)
  // Só aplica se for gramas (para converter) ou se não tiver tipo
  if (wasGram) {
    let newPortionValue = f.portionValue;
    let newMeasurementType = f.measurementType;
    let newPortionLabel = f.portionLabel;

    if (name.includes('ovo') || name.includes('omelete')) {
      newMeasurementType = 'unit';
      newPortionValue = 50; 
      newPortionLabel = 'unidade';
    } else if (name.includes('banana')) {
      newMeasurementType = 'unit';
      newPortionValue = 90; 
      newPortionLabel = 'unidade M';
    } else if (name.includes('maçã')) {
      newMeasurementType = 'unit';
      newPortionValue = 150; 
      newPortionLabel = 'unidade M';
    } else if (name.includes('pão integral') || name.includes('pão de forma')) {
      newMeasurementType = 'unit';
      newPortionValue = 25; 
      newPortionLabel = 'fatia';
    } else if (name.includes('pão francês')) {
      newMeasurementType = 'unit';
      newPortionValue = 50; 
      newPortionLabel = 'unidade';
    } else if (name.includes('azeite') || name.includes('manteiga')) {
      newMeasurementType = 'spoon';
      newPortionValue = name.includes('azeite') ? 5 : 10; 
      newPortionLabel = name.includes('azeite') ? 'fio' : 'colher de sopa';
    } else if (name.includes('arroz') || name.includes('feijão') || name.includes('macarrão')) {
      newMeasurementType = 'spoon';
      newPortionValue = 25; 
      newPortionLabel = 'colher de sopa';
    } else if (name.includes('iogurte')) {
      newMeasurementType = 'unit';
      newPortionValue = 170; 
      newPortionLabel = 'pote';
    } else if (name.includes('whey') || name.includes('suplemento')) {
      newMeasurementType = 'unit';
      newPortionValue = 30; 
      newPortionLabel = 'scoop';
    } else if (name.includes('frango') || name.includes('carne') || name.includes('peixe')) {
      newMeasurementType = 'unit';
      newPortionValue = 150; 
      newPortionLabel = 'filé M';
    }

    // 🔥 FIX CRÍTICO: Se mudamos de GRAMAS para UNIT/SPOON, precisamos ajustar a QUANTITY
    // Caso contrário: 125g de arroz vira 125 colheres (3125g)
    if (newMeasurementType !== 'gram' && wasGram && initialQuantity > 5) {
      // Se a quantidade parece ser em gramas (ex: > 5), convertemos para a nova unidade
      f.quantity = Math.round((initialQuantity / (newPortionValue || 1)) * 10) / 10;
      console.log(`[V3-Normalization] Converted ${initialQuantity}g ${name} to ${f.quantity} ${newPortionLabel}`);
    }

    f.measurementType = newMeasurementType;
    f.portionValue = newPortionValue;
    f.portionLabel = newPortionLabel;
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
 * Busca a melhor imagem no banco meal_visual_library para um determinado nome/alimento.
 * REGRA PARTE 1 & 4 - Imagens correspondentes e Fallbacks.
 */
export async function getBestMealImage(mealName: string, items: any[]): Promise<{ url: string; source: 'manual' | 'auto' | 'fallback' }> {
  try {
    const cleanMealName = mealName.toLowerCase();
    
    // 1. Identificar Alimento PRINCIPAL (Geralmente Proteína ou o que define o prato)
    const principalItem = items.find(i => 
      ['frango', 'carne', 'peixe', 'ovo', 'tilápia', 'marmita', 'omelete', 'escondidinho', 'massa'].some(p => i.name.toLowerCase().includes(p))
    ) || items[0];

    const searchTerm = principalItem ? principalItem.name.toLowerCase() : cleanMealName;
    
    // 2. Buscar por nome exato ou similar no banco
    const { data: results } = await supabase
      .from('meal_visual_library')
      .select('image_url, name, category')
      .or(`name.ilike.%${searchTerm}%,name.ilike.%${cleanMealName}%`)
      .limit(5);

    if (results && results.length > 0) {
      // Priorizar os que têm URL válida
      const valid = results.find(r => r.image_url);
      if (valid) return { url: valid.image_url, source: 'auto' };
    }

    // 3. Fallbacks por Categoria (Regra Parte 4)
    const isBreakfast = cleanMealName.includes('café') || cleanMealName.includes('desjejum');
    const isLunch = cleanMealName.includes('almoço');
    const isDinner = cleanMealName.includes('jantar');
    const isSnack = cleanMealName.includes('lanche');
    const isSupper = cleanMealName.includes('ceia');

    let fallbackTerm = 'fruta';
    if (isBreakfast) fallbackTerm = 'pao-frances';
    if (isLunch || isDinner) fallbackTerm = 'arroz-feijao-frango';
    if (isSnack) fallbackTerm = 'iogurte-natural';
    if (isSupper) fallbackTerm = 'banana-com-canela';
    
    // Se o termo de busca tiver proteína, tenta o fallback da proteína
    if (searchTerm.includes('frango')) fallbackTerm = 'frango';
    if (searchTerm.includes('carne')) fallbackTerm = 'carne';
    if (searchTerm.includes('peixe')) fallbackTerm = 'peixe';
    if (searchTerm.includes('ovo')) fallbackTerm = 'pao-com-ovo';
    
    const { data: fallbackResults } = await supabase
      .from('meal_visual_library')
      .select('image_url')
      .ilike('name', `%${fallbackTerm}%`)
      .limit(1);

    if (fallbackResults?.[0]?.image_url) {
      return { url: fallbackResults[0].image_url, source: 'fallback' };
    }

    // Último recurso: Imagem padrão segura (NutriCore V2 Standard)
    return { 
      url: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/fruta.jpg', 
      source: 'fallback' 
    };
  } catch (err) {
    return { 
      url: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/fruta.jpg', 
      source: 'fallback' 
    };
  }
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
