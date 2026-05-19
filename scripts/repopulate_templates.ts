
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MEAL_VISUAL_LIBRARY = {
  pao_frances: '8626be62-b9ea-45ad-abf9-09528bd60368',
  feijao_carioca: '0d2887f0-0f0a-465e-a1e4-bdbad84d2531',
  arroz_feijao_frango: '7292bdef-9b4e-4008-be2f-bf0fec7258b3',
  tapioca_queijo: '7cf42112-a541-4153-820a-11c430d8ddf9',
  sopa_legumes: 'b69a01f3-985a-49fd-9a54-fbb08b1f0dc8',
  castanhas: '59623215-5007-45d6-8825-2646fb2c8315',
  abacate: '0b4b5b19-781d-45ec-ac25-8a77fe6daad2',
  frutas_vermelhas: '82138fc1-8a5b-47ce-9dfc-f79acc8d9a59',
  whey: '7a1cf5e9-e87a-4fa4-bac8-bdb3bf90508e',
  carne_panela: '2cd6493f-c12a-4425-9359-2b961a7a457c',
  arroz_integral: '6a596409-e61d-41d0-a908-96fec006616b',
  tilapia: 'f86f1426-89f1-4844-99b2-c8b4b634912f',
  farofa_ovo: '0d72e65c-20da-4c7a-b503-3a2dde138a85',
  pao_frango: 'b1787be4-4829-43b9-a6c8-8101ca9fd5a0',
};

// Helper to build a meal item
const item = (libId: string, name: string, kcal: number, p: number, c: number, f: number, qty: string) => ({
  id: crypto.randomUUID(),
  visual_library_item_id: libId,
  name: name,
  title: name,
  kcal,
  protein: p,
  carbs: c,
  fat: f,
  quantity: 1,
  quantity_display: qty,
  imageUrl: `https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/${libId.includes('/') ? libId : libId + '.jpg'}`,
  is_primary: true
});

const buildSnapshot = (meals: any[]) => {
  return {
    "1800": {
      days: [
        {
          day_of_week: 1,
          meals: meals.map((m, i) => ({
            id: crypto.randomUUID(),
            tipo_refeicao: m.type,
            name: m.name,
            time: m.time,
            items: m.items
          }))
        }
      ]
    }
  };
};

async function main() {
  // Anti-Inflammatory
  const antiInfMeals = [
    { type: 'Café da Manhã', name: 'Desjejum Bioativo', time: '08:00', items: [item(MEAL_VISUAL_LIBRARY.farofa_ovo, 'Farofa de Ovo com Café', 250, 15, 10, 12, '1 porção')] },
    { type: 'Lanche da Manhã', name: 'Antioxidante', time: '10:30', items: [item(MEAL_VISUAL_LIBRARY.frutas_vermelhas, 'Frutas Vermelhas', 80, 1, 15, 0, '1 xícara')] },
    { type: 'Almoço', name: 'Almoço Anti-inflamatório', time: '13:00', items: [item(MEAL_VISUAL_LIBRARY.tilapia, 'Filé de Tilápia com Ervas', 350, 30, 5, 15, '150g')] },
    { type: 'Lanche da Tarde', name: 'Gorduras Boas', time: '16:30', items: [item(MEAL_VISUAL_LIBRARY.abacate, 'Abacate com Castanhas', 220, 4, 10, 18, '1/4 unidade')] },
    { type: 'Jantar', name: 'Ceia Leve', time: '19:30', items: [item(MEAL_VISUAL_LIBRARY.sopa_legumes, 'Sopa de Legumes Detox', 200, 8, 25, 5, '1 prato fundo')] }
  ];

  // Hypertrophy
  const hypertrophyMeals = [
    { type: 'Café da Manhã', name: 'Café de Campeão', time: '07:30', items: [item(MEAL_VISUAL_LIBRARY.tapioca_queijo, 'Tapioca com Queijo e Ovos', 450, 20, 50, 15, '2 unidades')] },
    { type: 'Almoço', name: 'Construção Muscular', time: '12:30', items: [item(MEAL_VISUAL_LIBRARY.arroz_feijao_frango, 'Arroz, Feijão e Frango', 650, 45, 80, 12, '1 prato cheio')] },
    { type: 'Lanche da Tarde', name: 'Pós-Treino Estrutural', time: '16:00', items: [item(MEAL_VISUAL_LIBRARY.whey, 'Whey Protein com Banana', 300, 30, 30, 3, '1 shake')] },
    { type: 'Jantar', name: 'Reparação Noturna', time: '20:00', items: [item(MEAL_VISUAL_LIBRARY.carne_panela, 'Carne de Panela com Arroz Integral', 550, 40, 60, 15, '200g carne + 150g arroz')] }
  ];

  await supabase.from('v3_diet_templates').update({
    plan_snapshot: buildSnapshot(antiInfMeals)
  }).eq('slug', 'anti-inflamatorio-premium');

  await supabase.from('v3_diet_templates').update({
    plan_snapshot: buildSnapshot(hypertrophyMeals)
  }).eq('slug', 'hipertrofia-premium-v2');

  console.log('Templates repopulated successfully.');
}

main();
