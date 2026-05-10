export type FoodCategory =
  | "protein"
  | "carb"
  | "fat"
  | "fruit"
  | "vegetable"
  | "dairy";

export interface Food {
  id: string;
  name: string;
  category: FoodCategory;
  protein_100g: number;
  carb_100g: number;
  fat_100g: number;
  kcal_100g: number;
  base_grams: number;
  unit: string;
}

/**
 * Alimentos base com dados reais aproximados (TACO/USDA).
 */
export const BASE_FOODS: Food[] = [
  // Proteínas
  { id: "1", name: "Peito de Frango Grelhado", category: "protein", protein_100g: 31, carb_100g: 0, fat_100g: 3.6, kcal_100g: 165, base_grams: 100, unit: "g" },
  { id: "2", name: "Patinho Bovino Grelhado", category: "protein", protein_100g: 28, carb_100g: 0, fat_100g: 7, kcal_100g: 185, base_grams: 100, unit: "g" },
  { id: "3", name: "Tilápia Grelhada", category: "protein", protein_100g: 26, carb_100g: 0, fat_100g: 2.7, kcal_100g: 128, base_grams: 100, unit: "g" },
  { id: "4", name: "Ovo Cozido", category: "protein", protein_100g: 13, carb_100g: 1, fat_100g: 10, kcal_100g: 155, base_grams: 50, unit: "unidade (50g)" },
  { id: "17", name: "Queijo Minas Frescal", category: "protein", protein_100g: 17, carb_100g: 3, fat_100g: 15, kcal_100g: 215, base_grams: 30, unit: "fatia (30g)" },

  // Carboidratos
  { id: "5", name: "Arroz Branco Cozido", category: "carb", protein_100g: 2.5, carb_100g: 28, fat_100g: 0.2, kcal_100g: 130, base_grams: 100, unit: "g" },
  { id: "6", name: "Batata Doce Cozida", category: "carb", protein_100g: 1.6, carb_100g: 20, fat_100g: 0.1, kcal_100g: 86, base_grams: 100, unit: "g" },
  { id: "7", name: "Feijão Carioca Cozido", category: "carb", protein_100g: 4.8, carb_100g: 14, fat_100g: 0.5, kcal_100g: 76, base_grams: 100, unit: "g" },
  { id: "8", name: "Aveia em Flocos", category: "carb", protein_100g: 14, carb_100g: 67, fat_100g: 8, kcal_100g: 394, base_grams: 30, unit: "g" },
  { id: "18", name: "Pão Francês", category: "carb", protein_100g: 8, carb_100g: 58, fat_100g: 3, kcal_100g: 300, base_grams: 50, unit: "unid (50g)" },
  { id: "23", name: "Pão Integral", category: "carb", protein_100g: 9, carb_100g: 48, fat_100g: 3, kcal_100g: 260, base_grams: 50, unit: "2 fatias (50g)" },
  { id: "19", name: "Tapioca (Goma)", category: "carb", protein_100g: 0, carb_100g: 54, fat_100g: 0, kcal_100g: 220, base_grams: 60, unit: "g" },
  { id: "20", name: "Cuscuz de Milho", category: "carb", protein_100g: 2.5, carb_100g: 25, fat_100g: 0.5, kcal_100g: 110, base_grams: 100, unit: "g" },

  // Gorduras
  { id: "9", name: "Azeite de Oliva Extra Virgem", category: "fat", protein_100g: 0, carb_100g: 0, fat_100g: 100, kcal_100g: 884, base_grams: 13, unit: "colher de sopa (13ml)" },
  { id: "10", name: "Pasta de Amendoim", category: "fat", protein_100g: 25, carb_100g: 20, fat_100g: 50, kcal_100g: 588, base_grams: 15, unit: "g" },
  { id: "11", name: "Manteiga sem sal", category: "fat", protein_100g: 0.8, carb_100g: 0.1, fat_100g: 81, kcal_100g: 717, base_grams: 10, unit: "g" },

  // Frutas
  { id: "12", name: "Banana Prata", category: "fruit", protein_100g: 1.3, carb_100g: 26, fat_100g: 0.1, kcal_100g: 98, base_grams: 100, unit: "g" },
  { id: "13", name: "Maçã", category: "fruit", protein_100g: 0.3, carb_100g: 14, fat_100g: 0.2, kcal_100g: 52, base_grams: 100, unit: "g" },
  { id: "21", name: "Mamão Papaia", category: "fruit", protein_100g: 0.5, carb_100g: 11, fat_100g: 0.1, kcal_100g: 45, base_grams: 100, unit: "g" },

  // Vegetais
  { id: "14", name: "Brócolis Cozido", category: "vegetable", protein_100g: 2.4, carb_100g: 4.4, fat_100g: 0.4, kcal_100g: 35, base_grams: 100, unit: "g" },
  { id: "15", name: "Alface Americana", category: "vegetable", protein_100g: 0.9, carb_100g: 1.7, fat_100g: 0.1, kcal_100g: 9, base_grams: 100, unit: "g" },
  { id: "22", name: "Tomate", category: "vegetable", protein_100g: 1, carb_100g: 3, fat_100g: 0.2, kcal_100g: 18, base_grams: 100, unit: "g" },

  // Laticínios
  { id: "16", name: "Iogurte Natural Desnatado", category: "dairy", protein_100g: 4, carb_100g: 6, fat_100g: 0.1, kcal_100g: 41, base_grams: 170, unit: "pote (170g)" },
];
