import { runEngine, EngineInput, EngineResult, Goal, ActivityLevel } from './nutrition-engine';
import { distributeMacros, MealSlot, DistributedMeal } from './meal-distribution';
import { buildMeal, PlannedMeal } from './meal-builder';
import { BASE_FOODS, Food } from './food-database';
import { MARMITA_RECIPES, Marmita } from './marmitas-database';
import { getSubstitutions } from './substitutions';
import { getBestMealImage } from '../../features/editor-v3/utils/normalization';

// Tipos compatíveis com o FitJourney Elite V3
import { Meal as V3Meal, MealItem as V3MealItem, Food as V3Food, PatientContext } from '../../features/clinical-engine/types/clinical-types';

/**
 * Orquestrador NutriCore V2 - Adaptador para FitJourney Elite V3
 */
export class NutriCoreV2Adapter {
  /**
   * Converte o contexto do paciente do FitJourney para o formato NutriCore
   */
  private static mapPatientToEngine(context: PatientContext): EngineInput {
    // Mapeamento de objetivos do V3 para o NutriCore V2
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
      'Manutenção': 'manutencao'
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
      weight_kg: context.weight || 70, // Fallback final se o motor de priorização falhar totalmente
      height_cm: context.height || 170,
      age_years: context.age || 30,
      sex: context.gender === 'female' ? 'feminino' : 'masculino',
      activity_level: activity,
      goal: goal
    };
  }

  /**
   * Gera um plano Elite V3 usando o novo Motor NutriCore
   */
  static async generateElitePlan(context: PatientContext, availableFoods: V3Food[]): Promise<V3Meal[]> {
    const engineInput = this.mapPatientToEngine(context);
    const engineResult = runEngine(engineInput);
    
    // Regra Parte 4 Item 5: Se for plano completo, a base sugerida é ~2000 kcal se não houver contexto específico
    const targetKcal = engineResult.target_kcal || 2000;

    // Estrutura padrão de refeições baseada no FitJourney
    const mealSlots: MealSlot[] = [
      { type: 'cafe_da_manha', time: '08:00' },
      { type: 'lanche_da_manha', time: '10:30' },
      { type: 'almoço', time: '13:00' },
      { type: 'lanche_da_tarde', time: '16:00' },
      { type: 'jantar', time: '19:30' },
      { type: 'ceia', time: '22:00' }
    ];

    // Distribuição de Macros
    const distributed = distributeMacros(engineResult.macros, mealSlots);

    // NutriCore usa sua própria base de alimentos, mas podemos passar a disponível
    // Mapeando V3Food para Food do NutriCore (simplificado)
    const foodDb: Food[] = availableFoods.map(f => ({
      id: f.id,
      name: f.name,
      category: (f.category as any) || 'carb',
      protein_100g: f.protein,
      carb_100g: f.carbs,
      fat_100g: f.fat,
      kcal_100g: f.kcal,
      base_grams: 100,
      unit: f.portionUnitLabel || 'g'
    }));

    // Se a base estiver vazia, usa o BASE_FOODS do NutriCore
    const finalDb = foodDb.length > 5 ? foodDb : BASE_FOODS;

    // Utilizar Promise.all para permitir chamadas assíncronas dentro do map (getBestMealImage)
    return Promise.all(distributed.map(async (slot) => {
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
          preferences: context.preferences
        }
      );

      const v3Items = plannedMeal.items.map(item => {
        // 🛡️ REGRA DE OURO NutriCore V2:
        // Entregamos o macro TOTAL para a quantidade calculada.
        const totalKcal = Math.round(item.macros.kcal);
        const totalProtein = Number(item.macros.protein_g.toFixed(1));
        const totalCarbs = Number(item.macros.carb_g.toFixed(1));
        const totalFat = Number(item.macros.fat_g.toFixed(1));
        
        // Encontrar o objeto food original para calcular substituições
        const foodObj = finalDb.find(f => f.id === item.foodId);
        let substitutions: any[] = [];
        
        if (foodObj) {
          const subs = getSubstitutions(foodObj, finalDb, item.grams, context.restrictions);
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
            suggestedQuantity: s.grams // Informação vital para o executeSwap
          }));
        }

        // Ajuste Medida Caseira Elite
        const lowerName = item.name.toLowerCase();
        let measurementType: any = 'gram';
        let quantity = item.grams;
        let portionValue = 100;
        let portionLabel = 'g';

        if (lowerName.includes('ovo')) {
          measurementType = 'unit';
          portionValue = 50; // M
          quantity = Math.round(item.grams / 50);
          portionLabel = 'unidade(s)';
        } else if (lowerName.includes('pão integral') || lowerName.includes('pão de forma')) {
          measurementType = 'unit';
          portionValue = 25;
          quantity = Math.round(item.grams / 25);
          portionLabel = 'fatia(s)';
        } else if (lowerName.includes('pão francês')) {
          measurementType = 'unit';
          portionValue = 50;
          quantity = Math.round(item.grams / 50);
          portionLabel = 'unidade(s)';
        } else if (lowerName.includes('banana')) {
          measurementType = 'unit';
          portionValue = 90;
          quantity = Math.round(item.grams / 90);
          portionLabel = 'unidade(s) M';
        } else if (lowerName.includes('arroz') || lowerName.includes('feijão')) {
          measurementType = 'spoon';
          portionValue = 25;
          quantity = Math.round(item.grams / 25);
          portionLabel = 'colher(es) de sopa';
        }

        return {
          id: item.foodId,
          name: item.name,
          kcal: totalKcal,
          calories: totalKcal,
          protein: totalProtein,
          carbs: totalCarbs,
          fat: totalFat,
          // 🛡️ Blindagem: Salvar também os valores por 100g para o Motor V3 não se perder
          kcal_100g: foodObj?.kcal_100g || totalKcal,
          protein_100g: foodObj?.protein_100g || totalProtein,
          carb_100g: foodObj?.carb_100g || totalCarbs,
          fat_100g: foodObj?.fat_100g || totalFat,
          portionValue,
          portionUnitLabel: portionLabel,
          portionUnit: portionLabel,
          portionLabel: portionLabel,
          measurementType: measurementType as any,
          instanceId: Math.random().toString(36).substring(2, 10),
          quantity, 
          substitutions
        };
      });

      // PARTE 1 - Imagens Inteligentes (Elite V3)
      const bestImage = await getBestMealImage(mealName, v3Items);

      // Converter PlannedMeal para V3Meal
      return {
        id: Math.random().toString(36).substring(2, 9),
        name: mealName,
        time: slot.time,
        items: v3Items,
        imageUrl: bestImage.url,
        imageSource: bestImage.source
      };
    }));
  }

  /**
   * Calcula substituições usando o algoritmo NutriCore
   */
  static getV2Substitutions(food: V3Food, grams: number, availableFoods: V3Food[]): V3Food[] {
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
