import { Meal, MealItem, Food, MealTemplate } from "../types";
import { normalizeFood } from "../utils/normalization";
import { calculateItemMacros } from "@/lib/nutricore_v2/helpers";

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

  // 1. Plotagem inicial dos itens do template
  const baseItems: MealItem[] = template.items.map((f) => {
    const normalized = normalizeFood(f);
    
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
      quantity: initialQuantity,
      locked: false,
      substitutions: []
    };
  });

  // 2. Adicionar Substituições Equivalentes (Regra Problema 2.2)
  // Usamos uma lógica simplificada para encontrar substitutos na base de dados se disponível
  const itemsWithSubs = baseItems.map(item => {
    if (baseFoods.length === 0) return item;

    // Buscar 3 substitutos da mesma categoria
    const subs = baseFoods
      .filter(f => f.category === item.category && f.name !== item.name)
      .slice(0, 3);

    return {
      ...item,
      substitutions: subs
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
  if (params.isWeeklyMode) {
    const weeklyMeals: Meal[] = [];
    const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    
    days.forEach((day, index) => {
      // Para cada dia, tentamos trocar um item por uma de suas substituições
      const dayItems = finalItems.map(item => {
        if (index > 0 && item.substitutions && item.substitutions.length > 0) {
          // Escolha determinística baseada no dia para variação
          const subIndex = (index - 1) % item.substitutions.length;
          const sub = item.substitutions[subIndex];
          
          // Mantemos a mesma caloria do item original trocando pela gramatura equivalente do substituto
          const ratio = item.kcal / (sub.kcal || 1); 
          const subQty = (sub.portionValue || 100) * ratio;
          const macros = calculateItemMacros(sub, subQty);
          
          return {
            ...sub,
            instanceId: makeInstanceId(),
            quantity: subQty,
            ...macros,
            calories: macros.kcal,
            substitutions: item.substitutions // Mantém a lista de trocas
          } as MealItem;
        }
        return { ...item, instanceId: makeInstanceId() };
      });

      weeklyMeals.push({
        id: makeInstanceId(),
        name: `${template.name} (${day})`,
        items: dayItems,
        time: "08:00" // Default
      });
    });
    
    return weeklyMeals;
  }

  // Retorno padrão para dia único
  return [{
    id: makeInstanceId(),
    name: template.name,
    items: finalItems,
    time: "08:00"
  }];
}
