import { supabase } from '@/integrations/supabase/client';
import { Food, Meal, MealItem } from '../types';
import { PipelineTrace, ClinicalGuard } from './pipeline-trace';
import { SovereignTelemetry } from '@/lib/sovereignTelemetry';
import { SovereignFatalGuard } from '@/lib/sovereign-fatal-guards';

const tracer = PipelineTrace.getInstance();

/**
 * Normaliza um alimento para garantir que ele siga o padrão Elite V3.
 * Cura inconsistências de campos ausentes e infere tipos se necessário.
 * FASE: PIPELINE PURIFICATION — Separação de Massa Clínica vs Display
 */
export function normalizeFood(food: any): Food {
  // 🛡️ BLOQUEIO SOBERANO: Impede reconstrução de payload se houver indícios de heurística textual
  if (typeof food === 'string' || (food?.name && !food.id && !food.instanceId)) {
    SovereignFatalGuard.blockLegacyNormalization('normalizeFood', food?.name || 'Unknown');
  }

  const f = { ...food };
  const originalId = f.id || f.instanceId;
  
  tracer.trace(`Normalizing Food: ${f.name || 'Unknown'}`, { id: originalId, initial: { ...f } });

  // ... (rest of function)
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
    SovereignTelemetry.log({
      runtime_source: 'normalization_v3',
      event_type: 'missing_clinical_mass',
      severity: 'warning',
      message: `Food ${name} missing clinical_mass_g. Initializing with quantity ${initialQuantity}.`,
      metadata: { id: originalId, name, quantity: initialQuantity }
    });
    f.clinical_mass_g = initialQuantity;
    tracer.trace(`Clinical Mass Frozen: ${name}`, { mass: f.clinical_mass_g });
  }

  // PARTE 1 — MEDIDAS CASEIRAS (PADRONIZAÇÃO)
  // 🛑 REMOVIDO: O sistema não deve mais "adivinhar" medidas por nome de string (ex: 'ovo' -> 50g).
  // Apenas garantimos que o objeto Food tenha estrutura válida.
  if (wasGram) {
    f.measurementType = f.measurementType || 'gram';
    f.portionValue = f.portionValue || 100;
    f.portionLabel = f.portionLabel || '100g';
  }

  // Se não tem tipo, default para gramas (sem inferência por nome)
  if (!f.measurementType) {
    f.measurementType = 'gram';
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
  // 🛡️ BLOQUEIO SOBERANO: Bloquear hidratação V2->V3 se detectado no runtime crítico
  SovereignFatalGuard.blockLegacyNormalization('normalizeV2ToV3', 'Tentativa de hidratar V2 -> V3 em Runtime Soberano');
  
  // (O código abaixo torna-se inacessível em runtime se o guard acima disparar)
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
      id: crypto.randomUUID(),
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
        instanceId: normalized.instanceId || crypto.randomUUID(),
        quantity: normalized.quantity ?? 1,
        clinical_mass_g: normalized.clinical_mass_g ?? (() => {
          const fallback = normalized.measurementType === 'gram' ? normalized.quantity : (normalized.quantity * (normalized.portionValue || 1));
          SovereignTelemetry.log({
            runtime_source: 'normalization_v3_legacy_migration',
            event_type: 'missing_clinical_mass',
            severity: 'warning',
            message: `Inferring clinical_mass_g for ${normalized.name} during V2 migration.`,
            metadata: { name: normalized.name, fallback }
          });
          return fallback;
        })(),
        substitutions: (normalized.substitutions || []).map((sub: any) => normalizeFood(sub))
      } as MealItem;
    });

    return {
      ...meal,
      id: meal.id || crypto.randomUUID(),
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
        instanceId: (item as any).instanceId || crypto.randomUUID(),
        quantity,
        blockId: (item as any).blockId || generatedBlockId,
        clinical_mass_g: (item as any).clinical_mass_g ?? (normalized as any).clinical_mass_g ?? (() => {
          const fallback = normalized.measurementType === 'gram' ? quantity : (quantity * (normalized.portionValue || 1));
          SovereignTelemetry.log({
            runtime_source: 'normalization_v3',
            event_type: 'missing_clinical_mass',
            severity: 'warning',
            message: `Inferring clinical_mass_g for ${normalized.name} during hydration.`,
            metadata: { name: normalized.name, fallback, source: 'normalizeMeals' }
          });
          return fallback;
        })(),
        substitutions: (item as any).substitutions || [] 
      } as MealItem;
    })
  }));
}
