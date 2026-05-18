
const BASE_IMAGE_URL = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/';

interface Food {
  name: string;
  image: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: string;
  mass: number;
  substitutions: any[];
}

const FOOD_LIBRARY: Record<string, Food> = {
  'ovos-mexidos': {
    name: 'Ovos Mexidos',
    image: 'ovos-mexidos.jpg',
    kcal: 140, protein: 12, carbs: 1, fat: 10,
    quantity: '2 unidades', mass: 100,
    substitutions: [{ name: 'Omelete', mass: 100, kcal: 150 }]
  },
  'abacate': {
    name: 'Abacate',
    image: 'abacate.jpg',
    kcal: 160, protein: 2, carbs: 9, fat: 15,
    quantity: '1/2 unidade', mass: 100,
    substitutions: []
  },
  'pao-integral': {
    name: 'Pão Integral',
    image: 'pao-integral.jpg',
    kcal: 140, protein: 6, carbs: 25, fat: 2,
    quantity: '2 fatias', mass: 50,
    substitutions: [{ name: 'Torrada Integral', mass: 40, kcal: 140 }]
  },
  'arroz-branco': {
    name: 'Arroz Branco',
    image: 'arroz-branco.jpg',
    kcal: 156, protein: 3, carbs: 34, fat: 0.3,
    quantity: '120g', mass: 120,
    substitutions: [{ name: 'Arroz Integral', mass: 120, kcal: 150 }]
  },
  'feijao-carioca': {
    name: 'Feijão Carioca',
    image: 'feijao-carioca.jpg',
    kcal: 76, protein: 5, carbs: 14, fat: 0.5,
    quantity: '100g', mass: 100,
    substitutions: []
  },
  'frango-grelhado': {
    name: 'Frango Grelhado',
    image: 'frango-grelhado.jpg',
    kcal: 192, protein: 36, carbs: 0, fat: 4,
    quantity: '120g', mass: 120,
    substitutions: [{ name: 'Tilápia', mass: 150, kcal: 190 }]
  },
  'iogurte-com-granola': {
    name: 'Iogurte com Granola',
    image: 'iogurte-com-granola.jpg',
    kcal: 180, protein: 12, carbs: 25, fat: 4,
    quantity: '1 pote', mass: 200,
    substitutions: []
  },
  'sopa-de-legumes': {
    name: 'Sopa de Legumes',
    image: 'sopa-de-legumes.jpg',
    kcal: 250, protein: 25, carbs: 15, fat: 8,
    quantity: '350ml', mass: 350,
    substitutions: []
  },
  'banana-com-aveia': {
    name: 'Banana com Aveia',
    image: 'banana-com-aveia.jpg',
    kcal: 200, protein: 5, carbs: 40, fat: 3,
    quantity: '1 unidade + 2 colheres', mass: 150,
    substitutions: []
  },
  'whey-protein': {
    name: 'Whey Protein',
    image: 'whey-protein.jpg',
    kcal: 120, protein: 24, carbs: 3, fat: 1.5,
    quantity: '1 scoop', mass: 30,
    substitutions: []
  },
  'macarrao-integral': {
    name: 'Macarrão Integral',
    image: 'macarrao-integral.jpg',
    kcal: 150, protein: 5, carbs: 30, fat: 1,
    quantity: '100g', mass: 100,
    substitutions: []
  },
  'carne-grelhada': {
    name: 'Carne Grelhada',
    image: 'carne-grelhada.jpg',
    kcal: 220, protein: 30, carbs: 0, fat: 10,
    quantity: '100g', mass: 100,
    substitutions: []
  },
  'pao-com-ovo': {
    name: 'Pão com Ovo',
    image: 'pao-com-ovo.jpg',
    kcal: 280, protein: 18, carbs: 26, fat: 12,
    quantity: '1 unidade', mass: 150,
    substitutions: []
  },
  'vitamina-de-frutas': {
    name: 'Vitamina de Frutas',
    image: 'vitamina-de-frutas.jpg',
    kcal: 150, protein: 8, carbs: 25, fat: 3,
    quantity: '300ml', mass: 300,
    substitutions: []
  },
  'canja-de-galinha': {
    name: 'Canja de Galinha',
    image: 'canja-de-galinha-com-legumes.jpg',
    kcal: 220, protein: 20, carbs: 25, fat: 5,
    quantity: '400ml', mass: 400,
    substitutions: []
  },
  'arroz-feijao-frango': {
    name: 'Arroz, Feijão e Frango',
    image: 'arroz-feijao-frango.png',
    kcal: 450, protein: 45, carbs: 50, fat: 6,
    quantity: '1 prato', mass: 450,
    substitutions: []
  }
};

const TEMPLATE_SLUGS = [
  'mediterranea-pro',
  'performance-crossfit',
  'lifestyle-saudavel',
  'tradicional-brasileiro-fit',
  'hipertrofia-masculina',
  'sop-menopausa',
  'soberano-tradicional-brasileiro',
  'soberano-emagrecimento-feminino',
  'emagrecimento-feminino',
  'corrida-endurance',
  'diabetes-control',
  'hipertensao-care',
  'low-carb-elite',
  'fit-economico'
];

function createMealItem(foodKey: string, day: number, slot: string): any {
  const food = FOOD_LIBRARY[foodKey];
  if (!food) return null;
  return {
    id: `i-${foodKey}-${day}`,
    instanceId: `inst-${foodKey}-${day}-${slot}`,
    name: food.name,
    title: food.name,
    kcal: food.kcal,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    quantity: 1,
    display_quantity: food.quantity,
    clinical_mass_g: food.mass,
    imageUrl: BASE_IMAGE_URL + food.image,
    substitutions: food.substitutions.map(s => ({
      ...s,
      imageUrl: BASE_IMAGE_URL + (FOOD_LIBRARY[s.name.toLowerCase().replace(/ /g, '-')]?.image || food.image)
    }))
  };
}

function generateSnapshot(slug: string, kcal: number) {
  const meals: any[] = [];
  const days = [1, 2, 3, 4, 5, 6, 0];
  
  // Basic logic for different templates
  let planItems = {
    'Café da Manhã': ['pao-integral', 'ovos-mexidos'],
    'Almoço': ['arroz-branco', 'feijao-carioca', 'frango-grelhado'],
    'Lanche da Tarde': ['iogurte-com-granola'],
    'Jantar': ['sopa-de-legumes']
  };

  if (slug.includes('performance') || slug.includes('hipertrofia')) {
    planItems = {
      'Café da Manhã': ['banana-com-aveia', 'ovos-mexidos'],
      'Almoço': ['arroz-feijao-frango'],
      'Lanche da Tarde': ['whey-protein'],
      'Jantar': ['macarrao-integral', 'carne-grelhada']
    };
  } else if (slug.includes('low-carb')) {
    planItems = {
      'Café da Manhã': ['ovos-mexidos', 'abacate'],
      'Almoço': ['frango-grelhado', 'abacate'],
      'Lanche da Tarde': ['whey-protein'],
      'Jantar': ['carne-grelhada', 'sopa-de-legumes']
    };
  }

  days.forEach(day => {
    Object.entries(planItems).forEach(([slot, foods]) => {
      meals.push({
        id: `m-${slot}-${day}`,
        name: slot,
        time: slot === 'Café da Manhã' ? '08:00' : slot === 'Almoço' ? '13:00' : slot === 'Lanche da Tarde' ? '16:00' : '20:00',
        day_of_week: day,
        items: foods.map(f => createMealItem(f, day, slot)).filter(Boolean)
      });
    });
  });

  return { meals };
}

let sql = '';
TEMPLATE_SLUGS.forEach(slug => {
  const snapshot: any = {};
  const kcalProfiles = [1500, 2000, 2500];
  kcalProfiles.forEach(kcal => {
    snapshot[kcal.toString()] = generateSnapshot(slug, kcal);
  });
  
  const json = JSON.stringify(snapshot).replace(/'/g, "''");
  sql += `UPDATE v3_diet_templates SET plan_snapshot = '${json}', active = true WHERE slug = '${slug}';\n`;
});

console.log(sql);
