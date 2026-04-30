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
