import { Food } from './useMealEditorV3Store';

/**
 * FitJourney V3 - Base de Dados Nutricionais
 * Referência: USDA (United States Department of Agriculture) FoodData Central
 * Frequência de atualização: Mensal
 */

export const QUICK_FOODS = [
  // Refeições Prontas / Pratos (com imagem)
  { id: 'q15', name: 'Omelete de Frango', calories: 280, protein: 32, carbs: 4, fat: 18, portionValue: 1, portionUnit: 'unidade', imageUrl: 'https://images.unsplash.com/photo-1510627489930-0c1b0ba8fa19?q=80&w=200' } as Food,
  { id: 'q16', name: 'Panqueca de Banana Fit', calories: 190, protein: 8, carbs: 24, fat: 6, portionValue: 1, portionUnit: 'unidade', imageUrl: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?q=80&w=200' } as Food,
  { id: 'q17', name: 'Crepioca Fit', calories: 210, protein: 12, carbs: 18, fat: 9, portionValue: 1, portionUnit: 'unidade', imageUrl: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?q=80&w=200' } as Food,
  { id: 'q18', name: 'Vitamina de Frutas', calories: 250, protein: 10, carbs: 45, fat: 4, portionValue: 300, portionUnit: 'ml', imageUrl: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?q=80&w=200' } as Food,
  { id: 'q19', name: 'Sanduíche Natural', calories: 320, protein: 18, carbs: 35, fat: 12, portionValue: 1, portionUnit: 'unidade', imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=200' } as Food,
  { id: 'q20', name: 'Iogurte com Granola', calories: 240, protein: 12, carbs: 32, fat: 8, portionValue: 200, portionUnit: 'g', imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=200' } as Food,
  
  // Itens Básicos
  { id: 'q1', name: 'Ovo Cozido', calories: 78, protein: 6, carbs: 0.6, fat: 5, portionValue: 50, portionUnit: 'un', householdMeasures: [{ unit: 'un', factor: 1 }, { unit: 'grande', factor: 1.2 }] } as Food,
  { id: 'q2', name: 'Pão Integral', calories: 68, protein: 3, carbs: 12, fat: 1, portionValue: 25, portionUnit: 'fatia', householdMeasures: [{ unit: 'fatia', factor: 1 }, { unit: 'g', factor: 0.04 }] } as Food,
  { id: 'q3', name: 'Queijo Branco', calories: 60, protein: 4, carbs: 1, fat: 4, portionValue: 30, portionUnit: 'fatia', householdMeasures: [{ unit: 'fatia', factor: 1 }, { unit: 'g', factor: 0.033 }] } as Food,
  { id: 'q4', name: 'Tapioca', calories: 70, protein: 0, carbs: 17, fat: 0, portionValue: 30, portionUnit: 'colher', householdMeasures: [{ unit: 'colher', factor: 1 }, { unit: 'g', factor: 0.033 }] },
  { id: 'q5', name: 'Cuscuz', calories: 110, protein: 3, carbs: 24, fat: 0.5, portionValue: 100, portionUnit: 'g', householdMeasures: [{ unit: 'g', factor: 1 }, { unit: 'colher', factor: 15 }] },
  { id: 'q6', name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, portionValue: 100, portionUnit: 'un', householdMeasures: [{ unit: 'un', factor: 1 }, { unit: 'g', factor: 0.01 }] },
  { id: 'q7', name: 'Maçã', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, portionValue: 100, portionUnit: 'un', householdMeasures: [{ unit: 'un', factor: 1 }, { unit: 'g', factor: 0.01 }] },
  { id: 'q8', name: 'Leite Integral', calories: 60, protein: 3, carbs: 5, fat: 3, portionValue: 100, portionUnit: 'ml', householdMeasures: [{ unit: 'ml', factor: 1 }, { unit: 'copo', factor: 200 }] },
  { id: 'q9', name: 'Frango Grelhado', calories: 165, protein: 31, carbs: 0, fat: 3.6, portionValue: 100, portionUnit: 'g', householdMeasures: [{ unit: 'g', factor: 1 }, { unit: 'filé', factor: 100 }, { unit: 'colher', factor: 25 }] } as Food,
  { id: 'q10', name: 'Arroz Branco', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, portionValue: 100, portionUnit: 'g', householdMeasures: [{ unit: 'g', factor: 1 }, { unit: 'colher', factor: 25 }] } as Food,
];

export const MARMITAS = [
  { id: 'm1', name: 'Marmita Frango e Batata Doce', calories: 420, protein: 32, carbs: 45, fat: 10, portionValue: 350, portionUnit: 'g', isMarmita: true, imageUrl: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?q=80&w=200' },
  { id: 'm2', name: 'Marmita Patinho e Arroz Integral', calories: 450, protein: 35, carbs: 48, fat: 12, portionValue: 350, portionUnit: 'g', isMarmita: true, imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=200' },
  { id: 'm3', name: 'Marmita Peixe Grelhado e Purê', calories: 380, protein: 28, carbs: 40, fat: 9, portionValue: 300, portionUnit: 'g', isMarmita: true, imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=200' },
  { id: 'm4', name: 'Marmita Escondidinho de Frango', calories: 410, protein: 30, carbs: 42, fat: 11, portionValue: 320, portionUnit: 'g', isMarmita: true, imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=200' },
  { id: 'm5', name: 'Marmita Estrogonofe de Carne Fit', calories: 480, protein: 34, carbs: 45, fat: 15, portionValue: 350, portionUnit: 'g', isMarmita: true, imageUrl: 'https://images.unsplash.com/photo-1534939561122-395078134709?q=80&w=200' },
  { id: 'm6', name: 'Marmita Nhoque de Batata Doce', calories: 390, protein: 18, carbs: 55, fat: 8, portionValue: 300, portionUnit: 'g', isMarmita: true, imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=200' },
  { id: 'm7', name: 'Marmita Lasanha de Berinjela', calories: 320, protein: 22, carbs: 25, fat: 14, portionValue: 300, portionUnit: 'g', isMarmita: true, imageUrl: 'https://images.unsplash.com/photo-1551818014-933e14670e9a?q=80&w=200' },
  { id: 'm8', name: 'Marmita Almôndegas e Macarrão', calories: 460, protein: 32, carbs: 52, fat: 13, portionValue: 350, portionUnit: 'g', isMarmita: true, imageUrl: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?q=80&w=200' },
  { id: 'm9', name: 'Marmita Risoto de Alho Poró', calories: 350, protein: 12, carbs: 58, fat: 7, portionValue: 300, portionUnit: 'g', isMarmita: true, imageUrl: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?q=80&w=200' },
  { id: 'm10', name: 'Marmita Lentilha e Arroz 7 Grãos', calories: 340, protein: 18, carbs: 55, fat: 5, portionValue: 350, portionUnit: 'g', isMarmita: true, imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=200' },
  { id: 'm11', name: 'Marmita Frango xadrez Fit', calories: 400, protein: 32, carbs: 38, fat: 12, portionValue: 350, portionUnit: 'g', isMarmita: true, imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=200' },
  { id: 'm12', name: 'Marmita Carne Moída e Quinoa', calories: 430, protein: 34, carbs: 42, fat: 11, portionValue: 320, portionUnit: 'g', isMarmita: true, imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=200' },
  { id: 'm13', name: 'Marmita Sobrecoxa e Legumes', calories: 470, protein: 30, carbs: 20, fat: 28, portionValue: 350, portionUnit: 'g', isMarmita: true, imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?q=80&w=200' },
  { id: 'm14', name: 'Marmita Salmão e Brócolis', calories: 410, protein: 35, carbs: 10, fat: 25, portionValue: 300, portionUnit: 'g', isMarmita: true, imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=200' },
  { id: 'm15', name: 'Marmita Grão de Bico e Abóbora', calories: 320, protein: 14, carbs: 48, fat: 8, portionValue: 320, portionUnit: 'g', isMarmita: true, imageUrl: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?q=80&w=200' },
  { id: 'm16', name: 'Marmita Omelete de Forno Recheado', calories: 350, protein: 25, carbs: 12, fat: 22, portionValue: 280, portionUnit: 'g', isMarmita: true, imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=200' },
  { id: 'm17', name: 'Marmita Macarrão Integral à Bolonhesa', calories: 460, protein: 30, carbs: 55, fat: 14, portionValue: 350, portionUnit: 'g', isMarmita: true, imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=200' },
  { id: 'm18', name: 'Marmita Frango com Quiabo e Polenta', calories: 440, protein: 35, carbs: 40, fat: 16, portionValue: 350, portionUnit: 'g', isMarmita: true, imageUrl: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?q=80&w=200' },
  { id: 'm19', name: 'Marmita Yakisoba Fit de Legumes', calories: 310, protein: 12, carbs: 45, fat: 9, portionValue: 300, portionUnit: 'g', isMarmita: true, imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=200' },
];
