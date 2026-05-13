import { supabase } from '@/integrations/supabase/client';
import { Food, Meal, MealItem } from '../types';
import { PipelineTrace, ClinicalGuard } from './pipeline-trace';

const tracer = PipelineTrace.getInstance();

/**
 * Normaliza um alimento para garantir que ele siga o padrão Elite V3.
 * Cura inconsistências de campos ausentes e infere tipos se necessário.
 * FASE: PIPELINE PURIFICATION — Separação de Massa Clínica vs Display
 */
export function normalizeFood(food: any): Food {
  const f = { ...food };
  const originalId = f.id || f.instanceId;
  
  tracer.trace(`Normalizing Food: ${f.name || 'Unknown'}`, { id: originalId, initial: { ...f } });

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

  // 🛡️ CONGELAMENTO DA MASSA CLÍNICA (Soberania do Motor)
  // Se for gramas e ainda não tiver clinical_mass_g, este é o ponto zero.
  if (wasGram && (f.clinical_mass_g === undefined || f.clinical_mass_g === null)) {
    f.clinical_mass_g = initialQuantity;
    tracer.trace(`Clinical Mass Frozen: ${name}`, { mass: f.clinical_mass_g });
  }

  // PARTE 1 — MEDIDAS CASEIRAS (PADRONIZAÇÃO URGENTE)
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

    // Só converte quantity se for a primeira vez (wasGram) e tivermos um teto clínico
    if (newMeasurementType !== 'gram' && wasGram && initialQuantity > 5) {
      // Se já temos clinical_mass_g, usamos ele para garantir que a conversão não seja recursiva
      const sourceMass = f.clinical_mass_g || initialQuantity;
      f.quantity = Math.round((sourceMass / (newPortionValue || 1)) * 10) / 10;
      
      tracer.trace(`Display Conversion: ${name}`, { 
        from: `${sourceMass}g`, 
        to: `${f.quantity} ${newPortionLabel}`,
        factor: newPortionValue 
      });
    }

    f.measurementType = newMeasurementType;
    f.portionValue = newPortionValue;
    f.portionLabel = newPortionLabel;
  }

  // Se não tem tipo, inferir
  if (!f.measurementType) {
    if (name.includes('leite') || name.includes('suco') || name.includes('bebida') || name.includes('água') || name.includes('ml')) {
      f.measurementType = 'ml';
    } else if (name.includes('aveia') || name.includes('granola') || name.includes('pasta') || name.includes('colher')) {
      f.measurementType = 'spoon';
    } else {
      f.measurementType = 'gram';
    }
  }

  // Fallbacks de labels
  if (!f.portionUnitLabel && f.portionUnit) f.portionUnitLabel = f.portionUnit;
  if (!f.portionUnit && f.portionUnitLabel) f.portionUnit = f.portionUnitLabel;
  if (!f.portionLabel && f.portionUnitLabel) f.portionLabel = `1 ${f.portionUnitLabel}`;

  // Garantir portionValue positivo
  if (!f.portionValue || f.portionValue <= 0) {
    if (f.measurementType === 'gram' || f.measurementType === 'ml') {
      f.portionValue = 100; 
    } else if (f.measurementType === 'spoon') {
      f.portionValue = 15; 
    } else {
      f.portionValue = 1; 
    }
  }

  // 🛡️ GUARDIÃO FISIOLÓGICO (FIM DO PIPELINE)
  if (f.quantity) {
    const clamped = ClinicalGuard.clampQuantity(f.quantity, name, f.measurementType);
    if (clamped !== f.quantity) {
      tracer.trace(`Clinical Guard Clamp Applied: ${name}`, { old: f.quantity, new: clamped });
      f.quantity = clamped;
      // Se clampamos a quantity, precisamos garantir que o clinical_mass_g também seja saudável
      if (f.measurementType === 'gram') f.clinical_mass_g = clamped;
    }
  }

  // 🛡️ MACRO SANITIZATION: Garante que os macros estáticos do objeto fiquem limpos
  const cleanMacros = ClinicalGuard.sanitizeMacros({
    kcal: f.kcal || 0,
    protein: f.protein || 0,
    carbs: f.carbs || 0,
    fat: f.fat || 0
  });

  f.kcal = cleanMacros.kcal;
  f.protein = cleanMacros.protein;
  f.carbs = cleanMacros.carbs;
  f.fat = cleanMacros.fat;

  return f as Food;
}

/**
 * Migration Guard: Converte dados do Editor V2 para V3 de forma segura.
 */
export function normalizeV2ToV3(v2Data: any): Meal[] {
  console.log('[Migration Guard] Iniciando migração V2 -> V3');
  tracer.trace('Migration Start', { items_count: v2Data?.length });
  
  if (!v2Data || !Array.isArray(v2Data)) {
    console.warn('[Migration Guard] Dados V2 inválidos ou ausentes');
    return [];
  }

  let mealsArray: any[] = v2Data;
  if (v2Data.length > 0 && v2Data[0].meal_type) {
    const itemsByMealType: Record<string, any[]> = {};
    v2Data.forEach((item: any) => {
      const type = item.meal_type || 'outros';
      if (!itemsByMealType[type]) itemsByMealType[type] = [];
      itemsByMealType[type].push(item);
    });

    const mealTypeLabels: Record<string, string> = {
      breakfast: 'Café da Manhã',
      morning_snack: 'Lanche da Manhã',
      lunch: 'Almoço',
      afternoon_snack: 'Lanche da Tarde',
      dinner: 'Jantar',
      evening_snack: 'Ceia',
      pre_workout: 'Pré-Treino',
      post_workout: 'Pós-Treino'
    };

    mealsArray = Object.entries(itemsByMealType).map(([type, items]) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: mealTypeLabels[type] || type,
      time: type === 'breakfast' ? '08:00' : (type === 'lunch' ? '12:00' : (type === 'dinner' ? '20:00' : '00:00')),
      items: items
    }));
  }

  return mealsArray.map((meal: any) => {
    const items = (meal.items || []).map((item: any) => {
      const sanitizedItem = { 
        ...item,
        name: item.name || item.title || 'Alimento sem nome',
        kcal: item.kcal ?? item.calories_target ?? item.calories ?? 0,
        protein: item.protein ?? item.protein_target ?? 0,
        carbs: item.carbs ?? item.carbs_target ?? 0,
        fat: item.fat ?? item.fat_target ?? 0,
      };
      
      const normalized = normalizeFood(sanitizedItem) as any;
      
      return {
        ...normalized,
        instanceId: normalized.instanceId || Math.random().toString(36).substring(2, 10),
        quantity: normalized.quantity ?? 1,
        clinical_mass_g: normalized.clinical_mass_g ?? (normalized.measurementType === 'gram' ? normalized.quantity : (normalized.quantity * (normalized.portionValue || 1))),
        substitutions: (normalized.substitutions || []).map((sub: any) => normalizeFood(sub))
      } as MealItem;
    });

    return {
      ...meal,
      id: meal.id || Math.random().toString(36).substring(2, 9),
      name: meal.name || 'Nova Refeição',
      items: items,
      time: meal.time || '00:00'
    } as Meal;
  });
}

/**
 * Busca a melhor imagem no banco meal_visual_library.
 */
export async function getBestMealImage(mealName: string, items: any[]): Promise<{ url: string; source: 'manual' | 'auto' | 'fallback' }> {
  try {
    const cleanMealName = mealName.toLowerCase();
    const principalItem = items.find(i => 
      ['frango', 'carne', 'peixe', 'ovo', 'tilápia', 'marmita', 'omelete', 'escondidinho', 'massa'].some(p => i.name.toLowerCase().includes(p))
    ) || items[0];

    const searchTerm = principalItem ? principalItem.name.toLowerCase() : cleanMealName;
    
    const { data: results } = await supabase
      .from('meal_visual_library')
      .select('image_url, name, category')
      .or(`name.ilike.%${searchTerm}%,name.ilike.%${cleanMealName}%`)
      .limit(5);

    if (results && results.length > 0) {
      const valid = results.find(r => r.image_url);
      if (valid) return { url: valid.image_url, source: 'auto' };
    }

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
  tracer.trace('Normalizing Meals Array', { count: meals?.length });
  return (meals || []).map(meal => ({
    ...meal,
    items: (meal.items || []).map(item => {
      const normalized = normalizeFood(item);
      const quantity = (item as any).quantity !== undefined ? (item as any).quantity : (
        normalized.measurementType === 'gram' ? 100 : 
        normalized.measurementType === 'ml' ? 200 : 1
      );
      
      // 🛡️ GOVERNANÇA SEMANAL: Garantir que alimentos idênticos na mesma refeição tenham o mesmo blockId
      // Normalizamos o nome da refeição (ex: "Almoço Segunda" -> "almoço") para agrupar horizontalmente
      const baseMealName = meal.name.toLowerCase().split(' ')[0].split('-')[0].trim();
      const generatedBlockId = `${baseMealName}-${normalized.id}`;

      return {
        ...normalized,
        instanceId: (item as any).instanceId || Math.random().toString(36).substring(2, 10),
        quantity,
        blockId: (item as any).blockId || generatedBlockId,
        clinical_mass_g: (item as any).clinical_mass_g ?? (normalized as any).clinical_mass_g ?? (normalized.measurementType === 'gram' ? quantity : (quantity * (normalized.portionValue || 1))),
        substitutions: (item as any).substitutions || [] 
      } as MealItem;
    })
  }));
}
