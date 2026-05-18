import { supabase } from "@/integrations/supabase/client";

const BASE_IMG_URL = "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library";

// Helper to generate IDs
const genId = () => crypto.randomUUID();

export const generatePremiumTemplates = () => {
  const generate7DaysOfMeals = (calories: number, theme: string) => {
    const allMeals: any[] = [];
    
    for (let day = 1; day <= 7; day++) {
      const dayCalories = calories; // Keeping it consistent per user preference for "perfection"
      
      const dayMeals = [
        {
          id: genId(),
          name: 'Café da Manhã',
          time: '07:30',
          day_of_week: day,
          items: [
            {
              id: genId(),
              instanceId: genId(),
              name: theme === 'hipertrofia' ? 'Ovos Mexidos com Pão Integral e Abacate' : 'Omelete de Claras com Espinafre',
              quantity: 1,
              display_quantity: '1 porção',
              clinical_mass_g: 300,
              kcal: Math.round(dayCalories * 0.22),
              protein: 25,
              carbs: 30,
              fat: 15,
              imageUrl: `${BASE_IMG_URL}/ovo-mexido.jpg`,
              substitutions: [
                {
                  id: genId(),
                  name: 'Panqueca de Aveia com Whey',
                  kcal: Math.round(dayCalories * 0.22),
                  protein: 22,
                  carbs: 35,
                  fat: 10,
                  imageUrl: `${BASE_IMG_URL}/panqueca-de-aveia.jpg`
                }
              ]
            }
          ]
        },
        {
          id: genId(),
          name: 'Almoço',
          time: '13:00',
          day_of_week: day,
          items: [
            {
              id: genId(),
              instanceId: genId(),
              name: theme === 'hipertrofia' ? 'Patinho Moído com Mandioca e Brócolis' : 'Frango Grelhado com Salada e Quinoa',
              quantity: 1,
              display_quantity: '1 prato',
              clinical_mass_g: 500,
              kcal: Math.round(dayCalories * 0.35),
              protein: 50,
              carbs: 60,
              fat: 15,
              imageUrl: theme === 'hipertrofia' ? `${BASE_IMG_URL}/patinho-moido.jpg` : `${BASE_IMG_URL}/frango-grelhado.jpg`,
              substitutions: [
                {
                  id: genId(),
                  name: 'Tilápia com Batata Doce',
                  kcal: Math.round(dayCalories * 0.35),
                  protein: 45,
                  carbs: 55,
                  fat: 12,
                  imageUrl: `${BASE_IMG_URL}/tilapia-grelhada.jpg`
                }
              ]
            }
          ]
        },
        {
          id: genId(),
          name: 'Lanche da Tarde',
          time: '16:30',
          day_of_week: day,
          items: [
            {
              id: genId(),
              instanceId: genId(),
              name: 'Iogurte com Whey e Frutas',
              quantity: 1,
              display_quantity: '1 bowl',
              clinical_mass_g: 250,
              kcal: Math.round(dayCalories * 0.15),
              protein: 30,
              carbs: 25,
              fat: 8,
              imageUrl: `${BASE_IMG_URL}/iogurte-com-frutas.jpg`,
              substitutions: [
                {
                  id: genId(),
                  name: 'Mix de Castanhas e Fruta',
                  kcal: Math.round(dayCalories * 0.15),
                  protein: 10,
                  carbs: 30,
                  fat: 18,
                  imageUrl: `${BASE_IMG_URL}/mix-castanhas.jpg`
                }
              ]
            }
          ]
        },
        {
          id: genId(),
          name: 'Jantar',
          time: '20:00',
          day_of_week: day,
          items: [
            {
              id: genId(),
              instanceId: genId(),
              name: theme === 'hipertrofia' ? 'Filé de Frango com Arroz e Legumes' : 'Sopa de Legumes com Frango',
              quantity: 1,
              display_quantity: '1 prato',
              clinical_mass_g: 450,
              kcal: Math.round(dayCalories * 0.28),
              protein: 45,
              carbs: 40,
              fat: 12,
              imageUrl: theme === 'hipertrofia' ? `${BASE_IMG_URL}/frango-grelhado.jpg` : `${BASE_IMG_URL}/sopa-de-legumes.jpg`,
              substitutions: [
                {
                  id: genId(),
                  name: 'Omelete Completo',
                  kcal: Math.round(dayCalories * 0.28),
                  protein: 35,
                  carbs: 10,
                  fat: 25,
                  imageUrl: `${BASE_IMG_URL}/ovo-mexido.jpg`
                }
              ]
            }
          ]
        }
      ];
      allMeals.push(...dayMeals);
    }
    
    return allMeals;
  };

  return [
    {
      id: genId(),
      slug: 'hipertrofia-premium',
      title: 'Hipertrofia Premium V3 ✨',
      description: 'Plano focado em ganho de massa muscular com alta densidade nutricional.',
      template_type: 'visual_v3',
      objective: 'hipertrofia',
      active: true,
      editable: true,
      substitutions_enabled: true,
      sovereign_validated: true,
      visual_style: 'premium',
      kcal_profiles: [2500],
      cluster_map: {
        'Café da Manhã': 'cafe_hiper',
        'Almoço': 'almoco_hiper',
        'Lanche da Tarde': 'lanche_hiper',
        'Jantar': 'jantar_hiper'
      },
      meal_distribution: [
        { slot: 'Café da Manhã', time: '07:30' },
        { slot: 'Almoço', time: '13:00' },
        { slot: 'Lanche da Tarde', time: '16:30' },
        { slot: 'Jantar', time: '20:00' }
      ],
      plan_snapshot: {
        "2500": {
          meals: generate7DaysOfMeals(2500, 'hipertrofia')
        }
      }
    },
    {
      id: genId(),
      slug: 'emagrecimento-premium',
      title: 'Emagrecimento Premium V3 ✨',
      description: 'Estratégia de déficit calórico com alta saciedade e controle de fome.',
      template_type: 'visual_v3',
      objective: 'emagrecimento',
      active: true,
      editable: true,
      substitutions_enabled: true,
      sovereign_validated: true,
      visual_style: 'premium',
      kcal_profiles: [1600],
      cluster_map: {
        'Café da Manhã': 'cafe_ema',
        'Almoço': 'almoco_ema',
        'Lanche da Tarde': 'lanche_ema',
        'Jantar': 'jantar_ema'
      },
      meal_distribution: [
        { slot: 'Café da Manhã', time: '08:00' },
        { slot: 'Almoço', time: '13:00' },
        { slot: 'Lanche da Tarde', time: '16:00' },
        { slot: 'Jantar', time: '19:30' }
      ],
      plan_snapshot: {
        "1600": {
          meals: generate7DaysOfMeals(1600, 'emagrecimento')
        }
      }
    },
    {
      id: genId(),
      slug: 'low-carb-premium',
      title: 'Low Carb Premium V3 ✨',
      description: 'Redução de carboidratos com foco em proteínas e gorduras de qualidade.',
      template_type: 'visual_v3',
      objective: 'low_carb',
      active: true,
      editable: true,
      substitutions_enabled: true,
      sovereign_validated: true,
      visual_style: 'premium',
      kcal_profiles: [1800],
      cluster_map: {
        'Café da Manhã': 'cafe_low',
        'Almoço': 'almoco_low',
        'Lanche da Tarde': 'lanche_low',
        'Jantar': 'jantar_low'
      },
      meal_distribution: [
        { slot: 'Café da Manhã', time: '07:30' },
        { slot: 'Almoço', time: '13:00' },
        { slot: 'Lanche da Tarde', time: '16:30' },
        { slot: 'Jantar', time: '20:00' }
      ],
      plan_snapshot: {
        "1800": {
          meals: generate7DaysOfMeals(1800, 'low_carb')
        }
      }
    },
    {
      id: genId(),
      slug: 'fodmaps-premium',
      title: 'Low FODMAPs Premium V3 ✨',
      description: 'Especial para saúde intestinal e redução de desconfortos digestivos.',
      template_type: 'visual_v3',
      objective: 'clinico',
      active: true,
      editable: true,
      substitutions_enabled: true,
      sovereign_validated: true,
      visual_style: 'premium',
      kcal_profiles: [1800],
      cluster_map: {
        'Café da Manhã': 'cafe_fodmap',
        'Almoço': 'almoco_fodmap',
        'Lanche da Tarde': 'lanche_fodmap',
        'Jantar': 'jantar_fodmap'
      },
      meal_distribution: [
        { slot: 'Café da Manhã', time: '08:00' },
        { slot: 'Almoço', time: '13:00' },
        { slot: 'Lanche da Tarde', time: '16:00' },
        { slot: 'Jantar', time: '19:30' }
      ],
      plan_snapshot: {
        "1800": {
          meals: generate7DaysOfMeals(1800, 'clinico')
        }
      }
    },
    {
      id: genId(),
      slug: 'anti-inflamatorio-premium',
      title: 'Anti-inflamatório Premium V3 ✨',
      description: 'Foco em antioxidantes e regulação sistêmica através da alimentação.',
      template_type: 'visual_v3',
      objective: 'clinico',
      active: true,
      editable: true,
      substitutions_enabled: true,
      sovereign_validated: true,
      visual_style: 'premium',
      kcal_profiles: [1800],
      cluster_map: {
        'Café da Manhã': 'cafe_anti',
        'Almoço': 'almoco_anti',
        'Lanche da Tarde': 'lanche_anti',
        'Jantar': 'jantar_anti'
      },
      meal_distribution: [
        { slot: 'Café da Manhã', time: '07:30' },
        { slot: 'Almoço', time: '13:00' },
        { slot: 'Lanche da Tarde', time: '16:00' },
        { slot: 'Jantar', time: '19:30' }
      ],
      plan_snapshot: {
        "1800": {
          meals: generate7DaysOfMeals(1800, 'clinico')
        }
      }
    }
  ] as any[];
};

export const seedPremiumV3Templates = async () => {
  try {
    const templates = generatePremiumTemplates();
    
    console.log('Clearing existing templates...');
    // Deleta os antigos primeiro para garantir que só fiquem os novos premium soberanos
    const { error: deleteError } = await supabase.from('v3_diet_templates').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteError) {
      console.error('Error clearing templates:', deleteError);
    }

    console.log(`Inserting ${templates.length} premium templates...`);
    // Inserir todos
    for (const t of templates) {
      const { error } = await supabase.from('v3_diet_templates').upsert({
        ...t,
        updated_at: new Date().toISOString()
      }, { onConflict: 'slug' });
      
      if (error) {
        console.error('Error inserting template:', t.title, error);
      }
    }
    
    return true;
  } catch (err) {
    console.error('Fatal error seeding templates:', err);
    return false;
  }
};
