/**
 * FitJourney V3 - Base de Dados Nutricionais
 * Referência: USDA (United States Department of Agriculture) FoodData Central
 * Frequência de atualização: Mensal
 */

export const QUICK_FOODS = [
  { id: 'q1', name: 'Ovo Cozido', calories: 78, protein: 6, carbs: 0.6, fat: 5, portionValue: 50, portionUnit: 'unidade' },
  { id: 'q2', name: 'Pão Integral', calories: 68, protein: 3, carbs: 12, fat: 1, portionValue: 25, portionUnit: 'g' },
  { id: 'q3', name: 'Queijo Branco', calories: 60, protein: 4, carbs: 1, fat: 4, portionValue: 30, portionUnit: 'g' },
  { id: 'q4', name: 'Tapioca', calories: 70, protein: 0, carbs: 17, fat: 0, portionValue: 30, portionUnit: 'g' },
  { id: 'q5', name: 'Cuscuz', calories: 110, protein: 3, carbs: 24, fat: 0.5, portionValue: 100, portionUnit: 'g' },
  { id: 'q6', name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, portionValue: 100, portionUnit: 'g' },
  { id: 'q7', name: 'Maçã', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, portionValue: 100, portionUnit: 'g' },
  { id: 'q8', name: 'Leite Integral', calories: 60, protein: 3, carbs: 5, fat: 3, portionValue: 100, portionUnit: 'ml' },
  { id: 'q9', name: 'Frango Grelhado', calories: 165, protein: 31, carbs: 0, fat: 3.6, portionValue: 100, portionUnit: 'g' },
  { id: 'q10', name: 'Arroz Branco', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, portionValue: 100, portionUnit: 'g' },
  { id: 'q11', name: 'Café Preto', calories: 2, protein: 0, carbs: 0, fat: 0, portionValue: 100, portionUnit: 'ml' },
  { id: 'q12', name: 'Chá de Ervas', calories: 1, protein: 0, carbs: 0, fat: 0, portionValue: 100, portionUnit: 'ml' },
  { id: 'q13', name: 'Aveia em Flocos', calories: 110, protein: 4, carbs: 20, fat: 2, portionValue: 30, portionUnit: 'g' },
  { id: 'q14', name: 'Leite Desnatado', calories: 35, protein: 3.5, carbs: 5, fat: 0.1, portionValue: 100, portionUnit: 'ml' },
];

export const MARMITAS = [
  { 
    id: 'm1', 
    name: 'Marmita Frango/Batata', 
    calories: 450, 
    protein: 35, 
    carbs: 45, 
    fat: 12, 
    portionValue: 350, 
    portionUnit: 'g', 
    isMarmita: true,
    imageUrl: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?q=80&w=200' 
  },
  { 
    id: 'm2', 
    name: 'Marmita Lentilha/Arroz', 
    calories: 380, 
    protein: 22, 
    carbs: 55, 
    fat: 8, 
    portionValue: 350, 
    portionUnit: 'g', 
    isMarmita: true,
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=200'
  },
];
