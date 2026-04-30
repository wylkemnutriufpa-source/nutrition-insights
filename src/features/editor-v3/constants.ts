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
    portionUnit: 'g', 
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
    portionUnit: 'g', 
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
    portionUnit: 'g', 
    isMarmita: true, 
    locked: true,
    imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=200' 
  }
];

export const mockFoods: Food[] = [
  { id: 'f1', name: 'Ovo cozido', calories: 70, protein: 6, carbs: 0, fat: 5, portionValue: 50, portionUnit: 'g' },
  { id: 'f2', name: 'Banana', calories: 90, protein: 1, carbs: 23, fat: 0, portionValue: 100, portionUnit: 'g' },
  { id: 'f3', name: 'Pão integral', calories: 140, protein: 5, carbs: 26, fat: 2, portionValue: 50, portionUnit: 'g' },
  { id: 'f4', name: 'Iogurte natural', calories: 80, protein: 7, carbs: 9, fat: 2, portionValue: 170, portionUnit: 'g' },
  { id: 'f5', name: 'Whey protein', calories: 120, protein: 25, carbs: 3, fat: 1, portionValue: 30, portionUnit: 'g' },
  { id: 'f6', name: 'Aveia em flocos', calories: 150, protein: 5, carbs: 27, fat: 3, portionValue: 40, portionUnit: 'g' },
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
      { id: 'f1', name: 'Ovo cozido', calories: 70, protein: 6, carbs: 0, fat: 5, portionValue: 100, portionUnit: 'g' },
      { id: 'f3', name: 'Pão integral', calories: 140, protein: 5, carbs: 26, fat: 2, portionValue: 50, portionUnit: 'g' },
      { id: 'f2', name: 'Banana', calories: 90, protein: 1, carbs: 23, fat: 0, portionValue: 100, portionUnit: 'g' },
    ],
  },
  {
    id: 't2',
    name: 'Lanche Proteico',
    description: 'Whey + Aveia + Iogurte',
    items: [
      { id: 'f5', name: 'Whey protein', calories: 120, protein: 25, carbs: 3, fat: 1, portionValue: 30, portionUnit: 'g' },
      { id: 'f6', name: 'Aveia em flocos', calories: 150, protein: 5, carbs: 27, fat: 3, portionValue: 40, portionUnit: 'g' },
      { id: 'f4', name: 'Iogurte natural', calories: 80, protein: 7, carbs: 9, fat: 2, portionValue: 170, portionUnit: 'g' },
    ],
  },
];
