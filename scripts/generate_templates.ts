import crypto from "crypto";

const IMG = "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library";
const uid = () => crypto.randomUUID();

const F = {
  frango:  { n:'Frango Grelhado',     p:'150g', k:240, pr:45, c:0,  g:6,  img:`${IMG}/frango-grelhado.jpg` },
  tilapia: { n:'Filé de Tilápia',     p:'150g', k:200, pr:40, c:0,  g:4,  img:`${IMG}/tilapia-grelhada.jpg` },
  patinho: { n:'Patinho Moído',       p:'150g',  k:300, pr:40, c:0,  g:12, img:`${IMG}/patinho-moido.jpg` },
  ovo:     { n:'Ovos Mexidos',        p:'3 ovos',        k:220, pr:18, c:1,  g:15, img:`${IMG}/ovo-mexido.jpg` },
  maminha: { n:'Maminha Grelhada',    p:'120g',k:270, pr:39, c:0,  g:12, img:`${IMG}/maminha-grelhada.jpg` },
  arroz:   { n:'Arroz Branco',        p:'100g', k:130, pr:2,  c:28, g:0,  img:`${IMG}/arroz-com-frango.png` },
  arrozI:  { n:'Arroz Integral',      p:'100g', k:120, pr:3,  c:25, g:1,  img:`${IMG}/arroz-com-frango.png` },
  feijao:  { n:'Feijão Carioca',      p:'1 concha',     k:70,  pr:5,  c:13, g:0,  img:`${IMG}/feijao-carioca.jpg` },
  batata:  { n:'Batata Doce',         p:'120g',     k:90,  pr:1,  c:20, g:0,  img:`${IMG}/batata-doce.jpg` },
  pao:     { n:'Pão Integral',        p:'2 fatias',     k:120, pr:4,  c:24, g:1,  img:`${IMG}/pao-integral.jpg` },
  iogurte: { n:'Iogurte Natural',     p:'170g',k:100, pr:7,  c:10, g:3,  img:`${IMG}/kefir.jpg` },
  banana:  { n:'Banana Prata',        p:'1 unidade',    k:70,  pr:1,  c:18, g:0,  img:`${IMG}/banana-com-aveia.jpg` },
  maca:    { n:'Maçã',               p:'1 unidade',    k:50,  pr:0,  c:13, g:0,  img:`${IMG}/maca.jpg` },
  castanha:{ n:'Mix de Castanhas',    p:'30g',    k:180, pr:4,  c:6,  g:16, img:`${IMG}/mix-castanhas.jpg` },
  salada:  { n:'Salada Verde',        p:'1 prato',      k:15,  pr:1,  c:3,  g:0,  img:`${IMG}/salada-verde.jpg` },
  legumes: { n:'Legumes no Vapor',    p:'100g',     k:40,  pr:2,  c:8,  g:0,  img:`${IMG}/legumes-vapor.jpg` },
  aveia:   { n:'Aveia em Flocos',     p:'30g',  k:110, pr:4,  c:17, g:2,  img:`${IMG}/banana-com-aveia.jpg` },
  whey:    { n:'Whey Protein',        p:'30g',      k:120, pr:24, c:3,  g:1,  img:`${IMG}/whey-protein.jpg` },
  tapioca: { n:'Tapioca',             p:'50g',    k:150, pr:0,  c:37, g:0,  img:`${IMG}/crepioca.jpg` },
  queijo:  { n:'Queijo Branco',       p:'30g',       k:70,  pr:5,  c:1,   g:5,  img:`${IMG}/pao-frances.jpg` },
};

const item = (f: any, isPri: boolean, subs: any[]) => ({
  id: uid(), instanceId: uid(),
  name: f.n, title: f.n,
  kcal: f.k, protein: f.pr, carbs: f.c, fat: f.g,
  kcal_100g: Math.round(f.k * 100 / (parseInt(f.p) || 100)),
  protein_100g: Math.round(f.pr * 100 / (parseInt(f.p) || 100)),
  carb_100g: Math.round(f.c * 100 / (parseInt(f.p) || 100)),
  fat_100g: Math.round(f.g * 100 / (parseInt(f.p) || 100)),
  quantity: 1, quantity_display: f.p,
  clinical_mass_g: parseInt(f.p) || 100,
  macros: { kcal: f.k, protein_g: f.pr, carbs_g: f.c, fat_g: f.g },
  imageUrl: f.img || null,
  is_primary: isPri,
  substitutions: subs.map(s => ({
    id: uid(), instanceId: uid(),
    name: s.n, title: s.n,
    kcal: s.k, protein: s.pr, carbs: s.c, fat: s.g,
    clinical_mass_g: parseInt(s.p) || 100,
    imageUrl: s.img || null,
  }))
});

const meal = (name: string, time: string, items: any[]) => ({
  id: uid(), name, time, items
});

const buildPlan = (meals: any[]) => {
  const days = [0, 1, 2, 3, 4, 5, 6].map(d => ({
    day_of_week: d,
    meals: meals.map(m => ({...m, id: uid(), items: m.items.map((it:any) => ({...it, id: uid(), instanceId: uid()}))}))
  }));
  return { days };
};

const templates = [
  {
    slug: 'anti-inflamatorio-premium', title: 'Anti-inflamatório Premium',
    objective: 'clinico', kcal: 1800,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.ovo, true, [F.frango]), item(F.maca, false, [F.banana])]),
      meal('Almoço', '12:30', [item(F.tilapia, true, [F.frango]), item(F.arrozI, false, [F.batata]), item(F.salada, false, [F.legumes])]),
      meal('Lanche', '16:00', [item(F.iogurte, true, [F.castanha]), item(F.castanha, false, [])]),
      meal('Jantar', '19:30', [item(F.frango, true, [F.tilapia]), item(F.legumes, false, [F.salada])])
    ]
  },
  {
    slug: 'cetogenica-premium', title: 'Cetogênica Prática',
    objective: 'clinico', kcal: 1500,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.ovo, true, []), item(F.castanha, false, [])]),
      meal('Almoço', '13:00', [item(F.patinho, true, [F.frango]), item(F.salada, false, [F.legumes])]),
      meal('Jantar', '20:00', [item(F.maminha, true, [F.tilapia]), item(F.legumes, false, [F.salada])])
    ]
  },
  {
    slug: 'pratico-rapido-barato', title: 'Cardápio Fácil e Prático',
    objective: 'saude', kcal: 1800,
    meals: [
      meal('Café da Manhã', '07:30', [item(F.pao, true, [F.tapioca]), item(F.ovo, false, [F.queijo])]),
      meal('Almoço', '12:30', [item(F.frango, true, [F.patinho]), item(F.arroz, false, [F.batata]), item(F.feijao, false, [])]),
      meal('Lanche', '16:00', [item(F.banana, true, [F.maca]), item(F.iogurte, false, [])]),
      meal('Jantar', '19:30', [item(F.ovo, true, [F.frango]), item(F.arroz, false, [F.batata]), item(F.salada, false, [])])
    ]
  },
  {
    slug: 'colesterol-alto', title: 'Colesterol e Saúde do Coração',
    objective: 'clinico', kcal: 1800,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.aveia, true, [F.pao]), item(F.iogurte, false, [F.ovo]), item(F.maca, false, [])]),
      meal('Almoço', '13:00', [item(F.tilapia, true, [F.frango]), item(F.arrozI, false, [F.batata]), item(F.feijao, false, []), item(F.salada, false, [])]),
      meal('Jantar', '20:00', [item(F.frango, true, [F.tilapia]), item(F.legumes, false, [F.salada])])
    ]
  },
  {
    slug: 'pre-pos-operatorio', title: 'Pré e Pós Operatório',
    objective: 'clinico', kcal: 2000,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.ovo, true, [F.whey]), item(F.pao, false, [F.tapioca])]),
      meal('Almoço', '13:00', [item(F.patinho, true, [F.frango]), item(F.arroz, false, [F.batata]), item(F.legumes, false, [])]),
      meal('Lanche', '16:30', [item(F.whey, true, [F.iogurte]), item(F.banana, false, [])]),
      meal('Jantar', '20:00', [item(F.frango, true, [F.tilapia]), item(F.arroz, false, [F.batata]), item(F.salada, false, [])])
    ]
  },
  {
    slug: 'fodmaps-reduzida', title: 'FODMAPs (Saúde Intestinal)',
    objective: 'clinico', kcal: 1700,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.ovo, true, []), item(F.banana, false, [F.maca])]),
      meal('Almoço', '13:00', [item(F.frango, true, [F.tilapia]), item(F.arroz, false, [F.batata]), item(F.legumes, false, [])]),
      meal('Jantar', '20:00', [item(F.tilapia, true, [F.frango]), item(F.arroz, false, [F.batata]), item(F.salada, false, [])])
    ]
  },
  {
    slug: 'emagrecimento-pratico', title: 'Emagrecimento Prático',
    objective: 'emagrecimento', kcal: 1400,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.iogurte, true, [F.ovo]), item(F.maca, false, [F.banana])]),
      meal('Almoço', '12:30', [item(F.frango, true, [F.tilapia]), item(F.arrozI, false, [F.batata]), item(F.salada, false, [F.legumes])]),
      meal('Lanche', '16:00', [item(F.castanha, true, [F.iogurte])]),
      meal('Jantar', '19:30', [item(F.tilapia, true, [F.frango]), item(F.legumes, false, [F.salada])])
    ]
  },
  {
    slug: 'hipertrofia-pratica', title: 'Hipertrofia Prática',
    objective: 'hipertrofia', kcal: 2500,
    meals: [
      meal('Café da Manhã', '07:30', [item(F.ovo, true, []), item(F.pao, false, []), item(F.banana, false, [])]),
      meal('Almoço', '12:30', [item(F.patinho, true, [F.frango]), item(F.arroz, false, [F.macarrao]), item(F.feijao, false, []), item(F.salada, false, [])]),
      meal('Pós-Treino', '16:30', [item(F.whey, true, []), item(F.banana, false, [F.batata])]),
      meal('Jantar', '20:00', [item(F.frango, true, [F.maminha]), item(F.arroz, false, [F.batata]), item(F.legumes, false, [])])
    ]
  },
  {
    slug: 'diabetes-controle', title: 'Diabetes e Controle Glicêmico',
    objective: 'clinico', kcal: 1800,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.ovo, true, []), item(F.aveia, false, []), item(F.mamao, false, [])]),
      meal('Almoço', '12:30', [item(F.frango, true, [F.tilapia]), item(F.arrozI, false, [F.batata]), item(F.feijao, false, []), item(F.salada, false, [])]),
      meal('Jantar', '19:30', [item(F.tilapia, true, [F.frango]), item(F.legumes, false, [F.salada])])
    ]
  },
  {
    slug: 'gestantes-saudavel', title: 'Gestantes e Lactantes',
    objective: 'saude', kcal: 2200,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.pao, true, []), item(F.ovo, false, []), item(F.iogurte, false, []), item(F.fruta, false, [])]),
      meal('Almoço', '13:00', [item(F.patinho, true, [F.frango]), item(F.arroz, false, []), item(F.feijao, false, []), item(F.salada, false, [])]),
      meal('Jantar', '20:00', [item(F.frango, true, [F.tilapia]), item(F.batata, false, []), item(F.legumes, false, [])])
    ]
  },
  {
    slug: 'bariatrica-solida', title: 'Bariátrica (Fase Sólida)',
    objective: 'clinico', kcal: 1200,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.ovo, true, [F.whey])]),
      meal('Lanche', '10:30', [item(F.iogurte, true, [])]),
      meal('Almoço', '13:00', [item(F.frango, true, [F.tilapia]), item(F.legumes, false, [])]),
      meal('Lanche', '16:30', [item(F.whey, true, [])]),
      meal('Jantar', '20:00', [item(F.tilapia, true, [F.patinho]), item(F.salada, false, [])])
    ]
  },
  {
    slug: 'low-carb-acessivel', title: 'Low Carb Acessível',
    objective: 'low_carb', kcal: 1600,
    meals: [
      meal('Café da Manhã', '08:30', [item(F.ovo, true, []), item(F.queijo, false, [])]),
      meal('Almoço', '13:00', [item(F.maminha, true, [F.frango]), item(F.salada, false, [F.legumes])]),
      meal('Lanche', '16:30', [item(F.castanha, true, [F.iogurte])]),
      meal('Jantar', '20:00', [item(F.frango, true, [F.tilapia]), item(F.legumes, false, [F.salada])])
    ]
  }
];

const sql = templates.map(t => {
  const snapshot = { [t.kcal.toString()]: buildPlan(t.meals) };
  const dist = t.meals.map(m => ({ slot: m.name, time: m.time }));
  return `INSERT INTO public.v3_diet_templates (slug, title, description, template_type, objective, visual_style, kcal_profiles, meal_distribution, plan_snapshot, active, sovereign_validated) VALUES ('${t.slug}', '${t.title}', '${t.title} ${t.kcal} kcal', 'visual_v3', '${t.objective}', 'premium', '[${t.kcal}]'::jsonb, '${JSON.stringify(dist)}'::jsonb, '${JSON.stringify(snapshot)}'::jsonb, true, true);`;
}).join('\n');

console.log('DELETE FROM public.v3_diet_templates WHERE nutritionist_id IS NULL;');
console.log(sql);
