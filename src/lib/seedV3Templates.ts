import { supabase } from "@/integrations/supabase/client";

const BASE_IMG_URL = "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library";

// Helper to generate IDs
const genId = () => crypto.randomUUID();

export const generatePremiumTemplates = () => {
  return [
    {
      id: genId(),
      slug: 'hipertrofia-premium',
      title: 'Hipertrofia Premium 2500 kcal',
      description: 'Foco em ganho de massa muscular usando refeições completas e densas.',
      template_type: 'visual_v3',
      objective: 'hipertrofia',
      active: true,
      editable: true,
      substitutions_enabled: true,
      sovereign_validated: true,
      visual_style: 'premium',
      kcal_profiles: [2500],
      cluster_map: {
        'Café da Manhã': 'cafe_forte',
        'Almoço': 'almoco_forte',
        'Lanche da Tarde': 'lanche_proteico',
        'Jantar': 'jantar_forte'
      },
      meal_distribution: [
        { slot: 'Café da Manhã', time: '07:00' },
        { slot: 'Almoço', time: '13:00' },
        { slot: 'Lanche da Tarde', time: '16:00' },
        { slot: 'Jantar', time: '20:00' }
      ],
      plan_snapshot: {
        "2500": {
          days: [
            {
              day_of_week: 1,
              meals: [
                {
                  id: genId(),
                  name: 'Café da Manhã',
                  time: '07:00',
                  items: [
                    {
                      id: genId(),
                      title: 'Ovos Mexidos com Pão Integral e Frutas',
                      quantity_display: '1 prato cheio',
                      clinical_mass_g: 350,
                      macros: { kcal: 550, protein_g: 30, carbs_g: 55, fat_g: 22 },
                      visual: { image_url: `${BASE_IMG_URL}/ovo-mexido.jpg` },
                      substitutions: [
                        {
                          id: genId(),
                          title: 'Panqueca de Aveia com Pasta de Amendoim',
                          macros: { kcal: 550, protein_g: 28, carbs_g: 50, fat_g: 26 },
                          visual: { image_url: `${BASE_IMG_URL}/panqueca-de-aveia.jpg` }
                        }
                      ]
                    }
                  ]
                },
                {
                  id: genId(),
                  name: 'Almoço',
                  time: '13:00',
                  items: [
                    {
                      id: genId(),
                      title: 'Prato Feito: Frango Grelhado, Arroz, Feijão e Salada',
                      quantity_display: '1 prato farto',
                      clinical_mass_g: 550,
                      macros: { kcal: 750, protein_g: 65, carbs_g: 80, fat_g: 18 },
                      visual: { image_url: `${BASE_IMG_URL}/frango-grelhado.jpg` },
                      substitutions: [
                        {
                          id: genId(),
                          title: 'Prato Feito: Patinho Moído com Mandioca e Legumes',
                          macros: { kcal: 750, protein_g: 60, carbs_g: 85, fat_g: 19 },
                          visual: { image_url: `${BASE_IMG_URL}/patinho-moido.jpg` }
                        }
                      ]
                    }
                  ]
                },
                {
                  id: genId(),
                  name: 'Lanche da Tarde',
                  time: '16:00',
                  items: [
                    {
                      id: genId(),
                      title: 'Bowl de Iogurte com Whey, Frutas e Granola',
                      quantity_display: '1 tigela grande',
                      clinical_mass_g: 300,
                      macros: { kcal: 450, protein_g: 35, carbs_g: 55, fat_g: 10 },
                      visual: { image_url: `${BASE_IMG_URL}/iogurte-com-frutas.jpg` },
                      substitutions: [
                        {
                          id: genId(),
                          title: 'Crepioca Recheada com Queijo Branco',
                          macros: { kcal: 450, protein_g: 30, carbs_g: 45, fat_g: 16 },
                          visual: { image_url: `${BASE_IMG_URL}/crepioca.jpg` }
                        }
                      ]
                    }
                  ]
                },
                {
                  id: genId(),
                  name: 'Jantar',
                  time: '20:00',
                  items: [
                    {
                      id: genId(),
                      title: 'Marmita: Tilápia Grelhada com Purê de Batata e Brócolis',
                      quantity_display: '1 marmita',
                      clinical_mass_g: 500,
                      macros: { kcal: 750, protein_g: 55, carbs_g: 90, fat_g: 19 },
                      visual: { image_url: `${BASE_IMG_URL}/tilapia-grelhada.jpg` },
                      substitutions: [
                        {
                          id: genId(),
                          title: 'Sopa Completa de Legumes com Frango Desfiado',
                          macros: { kcal: 750, protein_g: 50, carbs_g: 95, fat_g: 18 },
                          visual: { image_url: `${BASE_IMG_URL}/sopa-de-legumes.jpg` }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    },
    {
      id: genId(),
      slug: 'emagrecimento-premium',
      title: 'Emagrecimento Premium 1500 kcal',
      description: 'Foco em déficit calórico com alta saciedade e refeições volumosas.',
      template_type: 'visual_v3',
      objective: 'emagrecimento',
      active: true,
      editable: true,
      substitutions_enabled: true,
      sovereign_validated: true,
      visual_style: 'premium',
      kcal_profiles: [1500],
      cluster_map: {
        'Café da Manhã': 'cafe_leve',
        'Almoço': 'almoco_leve',
        'Lanche da Tarde': 'lanche_leve',
        'Jantar': 'jantar_leve'
      },
      meal_distribution: [
        { slot: 'Café da Manhã', time: '08:00' },
        { slot: 'Almoço', time: '13:00' },
        { slot: 'Lanche da Tarde', time: '16:00' },
        { slot: 'Jantar', time: '19:30' }
      ],
      plan_snapshot: {
        "1500": {
          days: [
            {
              day_of_week: 1,
              meals: [
                {
                  id: genId(),
                  name: 'Café da Manhã',
                  time: '08:00',
                  items: [
                    {
                      id: genId(),
                      title: 'Omelete de Claras com Espinafre e Torrada Integral',
                      quantity_display: '1 porção',
                      clinical_mass_g: 250,
                      macros: { kcal: 300, protein_g: 25, carbs_g: 25, fat_g: 11 },
                      visual: { image_url: `${BASE_IMG_URL}/ovo-mexido.jpg` },
                      substitutions: [
                        {
                          id: genId(),
                          title: 'Iogurte Natural com Frutas Vermelhas',
                          macros: { kcal: 300, protein_g: 20, carbs_g: 35, fat_g: 8 },
                          visual: { image_url: `${BASE_IMG_URL}/iogurte-com-frutas.jpg` }
                        }
                      ]
                    }
                  ]
                },
                {
                  id: genId(),
                  name: 'Almoço',
                  time: '13:00',
                  items: [
                    {
                      id: genId(),
                      title: 'Salada Completa com Frango Grelhado e Mix de Folhas',
                      quantity_display: '1 bowl grande',
                      clinical_mass_g: 450,
                      macros: { kcal: 450, protein_g: 45, carbs_g: 30, fat_g: 16 },
                      visual: { image_url: `${BASE_IMG_URL}/salada-de-frango.jpg` },
                      substitutions: [
                        {
                          id: genId(),
                          title: 'Tilápia Grelhada com Brócolis e Cenoura Cozida',
                          macros: { kcal: 450, protein_g: 40, carbs_g: 35, fat_g: 16 },
                          visual: { image_url: `${BASE_IMG_URL}/tilapia-grelhada.jpg` }
                        }
                      ]
                    }
                  ]
                },
                {
                  id: genId(),
                  name: 'Lanche da Tarde',
                  time: '16:00',
                  items: [
                    {
                      id: genId(),
                      title: 'Salada de Frutas com Whey Protein',
                      quantity_display: '1 taça média',
                      clinical_mass_g: 250,
                      macros: { kcal: 300, protein_g: 25, carbs_g: 35, fat_g: 6 },
                      visual: { image_url: `${BASE_IMG_URL}/salada-de-frutas.jpg` },
                      substitutions: [
                        {
                          id: genId(),
                          title: 'Crepioca Simples',
                          macros: { kcal: 300, protein_g: 18, carbs_g: 30, fat_g: 12 },
                          visual: { image_url: `${BASE_IMG_URL}/crepioca.jpg` }
                        }
                      ]
                    }
                  ]
                },
                {
                  id: genId(),
                  name: 'Jantar',
                  time: '19:30',
                  items: [
                    {
                      id: genId(),
                      title: 'Sopa Leve de Legumes com Frango',
                      quantity_display: '1 prato fundo',
                      clinical_mass_g: 400,
                      macros: { kcal: 450, protein_g: 40, carbs_g: 40, fat_g: 14 },
                      visual: { image_url: `${BASE_IMG_URL}/sopa-de-legumes.jpg` },
                      substitutions: [
                        {
                          id: genId(),
                          title: 'Omelete de Forno com Legumes',
                          macros: { kcal: 450, protein_g: 35, carbs_g: 25, fat_g: 23 },
                          visual: { image_url: `${BASE_IMG_URL}/ovo-mexido.jpg` }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    },
    {
      id: genId(),
      slug: 'low-carb-premium',
      title: 'Low Carb Premium 1600 kcal',
      description: 'Dieta com restrição de carboidratos, rica em proteínas e gorduras boas.',
      template_type: 'visual_v3',
      objective: 'low_carb',
      active: true,
      editable: true,
      substitutions_enabled: true,
      sovereign_validated: true,
      visual_style: 'premium',
      kcal_profiles: [1600],
      cluster_map: {
        'Café da Manhã': 'cafe_low_carb',
        'Almoço': 'almoco_low_carb',
        'Lanche da Tarde': 'lanche_low_carb',
        'Jantar': 'jantar_low_carb'
      },
      meal_distribution: [
        { slot: 'Café da Manhã', time: '07:30' },
        { slot: 'Almoço', time: '13:00' },
        { slot: 'Lanche da Tarde', time: '16:30' },
        { slot: 'Jantar', time: '20:00' }
      ],
      plan_snapshot: {
        "1600": {
          days: [
            {
              day_of_week: 1,
              meals: [
                {
                  id: genId(),
                  name: 'Café da Manhã',
                  time: '07:30',
                  items: [
                    {
                      id: genId(),
                      title: 'Ovos com Abacate e Sementes',
                      quantity_display: '1 prato',
                      clinical_mass_g: 250,
                      macros: { kcal: 400, protein_g: 20, carbs_g: 10, fat_g: 31 },
                      visual: { image_url: `${BASE_IMG_URL}/ovo-mexido.jpg` },
                      substitutions: [
                        {
                          id: genId(),
                          title: 'Iogurte com Castanhas e Chia',
                          macros: { kcal: 400, protein_g: 15, carbs_g: 12, fat_g: 32 },
                          visual: { image_url: `${BASE_IMG_URL}/iogurte-com-frutas.jpg` }
                        }
                      ]
                    }
                  ]
                },
                {
                  id: genId(),
                  name: 'Almoço',
                  time: '13:00',
                  items: [
                    {
                      id: genId(),
                      title: 'Salmão Grelhado com Aspargos e Azeite',
                      quantity_display: '1 prato',
                      clinical_mass_g: 350,
                      macros: { kcal: 500, protein_g: 45, carbs_g: 8, fat_g: 32 },
                      visual: { image_url: `${BASE_IMG_URL}/salmao-grelhado.jpg` },
                      substitutions: [
                        {
                          id: genId(),
                          title: 'Frango Grelhado com Brócolis e Manteiga',
                          macros: { kcal: 500, protein_g: 50, carbs_g: 10, fat_g: 28 },
                          visual: { image_url: `${BASE_IMG_URL}/frango-grelhado.jpg` }
                        }
                      ]
                    }
                  ]
                },
                {
                  id: genId(),
                  name: 'Lanche da Tarde',
                  time: '16:30',
                  items: [
                    {
                      id: genId(),
                      title: 'Mix de Castanhas e Queijo Curado',
                      quantity_display: '1 porção média',
                      clinical_mass_g: 80,
                      macros: { kcal: 300, protein_g: 15, carbs_g: 5, fat_g: 24 },
                      visual: { image_url: `${BASE_IMG_URL}/mix-castanhas.jpg` },
                      substitutions: [
                        {
                          id: genId(),
                          title: 'Ovos de Codorna e Tomate Cereja',
                          macros: { kcal: 300, protein_g: 18, carbs_g: 6, fat_g: 22 },
                          visual: { image_url: `${BASE_IMG_URL}/ovo-mexido.jpg` }
                        }
                      ]
                    }
                  ]
                },
                {
                  id: genId(),
                  name: 'Jantar',
                  time: '20:00',
                  items: [
                    {
                      id: genId(),
                      title: 'Patinho Moído com Abobrinha Salteada',
                      quantity_display: '1 prato',
                      clinical_mass_g: 350,
                      macros: { kcal: 400, protein_g: 45, carbs_g: 12, fat_g: 19 },
                      visual: { image_url: `${BASE_IMG_URL}/patinho-moido.jpg` },
                      substitutions: [
                        {
                          id: genId(),
                          title: 'Salada de Atum com Maionese de Abacate',
                          macros: { kcal: 400, protein_g: 40, carbs_g: 10, fat_g: 22 },
                          visual: { image_url: `${BASE_IMG_URL}/salada-de-atum.jpg` }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    },
    {
      id: genId(),
      slug: 'fodmaps-premium',
      title: 'Low FODMAPs Premium 1800 kcal',
      description: 'Especial para Síndrome do Intestino Irritável. Ingredientes de fácil digestão.',
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
          days: [
            {
              day_of_week: 1,
              meals: [
                {
                  id: genId(),
                  name: 'Café da Manhã',
                  time: '08:00',
                  items: [
                    {
                      id: genId(),
                      title: 'Mingau de Aveia Sem Glúten com Morangos (Leite sem Lactose)',
                      quantity_display: '1 tigela',
                      clinical_mass_g: 300,
                      macros: { kcal: 350, protein_g: 15, carbs_g: 50, fat_g: 10 },
                      visual: { image_url: `${BASE_IMG_URL}/mingau-de-aveia.jpg` },
                      substitutions: [
                        {
                          id: genId(),
                          title: 'Tapioca com Ovos Mexidos e Mamão (Porção Moderada)',
                          macros: { kcal: 350, protein_g: 15, carbs_g: 50, fat_g: 10 },
                          visual: { image_url: `${BASE_IMG_URL}/crepioca.jpg` }
                        }
                      ]
                    }
                  ]
                },
                {
                  id: genId(),
                  name: 'Almoço',
                  time: '13:00',
                  items: [
                    {
                      id: genId(),
                      title: 'Frango Grelhado com Quinoa e Cenoura Assada',
                      quantity_display: '1 prato',
                      clinical_mass_g: 400,
                      macros: { kcal: 550, protein_g: 45, carbs_g: 55, fat_g: 16 },
                      visual: { image_url: `${BASE_IMG_URL}/frango-grelhado.jpg` },
                      substitutions: [
                        {
                          id: genId(),
                          title: 'Salmão com Batata Inglesa e Espinafre',
                          macros: { kcal: 550, protein_g: 40, carbs_g: 50, fat_g: 21 },
                          visual: { image_url: `${BASE_IMG_URL}/salmao-grelhado.jpg` }
                        }
                      ]
                    }
                  ]
                },
                {
                  id: genId(),
                  name: 'Lanche da Tarde',
                  time: '16:00',
                  items: [
                    {
                      id: genId(),
                      title: 'Snack de Arroz com Pasta de Amendoim e Kiwi',
                      quantity_display: '1 prato pequeno',
                      clinical_mass_g: 150,
                      macros: { kcal: 350, protein_g: 10, carbs_g: 40, fat_g: 16 },
                      visual: { image_url: `${BASE_IMG_URL}/panqueca-de-aveia.jpg` },
                      substitutions: [
                        {
                          id: genId(),
                          title: 'Iogurte Zero Lactose com Chia e Morango',
                          macros: { kcal: 350, protein_g: 12, carbs_g: 35, fat_g: 18 },
                          visual: { image_url: `${BASE_IMG_URL}/iogurte-com-frutas.jpg` }
                        }
                      ]
                    }
                  ]
                },
                {
                  id: genId(),
                  name: 'Jantar',
                  time: '19:30',
                  items: [
                    {
                      id: genId(),
                      title: 'Carne Magra (Patinho) com Macarrão Sem Glúten e Molho Caseiro de Tomate',
                      quantity_display: '1 prato',
                      clinical_mass_g: 400,
                      macros: { kcal: 550, protein_g: 45, carbs_g: 65, fat_g: 12 },
                      visual: { image_url: `${BASE_IMG_URL}/patinho-moido.jpg` },
                      substitutions: [
                        {
                          id: genId(),
                          title: 'Filé de Tilápia com Arroz Branco e Abobrinha',
                          macros: { kcal: 550, protein_g: 45, carbs_g: 65, fat_g: 12 },
                          visual: { image_url: `${BASE_IMG_URL}/tilapia-grelhada.jpg` }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    },
    {
      id: genId(),
      slug: 'anti-inflamatorio-premium',
      title: 'Anti-inflamatório Premium 1800 kcal',
      description: 'Rico em ômega-3, antioxidantes, polifenóis e livre de ultraprocessados.',
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
          days: [
            {
              day_of_week: 1,
              meals: [
                {
                  id: genId(),
                  name: 'Café da Manhã',
                  time: '07:30',
                  items: [
                    {
                      id: genId(),
                      title: 'Suco Verde com Gengibre e Ovos Mexidos no Azeite',
                      quantity_display: '1 copo + 1 prato',
                      clinical_mass_g: 350,
                      macros: { kcal: 400, protein_g: 18, carbs_g: 25, fat_g: 25 },
                      visual: { image_url: `${BASE_IMG_URL}/suco-verde.jpg` },
                      substitutions: [
                        {
                          id: genId(),
                          title: 'Chá de Cúrcuma com Abacate e Castanhas',
                          macros: { kcal: 400, protein_g: 10, carbs_g: 20, fat_g: 31 },
                          visual: { image_url: `${BASE_IMG_URL}/mix-castanhas.jpg` }
                        }
                      ]
                    }
                  ]
                },
                {
                  id: genId(),
                  name: 'Almoço',
                  time: '13:00',
                  items: [
                    {
                      id: genId(),
                      title: 'Salmão Grelhado com Mix de Vegetais Escuros (Couve e Brócolis)',
                      quantity_display: '1 prato',
                      clinical_mass_g: 450,
                      macros: { kcal: 500, protein_g: 40, carbs_g: 35, fat_g: 22 },
                      visual: { image_url: `${BASE_IMG_URL}/salmao-grelhado.jpg` },
                      substitutions: [
                        {
                          id: genId(),
                          title: 'Tilápia com Arroz Integral e Salada de Folhas Roxas',
                          macros: { kcal: 500, protein_g: 40, carbs_g: 50, fat_g: 15 },
                          visual: { image_url: `${BASE_IMG_URL}/tilapia-grelhada.jpg` }
                        }
                      ]
                    }
                  ]
                },
                {
                  id: genId(),
                  name: 'Lanche da Tarde',
                  time: '16:00',
                  items: [
                    {
                      id: genId(),
                      title: 'Frutas Vermelhas com Iogurte Natural e Semente de Linhaça',
                      quantity_display: '1 bowl',
                      clinical_mass_g: 250,
                      macros: { kcal: 350, protein_g: 15, carbs_g: 40, fat_g: 15 },
                      visual: { image_url: `${BASE_IMG_URL}/iogurte-com-frutas.jpg` },
                      substitutions: [
                        {
                          id: genId(),
                          title: 'Mamão com Chia e Pão de Fermentação Natural',
                          macros: { kcal: 350, protein_g: 10, carbs_g: 50, fat_g: 12 },
                          visual: { image_url: `${BASE_IMG_URL}/salada-de-frutas.jpg` }
                        }
                      ]
                    }
                  ]
                },
                {
                  id: genId(),
                  name: 'Jantar',
                  time: '19:30',
                  items: [
                    {
                      id: genId(),
                      title: 'Creme de Abóbora com Frango Desfiado e Azeite Extravirgem',
                      quantity_display: '1 prato fundo',
                      clinical_mass_g: 400,
                      macros: { kcal: 550, protein_g: 45, carbs_g: 45, fat_g: 21 },
                      visual: { image_url: `${BASE_IMG_URL}/sopa-de-legumes.jpg` },
                      substitutions: [
                        {
                          id: genId(),
                          title: 'Sardinha Grelhada com Salada Morna de Grão de Bico e Ervas',
                          macros: { kcal: 550, protein_g: 40, carbs_g: 55, fat_g: 19 },
                          visual: { image_url: `${BASE_IMG_URL}/salada-de-frango.jpg` }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    }
  ];
};

export const seedPremiumV3Templates = async () => {
  try {
    const templates = generatePremiumTemplates();
    
    // Deleta os antigos primeiro (opcional, mas garante limpeza)
    // await supabase.from('v3_diet_templates').delete().neq('id', '0');

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
