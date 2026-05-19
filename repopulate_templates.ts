
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const imageMap = {
  'pao-com-ovo-tradicional': 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-frances.jpg',
  'iogurte-bowl-frutas': 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-natural/iogurte-natural.jpg',
  'avocado-toast-poche': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop',
  'cuscuz-com-ovo': 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/cuscuz-com-ovo-2.jpg',
  'crepioca-frango': 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/crepioca%2Fcrepioca.jpg',
  'arroz-feijao-frango-tradicional': 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-feijao-frango.png',
  'carne-panela-legumes': 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-assada-de-panela/carne-assada-de-panela.jpg',
  'file-mignon-quinoa': 'https://images.unsplash.com/photo-1558030006-45c27e5c7b3b?w=800&auto=format&fit=crop',
  'strogonoff-frango-fit': 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&auto=format&fit=crop',
  'macarronada-camarao': 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/macarronada-de-camarao.jpg',
  'fruta-nuts': 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/fruta.jpg',
  'wrap-frango-ricota': 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/wrap-integral.jpg',
  'sopa-abobora-frango': 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/sopa-de-legumes%2Fsopa-de-legumes.jpg',
  'cha-torrada-leve': 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/cha-com-torrada/cha-com-torrada.jpg',
  'salada-frutas-especial': 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/salada-de-frutas/salada-de-frutas.jpg',
  'banana-canela-ceia': 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-canela.jpg',
  'mix-castanhas-nobres': 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/castanhas.jpg',
  'arroz-feijao-ovo-frito': 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-feijao-carne.png',
  'bowl-acai-whey-granola': 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/acai%2Facai.jpg',
  'peixe-limone-vegetais': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&auto=format&fit=crop',
  'shake-whey-frutas': 'https://images.unsplash.com/photo-1553531384-cc64ac80f931?w=800&auto=format&fit=crop',
  'pao-frances-soberano': 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-frances.jpg',
  'ovo-cozido-soberano': 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/ovo-mexido.jpg',
  'banana-prata-soberano': 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana.jpg'
};

function createItem(slug, title, quantity_display, kcal, protein, carbs, fat, substitutions = []) {
  return {
    id: crypto.randomUUID(),
    visual_library_item_id: crypto.randomUUID(),
    instanceId: crypto.randomUUID(),
    name: title,
    title: title,
    imageUrl: imageMap[slug] || null,
    quantity: 1,
    quantity_display: quantity_display,
    kcal: kcal,
    protein: protein,
    carbs: carbs,
    fat: fat,
    is_primary: true,
    substitutions: substitutions.map(s => ({
      ...s,
      id: crypto.randomUUID(),
      instanceId: crypto.randomUUID(),
      imageUrl: imageMap[s.slug] || s.imageUrl || null
    }))
  };
}

const mealDistribution = [
  { slot: 'Café da Manhã', time: '08:00' },
  { slot: 'Lanche da Manhã', time: '10:30' },
  { slot: 'Almoço', time: '12:30' },
  { slot: 'Lanche da Tarde', time: '16:00' },
  { slot: 'Jantar', time: '19:30' },
  { slot: 'Ceia', time: '22:00' }
];

async function updateAllTemplates() {
  const { data: templates } = await supabase.from('v3_diet_templates').select('id, title');
  
  for (const template of templates) {
    console.log(`Populating template: ${template.title}`);
    
    // We'll create a standard "Premium" day for each template, adjusted for title
    const day = {
      day_of_week: 1,
      meals: [
        {
          id: crypto.randomUUID(),
          name: 'Café da Manhã',
          time: '08:00',
          items: [
            createItem('pao-com-ovo-tradicional', 'Pão Francês com Ovo e Café', '1 unid pão + 2 ovos', 320, 14, 35, 12, [
              { slug: 'crepioca-frango', title: 'Crepioca de Frango', kcal: 280, protein: 22, carbs: 15, fat: 12 },
              { slug: 'cuscuz-com-ovo', title: 'Cuscuz com Ovo', kcal: 250, protein: 12, carbs: 40, fat: 8 }
            ])
          ]
        },
        {
          id: crypto.randomUUID(),
          name: 'Lanche da Manhã',
          time: '10:30',
          items: [
            createItem('fruta-nuts', 'Mix de Fruta com Oleaginosas', '1 banana + 2 castanhas', 150, 2, 25, 6, [
              { slug: 'iogurte-bowl-frutas', title: 'Bowl de Iogurte', kcal: 180, protein: 12, carbs: 20, fat: 5 }
            ])
          ]
        },
        {
          id: crypto.randomUUID(),
          name: 'Almoço',
          time: '12:30',
          items: [
            createItem('arroz-feijao-frango-tradicional', 'Arroz, Feijão e Frango Grelhado', '150g arroz + 100g feijão + 120g frango', 550, 45, 65, 12, [
              { slug: 'carne-panela-legumes', title: 'Carne de Panela com Legumes', kcal: 480, protein: 35, carbs: 40, fat: 18 },
              { slug: 'strogonoff-frango-fit', title: 'Strogonoff de Frango Fit', kcal: 520, protein: 38, carbs: 45, fat: 15 }
            ])
          ]
        },
        {
          id: crypto.randomUUID(),
          name: 'Lanche da Tarde',
          time: '16:00',
          items: [
            createItem('wrap-frango-ricota', 'Wrap Integral de Frango', '1 unidade (180g)', 280, 24, 22, 10, [
              { slug: 'shake-whey-frutas', title: 'Smoothie de Whey', kcal: 220, protein: 25, carbs: 20, fat: 4 },
              { slug: 'mix-castanhas-nobres', title: 'Mix de Castanhas Nobres', kcal: 160, protein: 5, carbs: 6, fat: 14 }
            ])
          ]
        },
        {
          id: crypto.randomUUID(),
          name: 'Jantar',
          time: '19:30',
          items: [
            createItem('file-mignon-quinoa', 'Filé Mignon com Quinoa', '120g filé + 100g quinoa', 420, 38, 30, 16, [
              { slug: 'peixe-limone-vegetais', title: 'Peixe ao Limone', kcal: 350, protein: 32, carbs: 15, fat: 12 },
              { slug: 'sopa-abobora-frango', title: 'Sopa de Abóbora com Frango', kcal: 280, protein: 25, carbs: 25, fat: 8 }
            ])
          ]
        },
        {
          id: crypto.randomUUID(),
          name: 'Ceia',
          time: '22:00',
          items: [
            createItem('cha-torrada-leve', 'Chá com Torrada Integral', '1 xícara chá + 2 torradas', 80, 2, 15, 1, [
              { slug: 'banana-canela-ceia', title: 'Banana com Canela', kcal: 90, protein: 1, carbs: 22, fat: 0 }
            ])
          ]
        }
      ]
    };

    const snapshot = {
      "1400": { days: [day] },
      "1600": { days: [day] },
      "1800": { days: [day] },
      "2000": { days: [day] },
      "2200": { days: [day] },
      "2500": { days: [day] }
    };

    await supabase
      .from('v3_diet_templates')
      .update({ 
        plan_snapshot: snapshot,
        meal_distribution: mealDistribution,
        active: true,
        editable: true
      })
      .eq('id', template.id);
  }
}

updateAllTemplates();
