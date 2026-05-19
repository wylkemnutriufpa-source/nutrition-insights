
import { seedPremiumV3Templates } from "./seedV3Templates";

export const BLUEPRINTS = [
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
        main: 'suco-verde-detox', 
        subs: ['vitamina-de-frutas'],
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
        sides: [{ slug: 'banana-com-aveia', subs: ['mamao-com-aveia'] }]
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
  }
];
