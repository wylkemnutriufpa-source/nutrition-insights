
/**
 * BLUEPRINTS DE TEMPLATES DETERMINÍSTICOS
 * Define a estrutura das dietas usando apenas SLUGS do banco real (meal_visual_library).
 */

export const ALL_BLUEPRINTS = [
  {
    slug: 'anti-inflamatorio-premium',
    title: 'Protocolo Anti-Inflamatório Real',
    description: 'Foco em fitoquímicos, ômega-3 e baixa carga glicêmica usando banco real.',
    template_type: 'visual_v3',
    objective: 'clinico',
    visual_style: 'premium',
    kcal_profiles: [1800, 2000],
    meals: [
      { 
        name: 'Desjejum Bioativo', 
        time: '08:00', 
        main: 'vitamina-de-frutas', 
        subs: ['iogurte-natural'],
        sides: [{ slug: 'ovos-mexidos', subs: ['omelete'] }] 
      },
      { 
        name: 'Almoço Anti-Inflamatório', 
        time: '12:30', 
        main: 'file-de-tilapia', 
        subs: ['peixe-com-legumes', 'maminha'],
        sides: [
          { slug: 'arroz-integral', subs: ['batata-doce'] },
          { slug: 'salada-verde', subs: ['legumes-cozidos-jantar'] },
          { slug: 'azeite' }
        ]
      },
      { 
        name: 'Lanche da Tarde', 
        time: '16:00', 
        main: 'abacate-cacau', 
        subs: ['castanha', 'iogurte-natural'],
        sides: [{ slug: 'granola-com-iogurte' }]
      },
      { 
        name: 'Jantar Leve', 
        time: '19:30', 
        main: 'sopa-de-legumes', 
        subs: ['frango-grelhado'],
        sides: [{ slug: 'salada-crua-folhas-jantar' }]
      }
    ]
  },
  {
    slug: 'hipertrofia-premium-v2',
    title: 'Hipertrofia Estrutural Real',
    description: 'Aporte proteico máximo com densidade calórica vinda de alimentos reais.',
    template_type: 'visual_v3',
    objective: 'hipertrofia',
    visual_style: 'premium',
    kcal_profiles: [2500, 3000],
    meals: [
      { 
        name: 'Café da Manhã Anabólico', 
        time: '07:00', 
        main: 'pao-com-ovo', 
        subs: ['cuscuz-com-ovo', 'crepioca'],
        sides: [{ slug: 'aveia-com-banana', subs: ['mamao-com-aveia'] }]
      },
      { 
        name: 'Almoço de Performance', 
        time: '13:00', 
        main: 'acem', 
        subs: ['carne-grelhada', 'strogonoff-frango'],
        sides: [
          { slug: 'arroz-feijao-carne', subs: ['macarrao-com-carne-moida'] },
          { slug: 'feijao-carioca' },
          { slug: 'salada-completa' }
        ]
      },
      { 
        name: 'Pós-Treino Real', 
        time: '16:30', 
        main: 'whey-protein', 
        subs: ['iogurte-com-banana'],
        sides: [{ slug: 'pao-com-frango-desfiado' }]
      },
      { 
        name: 'Jantar de Recuperação', 
        time: '20:30', 
        main: 'arroz-com-frango', 
        subs: ['macarronada-de-camarao', 'lombo-suino'],
        sides: [{ slug: 'legumes-cozidos-jantar' }]
      }
    ]
  },
  {
    slug: 'low-carb-premium-real',
    title: 'Low Carb Premium Determinístico',
    description: 'Alta gordura saudável e proteína, zero invenção textual.',
    template_type: 'visual_v3',
    objective: 'low_carb',
    visual_style: 'premium',
    kcal_profiles: [1600, 1800],
    meals: [
      { 
        name: 'Café da Manhã Keto', 
        time: '08:30', 
        main: 'ovos-cozidos', 
        subs: ['omelete'],
        sides: [{ slug: 'abacate', subs: ['mix-nuts'] }]
      },
      { 
        name: 'Almoço Low Carb', 
        time: '13:00', 
        main: 'maminha', 
        subs: ['file-de-porco', 'peixe-grelhado'],
        sides: [
          { slug: 'legumes-cozidos-jantar', subs: ['salada-verde'] },
          { slug: 'azeite' }
        ]
      },
      { 
        name: 'Lanche Sacietógeno', 
        time: '16:30', 
        main: 'mix-nuts', 
        subs: ['abacate-cacau'],
        sides: []
      },
      { 
        name: 'Jantar Cetogênico', 
        time: '20:00', 
        main: 'frango-grelhado', 
        subs: ['file-de-tilapia'],
        sides: [{ slug: 'salada-crua-folhas-jantar' }]
      }
    ]
  },
  {
    slug: 'emagrecimento-clinico-real',
    title: 'Emagrecimento Clínico Estrutural',
    description: 'Densidade nutricional controlada com base em alimentos reais do banco.',
    template_type: 'visual_v3',
    objective: 'emagrecimento',
    visual_style: 'premium',
    kcal_profiles: [1200, 1400, 1500],
    meals: [
      { 
        name: 'Café da Manhã Leve', 
        time: '08:00', 
        main: 'iogurte-natural', 
        subs: ['crepioca'],
        sides: [{ slug: 'maca', subs: ['morango', 'melao'] }]
      },
      { 
        name: 'Almoço Equilibrado', 
        time: '13:00', 
        main: 'frango-grelhado', 
        subs: ['file-de-tilapia'],
        sides: [
          { slug: 'arroz-integral', subs: ['batata-doce'] },
          { slug: 'feijao-carioca' },
          { slug: 'salada-verde' }
        ]
      },
      { 
        name: 'Lanche de Densidade', 
        time: '16:00', 
        main: 'frutas-vermelhas', 
        subs: ['iogurte-com-banana'],
        sides: [{ slug: 'mix-nuts' }]
      },
      { 
        name: 'Jantar de Controle', 
        time: '19:30', 
        main: 'sopa-de-legumes', 
        subs: ['peixe-com-legumes'],
        sides: [{ slug: 'salada-crua-folhas-jantar' }]
      }
    ]
  }
];
