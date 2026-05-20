import { supabase } from '@/integrations/supabase/client';
import { Food, Meal, MealItem } from '../types';
import { SovereignTelemetry } from '@/lib/sovereignTelemetry';
import { SovereignFatalGuard } from './FakeUtils';
import { translateSlot } from './translations';


/**
 * Normaliza um alimento para garantir que ele siga o padrão Estável.
 * Cura inconsistências de campos ausentes e mantém soberania de massa clínica.
 */

export function normalizeFood(food: any): Food {
  // 🛡️ BLOQUEIO SOBERANO: Impede reconstrução de payload se houver indícios de heurística textual
  if (typeof food === 'string' || (food?.name && !food.id && !food.instanceId)) {
    SovereignFatalGuard.blockLegacyNormalization('normalizeFood', food?.name || 'Unknown');
  }

  const f = { ...food };
  const originalId = f.id || f.instanceId;
  
  // Normalização estritamente técnica (sem rastreamento de pipeline)

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

  // Sanitização básica de macros para evitar valores nulos
  f.kcal = Math.max(0, f.kcal);
  f.protein = Math.max(0, f.protein);
  f.carbs = Math.max(0, f.carbs);
  f.fat = Math.max(0, f.fat);


  // 🛡️ MACRO PURIFICATION: Se não temos macros por 100g, inferimos agora para o Motor V3
  if (f.kcal_100g === undefined || f.kcal_100g === 0) {
    const pValue = Number(f.portionValue) || 100;
    f.kcal_100g = (f.measurementType === 'gram' || f.measurementType === 'ml') ? f.kcal : (f.kcal / (pValue / 100));
    f.protein_100g = (f.measurementType === 'gram' || f.measurementType === 'ml') ? f.protein : (f.protein / (pValue / 100));
    f.carb_100g = (f.measurementType === 'gram' || f.measurementType === 'ml') ? f.carbs : (f.carbs / (pValue / 100));
    f.fat_100g = (f.measurementType === 'gram' || f.measurementType === 'ml') ? f.fat : (f.fat / (pValue / 100));
  }

  // Macros preservados conforme cálculo do alimento


  return f as Food;
}

/**
 * Migration Guard: Converte dados do Editor V2 para V3 de forma segura.
 */
export function normalizeV2ToV3(v2Data: any): Meal[] {
  console.log('[Migration] Concluindo migração técnica para plataforma estável');

  if (!v2Data || !Array.isArray(v2Data)) {
    console.warn('[Migration Guard] Dados V2 inválidos ou ausentes');
    return [];
  }

  let mealsArray: any[] = v2Data;
  if (v2Data.length > 0 && v2Data[0].tipo_refeicao) {
    const itemsByMealType: Record<string, any[]> = {};
    v2Data.forEach((item: any) => {
      const type = item.tipo_refeicao || 'outros';
      if (!itemsByMealType[type]) itemsByMealType[type] = [];
      itemsByMealType[type].push(item);
    });

    mealsArray = Object.entries(itemsByMealType).map(([type, items]) => ({
      id: crypto.randomUUID(),
      name: translateSlot(type),
      time: type === 'Café da Manhã' ? '08:00' : (type === 'Almoço' ? '12:00' : (type === 'Jantar' ? '20:00' : '00:00')),
      items: items
    }));
  }

  return mealsArray.map((meal: any) => {
    const items = (meal.items || []).map((item: any) => {
      const sanitizedItem = { 
        ...item,
        name: item.name || item.title || 'Alimento sem nome',
        kcal: item.kcal ?? item.meta_calorias ?? item.calories ?? 0,
        protein: item.protein ?? item.meta_proteinas ?? 0,
        carbs: item.carbs ?? item.meta_carboidratos ?? 0,
        fat: item.fat ?? item.meta_gorduras ?? 0,
      };
      
      const normalized = normalizeFood(sanitizedItem) as any;
      
      return {
        ...normalized,
        instanceId: normalized.instanceId || crypto.randomUUID(),
        quantity: normalized.quantity ?? 1,
        clinical_mass_g: normalized.clinical_mass_g ?? (() => {
          const fallback = normalized.measurementType === 'gram' ? normalized.quantity : (normalized.quantity * (normalized.portionValue || 1));
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
 * Normaliza um snapshot V3 diretamente para a estrutura do Editor V3.
 * Este é o caminho mais fiel, pois o snapshot V3 já segue a lógica do Editor.
 */
export function normalizeSnapshotToV3(snapshot: any): Meal[] {
  if (!snapshot) return [];
  
  const rawMeals: any[] = [];
  
  // Estrutura complexa: snapshot.days -> meals
  if (Array.isArray(snapshot.days)) {
    snapshot.days.forEach((day: any, index: number) => {
      // 🛡️ SOBERANIA V3: Se day_of_week não existir no objeto do dia, inferimos pelo índice do array.
      // Seguindo a ordem do Editor [1, 2, 3, 4, 5, 6, 0] (Segunda a Domingo)
      const daysOrder = [1, 2, 3, 4, 5, 6, 0];
      const fallbackDay = daysOrder[index % 7];
      const dayIdx = (day.day_of_week !== undefined && day.day_of_week !== null) ? Number(day.day_of_week) : fallbackDay;

      if (Array.isArray(day.meals)) {
        day.meals.forEach((m: any) => {
          rawMeals.push({
            ...m,
            day_of_week: dayIdx
          });
        });
      }
    });
  } 
  // Estrutura flat: snapshot.meals
  else if (Array.isArray(snapshot.meals)) {
    rawMeals.push(...snapshot.meals);
  }
  // Estrutura única (legado)
  else if (snapshot.items) {
    rawMeals.push({
      ...snapshot,
      day_of_week: snapshot.day_of_week !== undefined ? snapshot.day_of_week : 0,
      items: snapshot.items
    });
  }

  return rawMeals.map(m => ({
    id: m.id || crypto.randomUUID(),
    name: m.name || translateSlot(m.meal_type || m.type || 'Refeição'),
    time: m.time || m.scheduled_time || "08:00",
    day_of_week: m.day_of_week !== undefined ? Number(m.day_of_week) : 1,
    items: (m.items || []).map((it: any) => {
      const img = it.image_url || it.imageUrl || it.visual?.image_url;
      const kcal = Number(it.kcal ?? it.meta_calorias ?? it.macros?.kcal ?? 0);
      const prot = Number(it.protein ?? it.meta_proteinas ?? it.macros?.protein_g ?? 0);
      const carb = Number(it.carbs ?? it.meta_carboidratos ?? it.macros?.carbs_g ?? 0);
      const fat = Number(it.fat ?? it.meta_gorduras ?? it.macros?.fat_g ?? 0);
      let qty = Number(it.quantity ?? it.display_quantity ?? it.clinical_mass_g ?? 0);
      let clinical_mass_g = Number(it.clinical_mass_g || qty);

      // 🛡️ SANITIZAÇÃO V3: Se a massa for 1 mas o item tem macros reais, recupera para 100g
      if (clinical_mass_g <= 1 && kcal > 5) {
        clinical_mass_g = 100;
        qty = 100;
      }

      return {
        id: it.id || it.instanceId || crypto.randomUUID(),
        instanceId: it.instanceId || it.id || crypto.randomUUID(),
        name: it.name || it.title || "Refeição",
        kcal,
        protein: prot,
        carbs: carb,
        fat: fat,
        quantity: qty,
        clinical_mass_g: clinical_mass_g,
        imageUrl: img,
        substitution_group_id: it.substitution_group_id || it.blockId,
        substitutions: Array.isArray(it.substitutions) ? it.substitutions.map((s: any) => ({
          ...s,
          name: s.name || s.title,
          kcal: Number(s.kcal ?? s.meta_calorias ?? s.macros?.kcal ?? 0),
          protein: Number(s.protein ?? s.meta_proteinas ?? s.macros?.protein_g ?? 0),
          carbs: Number(s.carbs ?? s.meta_carboidratos ?? s.macros?.carbs_g ?? 0),
          fat: Number(s.fat ?? s.meta_gorduras ?? s.macros?.fat_g ?? 0),
          imageUrl: s.image_url || s.imageUrl || s.visual?.image_url
        })) : []
      };
    })
  }));
}

/**
 * Busca a melhor imagem no banco meal_visual_library.
 * V3 SOBERANO: Prioriza resolução por IDs (food_id, recipe_id)
 */
/**
 * Busca a melhor imagem no banco meal_visual_library.
 * V3 SOBERANO: Mapeamento Direto por Nome (Solicitado pelo Usuário)
 */
export async function getBestMealImage(mealName: string, items: any[]): Promise<{ url: string; source: 'manual' | 'auto' | 'fallback' }> {
  try {
    const principalItem = items[0];
    if (!principalItem) return { url: FALLBACK_MEAL_IMAGE, source: 'fallback' };

    const foodName = (principalItem.name || "").toLowerCase().trim();
    
    // 🛡️ SOBERANIA V3: NUNCA usar inferência por slug em tempo de execução no App.
    // Apenas busca explícita na biblioteca ou fallback para placeholder.

    // 1. Tenta buscar no banco pelo nome exato (display_name ou name)
    const { data: match } = await supabase
      .from('meal_visual_library')
      .select('image_url')
      .or(`name.eq."${foodName}",display_name.eq."${foodName}"`)
      .eq('is_active', true)
      .maybeSingle();

    if (match?.image_url) {
      return { url: match.image_url, source: 'auto' };
    }

    // 🛡️ SOBERANIA V3: Se não encontrou na biblioteca oficial, retorna o placeholder oficial.
    // O sistema não deve tentar "adivinhar" extensões ou URLs.
    return { url: FALLBACK_MEAL_IMAGE, source: 'fallback' };

  } catch (err) {
    return { url: FALLBACK_MEAL_IMAGE, source: 'fallback' };
  }
}

const STORAGE_BASE_URL = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library';
const FALLBACK_MEAL_IMAGE = `${STORAGE_BASE_URL}/fruta.jpg`;

/**
 * Normaliza uma lista de refeições.
 */
export function normalizeMeals(meals: Meal[]): Meal[] {

  return (meals || []).map(meal => ({
    ...meal,
    items: (meal.items || []).map(item => {
      const normalized = normalizeFood(item);
      const quantity = (item as any).quantity !== undefined ? (item as any).quantity : (
        normalized.measurementType === 'gram' ? 100 : 
        normalized.measurementType === 'ml' ? 200 : 1
      );
      
      // 🛡️ GOVERNANÇA SEMANAL: Garantir que alimentos idênticos na mesma refeição tenham o mesmo blockId
      const baseMealName = meal.name.toLowerCase().split(' ')[0].split('-')[0].trim();
      // 🛡️ GOVERNANÇA SEMANAL: blockId deve ser preservado. Só geramos se for absolutamente novo.
      const existingBlockId = (item as any).blockId || (item as any).substitution_group_id;
      const generatedBlockId = existingBlockId || crypto.randomUUID();

      if (!existingBlockId) {
        SovereignTelemetry.log({
          runtime_source: 'normalization_v3',
          event_type: 'implicit_block_generation',
          severity: 'warning',
          message: `Gerando blockId implícito para "${normalized.name}". Possível perda de hierarquia.`,
          metadata: { name: normalized.name, meal: meal.name }
        });
      }

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
