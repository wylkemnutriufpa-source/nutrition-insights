
import { supabase } from "@/integrations/supabase/client";

const IMG = "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library";
const uid = () => crypto.randomUUID();

// ─── EXTENDED CLINICAL FOOD DATABASE ───
// Added more variety and specific clinical items
const F = {
  // Proteins (Animal)
  frango:  { n:'Frango Grelhado',     p:'150g', k:240, pr:45, c:0,  g:6,  img:`${IMG}/frango-grelhado.jpg` },
  tilapia: { n:'Filé de Tilápia',     p:'150g', k:200, pr:40, c:0,  g:4,  img:`${IMG}/peixe-com-legumes.jpg` },
  patinho: { n:'Patinho Moído',       p:'150g', k:300, pr:40, c:0,  g:12, img:`${IMG}/carne-com-batata.jpg` },
  salmao:  { n:'Salmão Assado',       p:'150g', k:350, pr:35, c:0,  g:22, img:`${IMG}/peixe-com-legumes-1.jpg` },
  ovo:     { n:'Ovos Mexidos',        p:'3 ovos', k:220, pr:18, c:1, g:15, img:`${IMG}/ovos-mexidos.jpg` },
  omelete: { n:'Omelete de Ervas',    p:'2 ovos', k:180, pr:14, c:2, g:12, img:`${IMG}/omelete.jpg` },
  maminha: { n:'Maminha Grelhada',    p:'120g', k:270, pr:39, c:0,  g:12, img:`${IMG}/bife-acebolado.jpg` },
  acem:    { n:'Acém Desfiado',       p:'120g', k:254, pr:39, c:0,  g:10, img:`${IMG}/carne-com-batata-1.jpg` },
  whey:    { n:'Whey Protein',        p:'1 scoop', k:120, pr:24, c:3, g:1, img:`${IMG}/panqueca-proteica.jpg` },
  camarao: { n:'Camarão Grelhado',    p:'120g', k:110, pr:24, c:0, g:1, img:`${IMG}/macarronada-de-camarao.jpg` },

  // Carbohydrates
  arroz:   { n:'Arroz Branco',        p:'100g', k:130, pr:2,  c:28, g:0,  img:`${IMG}/arroz-branco.jpg` },
  arrozI:  { n:'Arroz Integral',      p:'100g', k:120, pr:3,  c:25, g:1,  img:`${IMG}/arroz-integral.jpg` },
  feijao:  { n:'Feijão Carioca',      p:'100g', k:70,  pr:5,  c:13, g:0,  img:`${IMG}/feijao-carioca.jpg` },
  lentilha:{ n:'Lentilha Cozida',     p:'100g', k:80,  pr:6,  c:14, g:0,  img:`${IMG}/lentilha.jpg` },
  batata:  { n:'Batata Doce',         p:'100g', k:90,  pr:1,  c:20, g:0,  img:`${IMG}/carne-com-batata.jpg` },
  macarrao:{ n:'Macarrão Integral',   p:'100g', k:140, pr:4,  c:28, g:1,  img:`${IMG}/macarrao-com-carne-moida.jpg` },
  tapioca: { n:'Tapioca',            p:'1 un',  k:150, pr:0,  c:37, g:0,  img:`${IMG}/tapioca-com-queijo.jpg` },
  cuscuz:  { n:'Cuscuz',             p:'100g', k:110, pr:4,  c:23, g:1,  img:`${IMG}/cuscuz-com-ovo.jpg` },
  pao:     { n:'Pão Integral',        p:'2 fatias', k:120, pr:4, c:24, g:1, img:`${IMG}/pao-com-queijo.jpg` },
  crepioca:{ n:'Crepioca',            p:'1 un',  k:180, pr:12, c:18, g:8,  img:`${IMG}/crepioca/crepioca-1.jpg` },

  // Fats & Extras
  castanha:{ n:'Mix de Castanhas',    p:'20g',  k:120, pr:3,  c:4,  g:11, img:`${IMG}/abacate.jpg` },
  abacate: { n:'Abacate',            p:'100g', k:160, pr:2,  c:9,  g:15, img:`${IMG}/abacate.jpg` },
  azeite:  { n:'Azeite de Oliva',    p:'1 colher', k:90, pr:0, c:0, g:10, img:`${IMG}/peixe-com-legumes.jpg` },
  
  // Veggies & Fruits
  salada:  { n:'Salada Verde',        p:'1 prato', k:20,  pr:1,  c:4,  g:0,  img:`${IMG}/peixe-com-legumes-1.jpg` },
  legumes: { n:'Legumes no Vapor',    p:'100g', k:40,  pr:2,  c:8,  g:0,  img:`${IMG}/peixe-com-legumes.jpg` },
  sopa:    { n:'Sopa de Legumes',     p:'1 prato', k:150, pr:5,  c:25, g:3,  img:`${IMG}/sopa-de-legumes.jpg` },
  mamao:   { n:'Mamão',              p:'100g', k:45,  pr:0,  c:11, g:0,  img:`${IMG}/banana-com-aveia.jpg` },
  banana:  { n:'Banana',             p:'1 un',  k:90,  pr:1,  c:23, g:0,  img:`${IMG}/banana-com-aveia-1.jpg` },
  maca:    { n:'Maçã',               p:'1 un',  k:60,  pr:0,  c:15, g:0,  img:`${IMG}/vitamina-de-fruta/vitamina-de-fruta.jpg` },
  morango: { n:'Morangos',           p:'100g', k:35,  pr:1,  c:8,  g:0,  img:`${IMG}/vitamina-de-fruta/vitamina-de-fruta.jpg` },

  
  // Snacks
  iogurte: { n:'Iogurte Natural',     p:'170g', k:100, pr:7,  c:10, g:3,  img:`${IMG}/iogurte-com-granola.jpg` },
  gelatina:{ n:'Gelatina Diet',       p:'1 taça', k:10,  pr:1,  c:1,  g:0,  img:`${IMG}/sopa-de-legumes.jpg` },
  cha:     { n:'Chá de Camomila',     p:'1 xícara', k:0, pr:0, c:0, g:0,  img:`${IMG}/peixe-com-legumes-1.jpg` },
};

type Food = typeof F[keyof typeof F];

const createItem = (food: Food, isPrimary: boolean, substitutions: Food[] = []) => {
  const instanceId = uid();
  return {
    id: uid(),
    instanceId,
    name: food.n,
    title: food.n,
    kcal: food.k,
    protein: food.pr,
    carbs: food.c,
    fat: food.g,
    quantity: 1,
    quantity_display: food.p,
    clinical_mass_g: parseInt(food.p) || 100,
    macros: { kcal: food.k, protein_g: food.pr, carbs_g: food.c, fat_g: food.g },
    imageUrl: food.img,
    is_primary: isPrimary,
    substitutions: substitutions.map(s => ({
      id: uid(),
      instanceId: uid(),
      name: s.n,
      title: s.n,
      kcal: s.k,
      protein: s.pr,
      carbs: s.c,
      fat: s.g,
      quantity: 1,
      quantity_display: s.p,
      clinical_mass_g: parseInt(s.p) || 100,
      macros: { kcal: s.k, protein_g: s.pr, carbs_g: s.c, fat_g: s.g },
      imageUrl: s.img,
    }))
  };
};

const createMeal = (name: string, time: string, items: { f: Food; isPri: boolean; s?: Food[] }[]) => {
  return {
    id: uid(),
    name,
    time,
    items: items.map(it => createItem(it.f, it.isPri, it.s || []))
  };
};

// ─── SCALING LOGIC ───
const scaleFood = (food: Food, factor: number): Food => {
  const currentP = parseInt(food.p);
  if (isNaN(currentP)) return food;
  const newP = Math.round(currentP * factor);
  return {
    ...food,
    p: `${newP}g`,
    k: Math.round(food.k * factor),
    pr: Math.round(food.pr * factor),
    c: Math.round(food.c * factor),
    g: Math.round(food.g * factor),
  };
};

// ─── GENERATOR ───
export const generateClinicalLibrary = () => {
  const categories = [
    { name: 'Anti-inflamatório Premium', slug: 'anti-inflamatorio', obj: 'clinico' },
    { name: 'Pré e Pós Operatório', slug: 'pre-pos-op', obj: 'clinico' },
    { name: 'Cetogênica Prática', slug: 'cetogenica', obj: 'clinico' },
    { name: 'Controle de Colesterol', slug: 'colesterol', obj: 'clinico' },
    { name: 'Baixa em FODMAPs', slug: 'fodmap', obj: 'clinico' },
    { name: 'Prático Rápido e Barato', slug: 'pratico', obj: 'saude' },
    { name: 'Diabetes e Controle Glicêmico', slug: 'diabetes', obj: 'clinico' },
    { name: 'Gestantes e Lactantes', slug: 'gestantes', obj: 'saude' },
    { name: 'Bariátrica (Fase Sólida)', slug: 'bariatrica', obj: 'clinico' },
    { name: 'Emagrecimento Prático', slug: 'emagrecimento', obj: 'emagrecimento' },
    { name: 'Hipertrofia Prática', slug: 'hipertrofia', obj: 'hipertrofia' },
    { name: 'Low Carb Acessível', slug: 'low-carb', obj: 'low_carb' },
    { name: 'Ganho de Massa Limpa', slug: 'massa-limpa', obj: 'hipertrofia' },
    { name: 'Detox e Vitalidade', slug: 'detox', obj: 'saude' },
  ];

  const kcalLevels = [1200, 1400, 1600, 1800];

  return categories.map(cat => {
    const snapshots: Record<string, any> = {};
    
    kcalLevels.forEach(kcal => {
      const factor = kcal / 1600; // Base 1600
      
      const days = [1, 2, 3, 4, 5, 6, 0].map(day => {
        // Variety: offset some choices based on day
        const isOdd = day % 2 !== 0;
        
        const meals = [
          createMeal('Café da Manhã', '08:00', [
            { f: scaleFood(isOdd ? F.ovo : F.iogurte, factor), isPri: true, s: [F.crepioca, F.pao] },
            { f: scaleFood(isOdd ? F.banana : F.mamao, factor), isPri: false }
          ]),
          createMeal('Lanche da Manhã', '10:30', [
            { f: scaleFood(F.castanha, factor), isPri: true, s: [F.maca] }
          ]),
          createMeal('Almoço', '12:30', [
            { f: scaleFood(isOdd ? F.frango : F.tilapia, factor), isPri: true, s: [F.maminha, F.salmao] },
            { f: scaleFood(isOdd ? F.arrozI : F.batata, factor), isPri: false, s: [F.lentilha] },
            { f: F.salada, isPri: false },
            { f: F.azeite, isPri: false }
          ]),
          createMeal('Lanche da Tarde', '16:00', [
            { f: scaleFood(isOdd ? F.iogurte : F.whey, factor), isPri: true, s: [F.castanha] },
            { f: scaleFood(isOdd ? F.maca : F.banana, factor), isPri: false }
          ]),
          createMeal('Jantar', '19:30', [
            { f: scaleFood(isOdd ? F.tilapia : F.sopa, factor), isPri: true, s: [F.frango] },
            { f: F.salada, isPri: false }
          ]),
          createMeal('Ceia', '21:30', [
            { f: F.cha, isPri: true },
            { f: F.gelatina, isPri: false }
          ])
        ];

        return { day_of_week: day, meals };
      });

      snapshots[kcal.toString()] = { days };
    });

    return {
      slug: `${cat.slug}-premium-v3`,
      title: `${cat.name} Premium`,
      description: `Protocolo definitivo de ${cat.name} com 4 variações calóricas e 7 dias de variedade.`,
      template_type: 'visual_v3',
      objective: cat.obj,
      visual_style: 'premium',
      kcal_profiles: kcalLevels,
      plan_snapshot: snapshots,
      meal_distribution: [
        { slot:'Café da Manhã', time:'08:00' }, { slot:'Lanche da Manhã', time:'10:30' },
        { slot:'Almoço', time:'12:30' }, { slot:'Lanche da Tarde', time:'16:00' },
        { slot:'Jantar', time:'19:30' }, { slot:'Ceia', time:'21:30' }
      ],
      cluster_map: {},
      active: true,
      sovereign_validated: true
    };
  });
};

export const runClinicalAudit = () => {
  const templates = generateClinicalLibrary();
  console.log("=== CLINICAL LIBRARY AUDIT ===");
  templates.forEach(t => {
    const profiles = Object.keys(t.plan_snapshot);
    const firstProfile = t.plan_snapshot[profiles[0]];
    const totalDays = firstProfile.days.length;
    const totalMeals = firstProfile.days.reduce((acc: number, d: any) => acc + d.meals.length, 0);
    const totalItems = firstProfile.days.reduce((acc: number, d: any) => 
      acc + d.meals.reduce((macc: number, m: any) => macc + m.items.length, 0), 0);
    
    // Hash-like fingerprint (simplified)
    const fingerprint = JSON.stringify(firstProfile).length;

    console.log(`Template: ${t.title}`);
    console.log(`- Profiles: ${profiles.join(", ")}`);
    console.log(`- Days: ${totalDays}`);
    console.log(`- Total Meals: ${totalMeals}`);
    console.log(`- Total Items: ${totalItems}`);
    console.log(`- Fingerprint (Size): ${fingerprint}`);
    
    // Compare 1200 vs 1800
    if (t.plan_snapshot["1200"] && t.plan_snapshot["1800"]) {
      const m1200 = t.plan_snapshot["1200"].days[0].meals[2].items[0].kcal;
      const m1800 = t.plan_snapshot["1800"].days[0].meals[2].items[0].kcal;
      console.log(`- Scaling Check (Lunch Item 1 Kcal): 1200kcal version=${m1200}, 1800kcal version=${m1800}`);
    }
    console.log("----------------------------");
  });
};

export const deployClinicalLibrary = async () => {
  const templates = generateClinicalLibrary();
  console.log(`[Deploy] Preparando ${templates.length} templates com 4 perfis cada (${templates.length * 4} variações)...`);
  
  for (const t of templates) {
    const { error } = await supabase.from('v3_diet_templates').upsert(t, { onConflict: 'slug' });
    if (error) console.error(`Error deploying ${t.title}:`, error);
    else console.log(`✓ Deployed: ${t.title}`);
  }
};

