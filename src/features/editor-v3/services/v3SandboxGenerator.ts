
import { LibraryV3Resolver } from "./libraryV3Resolver";
import { distributeMacros, MealSlot } from "@/lib/nutricore_v2/meal-distribution";
import { runEngine, EngineInput } from "@/lib/nutricore_v2/nutrition-engine";
import { PatientContext, Meal } from "../types";
import { DietTemplateService } from "./dietTemplateService";

export interface SandboxRequest {
  patientContext: Partial<PatientContext>;
  mealSlots?: MealSlot[];
  templateSlug?: string;
  isWeekly?: boolean;
}

/**
 * V3 Sandbox Generator
 * ----------------------------------------------------------------
 * Motor de simulação para validar a Biblioteca V3 sem persistência.
 */
export class V3SandboxGenerator {
  static async generateDraft(request: SandboxRequest): Promise<Meal[]> {
    console.info(`[Sandbox-V3] Starting Simulation. Template: ${request.templateSlug || 'None'}`);

    // 1. Setup Contexto Clínico
    const context: PatientContext = {
      id: 'sandbox-id',
      name: 'Sandbox User',
      goal: request.patientContext.goal || 'manutencao',
      weight: request.patientContext.weight || 75,
      height: request.patientContext.height || 175,
      age: request.patientContext.age || 30,
      gender: request.patientContext.gender || 'male',
      activityLevel: request.patientContext.activityLevel || 'moderado',
      restrictions: request.patientContext.restrictions || [],
      preferences: request.patientContext.preferences || [],
      calories_target: request.patientContext.calories_target || 2000,
      protein_target: request.patientContext.protein_target || 150,
      carbs_target: request.patientContext.carbs_target || 200,
      fat_target: request.patientContext.fat_target || 60
    };

    // 2. Buscar Template se fornecido
    let template = null;
    if (request.templateSlug) {
      template = await DietTemplateService.getTemplateBySlug(request.templateSlug);
      if (template) {
        console.info(`[Sandbox-V3] Using Template: ${template.title}`);
        context.goal = template.objective;
      }
    }

    // 3. Rodar Motor Nutricional (NutriCore)
    const engineInput: EngineInput = {
      weight_kg: context.weight,
      height_cm: context.height,
      age_years: context.age!,
      sex: context.gender === 'female' ? 'feminino' : 'masculino',
      activity_level: context.activityLevel as any || 'moderado',
      goal: context.goal as any || 'manutencao'
    };
    
    const engineResult = runEngine(engineInput);
    const targetMacros = {
      protein_g: context.protein_target || engineResult.macros.protein_g,
      carb_g: context.carbs_target || engineResult.macros.carb_g,
      fat_g: context.fat_target || engineResult.macros.fat_g,
      protein_kcal: (context.protein_target || engineResult.macros.protein_g) * 4,
      carb_kcal: (context.carbs_target || engineResult.macros.carb_g) * 4,
      fat_kcal: (context.fat_target || engineResult.macros.fat_g) * 9
    };

    // 4. Distribuição de Macros (Slots)
    let slots: MealSlot[] = [];
    if (template && template.meal_distribution) {
      slots = template.meal_distribution.map(d => ({
        type: d.slot,
        time: d.time
      }));
    } else {
      slots = request.mealSlots || [
        { type: 'cafe_da_manha', time: '08:00' },
        { type: 'almoço', time: '13:00' },
        { type: 'lanche_da_tarde', time: '16:30' },
        { type: 'jantar', time: '20:00' },
        { type: 'ceia', time: '22:30' }
      ];
    }
    
    const distributed = distributeMacros(targetMacros as any, slots);

    // 5. Resolução Soberana (LibraryV3Resolver)
    const sandboxMeals: Meal[] = [];
    const planId = 'sandbox-plan';
    
    // Se o template tem um perfil específico para a kcal alvo, podemos extrair regras dele
    const activeProfile = template?.kcal_profiles?.find(p => 
      typeof p === 'object' && p.kcal === context.calories_target
    );

    const daysToGenerate = request.isWeekly ? [1, 2, 3, 4, 5, 6, 0] : [null];

    for (const dayIndex of daysToGenerate) {
      const dayId = dayIndex !== null ? `day-${dayIndex}` : 'sandbox-day';
      
      for (const slot of distributed) {
        // Mapeamento de Cluster
        let clusterSlug = 'almoco_tradicional';
        
        if (template && template.cluster_map && template.cluster_map[slot.type]) {
          clusterSlug = template.cluster_map[slot.type];
        } else {
          if (slot.type.includes('cafe')) clusterSlug = 'cafe_tradicional';
          else if (slot.type.includes('lanche')) clusterSlug = 'lanche_pratico';
          else clusterSlug = 'almoco_tradicional';
        }

        const meal = await LibraryV3Resolver.resolveMealStructure(
          clusterSlug,
          slot.macros.calories,
          {
            goal: context.goal!,
            planId,
            day: dayId,
            mealSlot: slot.type,
            integrityThreshold: template?.meal_integrity_threshold,
            family: template?.family,
            styleContract: template?.style_contract
          }
        );

        if (meal) {
          meal.time = slot.time;
          meal.day_of_week = dayIndex !== null ? dayIndex : undefined;
          meal.selectionMode = request.isWeekly ? 'week' : 'day';
          sandboxMeals.push(meal);
        }
      }
    }

    console.info(`[Sandbox-V3] Simulation Complete. Generated ${sandboxMeals.length} meals.`);
    return sandboxMeals;
  }
}
