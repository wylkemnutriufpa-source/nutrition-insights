import { Food } from './types';

export const mockMarmitas: Food[] = [
  { 
    id: 'm1', 
    name: 'Marmita Frango e Batata Doce', 
    calories: 120, // Por 100g para facilitar se mudar gramas, mas user quer por porção
    protein: 9, 
    carbs: 13, 
    fat: 3, 
    portionValue: 350, 
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
    calories: 130, 
    protein: 10, 
    carbs: 14, 
    fat: 4, 
    portionValue: 350, 
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
    calories: 110, 
    protein: 8, 
    carbs: 12, 
    fat: 3, 
    portionValue: 300, 
    portionUnit: 'marmita', 
    portionLabel: '1 marmita',
    measurementType: 'unit',
    isMarmita: true, 
    locked: true,
    imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=200' 
  }
];

export const mockFoods: Food[] = [
  { id: 'f1', name: 'Ovo cozido', calories: 1.4, protein: 0.12, carbs: 0, fat: 0.1, portionValue: 50, portionUnit: 'unidade', portionLabel: '1 unidade', measurementType: 'unit' },
  { id: 'f2', name: 'Banana', calories: 0.9, protein: 0.01, carbs: 0.23, fat: 0, portionValue: 100, portionUnit: 'unidade', portionLabel: '1 unidade', measurementType: 'unit' },
  { id: 'f3', name: 'Pão integral', calories: 2.8, protein: 0.12, carbs: 0.52, fat: 0.04, portionValue: 25, portionUnit: 'fatia', portionLabel: '1 fatia', measurementType: 'unit' },
  { id: 'f4', name: 'Arroz branco', calories: 1.3, protein: 0.02, carbs: 0.28, fat: 0, portionValue: 1, portionUnit: 'g', portionLabel: 'gramas', measurementType: 'gram' },
  { id: 'f5', name: 'Frango grelhado', calories: 1.6, protein: 0.31, carbs: 0, fat: 0.03, portionValue: 1, portionUnit: 'g', portionLabel: 'gramas', measurementType: 'gram' },
  { id: 'f6', name: 'Aveia em flocos', calories: 3.7, protein: 0.14, carbs: 0.66, fat: 0.07, portionValue: 15, portionUnit: 'colher', portionLabel: '1 colher', measurementType: 'spoon' },
  { id: 'f7', name: 'Leite desnatado', calories: 0.35, protein: 0.03, carbs: 0.05, fat: 0, portionValue: 1, portionUnit: 'ml', portionLabel: 'ml', measurementType: 'ml' },
  { id: 'f8', name: 'Whey protein', calories: 4, protein: 0.8, carbs: 0.1, fat: 0.03, portionValue: 30, portionUnit: 'medida', portionLabel: '1 medida', measurementType: 'unit' },
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
      { ...mockFoods[4] }, // Whey
      { ...mockFoods[5] }, // Aveia
      { ...mockFoods[3] }, // Iogurte
    ],
  },
];
