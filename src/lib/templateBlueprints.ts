
/**
 * BLUEPRINTS DE TEMPLATES DETERMINÍSTICOS
 * Define a estrutura das dietas usando apenas SLUGS do banco real (meal_visual_library).
 * Todos os templates agora incluem obrigatoriamente Café, Lanche M, Almoço, Lanche T, Jantar e Ceia.
 */

export const ALL_BLUEPRINTS = [
  {
    slug: 'anti-inflamatorio-premium',
    title: 'Protocolo Anti-Inflamatório Real',
    description: 'Foco em fitoquímicos, ômega-3 e baixa carga glicêmica usando banco real.',
    template_type: 'visual_v3',
    objective: 'clinico',
    visual_style: 'premium',
    kcal_profiles: [1600, 1800, 2000],
    meals: [
      { 
        name: 'Café da Manhã Bioativo', 
        time: '08:00', 
        main: 'vitamina-de-frutas', 
        subs: ['iogurte-natural', 'kefir'],
        sides: [{ slug: 'ovos-mexidos', subs: ['omelete'] }] 
      },
      { 
        name: 'Lanche da Manhã', 
        time: '10:30', 
        main: 'castanha', 
        subs: ['mix-nuts'],
        sides: [{ slug: 'abacaxi', subs: ['melao'] }] 
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
      },
      { 
        name: 'Ceia', 
        time: '21:30', 
        main: 'cha-com-torrada', 
        subs: ['gelatina'],
        sides: []
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
    kcal_profiles: [2200, 2500, 2800, 3000],
    meals: [
      { 
        name: 'Café da Manhã Anabólico', 
        time: '07:00', 
        main: 'pao-com-ovo', 
        subs: ['cuscuz-com-ovo', 'crepioca'],
        sides: [{ slug: 'aveia-com-banana', subs: ['mamao-com-aveia'] }]
      },
      { 
        name: 'Lanche da Manhã', 
        time: '10:00', 
        main: 'iogurte-com-fruta', 
        subs: ['sanduiche-natural'],
        sides: [{ slug: 'mix-nuts' }]
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
      },
      { 
        name: 'Ceia', 
        time: '22:30', 
        main: 'caseina', 
        subs: ['iogurte-natural'],
        sides: [{ slug: 'banana-com-canela' }]
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
    kcal_profiles: [1500, 1600, 1800, 2000],
    meals: [
      { 
        name: 'Café da Manhã Keto', 
        time: '08:30', 
        main: 'ovos-cozidos', 
        subs: ['omelete'],
        sides: [{ slug: 'abacate', subs: ['mix-nuts'] }]
      },
      { 
        name: 'Lanche da Manhã', 
        time: '10:30', 
        main: 'fat-bomb', 
        subs: ['castanha'],
        sides: []
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
      },
      { 
        name: 'Ceia', 
        time: '22:00', 
        main: 'gelatina', 
        subs: ['cha-com-torrada'],
        sides: []
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
    kcal_profiles: [1200, 1400, 1500, 1600],
    meals: [
      { 
        name: 'Café da Manhã Leve', 
        time: '08:00', 
        main: 'iogurte-natural', 
        subs: ['crepioca'],
        sides: [{ slug: 'maca', subs: ['morango', 'melao'] }]
      },
      { 
        name: 'Lanche da Manhã', 
        time: '10:00', 
        main: 'fruta', 
        subs: ['agua-de-coco'],
        sides: []
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
      },
      { 
        name: 'Ceia', 
        time: '21:30', 
        main: 'gelatina', 
        subs: ['cha-com-torrada'],
        sides: []
      }
    ]
  },
  {
    slug: 'vegetariano-premium-real',
    title: 'Protocolo Vegetariano Estrutural',
    description: 'Equilíbrio de aminoácidos usando leguminosas e ovos do banco real.',
    template_type: 'visual_v3',
    objective: 'vegetariano',
    visual_style: 'premium',
    kcal_profiles: [1600, 1800, 2000],
    meals: [
      { 
        name: 'Café da Manhã Veggie', 
        time: '07:30', 
        main: 'tapioca-com-queijo', 
        subs: ['pao-com-queijo'],
        sides: [{ slug: 'mamao-com-aveia' }]
      },
      { 
        name: 'Lanche da Manhã', 
        time: '10:00', 
        main: 'iogurte-com-fruta', 
        subs: ['mix-nuts'],
        sides: []
      },
      { 
        name: 'Almoço Vegetariano', 
        time: '12:30', 
        main: 'omelete', 
        subs: ['legumes-gratinados-jantar'],
        sides: [
          { slug: 'arroz-feijao-carne', subs: ['macarrao-integral'] },
          { slug: 'feijao-carioca' },
          { slug: 'salada-completa' }
        ]
      },
      { 
        name: 'Lanche da Tarde', 
        time: '16:00', 
        main: 'banana-com-pasta-amendoim', 
        subs: ['sanduiche-natural'],
        sides: []
      },
      { 
        name: 'Jantar Vegetariano', 
        time: '19:30', 
        main: 'sopa-de-legumes', 
        subs: ['peixe-com-legumes'],
        sides: [{ slug: 'ovos-cozidos' }]
      },
      { 
        name: 'Ceia', 
        time: '22:00', 
        main: 'banana-com-canela', 
        subs: ['cha-com-torrada'],
        sides: []
      }
    ]
  },
  {
    slug: 'lifestyle-saudavel-premium',
    title: 'Lifestyle Saudável Brasileiro',
    description: 'Dieta equilibrada com pratos tradicionais e foco em adesão real.',
    template_type: 'visual_v3',
    objective: 'performance',
    visual_style: 'premium',
    kcal_profiles: [1800, 2000, 2200],
    meals: [
      { 
        name: 'Café da Manhã Tradicional', 
        time: '07:30', 
        main: 'pao-frances', 
        subs: ['pao-com-ovo'],
        sides: [{ slug: 'mamao-com-aveia', subs: ['abacaxi'] }]
      },
      { 
        name: 'Lanche da Manhã', 
        time: '10:00', 
        main: 'fruta', 
        subs: ['agua-de-coco'],
        sides: []
      },
      { 
        name: 'Almoço Brasileiro', 
        time: '12:30', 
        main: 'carne-assada-de-panela', 
        subs: ['strogonoff-frango', 'coxa-e-sobrecoxa'],
        sides: [
          { slug: 'arroz-feijao-carne', subs: ['arroz-com-frango'] },
          { slug: 'feijao-carioca' },
          { slug: 'salada-completa' }
        ]
      },
      { 
        name: 'Lanche da Tarde', 
        time: '16:00', 
        main: 'sanduiche-natural-de-frango', 
        subs: ['wrap-integral'],
        sides: [{ slug: 'suco-detox' }]
      },
      { 
        name: 'Jantar Leve', 
        time: '19:30', 
        main: 'omelete', 
        subs: ['sopa-de-legumes'],
        sides: [{ slug: 'salada-verde' }]
      },
      { 
        name: 'Ceia', 
        time: '22:00', 
        main: 'gelatina', 
        subs: ['cha-com-torrada'],
        sides: []
      }
    ]
  }
];
