
import { v4 as uuidv4 } from 'uuid';

const createItem = (name, quantity, quantity_display, kcal, p, c, f, imageUrl = '') => ({
  id: uuidv4(),
  instanceId: uuidv4(),
  name,
  title: name,
  quantity,
  quantity_display,
  kcal,
  protein: p,
  carbs: c,
  fat: f,
  imageUrl,
  is_primary: true,
  clinical_mass_g: 100,
  substitutions: [],
  macros: { kcal, protein_g: p, carbs_g: c, fat_g: f }
});

const generatePracticalTemplate = () => {
  const kcalLevels = [1200, 1500, 1800, 2200, 2500];
  const snapshot = {};

  kcalLevels.forEach(kcal => {
    // Basic scaling factor relative to 1500
    const scale = kcal / 1500;
    
    const isHypertrophy = kcal >= 2200;

    const meals = [
      {
        id: uuidv4(),
        name: 'Café da Manhã',
        time: '08:00',
        items: [
          {
            ...createItem('Pão Integral com Ovo', 1, '2 fatias + 1 ovo', Math.round(250 * scale), 12, 25, 8),
            substitutions: [
              createItem('Pão Integral com Queijo', 1, '2 fatias + 1 fatia queijo', Math.round(240 * scale), 10, 25, 9),
              createItem('Tapioca com Ovo', 1, '3 colheres + 1 ovo', Math.round(260 * scale), 11, 30, 7),
              createItem('Tapioca com Queijo', 1, '3 colheres + 1 fatia queijo', Math.round(250 * scale), 9, 30, 8),
              createItem('Cuscuz com Ovo', 1, '1 pedaço médio + 1 ovo', Math.round(270 * scale), 13, 35, 7),
              createItem('Cuscuz com Queijo', 1, '1 pedaço médio + 1 fatia queijo', Math.round(260 * scale), 11, 35, 8)
            ]
          }
        ]
      },
      {
        id: uuidv4(),
        name: 'Lanche da Manhã',
        time: '10:30',
        items: [
          isHypertrophy 
            ? createItem('Vitamina de Fruta com Aveia', 1, '250ml + 2 colheres aveia', Math.round(220 * scale), 8, 35, 4)
            : createItem('Fruta da Estação', 1, '1 un média', Math.round(80 * scale), 1, 20, 0)
        ]
      },
      {
        id: uuidv4(),
        name: 'Almoço',
        time: '12:30',
        items: [
          {
            ...createItem('Frango Grelhado', 1, '100g', Math.round(160 * scale), 30, 0, 4),
            substitutions: [
              createItem('Carne Moída Patinho', 1, '100g', Math.round(180 * scale), 28, 0, 7),
              createItem('Filé de Peixe Grelhado', 1, '120g', Math.round(140 * scale), 26, 0, 3)
            ]
          },
          createItem('Arroz e Feijão', 1, '3 colheres de cada', Math.round(180 * scale), 6, 35, 1),
          createItem('Salada Livre', 1, 'À vontade', 20, 1, 4, 0)
        ]
      },
      {
        id: uuidv4(),
        name: 'Lanche da Tarde',
        time: '16:00',
        items: [
          isHypertrophy 
            ? createItem('Iogurte com Aveia', 1, '1 un + 1 colher aveia', Math.round(150 * scale), 7, 20, 4)
            : createItem('Fruta com Mix de Fibras', 1, '1 un + 1 colher chia', Math.round(100 * scale), 2, 18, 2)
        ]
      },
      {
        id: uuidv4(),
        name: 'Jantar',
        time: '19:30',
        items: [
          {
            ...createItem('Frango Grelhado', 1, '100g', Math.round(160 * scale), 30, 0, 4),
            substitutions: [
              createItem('Carne Moída Patinho', 1, '100g', Math.round(180 * scale), 28, 0, 7),
              createItem('Filé de Peixe Grelhado', 1, '120g', Math.round(140 * scale), 26, 0, 3)
            ]
          },
          createItem('Arroz Branco/Integral', 1, '3 colheres', Math.round(100 * scale), 2, 22, 0),
          createItem('Salada Livre', 1, 'À vontade', 20, 1, 4, 0)
        ]
      }
    ];

    snapshot[kcal.toString()] = {
      days: [{
        day_of_week: 1,
        meals: meals
      }]
    };
  });

  return snapshot;
};

const template = {
  title: 'Prático Café da Manhã',
  slug: 'pratico-cafe-da-manha',
  description: 'Protocolo focado em praticidade no café da manhã com pão, tapioca ou cuscuz. Lanches leves e refeições sólidas equilibradas.',
  objective: 'emagrecimento',
  kcal_range_min: 1200,
  kcal_range_max: 2500,
  kcal_profiles: [1200, 1500, 1800, 2200, 2500],
  clinical_tags: ['pratico', 'acessivel', 'versatil'],
  dietary_restrictions: ['contains_dairy', 'contains_egg'],
  active: true,
  editable: true,
  plan_snapshot: generatePracticalTemplate()
};

console.log(JSON.stringify(template, null, 2));
