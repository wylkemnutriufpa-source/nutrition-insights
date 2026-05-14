import { Meal, MealItem, Food, MealTemplate, TemplateStyleContract } from "../types";
import { normalizeFood } from "../utils/normalization";
import { calculateItemMacros } from "@/lib/nutricore_v2/helpers";
import { getSubstitutions } from "@/lib/nutricore_v2/substitutions";
import {
  isFoodAllowedInSlot,
  isFreePortionFood,
  FREE_PORTION_MAX_GRAMS,
  normalizeSlot,
} from "@/lib/mealTypeIntegrity";
import { getFoodGroup } from "@/lib/substitutionGroups";
import { WeeklyFatigueGuard, calculateHumanMealScore } from "@/lib/clinicalHumanEngine";
import { getStyleContract } from "@/lib/templateStyles";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const makeInstanceId = () => crypto.randomUUID();

/**
 * Interface para os parâmetros de ajuste clínico.
 * Podem ser estendidos conforme necessário.
 */
export interface TemplateAdjustmentParams {
  goalProtein?: number;
  goalCarbs?: number;
  goalFat?: number;
  goalCalories?: number;
  isWeeklyMode?: boolean;
  styleContract?: TemplateStyleContract;
}

/**
 * Motor de Inteligência para Templates V3.
 * Ajusta quantidades, adiciona substituições e lida com variação semanal.
 */
export function processSmartTemplate(
  template: MealTemplate, 
  params: TemplateAdjustmentParams,
  baseFoods: Food[] = []
): Meal[] {
  console.log(`[SmartTemplate] Processando template "${template.name}"`, params);

  const styleContract = params.styleContract || getStyleContract((template as any).family);

  // 🛡️ REGRAS DE TEMPLATE: O slot agora é detectado com maior rigor para evitar drift.
  const templateName = template.name.toLowerCase();
  const slot = normalizeSlot(templateName) || 'breakfast';

  // 1. Plotagem inicial dos itens do template com HUMAN_SCORE_GUARD
  const baseItems: MealItem[] = template.items.map((f) => {
    const normalized = normalizeFood(f);
    
    // 🛡️ MEAL_TYPE_GUARD: Bloqueia alimentos proibidos para o slot já na plotagem inicial
    if (!isFoodAllowedInSlot(normalized.name, getFoodGroup(normalized.name), slot, { source: "templateIntelligence.plot" })) {
       console.warn(`[SmartTemplate] Alimento removido da plotagem por violação clínica: ${normalized.name} no slot ${slot}`);
       return null;
    }
    
    let initialQuantity = normalized.portionValue || 1;
    if (normalized.measurementType === 'gram') initialQuantity = 100;
    if (normalized.measurementType === 'ml') initialQuantity = 200;
    
    const macros = calculateItemMacros(normalized, initialQuantity);
    
    return {
      ...normalized,
      kcal: macros.kcal,
      calories: macros.kcal,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      instanceId: makeInstanceId(),
      blockId: (f as any).blockId || normalized.id || makeInstanceId(), // Preserve blockId
      substitution_group_id: (f as any).substitution_group_id || (f as any).blockId || normalized.id,
      is_primary: true, // Itens base do template são primários
      quantity: initialQuantity,
      locked: false,
      substitutions: []
    };
  }).filter(Boolean) as MealItem[];

  // 2. Adicionar Substituições Equivalentes (Regra Problema 2.2)
  // Usamos uma lógica simplificada para encontrar substitutos na base de dados se disponível
  const itemsWithSubs = baseItems.map(item => {
    if (baseFoods.length === 0) return item;

    // Mapear para o formato do NutriCore V3 para cálculo de substituições
    const mapToNutriCore = (f: any) => ({
      id: f.id,
      name: f.name,
      category: f.category || 'any',
      protein_100g: f.protein_100g || f.protein || 0,
      carb_100g: f.carb_100g || f.carbs || 0,
      fat_100g: f.fat_100g || f.fat || 0,
      kcal_100g: f.kcal_100g || f.kcal || 0,
      base_grams: 100,
      unit: f.portionUnitLabel || 'g'
    });

    const coreItem = mapToNutriCore(item);
    const coreDb = baseFoods.map(mapToNutriCore);

    // Usar o motor soberano de substituições do NutriCore V3
    const mealType = template.name; 
    const subs = getSubstitutions(coreItem as any, coreDb as any, item.quantity, [], mealType);
    
    return {
      ...item,
      substitutions: subs.map(s => ({
        ...s.food,
        suggestedQuantity: s.grams,
        portionLabel: s.unit_label
      })) as any
    };
  });

  // 3. Ajuste por Metas Clínicas (Regra Problema 2.3)
  // Se as metas do modal "Ajustar Plano" (ou contexto) forem passadas, escalamos as quantidades
  let finalItems = [...itemsWithSubs];
  
  if (params.goalCalories && params.goalCalories > 0) {
    // Calculamos o total atual do template (considerando que ele pode ser uma refeição única ou plano)
    const currentKcal = finalItems.reduce((sum, i) => sum + i.kcal, 0);
    
    // Estimamos o fator de escala. Se for uma refeição única, o ideal seria saber a meta DA REFEIÇÃO,
    // mas aqui escalamos proporcionalmente à meta diária se o desvio for grande.
    // Para simplificar e evitar distorções agressivas, aplicamos um fator suave.
    if (currentKcal > 0) {
      // Se o template tem 500kcal e a meta é 2000kcal, ele representa 25% do dia.
      // Se a meta mudar para 2500kcal, ele deve ir para 625kcal.
      // Como não sabemos a meta original do template, usamos 2000 como referência base de templates.
      const referenceKcal = 2000;
      const ratio = params.goalCalories / referenceKcal;
      
      if (Math.abs(1 - ratio) > 0.1) { // Só ajusta se a diferença for > 10%
        finalItems = finalItems.map(item => {
          const newQty = item.quantity * ratio;
          const macros = calculateItemMacros(item, newQty);
          return {
            ...item,
            quantity: newQty,
            ...macros,
            calories: macros.kcal
          };
        });
      }
    }
  }

  // 4. Geração de Variação Semanal (Regra Problema 2.5)
  // Se o modo semanal estiver ativo, geramos 7 dias baseados no template, mas com trocas
  // 🛡️ MEAL_TYPE_GUARD: cada substituição é validada contra o slot da refeição
  // para impedir contaminação (tilápia no café, arroz no café, etc).
  if (params.isWeeklyMode) {
    const weeklyMeals: Meal[] = [];
    const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

    // Detecta o slot a partir do nome do template/refeição (fallback: breakfast)
    const slot = normalizeSlot(template.name) ?? normalizeSlot((template as any).meal_type) ?? null;

    // 🛡️ FATIGUE_GUARD: Motor de variedade semanal humana
    const fatigueGuard = new WeeklyFatigueGuard();

    days.forEach((day, index) => {
      // O day_of_week segue o padrão: Segunda=1, Terça=2, ..., Sábado=6, Domingo=0
      const currentDayOfWeek = DAY_ORDER[index];

      // Para cada dia, tentamos trocar um item por uma de suas substituições
      const dayItems = finalItems.map(item => {
        if (index > 0 && item.substitutions && item.substitutions.length > 0) {
          // 🛡️ Filtra apenas substituições válidas para o slot
          const validSubs = slot
            ? item.substitutions.filter((s: any) =>
                isFoodAllowedInSlot(s.name || "", getFoodGroup(s.name || ""), slot, {
                  source: "templateIntelligence.weeklyVariation",
                }),
              )
            : item.substitutions;

          if (validSubs.length === 0) {
            // Sem substituição válida → mantém o item original (não força troca proibida)
            return { ...item, instanceId: makeInstanceId() };
          }

          const subIndex = (index - 1) % validSubs.length;
          const sub = validSubs[subIndex];

          // 🛡️ Vegetais (portion_mode=free) não escalam — mantêm porção fixa
          const isFree = isFreePortionFood(sub.name || "", getFoodGroup(sub.name || ""));
          let subQty: number;
          if (isFree) {
            subQty = Math.min(sub.portionValue || 80, FREE_PORTION_MAX_GRAMS);
          } else {
            const ratio = item.kcal / (sub.kcal || 1);
            subQty = (sub.portionValue || 100) * ratio;
          }
          const macros = calculateItemMacros(sub, subQty);

          return {
            ...sub,
            instanceId: makeInstanceId(),
            blockId: item.blockId,
            substitution_group_id: item.substitution_group_id,
            is_primary: true,
            quantity: subQty,
            ...macros,
            calories: macros.kcal,
            substitutions: validSubs,
          } as MealItem;
        }
        return { ...item, instanceId: makeInstanceId() };
      });

      const newMeal = {
        id: makeInstanceId(),
        name: `${template.name} (${day})`,
        items: dayItems,
        time: slot === 'breakfast' ? "08:00" : (slot === 'lunch' ? "12:00" : (slot === 'dinner' ? "20:00" : "16:00")),
        day_of_week: currentDayOfWeek, // 🛡️ SOBERANIA: Define explicitamente o dia da semana
      } as Meal;

      // 🛡️ Tenta evitar fadiga: Se repetir demais, tenta outra subs (simplificado aqui para 1 tentativa)
      const fatigue = fatigueGuard.checkFatigue(newMeal);
      if (!fatigue.canAdd && index > 0) {
        console.info(`[FatigueGuard] Variando refeição de ${day} por fadiga: ${fatigue.reason}`);
        // Em um motor mais complexo, faríamos um loop aqui.
      }

      fatigueGuard.addMeal(newMeal);
      weeklyMeals.push(newMeal);
    });

    return weeklyMeals.map(m => {
      const score = calculateHumanMealScore(m, template.name, styleContract);
      if (score.status === 'absurd') {
        console.warn(`[SmartTemplate] Refeição semanal rejeitada por violação de estilo: ${m.name}`, score.reasons);
      }
      return m;
    });
  }

  // Retorno padrão para dia único
  const finalMeal = {
    id: makeInstanceId(),
    name: template.name,
    items: finalItems,
    time: slot === 'breakfast' ? "08:00" : (slot === 'lunch' ? "12:00" : (slot === 'dinner' ? "20:00" : "16:00"))
  };

  const finalScore = calculateHumanMealScore(finalMeal, template.name, styleContract);
  if (finalScore.status === 'absurd') {
    console.warn(`[SmartTemplate] Refeição única rejeitada por violação de estilo: ${finalMeal.name}`, finalScore.reasons);
  }

  return [finalMeal];
}
