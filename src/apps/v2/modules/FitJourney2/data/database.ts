import { FoodItem } from '../types';

export const MARMITAS: FoodItem[] = [
  { id: 'm1', name: 'Frango com Arroz e Legumes', calories: 450, protein: 35, carbs: 45, fat: 12, servingSize: 350, category: 'marmita' },
  { id: 'm2', name: 'Patinho com Purê de Mandioquinha', calories: 480, protein: 38, carbs: 42, fat: 15, servingSize: 350, category: 'marmita' },
  { id: 'm3', name: 'Peixe com Arroz Integral e Brócolis', calories: 400, protein: 30, carbs: 40, fat: 10, servingSize: 350, category: 'marmita' },
  { id: 'm4', name: 'Strogonoff de Frango (Fit)', calories: 500, protein: 35, carbs: 40, fat: 18, servingSize: 350, category: 'marmita' },
  { id: 'm5', name: 'Carne Desfiada com Abóbora', calories: 420, protein: 35, carbs: 30, fat: 14, servingSize: 350, category: 'marmita' },
  { id: 'm6', name: 'Macarrão Integral com Almôndegas', calories: 520, protein: 32, carbs: 55, fat: 16, servingSize: 350, category: 'marmita' },
  { id: 'm7', name: 'Risotinho de Frango com Alho Poró', calories: 460, protein: 33, carbs: 48, fat: 12, servingSize: 350, category: 'marmita' },
  { id: 'm8', name: 'Sobrecoxa Assada com Batata Doce', calories: 550, protein: 35, carbs: 45, fat: 22, servingSize: 350, category: 'marmita' },
  { id: 'm9', name: 'Feijoada Fit', calories: 580, protein: 40, carbs: 50, fat: 20, servingSize: 400, category: 'marmita' },
  { id: 'm10', name: 'Escondidinho de Batata Doce com Frango', calories: 470, protein: 34, carbs: 45, fat: 14, servingSize: 350, category: 'marmita' },
  { id: 'm11', name: 'Nhoque de Batata Doce com Molho de Carne', calories: 490, protein: 30, carbs: 55, fat: 15, servingSize: 350, category: 'marmita' },
  { id: 'm12', name: 'Lasanha de Berinjela com Carne', calories: 380, protein: 35, carbs: 20, fat: 18, servingSize: 350, category: 'marmita' },
  { id: 'm13', name: 'Panqueca de Carne com Molho Vermelho', calories: 450, protein: 32, carbs: 40, fat: 16, servingSize: 350, category: 'marmita' },
  { id: 'm14', name: 'Arroz de Couve-Flor com Iscas de Carne', calories: 350, protein: 35, carbs: 15, fat: 15, servingSize: 300, category: 'marmita' },
  { id: 'm15', name: 'Kibe Assado Recheado com Queijo Minas', calories: 430, protein: 30, carbs: 35, fat: 18, servingSize: 300, category: 'marmita' },
  { id: 'm16', name: 'Moqueca de Peixe com Arroz de Coco', calories: 510, protein: 28, carbs: 45, fat: 22, servingSize: 350, category: 'marmita' },
  { id: 'm17', name: 'Torta de Frango com Massa de Grão de Bico', calories: 440, protein: 30, carbs: 35, fat: 20, servingSize: 300, category: 'marmita' },
  { id: 'm18', name: 'Bowl de Quinoa com Frango e Abacate', calories: 530, protein: 35, carbs: 40, fat: 25, servingSize: 350, category: 'marmita' },
  { id: 'm19', name: 'Salmão com Crosta de Castanhas e Aspargos', calories: 580, protein: 40, carbs: 15, fat: 38, servingSize: 300, category: 'marmita' }
];

export const BREAKFAST_ITEMS: FoodItem[] = [
  { id: 'p1', name: 'Pão Integral', calories: 120, protein: 5, carbs: 22, fat: 2, servingSize: 50, category: 'carb' },
  { id: 'o1', name: 'Ovos Mexidos', calories: 150, protein: 12, carbs: 1, fat: 11, servingSize: 100, category: 'protein' },
  { id: 'b1', name: 'Banana', calories: 90, protein: 1, carbs: 23, fat: 0, servingSize: 90, category: 'fruit' },
  { id: 't1', name: 'Tapioca', calories: 240, protein: 0, carbs: 60, fat: 0, servingSize: 70, category: 'carb' },
  { id: 'q1', name: 'Queijo Minas', calories: 150, protein: 10, carbs: 1, fat: 12, servingSize: 60, category: 'protein' },
  { id: 'm_fruta', name: 'Mamão', calories: 60, protein: 1, carbs: 15, fat: 0, servingSize: 150, category: 'fruit' },
  { id: 'i1', name: 'Iogurte Natural', calories: 110, protein: 8, carbs: 10, fat: 4, servingSize: 170, category: 'dairy' }
];

export const SNACK_OPTIONS = [
  { name: 'Iogurte + Fruta', items: ['i1', 'b1'] },
  { name: 'Ovos + Fruta', items: ['o1', 'b1'] },
  { name: 'Whey + Fruta', items: ['whey', 'b1'] }
];
