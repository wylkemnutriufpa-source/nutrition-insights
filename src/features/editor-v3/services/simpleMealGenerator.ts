import { Meal, MealItem, Food, PatientContext } from "../types";

/**
 * ⚡ RESET TOTAL — MOTOR DE GERAÇÃO SIMPLIFICADO (FITJOURNEY V3)
 * ----------------------------------------------------------------
 * Objetivo: Estabilidade, Coerência e Variedade sem Hiper-Complexidade.
 */

const BASE_FOODS = {
  proteins: [
    { name: "Frango Grelhado", kcal: 165, p: 31, c: 0, f: 3.6, category: "proteína" },
    { name: "Carne Moída Patinho", kcal: 219, p: 35.9, c: 0, f: 7.3, category: "proteína" },
    { name: "Tilápia Grelhada", kcal: 128, p: 26, c: 0, f: 2.7, category: "proteína" },
    { name: "Ovo Cozido", kcal: 155, p: 13, c: 1, f: 11, category: "proteína" },
    { name: "Omelete Simples", kcal: 160, p: 14, c: 2, f: 12, category: "proteína" },
  ],
  carbs: [
    { name: "Arroz Branco Cozido", kcal: 130, p: 2.5, c: 28, f: 0.2, category: "carboidrato" },
    { name: "Arroz Integral Cozido", kcal: 124, p: 2.6, c: 26, f: 1, category: "carboidrato" },
    { name: "Batata Doce Cozida", kcal: 86, p: 1.6, c: 20, f: 0.1, category: "carboidrato" },
    { name: "Macarrão Integral", kcal: 124, p: 5.3, c: 26, f: 0.5, category: "carboidrato" },
    { name: "Mandioca Cozida", kcal: 125, p: 0.6, c: 30, f: 0.3, category: "carboidrato" },
  ],
  breakfast_carbs: [
    { name: "Pão Integral", kcal: 247, p: 9.4, c: 43, f: 3.7, category: "carboidrato" },
    { name: "Pão Francês", kcal: 300, p: 9, c: 58, f: 3, category: "carboidrato" },
    { name: "Tapioca (Goma)", kcal: 240, p: 0, c: 60, f: 0, category: "carboidrato" },
    { name: "Cuscuz de Milho", kcal: 110, p: 2.5, c: 25, f: 0.5, category: "carboidrato" },
    { name: "Aveia em Flocos", kcal: 389, p: 17, c: 66, f: 7, category: "carboidrato" },
  ],
  fruits: [
    { name: "Banana", kcal: 92, p: 1, c: 24, f: 0.3, category: "fruta" },
    { name: "Maçã", kcal: 52, p: 0.3, c: 14, f: 0.2, category: "fruta" },
    { name: "Mamão Papaia", kcal: 43, p: 0.5, c: 11, f: 0.3, category: "fruta" },
    { name: "Abacaxi", kcal: 50, p: 0.5, c: 13, f: 0.1, category: "fruta" },
    { name: "Morango", kcal: 32, p: 0.7, c: 8, f: 0.3, category: "fruta" },
  ],
  dairy: [
    { name: "Iogurte Natural", kcal: 61, p: 3.5, c: 4.7, f: 3.3, category: "laticínio" },
    { name: "Iogurte Grego", kcal: 133, p: 10, c: 4, f: 9, category: "laticínio" },
    { name: "Queijo Cottage", kcal: 98, p: 11, c: 3.4, f: 4.3, category: "laticínio" },
    { name: "Queijo Minas Frescal", kcal: 215, p: 17, c: 3, f: 15, category: "laticínio" },
  ],
  legumes: [
    { name: "Feijão Carioca Cozido", kcal: 76, p: 4.8, c: 14, f: 0.5, category: "leguminosa" },
    { name: "Feijão Preto Cozido", kcal: 132, p: 8.9, c: 24, f: 0.5, category: "leguminosa" },
    { name: "Lentilha Cozida", kcal: 116, p: 9, c: 20, f: 0.4, category: "leguminosa" },
    { name: "Grão de Bico Cozido", kcal: 164, p: 8, c: 27, f: 2.6, category: "leguminosa" },
  ],
  vegetables: [
    { name: "Brócolis Cozido", kcal: 34, p: 2.8, c: 7, f: 0.4, category: "vegetal" },
    { name: "Cenoura Cozida", kcal: 41, p: 0.9, c: 10, f: 0.2, category: "vegetal" },
    { name: "Alface e Tomate", kcal: 15, p: 1, c: 3, f: 0.2, category: "vegetal" },
  ],
  fats: [
    { name: "Azeite de Oliva", kcal: 884, p: 0, c: 0, f: 100, category: "gordura" },
    { name: "Pasta de Amendoim", kcal: 588, p: 25, c: 20, f: 50, category: "gordura" },
    { name: "Castanhas", kcal: 650, p: 14, c: 12, f: 60, category: "gordura" },
  ]
};

export class SimpleMealGenerator {
  /**
   * Gera um plano simplificado e funcional.
   */
  static generatePlan(context: PatientContext, isWeekly: boolean = false): Meal[] {
    const meals: Meal[] = [];
    const days = isWeekly ? [1, 2, 3, 4, 5, 6, 0] : [null];
    
    // Cálculo simplificado de meta por refeição (distribuição clássica)
    const dailyKcal = context.calories_target || 2000;
    const distribution = {
      breakfast: 0.20,
      snack1: 0.10,
      lunch: 0.30,
      snack2: 0.10,
      dinner: 0.20,
      supper: 0.10
    };

    days.forEach((dayIndex) => {
      const daySeed = dayIndex !== null ? dayIndex : 42;
      
      // 1. Café da Manhã
      meals.push(this.buildSimpleMeal(
        "Café da Manhã", 
        "breakfast", 
        dailyKcal * distribution.breakfast, 
        ['breakfast_carbs', 'proteins', 'fruits'],
        daySeed,
        dayIndex
      ));

      // 2. Lanche da Manhã
      meals.push(this.buildSimpleMeal(
        "Lanche da Manhã", 
        "snack", 
        dailyKcal * distribution.snack1, 
        ['fruits', 'dairy'],
        daySeed + 1,
        dayIndex
      ));

      // 3. Almoço
      meals.push(this.buildSimpleMeal(
        "Almoço", 
        "lunch", 
        dailyKcal * distribution.lunch, 
        ['proteins', 'carbs', 'legumes', 'vegetables'],
        daySeed + 2,
        dayIndex
      ));

      // 4. Lanche da Tarde
      meals.push(this.buildSimpleMeal(
        "Lanche da Tarde", 
        "snack", 
        dailyKcal * distribution.snack2, 
        ['fruits', 'dairy', 'fats'],
        daySeed + 3,
        dayIndex
      ));

      // 5. Jantar
      meals.push(this.buildSimpleMeal(
        "Jantar", 
        "dinner", 
        dailyKcal * distribution.dinner, 
        ['proteins', 'carbs', 'vegetables'],
        daySeed + 4,
        dayIndex
      ));

      // 6. Ceia
      meals.push(this.buildSimpleMeal(
        "Ceia", 
        "supper", 
        dailyKcal * distribution.supper, 
        ['dairy', 'fats'],
        daySeed + 5,
        dayIndex
      ));
    });

    return meals;
  }

  private static buildSimpleMeal(name: string, type: any, targetKcal: number, foodKeys: string[], seed: number, day: number | null): Meal {
    const items: MealItem[] = [];
    const itemTargetKcal = targetKcal / foodKeys.length;

    foodKeys.forEach((key, idx) => {
      const pool = (BASE_FOODS as any)[key];
      // Seleção circular baseada no dia para garantir rotação semanal
      const food = pool[(seed + idx) % pool.length];
      
      const quantity = Math.round((itemTargetKcal / food.kcal) * 100);
      const factor = quantity / 100;

      const instanceId = crypto.randomUUID();
      items.push({
        id: food.name,
        instanceId,
        blockId: instanceId,
        name: food.name,
        quantity,
        clinical_mass_g: quantity,
        kcal: Math.round(food.kcal * factor),
        protein: Number((food.p * factor).toFixed(1)),
        carbs: Number((food.c * factor).toFixed(1)),
        fat: Number((food.f * factor).toFixed(1)),
        measurementType: "gram",
        portionValue: 100,
        portionLabel: "g",
        is_primary: true,
        substitutions: this.getSimpleSubstitutions(food, quantity, pool)
      } as any);
    });

    return {
      id: crypto.randomUUID(),
      name,
      items,
      time: this.getDefaultTime(type),
      day_of_week: day !== null ? day : undefined,
      imageUrl: "",
      imageSource: "auto"
    } as Meal;
  }

  private static getSimpleSubstitutions(food: any, quantity: number, pool: any[]): any[] {
    return pool
      .filter(f => f.name !== food.name)
      .slice(0, 4)
      .map(f => {
        const ratio = food.kcal / f.kcal;
        const subQty = Math.round(quantity * ratio);
        const factor = subQty / 100;
        
        return {
          id: f.name,
          name: f.name,
          kcal: Math.round(f.kcal * factor),
          protein: Number((f.p * factor).toFixed(1)),
          carbs: Number((f.c * factor).toFixed(1)),
          fat: Number((f.f * factor).toFixed(1)),
          quantity: subQty,
          suggestedQuantity: subQty,
          portionLabel: `${subQty}g`,
          is_substitution: true,
          is_primary: false
        };
      });
  }

  private static getDefaultTime(type: string): string {
    const times: Record<string, string> = {
      breakfast: "08:00",
      snack: "10:30",
      lunch: "13:00",
      afternoon_snack: "16:00",
      dinner: "19:30",
      supper: "22:00"
    };
    return times[type] || "00:00";
  }
}
