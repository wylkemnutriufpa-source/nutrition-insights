
import { LibraryV3Resolver } from "./libraryV3Resolver";
import { distributeMacros, MealSlot } from "@/lib/nutricore_v2/meal-distribution";
import { runEngine, EngineInput } from "@/lib/nutricore_v2/nutrition-engine";
import { PatientContext, Meal } from "../types";

export interface SandboxRequest {
  patientContext: Partial<PatientContext>;
  mealSlots?: MealSlot[];
}

/**
 * V3 Sandbox Generator
 * ----------------------------------------------------------------
 * Motor de simulação para validar a Biblioteca V3 sem persistência.
 */
export class V3SandboxGenerator {
  static async generateDraft(request: SandboxRequest): Promise<Meal[]> {
    console.info(`[Sandbox-V3] Starting Simulation for ${request.patientContext.goal}`);

    // 1. Setup Contexto Clínico
    const context: PatientContext = {
      id: 'sandbox-id',
      name: 'Sandbox User',
      goal: request.patientContext.goal || 'maintain',
      weight: request.patientContext.weight || 75,
      height: request.patientContext.height || 175,
      age: request.patientContext.age || 30,
      gender: request.patientContext.gender || 'male',
      activityLevel: request.patientContext.activityLevel || 'moderate',
      restrictions: request.patientContext.restrictions || [],
      preferences: request.patientContext.preferences || [],
      calories_target: request.patientContext.calories_target || 2000,
      protein_target: request.patientContext.protein_target || 150,
      carbs_target: request.patientContext.carbs_target || 200,
      fat_target: request.patientContext.fat_target || 60
    };

    // 2. Rodar Motor Nutricional (V3)
    const engineInput: EngineInput = {
      weight_kg: context.weight,
      height_cm: context.height,
      age_years: context.age!,
      sex: context.gender === 'female' ? 'feminino' : 'masculino',
      activity_level: context.activityLevel as any || 'moderado',
      goal: context.goal as any || 'manutencao'
    };
    
    // Simular alvos se não fornecidos
    const engineResult = runEngine(engineInput);
    const targetMacros = {
      protein_g: context.protein_target || engineResult.macros.protein_g,
      carb_g: context.carbs_target || engineResult.macros.carb_g,
      fat_g: context.fat_target || engineResult.macros.fat_g,
      calories: context.calories_target || engineResult.target_kcal
    };

    // 3. Distribuição de Macros
    const defaultSlots: MealSlot[] = [
      { type: 'cafe_da_manha', time: '08:00' },
      { type: 'almoço', time: '13:00' },
      { type: 'lanche_da_tarde', time: '16:00' },
      { type: 'jantar', time: '19:30' }
    ];
    
    const slots = request.mealSlots || defaultSlots;
    const distributed = distributeMacros(targetMacros as any, slots);

    // 4. Resolução de Estruturas pela Biblioteca V3 (Soberana)
    const sandboxMeals: Meal[] = [];
    const planId = 'sandbox-plan';
    const day = 'sandbox-day';

    for (const slot of distributed) {
      // Mapeamento de Cluster (Simplificado para Sandbox)
      let clusterSlug = 'almoco_tradicional';
      if (slot.type === 'cafe_da_manha') clusterSlug = 'cafe_tradicional';
      if (slot.type === 'lanche_da_tarde') clusterSlug = 'lanche_pratico';
      if (slot.type === 'jantar') clusterSlug = 'almoco_tradicional';

      const meal = await LibraryV3Resolver.resolveMealStructure(
        clusterSlug,
        slot.macros.calories,
        {
          goal: context.goal!,
          planId,
          day,
          mealSlot: slot.type
        }
      );

      if (meal) {
        meal.time = slot.time;
        // Injetar macros do distribuidor para validação no sandbox
        sandboxMeals.push(meal);
      }
    }

    console.info(`[Sandbox-V3] Simulation Complete. Generated ${sandboxMeals.length} meals.`);
    return sandboxMeals;
  }
}
