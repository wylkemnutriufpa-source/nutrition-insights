import { supabase } from "@/integrations/supabase/client";

const BASE_IMG_URL = "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library";

// Helper to generate IDs
const genId = () => crypto.randomUUID();

export const generatePremiumTemplates = () => {
  const createDay = (dayIndex: number, calories: number, theme: string) => {
    // Basic variations based on day
    const dayName = dayIndex;
    
    const breakfast = {
      id: genId(),
      name: 'Café da Manhã',
      time: '07:30',
      items: [
        {
          id: genId(),
          title: theme === 'hipertrofia' ? 'Ovos Mexidos com Pão Integral e Abacate' : 'Omelete de Claras com Espinafre',
          quantity_display: '1 porção',
          clinical_mass_g: 300,
          macros: { kcal: Math.round(calories * 0.22), protein_g: 25, carbs_g: 30, fat_g: 15 },
          visual: { image_url: `${BASE_IMG_URL}/ovo-mexido.jpg` },
          substitutions: [
            {
              id: genId(),
              title: 'Panqueca de Aveia com Whey',
              macros: { kcal: Math.round(calories * 0.22), protein_g: 22, carbs_g: 35, fat_g: 10 },
              visual: { image_url: `${BASE_IMG_URL}/panqueca-de-aveia.jpg` }
            }
          ]
        }
      ]
    };

    const lunch = {
      id: genId(),
      name: 'Almoço',
      time: '13:00',
      items: [
        {
          id: genId(),
          title: theme === 'hipertrofia' ? 'Patinho Moído com Mandioca e Brócolis' : 'Frango Grelhado com Salada e Quinoa',
          quantity_display: '1 prato',
          clinical_mass_g: 500,
          macros: { kcal: Math.round(calories * 0.35), protein_g: 50, carbs_g: 60, fat_g: 15 },
          visual: { image_url: theme === 'hipertrofia' ? `${BASE_IMG_URL}/patinho-moido.jpg` : `${BASE_IMG_URL}/frango-grelhado.jpg` },
          substitutions: [
            {
              id: genId(),
              title: 'Tilápia com Batata Doce',
              macros: { kcal: Math.round(calories * 0.35), protein_g: 45, carbs_g: 55, fat_g: 12 },
              visual: { image_url: `${BASE_IMG_URL}/tilapia-grelhada.jpg` }
            }
          ]
        }
      ]
    };

    const snack = {
      id: genId(),
      name: 'Lanche da Tarde',
      time: '16:30',
      items: [
        {
          id: genId(),
          title: 'Iogurte com Whey e Frutas',
          quantity_display: '1 bowl',
          clinical_mass_g: 250,
          macros: { kcal: Math.round(calories * 0.15), protein_g: 30, carbs_g: 25, fat_g: 8 },
          visual: { image_url: `${BASE_IMG_URL}/iogurte-com-frutas.jpg` },
          substitutions: [
            {
              id: genId(),
              title: 'Mix de Castanhas e Fruta',
              macros: { kcal: Math.round(calories * 0.15), protein_g: 10, carbs_g: 30, fat_g: 18 },
              visual: { image_url: `${BASE_IMG_URL}/mix-castanhas.jpg` }
            }
          ]
        }
      ]
    };

    const dinner = {
      id: genId(),
      name: 'Jantar',
      time: '20:00',
      items: [
        {
          id: genId(),
          title: theme === 'hipertrofia' ? 'Filé de Frango com Arroz e Legumes' : 'Sopa de Legumes com Frango',
          quantity_display: '1 prato',
          clinical_mass_g: 450,
          macros: { kcal: Math.round(calories * 0.28), protein_g: 45, carbs_g: 40, fat_g: 12 },
          visual: { image_url: theme === 'hipertrofia' ? `${BASE_IMG_URL}/frango-grelhado.jpg` : `${BASE_IMG_URL}/sopa-de-legumes.jpg` },
          substitutions: [
            {
              id: genId(),
              title: 'Omelete Completo',
              macros: { kcal: Math.round(calories * 0.28), protein_g: 35, carbs_g: 10, fat_g: 25 },
              visual: { image_url: `${BASE_IMG_URL}/ovo-mexido.jpg` }
            }
          ]
        }
      ]
    };

    return {
      day_of_week: dayIndex,
      meals: [breakfast, lunch, snack, dinner]
    };
  };

  const generate7Days = (calories: number, theme: string) => {
    return Array.from({ length: 7 }, (_, i) => createDay(i + 1, calories, theme));
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
          days: generate7Days(2500, 'hipertrofia')
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
          days: generate7Days(1600, 'emagrecimento')
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
          days: generate7Days(1800, 'low_carb')
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
          days: generate7Days(1800, 'clinico')
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
          days: generate7Days(1800, 'clinico')
        }
      }
    }
  ];
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
