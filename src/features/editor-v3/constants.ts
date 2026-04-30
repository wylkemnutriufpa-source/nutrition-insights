import { Food } from './types';

export const mockMarmitas: Food[] = [
  { 
    id: 'm1', 
    name: 'Marmita Frango e Batata Doce', 
    kcal: 420,
    calories: 420, 
    protein: 32, 
    carbs: 45, 
    fat: 10, 
    portionValue: 350, 
    portionUnitLabel: 'marmita',
    portionUnit: 'marmita', 
    portionLabel: '1 marmita',
    measurementType: 'unit',
    isMarmita: true, 
    locked: true,
    imageUrl: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?q=80&w=200' 
  },
  { 
    id: 'm2', 
    name: 'Marmita Patinho e Arroz Integral', 
    kcal: 450,
    calories: 450, 
    protein: 35, 
    carbs: 48, 
    fat: 12, 
    portionValue: 350, 
    portionUnitLabel: 'marmita',
    portionUnit: 'marmita', 
    portionLabel: '1 marmita',
    measurementType: 'unit',
    isMarmita: true, 
    locked: true,
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=200' 
  },
  { 
    id: 'm3', 
    name: 'Marmita Peixe Grelhado e Purê', 
    kcal: 380,
    calories: 380, 
    protein: 28, 
    carbs: 40, 
    fat: 9, 
    portionValue: 300, 
    portionUnitLabel: 'marmita',
    portionUnit: 'marmita', 
    portionLabel: '1 marmita',
    measurementType: 'unit',
    isMarmita: true, 
    locked: true,
    imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=200' 
  }
];

export const mockFoods: Food[] = [
  // --- UNIT ---
  { 
    id: 'f1', name: 'Ovo cozido/mexido', 
    kcal: 70, calories: 70, protein: 6, carbs: 0.5, fat: 5, 
    portionValue: 50, portionUnitLabel: 'unidade', portionUnit: 'unidade', portionLabel: '1 unidade', 
    measurementType: 'unit' 
  },
  { 
    id: 'f2', name: 'Banana', 
    kcal: 90, calories: 90, protein: 1, carbs: 23, fat: 0, 
    portionValue: 100, portionUnitLabel: 'unidade', portionUnit: 'unidade', portionLabel: '1 unidade', 
    measurementType: 'unit' 
  },
  { 
    id: 'f3', name: 'Pão integral', 
    kcal: 70, calories: 70, protein: 3, carbs: 13, fat: 1, 
    portionValue: 25, portionUnitLabel: 'fatia', portionUnit: 'fatia', portionLabel: '1 fatia', 
    measurementType: 'unit' 
  },
  { 
    id: 'f9', name: 'Queijo Mussarela', 
    kcal: 70, calories: 70, protein: 5, carbs: 0.5, fat: 5, 
    portionValue: 20, portionUnitLabel: 'fatia', portionUnit: 'fatia', portionLabel: '1 fatia', 
    measurementType: 'unit' 
  },
  { 
    id: 'f10', name: 'Iogurte Natural', 
    kcal: 100, calories: 100, protein: 7, carbs: 9, fat: 4, 
    portionValue: 170, portionUnitLabel: 'pote', portionUnit: 'pote', portionLabel: '1 pote', 
    measurementType: 'unit' 
  },

  // --- GRAM ---
  { 
    id: 'f4', name: 'Arroz branco', 
    kcal: 1.3, calories: 1.3, protein: 0.02, carbs: 0.28, fat: 0, 
    portionValue: 1, portionUnitLabel: 'g', portionUnit: 'g', portionLabel: 'gramas', 
    measurementType: 'gram' 
  },
  { 
    id: 'f5', name: 'Frango grelhado', 
    kcal: 1.6, calories: 1.6, protein: 0.31, carbs: 0, fat: 0.03, 
    portionValue: 1, portionUnitLabel: 'g', portionUnit: 'g', portionLabel: 'gramas', 
    measurementType: 'gram' 
  },
  { 
    id: 'f11', name: 'Feijão carioca', 
    kcal: 0.9, calories: 0.9, protein: 0.05, carbs: 0.14, fat: 0.01, 
    portionValue: 1, portionUnitLabel: 'g', portionUnit: 'g', portionLabel: 'gramas', 
    measurementType: 'gram' 
  },
  { 
    id: 'f12', name: 'Macarrão cozido', 
    kcal: 1.5, calories: 1.5, protein: 0.06, carbs: 0.31, fat: 0.01, 
    portionValue: 1, portionUnitLabel: 'g', portionUnit: 'g', portionLabel: 'gramas', 
    measurementType: 'gram' 
  },
  { 
    id: 'f13', name: 'Carne (Patinho)', 
    kcal: 1.7, calories: 1.7, protein: 0.26, carbs: 0, fat: 0.07, 
    portionValue: 1, portionUnitLabel: 'g', portionUnit: 'g', portionLabel: 'gramas', 
    measurementType: 'gram' 
  },

  // --- SPOON ---
  { 
    id: 'f6', name: 'Aveia em flocos', 
    kcal: 56, calories: 56, protein: 2, carbs: 10, fat: 1, 
    portionValue: 15, portionUnitLabel: 'colher', portionUnit: 'colher', portionLabel: '1 colher', 
    measurementType: 'spoon' 
  },
  { 
    id: 'f14', name: 'Pasta de amendoim', 
    kcal: 90, calories: 90, protein: 3.5, carbs: 3, fat: 7.5, 
    portionValue: 15, portionUnitLabel: 'colher', portionUnit: 'colher', portionLabel: '1 colher', 
    measurementType: 'spoon' 
  },
  { 
    id: 'f15', name: 'Granola', 
    kcal: 60, calories: 60, protein: 1.5, carbs: 9, fat: 2.5, 
    portionValue: 15, portionUnitLabel: 'colher', portionUnit: 'colher', portionLabel: '1 colher', 
    measurementType: 'spoon' 
  },

  // --- ML ---
  { 
    id: 'f7', name: 'Leite desnatado', 
    kcal: 0.35, calories: 0.35, protein: 0.03, carbs: 0.05, fat: 0, 
    portionValue: 1, portionUnitLabel: 'ml', portionUnit: 'ml', portionLabel: 'ml', 
    measurementType: 'ml' 
  },
  { 
    id: 'f16', name: 'Suco de Laranja', 
    kcal: 0.45, calories: 0.45, protein: 0.01, carbs: 0.11, fat: 0, 
    portionValue: 1, portionUnitLabel: 'ml', portionUnit: 'ml', portionLabel: 'ml', 
    measurementType: 'ml' 
  },

  // --- OTHERS ---
  { 
    id: 'f8', name: 'Whey protein', 
    kcal: 120, calories: 120, protein: 25, carbs: 3, fat: 1, 
    portionValue: 30, portionUnitLabel: 'medida', portionUnit: 'medida', portionLabel: '1 medida', 
    measurementType: 'unit' 
  },
];

export interface MealTemplate {
  id: string;
  name: string;
  description: string;
  items: Food[];
}

export const mockTemplates: MealTemplate[] = [
  {
    id: 't1',
    name: 'Café Fit Padrão',
    description: 'Ovos + Pão integral + Banana',
    items: [
      { ...mockFoods[0] }, // Ovo
      { ...mockFoods[2] }, // Pão
      { ...mockFoods[1] }, // Banana
    ],
  },
  {
    id: 't2',
    name: 'Lanche Proteico',
    description: 'Whey + Aveia + Iogurte',
    items: [
      { ...mockFoods[15] }, // Whey (updated index)
      { ...mockFoods[10] }, // Aveia
      { ...mockFoods[4] }, // Iogurte
    ],
  },
];