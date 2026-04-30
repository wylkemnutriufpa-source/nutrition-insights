import { Food } from './types';

export const mockMarmitas: Food[] = [
  { 
    id: 'm1', 
    name: 'Marmita Frango e Batata Doce', 
    calories: 420, 
    protein: 32, 
    carbs: 45, 
    fat: 10, 
    portionValue: 350, 
    portionUnit: 'marmita', 
    portionLabel: '1 marmita',
    isMarmita: true, 
    locked: true,
    imageUrl: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?q=80&w=200' 
  },
  { 
    id: 'm2', 
    name: 'Marmita Patinho e Arroz Integral', 
    calories: 450, 
    protein: 35, 
    carbs: 48, 
    fat: 12, 
    portionValue: 350, 
    portionUnit: 'marmita', 
    portionLabel: '1 marmita',
    isMarmita: true, 
    locked: true,
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=200' 
  },
  { 
    id: 'm3', 
    name: 'Marmita Peixe Grelhado e Purê', 
    calories: 380, 
    protein: 28, 
    carbs: 40, 
    fat: 9, 
    portionValue: 300, 
    portionUnit: 'marmita', 
    portionLabel: '1 marmita',
    isMarmita: true, 
    locked: true,
    imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=200' 
  }
];

export const mockFoods: Food[] = [
  { id: 'f1', name: 'Ovo cozido', calories: 70, protein: 6, carbs: 0, fat: 5, portionValue: 50, portionUnit: 'unidade', portionLabel: '1 unidade' },
  { id: 'f2', name: 'Banana', calories: 90, protein: 1, carbs: 23, fat: 0, portionValue: 100, portionUnit: 'unidade', portionLabel: '1 unidade' },
  { id: 'f3', name: 'Pão integral', calories: 70, protein: 3, carbs: 13, fat: 1, portionValue: 25, portionUnit: 'fatia', portionLabel: '1 fatia' },
  { id: 'f4', name: 'Iogurte natural', calories: 80, protein: 7, carbs: 9, fat: 2, portionValue: 170, portionUnit: 'pote', portionLabel: '1 pote' },
  { id: 'f5', name: 'Whey protein', calories: 120, protein: 25, carbs: 3, fat: 1, portionValue: 30, portionUnit: 'medida', portionLabel: '1 medida' },
  { id: 'f6', name: 'Aveia em flocos', calories: 56, protein: 2, carbs: 10, fat: 1, portionValue: 15, portionUnit: 'colher', portionLabel: '1 colher' },
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
