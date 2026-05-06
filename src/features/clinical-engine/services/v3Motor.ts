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

export const isProtein = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('frango') || n.includes('carne') || n.includes('peixe') || 
         n.includes('ovo') || n.includes('whey') || n.includes('patinho') || 
         n.includes('presunto') || n.includes('queijo') || n.includes('lombo') ||
         n.includes('músculo') || n.includes('alcatra') || n.includes('tilápia') ||
         n.includes('salmão') || n.includes('atum');
};

export const isCarb = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('arroz') || n.includes('batata') || n.includes('macarrão') || 
         n.includes('feijão') || n.includes('pão') || n.includes('aveia') || 
         n.includes('tapioca') || n.includes('cuscuz') || n.includes('mandioca') ||
         n.includes('milho') || n.includes('grão de bico') || n.includes('lentilha');
};

export const isFruit = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('banana') || n.includes('maçã') || n.includes('uva') || 
         n.includes('fruta') || n.includes('suco') || n.includes('laranja') ||
         n.includes('mamão') || n.includes('melão') || n.includes('melancia') ||
         n.includes('abacaxi') || n.includes('morango') || n.includes('manga') ||
         n.includes('pera') || n.includes('goiaba') || n.includes('tangerina');
};

export const isVegetable = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('alface') || n.includes('tomate') || n.includes('brócolis') || 
         n.includes('cenoura') || n.includes('vagem') || n.includes('abobrinha') ||
         n.includes('couve') || n.includes('repolho') || n.includes('chuchu') ||
         n.includes('espinafre');
};

export const isFat = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('azeite') || n.includes('manteiga') || n.includes('castanha') || 
         n.includes('amendoim') || n.includes('nozes') || n.includes('abacate') ||
         n.includes('óleo') || n.includes('banha');
};

export const getFoodCategory = (food: FoodItem): string => {
  if (food.category) return food.category.toLowerCase();
  const name = food.name.toLowerCase();
  if (isProtein(name)) return 'proteína';
  if (isCarb(name)) return 'carboidrato';
  if (isFruit(name)) return 'fruta';
  if (isVegetable(name)) return 'legume';
  if (isFat(name)) return 'gordura';
  return 'outro';
};

/**
 * Phase 4 — High Precision Substitutions
 */
export const getSubstitutionsWithGrams = (request: SubstitutionRequest): Substitution[] => {
  const { base_item, base_grams, available_foods, image_bank, max_suggestions = 5 } = request;
  
  const baseCategory = getFoodCategory(base_item);
  const baseKcalPerGram = base_item.kcal / 100;
  const caloriesBase = baseKcalPerGram * base_grams;

  // Map image bank for easy access
  const imageMap = new Map(image_bank.map(i => [i.food_id, i.image_url]));

  const substitutions: Substitution[] = available_foods
    .filter(food => {
      // 1. Same category
      if (getFoodCategory(food) !== baseCategory) return false;
      // 2. Not the same item
      if (food.id === base_item.id) return false;
      // 3. MUST HAVE IMAGE
      const img = food.imageUrl || imageMap.get(food.id);
      return !!img;
    })
    .map(candidate => {
      const candidateKcalPerGram = candidate.kcal / 100;
      
      // Calculate equivalent grams
      let equivalentGrams = candidateKcalPerGram > 0 
        ? caloriesBase / candidateKcalPerGram 
        : base_grams;
      
      // Rounded grams
      equivalentGrams = Math.round(equivalentGrams);

      // Determine unit display
      let unidade = `${equivalentGrams}g`;
      if (candidate.measurementType === 'unit' && candidate.portionValue) {
        const units = Math.round((equivalentGrams / candidate.portionValue) * 10) / 10;
        if (units >= 0.5) {
          unidade = `${units} ${units === 1 ? 'unidade' : 'unidades'}`;
          // Add grams in parenthesis if relevant
          unidade += ` (${equivalentGrams}g)`;
        }
      } else if (candidate.measurementType === 'spoon') {
        const spoons = Math.round((equivalentGrams / 15) * 10) / 10; // assuming 15g per spoon
        unidade = `${spoons} colheres (${equivalentGrams}g)`;
      }

      const ratio = equivalentGrams / 100;
      const calEquiv = candidate.kcal * ratio;

      return {
        alimento: candidate.name,
        alimento_id: candidate.id,
        gramas: equivalentGrams,
        unidade,
        calorias_equivalentes: Math.round(calEquiv * 10) / 10,
        macros: {
          proteina_g: Math.round(candidate.protein * ratio * 10) / 10,
          carboidrato_g: Math.round(candidate.carbs * ratio * 10) / 10,
          gordura_g: Math.round(candidate.fat * ratio * 10) / 10,
        },
        imagem_url: candidate.imageUrl || imageMap.get(candidate.id) || '',
        equivalencia_calorica: Math.round((1 - Math.abs(calEquiv - caloriesBase) / (caloriesBase || 1)) * 100)
      };
    })
    .sort((a, b) => {
      // a. Same measurementType first
      const aTypeMatch = available_foods.find(f => f.id === a.alimento_id)?.measurementType === base_item.measurementType ? 1 : 0;
      const bTypeMatch = available_foods.find(f => f.id === b.alimento_id)?.measurementType === base_item.measurementType ? 1 : 0;
      if (aTypeMatch !== bTypeMatch) return bTypeMatch - aTypeMatch;

      // b. Proximity to target calories
      return b.equivalencia_calorica - a.equivalencia_calorica;
    })
    .slice(0, max_suggestions);

  return substitutions;
};

export const calculateItemMacros = (item: Partial<Food>, quantity: number) => {
  const cal = item.calories || item.kcal || 0;
  const protein = item.protein ?? 0;
  const carbs = item.carbs ?? 0;
  const fat = item.fat ?? 0;

  // No V3, a base de cálculo é dinâmica baseada no portionValue (geralmente 100g para alimentos da Tabela TACO/USDA)
  // Se for unidade, portionValue é 1, resultando em fator = quantity
  const base = (item as any).portionValue || 100;
  const factor = quantity / base;

  return {
    kcal: cal * factor,
    protein: protein * factor,
    carbs: carbs * factor,
    fat: fat * factor
  };
};

export const getDeterministicSuggestions = (baseItemName: string, availableFoods: Food[], baseMeasurementType?: string, basePortionLabel?: string): Food[] => {
  const startTime = performance.now();
  const name = baseItemName.toLowerCase();
  let suggestions: Food[] = [];

  if (isProtein(name)) {
    suggestions = availableFoods.filter(f => isProtein(f.name.toLowerCase()) && f.name.toLowerCase() !== name);
  } else if (isCarb(name)) {
    suggestions = availableFoods.filter(f => isCarb(f.name.toLowerCase()) && f.name.toLowerCase() !== name);
  } else if (isFruit(name)) {
    suggestions = availableFoods.filter(f => isFruit(f.name.toLowerCase()) && f.name.toLowerCase() !== name);
  }

  if (suggestions.length < 3) {
    const additional = availableFoods.filter(f => 
      f.measurementType === baseMeasurementType && 
      f.name.toLowerCase() !== name &&
      !suggestions.find(s => s.id === f.id)
    );
    suggestions = [...suggestions, ...additional];
  }

  const result = suggestions.sort((a, b) => {
    const aTypeMatch = a.measurementType === baseMeasurementType ? 1 : 0;
    const bTypeMatch = b.measurementType === baseMeasurementType ? 1 : 0;
    const aLabelMatch = basePortionLabel && a.portionLabel === basePortionLabel ? 1 : 0;
    const bLabelMatch = basePortionLabel && b.portionLabel === basePortionLabel ? 1 : 0;
    if (aTypeMatch !== bTypeMatch) return bTypeMatch - aTypeMatch;
    return bLabelMatch - aLabelMatch;
  });

  const endTime = performance.now();
  return result;
};
