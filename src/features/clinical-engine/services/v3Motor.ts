import { Food } from '../types/clinical-types';

export interface FoodItem extends Partial<Food> {
  id: string;
  name: string;
  kcal: number; // Represents kcal per 100g or per unit depending on measurementType
  protein: number;
  carbs: number;
  fat: number;
  measurementType: 'unit' | 'gram' | 'spoon' | 'ml';
  portionValue?: number; // Standard weight in grams for 1 unit
  category?: string;
  imageUrl?: string;
}

export interface ImageBankItem {
  food_id: string;
  image_url: string;
}

export interface SubstitutionRequest {
  base_item: FoodItem;
  base_grams: number;
  available_foods: FoodItem[];
  image_bank: ImageBankItem[];
  max_suggestions?: number;
}

export interface Substitution {
  alimento: string;
  alimento_id: string;
  gramas: number;
  unidade: string;           // "150g", "2 fatias", "3 unidades"
  calorias_equivalentes: number;
  macros: {
    proteina_g: number;
    carboidrato_g: number;
    gordura_g: number;
  };
  imagem_url: string;
  equivalencia_calorica: number; // % proximity
}

// Calculations moved to NutriCore V2 (src/lib/nutricore_v2/helpers.ts)
export { 
  isProtein, isCarb, isFruit, isVegetable, isFat, getFoodCategory, 
  getSubstitutionsWithGrams, calculateItemMacros, getDeterministicSuggestions 
} from '@/lib/nutricore_v2/helpers';


