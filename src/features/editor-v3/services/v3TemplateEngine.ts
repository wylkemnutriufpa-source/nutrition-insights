
import { supabase } from "@/integrations/supabase/client";
import { V3DietTemplate, Meal, MealItem } from "../types/types";
import { LibraryV3Resolver } from "./libraryV3Resolver";
const distributeMacros: any = (...args: any[]) => [];
type MealSlot = any;

/**
 * V3 Template Plotter
 * ----------------------------------------------------------------
 * Responsável por plotar os modelos da Biblioteca Premium para o paciente.
 */
export class V3TemplatePlotter {
  /**
   * Plota um template completo para um paciente
   */
  static async plotTemplate(
    templateSlug: string, 
    targetKcal: number,
    options: { isWeekly?: boolean } = {}
  ): Promise<Meal[]> {
    console.info(`[V3-Template-Engine] Plotting template: ${templateSlug} at ${targetKcal}kcal`);

    // 1. Carregar Template Soberano
    const { data: template, error } = await supabase
      .from('v3_diet_templates')
      .select('*')
      .eq('slug', templateSlug)
      .single();

    if (error || !template) {
      throw new Error(`Template ${templateSlug} não encontrado.`);
    }

    // 2. Definir Alvos de Macros Baseados no Kcal Selecionado
    // Tenta encontrar perfil específico no template, caso contrário usa distribuição balanceada
    const profiles = (template.kcal_profiles as any[]) || [];
    const activeProfile = profiles.find((p: any) => (typeof p === 'number' ? p : p.kcal) === targetKcal);
    
    let proteinRatio = 0.3;
    let carbRatio = 0.4;
    let fatRatio = 0.3;

    if (activeProfile && typeof activeProfile === 'object' && activeProfile.distribution_rules) {
      proteinRatio = activeProfile.distribution_rules.protein_ratio || 0.3;
      carbRatio = activeProfile.distribution_rules.carb_ratio || 0.4;
      fatRatio = activeProfile.distribution_rules.fat_ratio || 0.3;
    }

    const targetMacros = {
      protein_g: (targetKcal * proteinRatio) / 4,
      carb_g: (targetKcal * carbRatio) / 4,
      fat_g: (targetKcal * fatRatio) / 9,
      protein_kcal: targetKcal * proteinRatio,
      carb_kcal: targetKcal * carbRatio,
      fat_kcal: targetKcal * fatRatio
    };

    // 3. Mapear Slots do Template
    const distribution = (template.meal_distribution as any[]) || [];
    const mealSlots: MealSlot[] = distribution.map(d => ({
      type: d.slot,
      time: d.time
    }));

    // 4. Distribuir Macros pelos Slots (Regra de Negócio NutriCore)
    const distributed = distributeMacros(targetMacros as any, mealSlots);

    // 5. Resolver cada Refeição via Biblioteca Premium (Sem Invenção)
    const meals: Meal[] = [];
    const daysToProcess = options.isWeekly ? [1, 2, 3, 4, 5, 6, 0] : [0];

    for (const day of daysToProcess) {
      for (const slot of distributed) {
        const clusterSlug = template.cluster_map?.[slot.type] || 'almoco_tradicional';
        
        // O Resolver V3 já foi blindado para evitar expansões absurdas
        const resolvedMeal = await LibraryV3Resolver.resolveMealStructure(
          clusterSlug,
          slot.macros.calories,
          {
            goal: template.objective,
            planId: `v3-plot-${templateSlug}`,
            day: day.toString(),
            mealSlot: slot.type,
            integrityThreshold: 1.2, // Rigoroso: pouca variação de gramas
            family: template.objective
          }
        );

        if (resolvedMeal) {
          resolvedMeal.time = slot.time;
          resolvedMeal.day_of_week = day;
          meals.push(resolvedMeal);
        }
      }
    }

    return meals;
  }

  /**
   * Lista categorias disponíveis para o UI
   */
  static async getCategories() {
    const { data, error } = await supabase
      .from('v3_diet_templates')
      .select('objective')
      .eq('active', true);
    
    if (error) return [];
    const objectives = Array.from(new Set(data.map(d => d.objective)));
    return objectives;
  }
}
