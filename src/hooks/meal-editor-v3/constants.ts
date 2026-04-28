import { Food } from "./useMealEditorV3Store";

export const QUICK_FOODS: Food[] = [
  { id: 'q1', name: 'Ovo Cozido', calories: 78, protein: 6, carbs: 0.6, fat: 5, portionValue: 1, portionUnit: 'unid' },
  { id: 'q2', name: 'Pão Francês', calories: 135, protein: 4, carbs: 28, fat: 1, portionValue: 50, portionUnit: 'g' },
  { id: 'q3', name: 'Queijo Muçarela', calories: 85, protein: 6, carbs: 0.5, fat: 7, portionValue: 30, portionUnit: 'g' },
  { id: 'q4', name: 'Tapioca (Goma)', calories: 70, protein: 0, carbs: 17, fat: 0, portionValue: 30, portionUnit: 'g' },
  { id: 'q5', name: 'Cuscuz de Milho', calories: 110, protein: 2, carbs: 24, fat: 0, portionValue: 100, portionUnit: 'g' },
  { id: 'q6', name: 'Banana Prata', calories: 90, protein: 1, carbs: 23, fat: 0, portionValue: 1, portionUnit: 'unid' },
  { id: 'q7', name: 'Maçã', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, portionValue: 1, portionUnit: 'unid' },
  { id: 'q8', name: 'Leite Integral', calories: 120, protein: 6, carbs: 9, fat: 7, portionValue: 200, portionUnit: 'ml' },
  { id: 'q9', name: 'Frango Grelhado', calories: 165, protein: 31, carbs: 0, fat: 3.6, portionValue: 100, portionUnit: 'g' },
  { id: 'q10', name: 'Arroz Branco', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, portionValue: 100, portionUnit: 'g' },
];

export const MARMITAS: Food[] = [
  { id: 'm1', name: 'Frango com Batata Doce', calories: 350, protein: 35, carbs: 40, fat: 5, portionValue: 300, portionUnit: 'g', isMarmita: true, imageUrl: '/marmitas/frango-batata.jpg' },
  { id: 'm2', name: 'Patinho com Arroz Integral', calories: 380, protein: 32, carbs: 45, fat: 8, portionValue: 300, portionUnit: 'g', isMarmita: true, imageUrl: '/marmitas/patinho-arroz.jpg' },
  { id: 'm3', name: 'Peixe com Legumes', calories: 280, protein: 30, carbs: 15, fat: 10, portionValue: 300, portionUnit: 'g', isMarmita: true, imageUrl: '/marmitas/peixe-legumes.jpg' },
  { id: 'm4', name: 'Escondidinho de Frango', calories: 410, protein: 28, carbs: 50, fat: 12, portionValue: 300, portionUnit: 'g', isMarmita: true, imageUrl: '/marmitas/escondidinho-frango.jpg' },
  { id: 'm5', name: 'Macarrão Integral com Almôndegas', calories: 450, protein: 30, carbs: 55, fat: 15, portionValue: 350, portionUnit: 'g', isMarmita: true, imageUrl: '/marmitas/macarrao-almondegas.jpg' },
  { id: 'm6', name: 'Strogonoff de Frango Light', calories: 390, protein: 32, carbs: 35, fat: 14, portionValue: 300, portionUnit: 'g', isMarmita: true, imageUrl: '/marmitas/strogonoff-frango.jpg' },
  { id: 'm7', name: 'Carne Moída com Purê de Mandioquinha', calories: 420, protein: 29, carbs: 48, fat: 13, portionValue: 300, portionUnit: 'g', isMarmita: true, imageUrl: '/marmitas/carne-pure.jpg' },
  { id: 'm8', name: 'Frango Xadrez com Arroz Colorido', calories: 370, protein: 31, carbs: 42, fat: 9, portionValue: 320, portionUnit: 'g', isMarmita: true, imageUrl: '/marmitas/frango-xadrez.jpg' },
  { id: 'm9', name: 'Lasanha de Berinjela', calories: 260, protein: 18, carbs: 20, fat: 14, portionValue: 300, portionUnit: 'g', isMarmita: true, imageUrl: '/marmitas/lasanha-berinjela.jpg' },
  { id: 'm10', name: 'Risoto de Funghi Integral', calories: 330, protein: 12, carbs: 58, fat: 6, portionValue: 300, portionUnit: 'g', isMarmita: true, imageUrl: '/marmitas/risoto-funghi.jpg' },
  { id: 'm11', name: 'Feijoada Fit', calories: 480, protein: 35, carbs: 50, fat: 18, portionValue: 350, portionUnit: 'g', isMarmita: true, imageUrl: '/marmitas/feijoada-fit.jpg' },
  { id: 'm12', name: 'Moqueca de Peixe com Arroz de Coco', calories: 400, protein: 28, carbs: 38, fat: 16, portionValue: 300, portionUnit: 'g', isMarmita: true, imageUrl: '/marmitas/moqueca.jpg' },
  { id: 'm13', name: 'Salmão Grelhado com Aspargos', calories: 350, protein: 32, carbs: 8, fat: 22, portionValue: 250, portionUnit: 'g', isMarmita: true, imageUrl: '/marmitas/salmao-aspargos.jpg' },
  { id: 'm14', name: 'Bowl de Quinoa e Vegetais', calories: 310, protein: 14, carbs: 52, fat: 8, portionValue: 300, portionUnit: 'g', isMarmita: true, imageUrl: '/marmitas/quinoa-bowl.jpg' },
  { id: 'm15', name: 'Omelete Recheado com Espinafre', calories: 240, protein: 20, carbs: 5, fat: 16, portionValue: 200, portionUnit: 'g', isMarmita: true, imageUrl: '/marmitas/omelete.jpg' },
  { id: 'm16', name: 'Panqueca de Carne com Molho de Tomate', calories: 380, protein: 26, carbs: 40, fat: 14, portionValue: 300, portionUnit: 'g', isMarmita: true, imageUrl: '/marmitas/panqueca.jpg' },
  { id: 'm17', name: 'Frango com Quiabo e Polenta', calories: 410, protein: 34, carbs: 45, fat: 11, portionValue: 350, portionUnit: 'g', isMarmita: true, imageUrl: '/marmitas/frango-quiabo.jpg' },
  { id: 'm18', name: 'Kibe de Forno com Tabule', calories: 360, protein: 25, carbs: 48, fat: 10, portionValue: 320, portionUnit: 'g', isMarmita: true, imageUrl: '/marmitas/kibe-tabule.jpg' },
  { id: 'm19', name: 'Nhoque de Batata Doce com Molho Pesto', calories: 390, protein: 10, carbs: 65, fat: 12, portionValue: 300, portionUnit: 'g', isMarmita: true, imageUrl: '/marmitas/nhoque-pesto.jpg' },
];
