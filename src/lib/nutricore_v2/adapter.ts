import { runEngine, EngineInput, EngineResult, Goal, ActivityLevel } from './nutrition-engine';
import { distributeMacros, MealSlot, DistributedMeal } from './meal-distribution';
import { buildMeal, PlannedMeal } from './meal-builder';
import { BASE_FOODS, Food } from './food-database';
import { MARMITA_RECIPES, Marmita } from './marmitas-database';
import { getSubstitutions } from './substitutions';
import { getBestMealImage } from '../../features/editor-v3/utils/normalization';
import { convertGramsToHousehold } from './unit-converter';

// Tipos compatíveis com o FitJourney Elite V3
import { Meal as V3Meal, MealItem as V3MealItem, Food as V3Food, PatientContext } from '../../features/clinical-engine/types/clinical-types';

/**
 * Orquestrador NutriCore V3 - Adaptador para FitJourney Elite V3
 */
export class NutriCoreV3Adapter {
  /**
   * Converte o contexto do paciente do FitJourney para o formato NutriCore
   */
  private static mapPatientToEngine(context: PatientContext): EngineInput {
    // Mapeamento de objetivos do V3 para o NutriCore V3
    const goalMap: Record<string, Goal> = {
      'lose_weight': 'emagrecimento',
      'gain_muscle': 'hipertrofia',
      'maintain': 'manutencao',
      'health': 'saude',
      'performance': 'performance',
      'lose-weight': 'emagrecimento', // Suporte a hífens comuns no editor
      'muscle-gain': 'hipertrofia',
      'Emagrecimento': 'emagrecimento',
      'Hipertrofia': 'hipertrofia',
      'Manutenção': 'manutencao',
      'recomposition': 'recomposicao',
      'recomposicao': 'recomposicao'
    };

    // Mapeamento de nível de atividade
    const activityMap: Record<string, ActivityLevel> = {
      'sedentary': 'sedentario',
      'light': 'leve',
      'moderate': 'moderado',
      'intense': 'intenso',
      'very_active': 'muito_intenso',
      'sedentario': 'sedentario',
      'leve': 'leve',
      'moderado': 'moderado',
      'intenso': 'intenso'
    };

    const goal = goalMap[context.goal || ''] || 'manutencao';
    const activity = activityMap[context.activityLevel || ''] || 'moderado';

    console.info(`[NutriCore-Adapter] Mapping Patient: Weight ${context.weight}kg, Goal ${context.goal} -> ${goal}`);

    return {
      weight_kg: (() => {
        if (!context.weight || context.weight <= 0) {
          throw new Error(`Dados Clínicos Incompletos: Peso do paciente não encontrado (${context.name})`);
        }
        return context.weight;
      })(),
      height_cm: (() => {
        if (!context.height || context.height <= 0) {
          throw new Error(`Dados Clínicos Incompletos: Altura do paciente não encontrada (${context.name})`);
        }
        return context.height;
      })(),
      age_years: context.age || 30,
      sex: context.gender === 'female' ? 'feminino' : 'masculino',
      activity_level: activity,
      goal: goal
    };
  }

  /**
   * Gera um plano Elite V3 usando o novo Motor NutriCore
   */
  static async generateElitePlan(context: PatientContext, availableFoods: V3Food[], isWeekly: boolean = false): Promise<V3Meal[]> {
    console.info(`[NutriCore-Adapter] Starting Elite Plan Generation for ${context.name} (${context.weight}kg) | Weekly: ${isWeekly}`);
    
    try {
      const engineInput = this.mapPatientToEngine(context);
      const engineResult = runEngine(engineInput);
      
      console.log(`\n=== STAGE 1: NutriCoreV3 Targets ===`);
      console.log(`Target Kcal: ${engineResult.target_kcal}`);
      console.log(`Target Protein: ${engineResult.macros.protein_g}g`);
      console.log(`Target Carbs: ${engineResult.macros.carb_g}g`);
      console.log(`Target Fat: ${engineResult.macros.fat_g}g`);
      console.log(`Rationale: ${engineResult.rationale.join(' | ')}`);

      const targetKcal = engineResult.target_kcal || 2000;

      const mealSlots: MealSlot[] = [
        { type: 'cafe_da_manha', time: '08:00' },
        { type: 'lanche_da_manha', time: '10:30' },
        { type: 'almoço', time: '13:00' },
        { type: 'lanche_da_tarde', time: '16:00' },
        { type: 'jantar', time: '19:30' },
        { type: 'ceia', time: '22:00' }
      ];

      const distributed = distributeMacros(engineResult.macros, mealSlots);
      const foodDb: Food[] = availableFoods.map(f => ({
        id: f.id,
        name: f.name,
        category: (f.category as any) || 'carb',
        protein_100g: f.protein || 0,
        carb_100g: f.carbs || 0,
        fat_100g: f.fat || 0,
        kcal_100g: f.kcal || 0,
        base_grams: 100,
        unit: f.portionUnitLabel || 'g'
      }));

      const finalDb = foodDb.length > 5 ? foodDb : BASE_FOODS;
      
      // Se for modo semanal, geramos variações para cada dia (7 x 6 = 42 refeições)
      const loops = isWeekly ? 7 : 1;
      const allGeneratedMeals: V3Meal[] = [];

      const PROTEIN_ROTATION = ["Frango", "Patinho", "Sobrecoxa", "Peixe Branco"];
      const CARB_ROTATION = ["Arroz", "Batata Doce", "Macarrão", "Mandioca"];
      const BREAKFAST_ROTATION = ["Pão Integral", "Tapioca", "Cuscuz", "Aveia"];

      for (let dayIdx = 0; dayIdx < loops; dayIdx++) {
        const currentDayOfWeek = dayIdx + 1; // 1-7
        if (isWeekly && !currentDayOfWeek) {
           throw new Error("Erro de Governança: day_of_week obrigatório em modo semanal.");
        }

        // Criar preferências rotativas para este dia específico
        // Criar preferências rotativas contextuais
        const dayProteins = ["Frango", "Carne", "Peixe", "Ovo"];
        const dayCarbs = ["Arroz", "Batata", "Macarrão", "Mandioca"];
        
        const dayPrefs = [
          dayProteins[dayIdx % dayProteins.length],
          dayCarbs[dayIdx % dayCarbs.length],
          ...(context.preferences || [])
        ];

        const daySeed = 42 + dayIdx; // Seed fixa para determinismo por dia
        const dayMeals = await Promise.all(distributed.map(async (slot) => {
          // Mapeamento robusto de nomes para o Editor V3
          const nameMap: Record<string, string> = {
            'cafe_da_manha': 'Café da Manhã',
            'lanche_da_manha': 'Lanche da Manhã',
            'almoço': 'Almoço',
            'lanche_da_tarde': 'Lanche da Tarde',
            'jantar': 'Jantar',
            'ceia': 'Ceia'
          };
          
          const mealName = nameMap[slot.type] || slot.type.charAt(0).toUpperCase() + slot.type.slice(1).replace(/_/g, ' ');
          
          // Gerar refeição com variedade determinística para cada dia do loop
          const plannedMeal = buildMeal(
            slot.type,
            slot.time,
            {
              protein_g: slot.macros.protein_g,
              carb_g: slot.macros.carb_g,
              fat_g: slot.macros.fat_g,
              kcal: slot.macros.calories
            },
            finalDb,
            {
              restrictions: context.restrictions,
              preferences: dayPrefs,
              seed: daySeed
            }
          );

          const v3Items = plannedMeal.items.map(item => {
            const totalKcal = Math.round(item.macros.kcal);
            const totalProtein = Number(item.macros.protein_g.toFixed(1));
            const totalCarbs = Number(item.macros.carb_g.toFixed(1));
            const totalFat = Number(item.macros.fat_g.toFixed(1));
            
            const foodObj = finalDb.find(f => f.id === item.foodId);
            let substitutions: any[] = [];
            
            if (foodObj) {
              const subs = getSubstitutions(foodObj, finalDb, item.grams, context.restrictions, mealName);
              substitutions = subs.map(s => ({
                id: s.food.id,
                name: s.food.name,
                kcal: s.food.kcal_100g,
                calories: s.food.kcal_100g,
                protein: s.food.protein_100g,
                carbs: s.food.carb_100g,
                fat: s.food.fat_100g,
                portionValue: 100,
                portionUnitLabel: 'g',
                portionUnit: 'g',
                portionLabel: s.unit_label,
                measurementType: 'gram',
                suggestedQuantity: s.grams
              }));
            }

            const portion = convertGramsToHousehold(item.name, item.grams);
            const measurementType = portion.measurementType;
            const quantity = portion.quantity;
            const portionValue = portion.portionValue;
            const portionLabel = portion.portionLabel;

            console.log(`[ClinicalAudit] Item: ${item.name} | Mass: ${item.grams}g | Prot: ${totalProtein}g | Kcal: ${totalKcal}`);

            return {
              id: item.foodId,
              name: item.name,
              kcal: totalKcal,
              calories: totalKcal,
              protein: totalProtein,
              carbs: totalCarbs,
              fat: totalFat,
              kcal_100g: foodObj?.kcal_100g || totalKcal,
              protein_100g: foodObj?.protein_100g || totalProtein,
              carb_100g: foodObj?.carb_100g || totalCarbs,
              fat_100g: foodObj?.fat_100g || totalFat,
              portionValue,
              portionUnitLabel: portionLabel,
              portionUnit: portionLabel,
              portionLabel: portionLabel,
              measurementType: measurementType as any,
              instanceId: crypto.randomUUID(),
              quantity, 
              clinical_mass_g: item.grams, // 🛡️ Congelamento na fonte (Motor V3)
              blockId: crypto.randomUUID(), // 🛡️ Hierarchy Ownership: Todo item gerado nasce com seu bloco
              substitution_group_id: crypto.randomUUID(), // 🛡️ Isolamento de substituições
              is_primary: true,
              substitutions
            };
          });

          const bestImage = await getBestMealImage(mealName, v3Items);
            
          const typeMap: Record<string, 'breakfast' | 'snack' | 'lunch' | 'dinner' | 'supper'> = {
            'cafe_da_manha': 'breakfast',
            'lanche_da_manha': 'snack',
            'almoço': 'lunch',
            'lanche_da_tarde': 'snack',
            'jantar': 'dinner',
            'ceia': 'supper'
          };
            
          return {
            id: crypto.randomUUID(),
            name: mealName,
            type: typeMap[slot.type] || 'snack',
            time: slot.time,
            items: v3Items,
            imageUrl: bestImage.url,
            imageSource: bestImage.source
          } as V3Meal;
        }));
        allGeneratedMeals.push(...dayMeals);
      }
      return allGeneratedMeals;
    } catch (error: any) {
      console.error('[NutriCore-Adapter] Fatal Error during generation:', error);
      throw new Error(`Falha no Processamento Clínico: ${error.message}`);
    }
  }

  /**
   * Calcula substituições usando o algoritmo NutriCore
   */
  static getV3Substitutions(food: V3Food, grams: number, availableFoods: V3Food[]): V3Food[] {
    // Mapear para tipos NutriCore
    const coreFood: Food = {
      id: food.id,
      name: food.name,
      category: (food.category as any) || 'carb',
      protein_100g: food.protein,
      carb_100g: food.carbs,
      fat_100g: food.fat,
      kcal_100g: food.kcal,
      base_grams: 100,
      unit: 'g'
    };

    const coreDb: Food[] = availableFoods.map(f => ({
      id: f.id,
      name: f.name,
      category: (f.category as any) || 'carb',
      protein_100g: f.protein,
      carb_100g: f.carbs,
      fat_100g: f.fat,
      kcal_100g: f.kcal,
      base_grams: 100,
      unit: 'g'
    }));

    const subs = getSubstitutions(coreFood, coreDb, grams);

    return subs.map((s: any) => ({
      id: s.food.id,
      name: s.food.name,
      kcal: s.food.kcal_100g,
      calories: s.food.kcal_100g,
      protein: s.food.protein_100g,
      carbs: s.food.carb_100g,
      fat: s.food.fat_100g,
      portionValue: 100,
      portionUnitLabel: 'g',
      portionUnit: 'g',
      portionLabel: s.unit_label,
      measurementType: 'gram'
    }));
  }
}
