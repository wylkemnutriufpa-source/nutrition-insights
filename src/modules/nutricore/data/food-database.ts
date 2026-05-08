import { FoodItem } from "../types";

export const FOOD_DATABASE: FoodItem[] = [
  // PROTEINS
  {
    id: 'egg',
    name: 'Ovo Inteiro',
    servingSize: 50,
    servingUnit: 'unidade',
    proteinPer100g: 13,
    carbsPer100g: 1,
    fatsPer100g: 10,
    caloriesPer100g: 155,
    category: 'protein',
    householdMeasures: [{ unit: 'unidade M', weight: 50 }]
  },
  {
    id: 'chicken-breast',
    name: 'Frango Grelhado',
    servingSize: 100,
    servingUnit: 'g',
    proteinPer100g: 31,
    carbsPer100g: 0,
    fatsPer100g: 3.6,
    caloriesPer100g: 165,
    category: 'protein',
    householdMeasures: [{ unit: 'filé médio', weight: 100 }]
  },
  {
    id: 'beef',
    name: 'Carne Patinho Grelhado',
    servingSize: 100,
    servingUnit: 'g',
    proteinPer100g: 28,
    carbsPer100g: 0,
    fatsPer100g: 7,
    caloriesPer100g: 190,
    category: 'protein',
    householdMeasures: [{ unit: 'bife médio', weight: 100 }]
  },
  {
    id: 'tilapia',
    name: 'Tilápia Grelhada',
    servingSize: 100,
    servingUnit: 'g',
    proteinPer100g: 26,
    carbsPer100g: 0,
    fatsPer100g: 2.7,
    caloriesPer100g: 128,
    category: 'protein',
    householdMeasures: [{ unit: 'filé', weight: 100 }]
  },
  // CARBS
  {
    id: 'rice',
    name: 'Arroz Branco Cozido',
    servingSize: 100,
    servingUnit: 'g',
    proteinPer100g: 2.5,
    carbsPer100g: 28,
    fatsPer100g: 0.2,
    caloriesPer100g: 130,
    category: 'carb',
    householdMeasures: [{ unit: 'colher de sopa', weight: 25 }]
  },
  {
    id: 'sweet-potato',
    name: 'Batata Doce Cozida',
    servingSize: 100,
    servingUnit: 'g',
    proteinPer100g: 1.6,
    carbsPer100g: 20,
    fatsPer100g: 0.1,
    caloriesPer100g: 86,
    category: 'carb',
    householdMeasures: [{ unit: 'unidade média', weight: 150 }]
  },
  {
    id: 'oats',
    name: 'Farelo de Aveia',
    servingSize: 30,
    servingUnit: 'g',
    proteinPer100g: 17,
    carbsPer100g: 66,
    fatsPer100g: 7,
    caloriesPer100g: 389,
    category: 'carb',
    householdMeasures: [{ unit: 'colher de sopa', weight: 10 }]
  },
  {
    id: 'bread-whole',
    name: 'Pão Integral',
    servingSize: 50,
    servingUnit: 'fatias',
    proteinPer100g: 9,
    carbsPer100g: 45,
    fatsPer100g: 3,
    caloriesPer100g: 250,
    category: 'carb',
    householdMeasures: [{ unit: 'fatia', weight: 25 }]
  },
  // FRUITS
  {
    id: 'banana',
    name: 'Banana Prata',
    servingSize: 100,
    servingUnit: 'unidade',
    proteinPer100g: 1.3,
    carbsPer100g: 23,
    fatsPer100g: 0.3,
    caloriesPer100g: 89,
    category: 'fruit',
    householdMeasures: [{ unit: 'unidade média', weight: 90 }]
  },
  // DAIRY
  {
    id: 'greek-yogurt',
    name: 'Iogurte Grego Natural',
    servingSize: 100,
    servingUnit: 'g',
    proteinPer100g: 10,
    carbsPer100g: 3.6,
    fatsPer100g: 0.4,
    caloriesPer100g: 59,
    category: 'dairy',
    householdMeasures: [{ unit: 'pote', weight: 100 }]
  },
  // FATS
  {
    id: 'olive-oil',
    name: 'Azeite de Oliva Extra Virgem',
    servingSize: 13,
    servingUnit: 'ml',
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatsPer100g: 100,
    caloriesPer100g: 884,
    category: 'fat',
    householdMeasures: [{ unit: 'colher de sopa', weight: 13 }]
  }
];

export class FoodDatabase {
  static findById(id: string): FoodItem | undefined {
    return FOOD_DATABASE.find(f => f.id === id);
  }

  static findByCategory(category: FoodItem['category']): FoodItem[] {
    return FOOD_DATABASE.filter(f => f.category === category);
  }
}
