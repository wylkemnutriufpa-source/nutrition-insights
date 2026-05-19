import { FoodItem } from '../types';

export const MARMITAS: FoodItem[] = [
  { id: 'm1', name: 'Frango com Arroz e Legumes', calories: 450, protein: 35, carbs: 45, fat: 12, tamanho_porcao: 350, category: 'marmita', imageUrl: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-feijao-frango.png' },
  { id: 'm2', name: 'Patinho com Purê de Mandioquinha', calories: 480, protein: 38, carbs: 42, fat: 15, tamanho_porcao: 350, category: 'marmita', imageUrl: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/acem/acem.jpg' },
  { id: 'm3', name: 'Peixe com Arroz Integral e Brócolis', calories: 400, protein: 30, carbs: 40, fat: 10, tamanho_porcao: 350, category: 'marmita', imageUrl: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/file-de-tilapia/file-de-tilapia.jpg' },
  { id: 'm4', name: 'Strogonoff de Frango (Fit)', calories: 500, protein: 35, carbs: 40, fat: 18, tamanho_porcao: 350, category: 'marmita', imageUrl: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-com-frango.png' },
  { id: 'm19', name: 'Salmão com Crosta de Castanhas', calories: 580, protein: 40, carbs: 15, fat: 38, tamanho_porcao: 300, category: 'marmita', imageUrl: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg' },
  { id: 'm20', name: 'Carne de Panela Acebolada', calories: 520, protein: 38, carbs: 30, fat: 22, tamanho_porcao: 350, category: 'marmita', imageUrl: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-assada-de-panela/carne-assada-de-panela.jpg' }
];

export const BREAKFAST_ITEMS: FoodItem[] = [
  { id: 'p1', name: 'Pão Integral', calories: 120, protein: 5, carbs: 22, fat: 2, tamanho_porcao: 50, category: 'carboidrato', imageUrl: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/torrada-integral/torrada-integral.jpg' },
  { id: 'o1', name: 'Ovos Mexidos', calories: 150, protein: 12, carbs: 1, fat: 11, tamanho_porcao: 100, category: 'proteína', imageUrl: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/farofa-de-ovo-com-cafe/farofa-de-ovo-com-cafe.jpg' },
  { id: 'b1', name: 'Frutas Vermelhas', calories: 60, protein: 1, carbs: 14, fat: 0, tamanho_porcao: 100, category: 'fruta', imageUrl: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frutas-vermelhas/frutas-vermelhas.jpg' },
  { id: 't1', name: 'Tapioca com Queijo', calories: 240, protein: 8, carbs: 28, fat: 6, tamanho_porcao: 100, category: 'carboidrato', imageUrl: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/tapioca-com-queijo.jpg' },
  { id: 'i1', name: 'Iogurte Natural', calories: 110, protein: 8, carbs: 10, fat: 4, tamanho_porcao: 170, category: 'laticínio', imageUrl: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-natural/iogurte-natural.jpg' },
  { id: 'a1', name: 'Abacate', calories: 160, protein: 2, carbs: 9, fat: 15, tamanho_porcao: 100, category: 'gordura', imageUrl: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/abacate.jpg' },
  { id: 'c1', name: 'Castanhas', calories: 160, protein: 4, carbs: 7, fat: 14, tamanho_porcao: 30, category: 'gordura', imageUrl: 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/castanhas.jpg' }
];

export const SNACK_OPTIONS = [
  { name: 'Iogurte + Fruta', items: ['i1', 'b1'] },
  { name: 'Ovos + Fruta', items: ['o1', 'b1'] },
  { name: 'Pão + Queijo', items: ['p1', 'q1'] }
];

import { PlanTemplate } from '../types';

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 't-anti-inf-1',
    name: 'Protocolo Anti-Inflamatório',
    description: 'Rico em ômega-3, antioxidantes e fitoquímicos. Foco em saúde intestinal e redução de citocinas.',
    category: 'saúde',
    meals: [
      { name: 'Desjejum Bioativo', type: 'Café da Manhã', items: [{ foodId: 'o1', quantity: 150 }, { foodId: 'a1', quantity: 100 }], totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
      { name: 'Lanche Manhã', type: 'Lanche da Manhã', items: [{ foodId: 'b1', quantity: 100 }], totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
      { name: 'Almoço Funcional', type: 'Almoço', items: [{ foodId: 'm19', quantity: 1 }], totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
      { name: 'Lanche Tarde', type: 'Lanche da Tarde', items: [{ foodId: 'i1', quantity: 170 }, { foodId: 'c1', quantity: 30 }], totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
      { name: 'Jantar Leve', type: 'Jantar', items: [{ foodId: 'm3', quantity: 1 }], totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 } }
    ]
  },
  {
    id: 't-hyper-1',
    name: 'Hipertrofia Estrutural',
    description: 'Focado em 2.2g/kg de proteína com carboidratos complexos e alta densidade calórica.',
    category: 'hipertrofia',
    meals: [
      { name: 'Café de Campeão', type: 'Café da Manhã', items: [{ foodId: 't1', quantity: 100 }, { foodId: 'o1', quantity: 200 }], totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
      { name: 'Almoço (Construção)', type: 'Almoço', items: [{ foodId: 'm1', quantity: 1 }], totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
      { name: 'Lanche Pós-Treino', type: 'Lanche da Tarde', items: [{ foodId: 'p1', quantity: 100 }, { foodId: 'i1', quantity: 200 }], totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
      { name: 'Jantar (Reparação)', type: 'Jantar', items: [{ foodId: 'm20', quantity: 1 }], totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 } }
    ]
  },
  {
    id: 't-loss-1',
    name: 'Definição Máxima',
    description: 'Baixo carboidrato com alto volume de vegetais e proteínas magras para máxima queima.',
    category: 'emagrecimento',
    meals: [
      { name: 'Café da Manhã', type: 'Café da Manhã', items: [{ foodId: 'o1', quantity: 200 }, { foodId: 'b1', quantity: 100 }], totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
      { name: 'Almoço (Marmita)', type: 'Almoço', items: [{ foodId: 'm3', quantity: 1 }], totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
      { name: 'Lanche Tarde', type: 'Lanche da Tarde', items: [{ foodId: 'i1', quantity: 170 }], totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
      { name: 'Jantar (Marmita)', type: 'Jantar', items: [{ foodId: 'm2', quantity: 1 }], totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 } }
    ]
  }
];
