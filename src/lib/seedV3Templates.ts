import { supabase } from "@/integrations/supabase/client";

const BASE_IMG = "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library";
const genId = () => crypto.randomUUID();

// Dicionário de alimentos base para reuso (garante itens detalhados com macros e substituições)
const FOODS = {
  frango: { title: 'Frango Grelhado', qty: '1 filé grande', mass: 150, m: {kcal: 240, protein_g: 45, carbs_g: 0, fat_g: 6}, img: `${BASE_IMG}/frango-grelhado.jpg` },
  tilapia: { title: 'Filé de Tilápia', qty: '1 filé', mass: 150, m: {kcal: 200, protein_g: 40, carbs_g: 0, fat_g: 4}, img: `${BASE_IMG}/file-de-tilapia/file-de-tilapia.jpg` },
  patinho: { title: 'Patinho Moído', qty: '4 colheres', mass: 150, m: {kcal: 300, protein_g: 40, carbs_g: 0, fat_g: 12}, img: `${BASE_IMG}/carne-assada-de-panela/carne-assada-de-panela.jpg` },
  salmao: { title: 'Salmão Assado', qty: '1 posta', mass: 150, m: {kcal: 350, protein_g: 35, carbs_g: 0, fat_g: 22}, img: `${BASE_IMG}/peixe-com-legumes.jpg` },
  ovo: { title: 'Ovos Mexidos', qty: '3 ovos', mass: 150, m: {kcal: 220, protein_g: 18, carbs_g: 1, fat_g: 15}, img: `${BASE_IMG}/ovos-mexidos.jpg` },
  
  arroz: { title: 'Arroz Branco', qty: '4 colheres', mass: 100, m: {kcal: 130, protein_g: 2, carbs_g: 28, fat_g: 0}, img: `${BASE_IMG}/arroz-integral.jpg` },
  arrozInt: { title: 'Arroz Integral', qty: '4 colheres', mass: 100, m: {kcal: 120, protein_g: 3, carbs_g: 25, fat_g: 1}, img: `${BASE_IMG}/arroz-integral.jpg` },
  feijao: { title: 'Feijão Carioca', qty: '1 concha', mass: 100, m: {kcal: 70, protein_g: 5, carbs_g: 13, fat_g: 0}, img: `${BASE_IMG}/feijao-carioca.jpg` },
  lentilha: { title: 'Lentilha Cozida', qty: '1 concha', mass: 100, m: {kcal: 80, protein_g: 6, carbs_g: 14, fat_g: 0}, img: `${BASE_IMG}/feijao-carioca.jpg` },
  macarrao: { title: 'Macarrão', qty: '1 escumadeira', mass: 100, m: {kcal: 140, protein_g: 4, carbs_g: 28, fat_g: 1}, img: `${BASE_IMG}/macarrao-com-carne-moida.jpg` },
  batata: { title: 'Batata Doce', qty: '1 pedaço', mass: 100, m: {kcal: 90, protein_g: 1, carbs_g: 20, fat_g: 0}, img: `${BASE_IMG}/frango-com-batata-doce/frango-com-batata-doce.jpg` },
  
  salada: { title: 'Salada Verde', qty: '1 prato', mass: 100, m: {kcal: 20, protein_g: 1, carbs_g: 4, fat_g: 0}, img: `${BASE_IMG}/salada-verde.jpg` },
  legumes: { title: 'Legumes no Vapor', qty: '1 escumadeira', mass: 100, m: {kcal: 40, protein_g: 2, carbs_g: 8, fat_g: 0}, img: `${BASE_IMG}/peixe-com-legumes.jpg` },
  
  pao: { title: 'Pão Integral', qty: '2 fatias', mass: 50, m: {kcal: 120, protein_g: 4, carbs_g: 24, fat_g: 1}, img: `${BASE_IMG}/pao-frances.jpg` },
  tapioca: { title: 'Tapioca', qty: '3 colheres', mass: 60, m: {kcal: 150, protein_g: 0, carbs_g: 36, fat_g: 0}, img: `${BASE_IMG}/crepioca/crepioca.jpg` },
  
  iogurte: { title: 'Iogurte Natural', qty: '1 pote', mass: 170, m: {kcal: 100, protein_g: 7, carbs_g: 10, fat_g: 3}, img: `${BASE_IMG}/iogurte-natural/iogurte-natural.jpg` },
  whey: { title: 'Whey Protein', qty: '1 scoop', mass: 30, m: {kcal: 120, protein_g: 24, carbs_g: 3, fat_g: 1}, img: `${BASE_IMG}/vitamina-de-fruta/vitamina-de-fruta.jpg` },
  aveia: { title: 'Aveia em Flocos', qty: '2 colheres', mass: 30, m: {kcal: 110, protein_g: 4, carbs_g: 17, fat_g: 2}, img: `${BASE_IMG}/banana-com-aveia.jpg` },
  banana: { title: 'Banana Prata', qty: '1 unidade', mass: 70, m: {kcal: 70, protein_g: 1, carbs_g: 18, fat_g: 0}, img: `${BASE_IMG}/banana-com-aveia.jpg` },
  maca: { title: 'Maçã', qty: '1 unidade', mass: 100, m: {kcal: 50, protein_g: 0, carbs_g: 13, fat_g: 0}, img: `${BASE_IMG}/maca/maca.jpg` },
  sopa: { title: 'Sopa de Legumes', qty: '1 prato', mass: 350, m: {kcal: 150, protein_g: 5, carbs_g: 25, fat_g: 3}, img: `${BASE_IMG}/sopa-de-legumes/sopa-de-legumes.jpg` },
  castanha: { title: 'Mix de Castanhas', qty: '1 punhado', mass: 30, m: {kcal: 180, protein_g: 4, carbs_g: 6, fat_g: 16}, img: `${BASE_IMG}/castanhas.jpg` },
  cuscuz: { title: 'Cuscuz com Ovo', qty: '2 fatias', mass: 150, m: {kcal: 250, protein_g: 12, carbs_g: 30, fat_g: 8}, img: `${BASE_IMG}/cuscuz-com-ovo.jpg` },
  omelete: { title: 'Omelete de Legumes', qty: '2 ovos', mass: 180, m: {kcal: 210, protein_g: 14, carbs_g: 5, fat_g: 14}, img: `${BASE_IMG}/omelete.jpg` },
  carne: { title: 'Carne Grelhada', qty: '1 bife', mass: 120, m: {kcal: 220, protein_g: 30, carbs_g: 0, fat_g: 10}, img: `${BASE_IMG}/carne-grelhada.jpg` }
};

const makeItem = (food: any, isPrimary = false, subs: any[] = []) => {
  const id = genId();
  return {
    id,
    instanceId: genId(),
    name: food.title,
    title: food.title,
    kcal: food.m.kcal,
    protein: food.m.protein_g !== undefined ? food.m.protein_g : food.m.protein,
    carbs: food.m.carbs_g !== undefined ? food.m.carbs_g : food.m.carbs,
    fat: food.m.fat_g !== undefined ? food.m.fat_g : food.m.fat,
    quantity: 1,
    quantity_display: food.qty,
    clinical_mass_g: food.mass,
    macros: food.m,
    imageUrl: food.img || null,
    is_primary: isPrimary,
    substitutions: subs.map(sub => ({
      id: genId(),
      instanceId: genId(),
      name: sub.title,
      title: sub.title,
      kcal: sub.m.kcal,
      protein: sub.m.protein_g !== undefined ? sub.m.protein_g : sub.m.protein,
      carbs: sub.m.carbs_g !== undefined ? sub.m.carbs_g : sub.m.carbs,
      fat: sub.m.fat_g !== undefined ? sub.m.fat_g : sub.m.fat,
      quantity: 1,
      quantity_display: sub.qty,
      clinical_mass_g: sub.mass,
      macros: sub.m,
      imageUrl: sub.img || null
    }))
  };
};

const buildMeal = (name: string, time: string, main: any, sides: any[]) => ({
  id: genId(),
  name,
  time,
  items: [
    makeItem(main.food, true, main.subs),
    ...sides.map(s => makeItem(s.food, false, s.subs))
  ]
});

export const generatePremiumTemplates = () => {
  return [
    {
      id: genId(), slug: 'hipertrofia-premium', title: 'Hipertrofia Premium 2500 kcal',
      description: 'Ingredientes detalhados com quantidades precisas para hipertrofia.',
      template_type: 'visual_v3', objective: 'hipertrofia', active: true, editable: true, substitutions_enabled: true, sovereign_validated: true, visual_style: 'premium', kcal_profiles: [2500], cluster_map: {},
      meal_distribution: [ { slot: 'Café da Manhã', time: '07:00' }, { slot: 'Almoço', time: '13:00' }, { slot: 'Lanche da Tarde', time: '16:00' }, { slot: 'Jantar', time: '20:00' } ],
      plan_snapshot: {
        "2500": {
          days: [
            {
              day_of_week: 1,
              meals: [
                buildMeal('Café da Manhã', '07:00', {food: FOODS.ovo, subs: [FOODS.whey]}, [{food: FOODS.pao, subs: [FOODS.tapioca]}, {food: FOODS.banana, subs: [FOODS.maca]}]),
                buildMeal('Almoço', '13:00', {food: FOODS.frango, subs: [FOODS.patinho]}, [{food: FOODS.arroz, subs: [FOODS.macarrao]}, {food: FOODS.feijao, subs: [FOODS.lentilha]}, {food: FOODS.salada, subs: [FOODS.legumes]}]),
                buildMeal('Lanche da Tarde', '16:00', {food: FOODS.iogurte, subs: [FOODS.whey]}, [{food: FOODS.aveia, subs: [FOODS.castanha]}, {food: FOODS.banana, subs: [FOODS.maca]}]),
                buildMeal('Jantar', '20:00', {food: FOODS.tilapia, subs: [FOODS.frango]}, [{food: FOODS.batata, subs: [FOODS.arroz]}, {food: FOODS.legumes, subs: [FOODS.salada]}])
              ]
            }
          ]
        }
      }
    },
    {
      id: genId(), slug: 'emagrecimento-premium', title: 'Emagrecimento Premium 1500 kcal',
      description: 'Porções controladas e foco em densidade nutricional.',
      template_type: 'visual_v3', objective: 'emagrecimento', active: true, editable: true, substitutions_enabled: true, sovereign_validated: true, visual_style: 'premium', kcal_profiles: [1500], cluster_map: {},
      meal_distribution: [ { slot: 'Café da Manhã', time: '08:00' }, { slot: 'Almoço', time: '13:00' }, { slot: 'Lanche da Tarde', time: '16:00' }, { slot: 'Jantar', time: '19:30' } ],
      plan_snapshot: {
        "1500": {
          days: [
            {
              day_of_week: 1,
              meals: [
                buildMeal('Café da Manhã', '08:00', {food: FOODS.ovo, subs: [FOODS.iogurte]}, [{food: FOODS.maca, subs: [FOODS.banana]}]),
                buildMeal('Almoço', '13:00', {food: FOODS.frango, subs: [FOODS.tilapia]}, [{food: FOODS.arrozInt, subs: [FOODS.batata]}, {food: FOODS.salada, subs: [FOODS.legumes]}]),
                buildMeal('Lanche da Tarde', '16:00', {food: FOODS.whey, subs: [FOODS.iogurte]}, [{food: FOODS.castanha, subs: [FOODS.aveia]}]),
                buildMeal('Jantar', '19:30', {food: FOODS.sopa, subs: [FOODS.patinho]}, [{food: FOODS.salada, subs: [FOODS.legumes]}])
              ]
            }
          ]
        }
      }
    },
    {
      id: genId(), slug: 'low-carb', title: 'Low Carb Premium 1600 kcal',
      description: 'Restrição de carboidratos com alta proteína.',
      template_type: 'visual_v3', objective: 'low_carb', active: true, editable: true, substitutions_enabled: true, sovereign_validated: true, visual_style: 'premium', kcal_profiles: [1600], cluster_map: {},
      meal_distribution: [ { slot: 'Café da Manhã', time: '08:00' }, { slot: 'Almoço', time: '13:00' }, { slot: 'Lanche', time: '16:00' }, { slot: 'Jantar', time: '20:00' } ],
      plan_snapshot: {
        "1600": {
          days: [
            {
              day_of_week: 1,
              meals: [
                buildMeal('Café da Manhã', '08:00', {food: FOODS.ovo, subs: [FOODS.patinho]}, [{food: FOODS.castanha, subs: [FOODS.iogurte]}]),
                buildMeal('Almoço', '13:00', {food: FOODS.salmao, subs: [FOODS.tilapia]}, [{food: FOODS.legumes, subs: [FOODS.salada]}]),
                buildMeal('Lanche da Tarde', '16:00', {food: FOODS.castanha, subs: [FOODS.whey]}, []),
                buildMeal('Jantar', '20:00', {food: FOODS.frango, subs: [FOODS.patinho]}, [{food: FOODS.salada, subs: [FOODS.legumes]}])
              ]
            }
          ]
        }
      }
    },
    {
      id: genId(), slug: 'fodmap', title: 'Low FODMAPs Premium 1800 kcal',
      description: 'Alimentos amigáveis para o intestino.',
      template_type: 'visual_v3', objective: 'clinico', active: true, editable: true, substitutions_enabled: true, sovereign_validated: true, visual_style: 'premium', kcal_profiles: [1800], cluster_map: {},
      meal_distribution: [ { slot: 'Café da Manhã', time: '08:00' }, { slot: 'Almoço', time: '13:00' }, { slot: 'Lanche', time: '16:00' }, { slot: 'Jantar', time: '20:00' } ],
      plan_snapshot: {
        "1800": {
          days: [
            {
              day_of_week: 1,
              meals: [
                buildMeal('Café da Manhã', '08:00', {food: FOODS.ovo, subs: [FOODS.tapioca]}, [{food: FOODS.banana, subs: [FOODS.maca]}]),
                buildMeal('Almoço', '13:00', {food: FOODS.tilapia, subs: [FOODS.frango]}, [{food: FOODS.arroz, subs: [FOODS.batata]}, {food: FOODS.salada, subs: [FOODS.legumes]}]),
                buildMeal('Lanche da Tarde', '16:00', {food: FOODS.tapioca, subs: [FOODS.aveia]}, []),
                buildMeal('Jantar', '20:00', {food: FOODS.patinho, subs: [FOODS.frango]}, [{food: FOODS.batata, subs: [FOODS.arroz]}])
              ]
            }
          ]
        }
      }
    },
    {
      id: genId(), slug: 'anti-inflamatorio', title: 'Anti-inflamatório Premium 1800 kcal',
      description: 'Rico em ômega-3 e antioxidantes.',
      template_type: 'visual_v3', objective: 'clinico', active: true, editable: true, substitutions_enabled: true, sovereign_validated: true, visual_style: 'premium', kcal_profiles: [1800], cluster_map: {},
      meal_distribution: [ { slot: 'Café da Manhã', time: '08:00' }, { slot: 'Almoço', time: '13:00' }, { slot: 'Lanche', time: '16:00' }, { slot: 'Jantar', time: '20:00' } ],
      plan_snapshot: {
        "1800": {
          days: [
            {
              day_of_week: 1,
              meals: [
                buildMeal('Café da Manhã', '08:00', {food: FOODS.whey, subs: [FOODS.ovo]}, [{food: FOODS.maca, subs: [FOODS.banana]}]),
                buildMeal('Almoço', '13:00', {food: FOODS.salmao, subs: [FOODS.tilapia]}, [{food: FOODS.batata, subs: [FOODS.arrozInt]}, {food: FOODS.legumes, subs: [FOODS.salada]}]),
                buildMeal('Lanche da Tarde', '16:00', {food: FOODS.castanha, subs: [FOODS.iogurte]}, [{food: FOODS.banana, subs: [FOODS.maca]}]),
                buildMeal('Jantar', '20:00', {food: FOODS.sopa, subs: [FOODS.frango]}, [{food: FOODS.salada, subs: [FOODS.legumes]}])
              ]
            }
          ]
        }
      }
    },
    {
      id: genId(), slug: 'diabetes', title: 'Controle Glicêmico 1800 kcal',
      description: 'Fibras e baixo IG.',
      template_type: 'visual_v3', objective: 'clinico', active: true, editable: true, substitutions_enabled: true, sovereign_validated: true, visual_style: 'premium', kcal_profiles: [1800], cluster_map: {},
      meal_distribution: [ { slot: 'Café da Manhã', time: '08:00' }, { slot: 'Almoço', time: '13:00' }, { slot: 'Lanche', time: '16:00' }, { slot: 'Jantar', time: '20:00' } ],
      plan_snapshot: { "1800": { days: [ { day_of_week: 1, meals: [
        buildMeal('Café da Manhã', '08:00', {food: FOODS.ovo, subs: [FOODS.iogurte]}, [{food: FOODS.pao, subs: [FOODS.tapioca]}, {food: FOODS.aveia, subs: [FOODS.castanha]}]),
        buildMeal('Almoço', '13:00', {food: FOODS.frango, subs: [FOODS.tilapia]}, [{food: FOODS.arrozInt, subs: [FOODS.feijao]}, {food: FOODS.legumes, subs: [FOODS.salada]}]),
        buildMeal('Lanche da Tarde', '16:00', {food: FOODS.castanha, subs: [FOODS.whey]}, []),
        buildMeal('Jantar', '20:00', {food: FOODS.patinho, subs: [FOODS.salmao]}, [{food: FOODS.salada, subs: [FOODS.legumes]}])
      ] } ] } }
    },
    {
      id: genId(), slug: 'dash', title: 'Hipertensão (DASH) 1800 kcal',
      description: 'Baixo sódio e rico em potássio.',
      template_type: 'visual_v3', objective: 'clinico', active: true, editable: true, substitutions_enabled: true, sovereign_validated: true, visual_style: 'premium', kcal_profiles: [1800], cluster_map: {},
      meal_distribution: [ { slot: 'Café da Manhã', time: '08:00' }, { slot: 'Almoço', time: '13:00' }, { slot: 'Lanche', time: '16:00' }, { slot: 'Jantar', time: '20:00' } ],
      plan_snapshot: { "1800": { days: [ { day_of_week: 1, meals: [
        buildMeal('Café da Manhã', '08:00', {food: FOODS.iogurte, subs: [FOODS.ovo]}, [{food: FOODS.banana, subs: [FOODS.maca]}, {food: FOODS.aveia, subs: [FOODS.tapioca]}]),
        buildMeal('Almoço', '13:00', {food: FOODS.salmao, subs: [FOODS.frango]}, [{food: FOODS.batata, subs: [FOODS.arroz]}, {food: FOODS.legumes, subs: [FOODS.salada]}]),
        buildMeal('Lanche da Tarde', '16:00', {food: FOODS.castanha, subs: [FOODS.whey]}, []),
        buildMeal('Jantar', '20:00', {food: FOODS.sopa, subs: [FOODS.tilapia]}, [{food: FOODS.salada, subs: [FOODS.legumes]}])
      ] } ] } }
    },
    {
      id: genId(), slug: 'bariatrico', title: 'Bariátrica (Fase Sólida) 1200 kcal',
      description: 'Pequenos volumes, alta proteína.',
      template_type: 'visual_v3', objective: 'clinico', active: true, editable: true, substitutions_enabled: true, sovereign_validated: true, visual_style: 'premium', kcal_profiles: [1200], cluster_map: {},
      meal_distribution: [ { slot: 'Café da Manhã', time: '08:00' }, { slot: 'Almoço', time: '13:00' }, { slot: 'Lanche', time: '16:00' }, { slot: 'Jantar', time: '20:00' } ],
      plan_snapshot: { "1200": { days: [ { day_of_week: 1, meals: [
        buildMeal('Café da Manhã', '08:00', {food: FOODS.ovo, subs: [FOODS.iogurte]}, []),
        buildMeal('Almoço', '13:00', {food: FOODS.frango, subs: [FOODS.tilapia]}, [{food: FOODS.legumes, subs: [FOODS.batata]}]),
        buildMeal('Lanche da Tarde', '16:00', {food: FOODS.whey, subs: [FOODS.castanha]}, []),
        buildMeal('Jantar', '20:00', {food: FOODS.patinho, subs: [FOODS.sopa]}, [{food: FOODS.legumes, subs: [FOODS.salada]}])
      ] } ] } }
    },
    {
      id: genId(), slug: 'gestantes', title: 'Gestantes Premium 2200 kcal',
      description: 'Rico em nutrientes e calorias adequadas.',
      template_type: 'visual_v3', objective: 'saude', active: true, editable: true, substitutions_enabled: true, sovereign_validated: true, visual_style: 'premium', kcal_profiles: [2200], cluster_map: {},
      meal_distribution: [ { slot: 'Café da Manhã', time: '08:00' }, { slot: 'Almoço', time: '13:00' }, { slot: 'Lanche', time: '16:00' }, { slot: 'Jantar', time: '20:00' } ],
      plan_snapshot: { "2200": { days: [ { day_of_week: 1, meals: [
        buildMeal('Café da Manhã', '08:00', {food: FOODS.pao, subs: [FOODS.tapioca]}, [{food: FOODS.ovo, subs: [FOODS.iogurte]}, {food: FOODS.maca, subs: [FOODS.banana]}]),
        buildMeal('Almoço', '13:00', {food: FOODS.patinho, subs: [FOODS.frango]}, [{food: FOODS.arroz, subs: [FOODS.macarrao]}, {food: FOODS.feijao, subs: [FOODS.lentilha]}, {food: FOODS.salada, subs: [FOODS.legumes]}]),
        buildMeal('Lanche da Tarde', '16:00', {food: FOODS.iogurte, subs: [FOODS.whey]}, [{food: FOODS.aveia, subs: [FOODS.castanha]}, {food: FOODS.banana, subs: [FOODS.maca]}]),
        buildMeal('Jantar', '20:00', {food: FOODS.sopa, subs: [FOODS.tilapia]}, [{food: FOODS.pao, subs: [FOODS.arroz]}])
      ] } ] } }
    },
    {
      id: genId(), slug: 'lactantes', title: 'Lactantes Premium 2500 kcal',
      description: 'Alta energia para produção de leite.',
      template_type: 'visual_v3', objective: 'saude', active: true, editable: true, substitutions_enabled: true, sovereign_validated: true, visual_style: 'premium', kcal_profiles: [2500], cluster_map: {},
      meal_distribution: [ { slot: 'Café da Manhã', time: '08:00' }, { slot: 'Almoço', time: '13:00' }, { slot: 'Lanche', time: '16:00' }, { slot: 'Jantar', time: '20:00' } ],
      plan_snapshot: { "2500": { days: [ { day_of_week: 1, meals: [
        buildMeal('Café da Manhã', '08:00', {food: FOODS.tapioca, subs: [FOODS.pao]}, [{food: FOODS.ovo, subs: [FOODS.iogurte]}, {food: FOODS.banana, subs: [FOODS.maca]}]),
        buildMeal('Almoço', '13:00', {food: FOODS.frango, subs: [FOODS.patinho]}, [{food: FOODS.arroz, subs: [FOODS.macarrao]}, {food: FOODS.feijao, subs: [FOODS.lentilha]}, {food: FOODS.salada, subs: [FOODS.legumes]}]),
        buildMeal('Lanche da Tarde', '16:00', {food: FOODS.whey, subs: [FOODS.iogurte]}, [{food: FOODS.pao, subs: [FOODS.tapioca]}, {food: FOODS.castanha, subs: [FOODS.aveia]}]),
        buildMeal('Jantar', '20:00', {food: FOODS.macarrao, subs: [FOODS.arroz]}, [{food: FOODS.patinho, subs: [FOODS.frango]}, {food: FOODS.legumes, subs: [FOODS.salada]}])
      ] } ] } }
    },
    {
      id: genId(), slug: 'cirurgico', title: 'Pré e Pós Operatório 2000 kcal',
      description: 'Cicatrizante e proteico.',
      template_type: 'visual_v3', objective: 'clinico', active: true, editable: true, substitutions_enabled: true, sovereign_validated: true, visual_style: 'premium', kcal_profiles: [2000], cluster_map: {},
      meal_distribution: [ { slot: 'Café da Manhã', time: '08:00' }, { slot: 'Almoço', time: '13:00' }, { slot: 'Lanche', time: '16:00' }, { slot: 'Jantar', time: '20:00' } ],
      plan_snapshot: { "2000": { days: [ { day_of_week: 1, meals: [
        buildMeal('Café da Manhã', '08:00', {food: FOODS.whey, subs: [FOODS.ovo]}, [{food: FOODS.maca, subs: [FOODS.banana]}]),
        buildMeal('Almoço', '13:00', {food: FOODS.salmao, subs: [FOODS.tilapia]}, [{food: FOODS.batata, subs: [FOODS.arroz]}, {food: FOODS.legumes, subs: [FOODS.salada]}]),
        buildMeal('Lanche da Tarde', '16:00', {food: FOODS.ovo, subs: [FOODS.iogurte]}, []),
        buildMeal('Jantar', '20:00', {food: FOODS.sopa, subs: [FOODS.frango]}, [{food: FOODS.legumes, subs: [FOODS.salada]}])
      ] } ] } }
    },
    {
      id: genId(), slug: 'paraense', title: 'Regional Paraense 2000 kcal',
      description: 'Dieta regional.',
      template_type: 'visual_v3', objective: 'saude', active: true, editable: true, substitutions_enabled: true, sovereign_validated: true, visual_style: 'premium', kcal_profiles: [2000], cluster_map: {},
      meal_distribution: [ { slot: 'Café da Manhã', time: '08:00' }, { slot: 'Almoço', time: '13:00' }, { slot: 'Lanche', time: '16:00' }, { slot: 'Jantar', time: '20:00' } ],
      plan_snapshot: { "2000": { days: [ { day_of_week: 1, meals: [
        buildMeal('Café da Manhã', '08:00', {food: FOODS.ovo, subs: [FOODS.iogurte]}, [{food: FOODS.tapioca, subs: [FOODS.pao]}]),
        buildMeal('Almoço', '13:00', {food: FOODS.tilapia, subs: [FOODS.frango]}, [{food: FOODS.arroz, subs: [FOODS.macarrao]}, {food: FOODS.feijao, subs: [FOODS.lentilha]}]),
        buildMeal('Lanche da Tarde', '16:00', {food: FOODS.tapioca, subs: [FOODS.pao]}, [{food: FOODS.whey, subs: [FOODS.iogurte]}]),
        buildMeal('Jantar', '20:00', {food: FOODS.sopa, subs: [FOODS.patinho]}, [{food: FOODS.legumes, subs: [FOODS.salada]}])
      ] } ] } }
    },
    {
      id: genId(), slug: 'brasileiro', title: 'Brasileiro Raiz 1800 kcal',
      description: 'Dieta básica do dia a dia.',
      template_type: 'visual_v3', objective: 'saude', active: true, editable: true, substitutions_enabled: true, sovereign_validated: true, visual_style: 'premium', kcal_profiles: [1800], cluster_map: {},
      meal_distribution: [ { slot: 'Café da Manhã', time: '08:00' }, { slot: 'Almoço', time: '13:00' }, { slot: 'Lanche', time: '16:00' }, { slot: 'Jantar', time: '20:00' } ],
      plan_snapshot: { "1800": { days: [ { day_of_week: 1, meals: [
        buildMeal('Café da Manhã', '08:00', {food: FOODS.pao, subs: [FOODS.tapioca]}, [{food: FOODS.ovo, subs: [FOODS.iogurte]}]),
        buildMeal('Almoço', '13:00', {food: FOODS.frango, subs: [FOODS.patinho]}, [{food: FOODS.arroz, subs: [FOODS.macarrao]}, {food: FOODS.feijao, subs: [FOODS.lentilha]}, {food: FOODS.salada, subs: [FOODS.legumes]}]),
        buildMeal('Lanche da Tarde', '16:00', {food: FOODS.banana, subs: [FOODS.maca]}, [{food: FOODS.aveia, subs: [FOODS.castanha]}]),
        buildMeal('Jantar', '20:00', {food: FOODS.macarrao, subs: [FOODS.arroz]}, [{food: FOODS.patinho, subs: [FOODS.frango]}, {food: FOODS.salada, subs: [FOODS.legumes]}])
      ] } ] } }
    },
    {
      id: genId(), slug: 'pratico', title: 'Práticos e Rápidos 1600 kcal',
      description: 'Lanches e marmitas prontas.',
      template_type: 'visual_v3', objective: 'saude', active: true, editable: true, substitutions_enabled: true, sovereign_validated: true, visual_style: 'premium', kcal_profiles: [1600], cluster_map: {},
      meal_distribution: [ { slot: 'Café da Manhã', time: '08:00' }, { slot: 'Almoço', time: '13:00' }, { slot: 'Lanche', time: '16:00' }, { slot: 'Jantar', time: '20:00' } ],
      plan_snapshot: { "1600": { days: [ { day_of_week: 1, meals: [
        buildMeal('Café da Manhã', '08:00', {food: FOODS.iogurte, subs: [FOODS.whey]}, [{food: FOODS.maca, subs: [FOODS.banana]}]),
        buildMeal('Almoço', '13:00', {food: FOODS.frango, subs: [FOODS.tilapia]}, [{food: FOODS.batata, subs: [FOODS.arroz]}, {food: FOODS.legumes, subs: [FOODS.salada]}]),
        buildMeal('Lanche da Tarde', '16:00', {food: FOODS.castanha, subs: [FOODS.aveia]}, []),
        buildMeal('Jantar', '20:00', {food: FOODS.pao, subs: [FOODS.tapioca]}, [{food: FOODS.patinho, subs: [FOODS.frango]}, {food: FOODS.salada, subs: [FOODS.legumes]}])
      ] } ] } }
    }
  ];
};

export const seedPremiumV3Templates = async () => {
  try {
    const templates = generatePremiumTemplates();
    
    // 1. Limpar templates "Premium" antigos ou corrompidos que não estão na lista atual
    const validSlugs = templates.map(t => t.slug);
    await supabase
      .from('v3_diet_templates')
      .delete()
      .is('nutritionist_id', null)
      .not('slug', 'in', `(${validSlugs.join(',')})`);

    // 2. Inserir ou atualizar os novos templates
    for (const t of templates) {
      const { error } = await supabase.from('v3_diet_templates').upsert({
        ...t,
        updated_at: new Date().toISOString()
      }, { onConflict: 'slug' });
      if (error) console.error('Error inserting template:', t.title, error);
    }
    return true;
  } catch (err) {
    console.error('Fatal error seeding templates:', err);
    return false;
  }
};
