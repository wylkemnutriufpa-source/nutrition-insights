import { supabase } from "@/integrations/supabase/client";

const IMG = "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library";
const uid = () => crypto.randomUUID();

// ─── BANCO DE ALIMENTOS INLINE (independente de meal_visual_library) ───
const F = {
  // Proteínas
  frango:  { n:'Frango Grelhado',     p:'1 filé (150g)', k:240, pr:45, c:0,  g:6,  img:`${IMG}/frango-grelhado.jpg` },
  tilapia: { n:'Filé de Tilápia',     p:'1 filé (150g)', k:200, pr:40, c:0,  g:4,  img:`${IMG}/tilapia-grelhada.jpg` },
  patinho: { n:'Patinho Moído',       p:'4 col (150g)',  k:300, pr:40, c:0,  g:12, img:`${IMG}/patinho-moido.jpg` },
  salmao:  { n:'Salmão Assado',       p:'1 posta (150g)',k:350, pr:35, c:0,  g:22, img:`${IMG}/salmao-grelhado.jpg` },
  ovo:     { n:'Ovos Mexidos',        p:'3 ovos',        k:220, pr:18, c:1,  g:15, img:`${IMG}/ovo-mexido.jpg` },
  maminha: { n:'Maminha Grelhada',    p:'1 fatia (120g)',k:270, pr:39, c:0,  g:12, img:`${IMG}/maminha-grelhada.jpg` },
  acem:    { n:'Acém Desfiado',       p:'4 col (120g)', k:254, pr:39, c:0,  g:10, img:`${IMG}/acem-desfiado.jpg` },
  // Carboidratos
  arroz:   { n:'Arroz Branco',        p:'4 col (100g)', k:130, pr:2,  c:28, g:0 },
  arrozI:  { n:'Arroz Integral',      p:'4 col (100g)', k:120, pr:3,  c:25, g:1 },
  feijao:  { n:'Feijão Carioca',      p:'1 concha',     k:70,  pr:5,  c:13, g:0 },
  lentilha:{ n:'Lentilha Cozida',     p:'1 concha',     k:80,  pr:6,  c:14, g:0 },
  batata:  { n:'Batata Doce',         p:'1 pedaço',     k:90,  pr:1,  c:20, g:0 },
  macarrao:{ n:'Macarrão Integral',   p:'1 escum.',     k:140, pr:4,  c:28, g:1 },
  // Pães e bases
  pao:     { n:'Pão Integral',        p:'2 fatias',     k:120, pr:4,  c:24, g:1,  img:`${IMG}/pao-integral.jpg` },
  tapioca: { n:'Tapioca c/ Queijo',   p:'1 unidade',    k:150, pr:4,  c:30, g:2,  img:`${IMG}/crepioca.jpg` },
  crepioca:{ n:'Crepioca',            p:'1 unidade',    k:150, pr:8,  c:18, g:5,  img:`${IMG}/crepioca.jpg` },
  cuscuz:  { n:'Cuscuz c/ Ovo',       p:'1 fatia',      k:180, pr:10, c:25, g:4,  img:`${IMG}/cuscuz-com-ovo.jpg` },
  // Vegetais
  salada:  { n:'Salada Verde',        p:'1 prato',      k:20,  pr:1,  c:4,  g:0 },
  legumes: { n:'Legumes no Vapor',    p:'1 escum.',     k:40,  pr:2,  c:8,  g:0 },
  sopa:    { n:'Sopa de Legumes',     p:'1 prato',      k:150, pr:5,  c:25, g:3,  img:`${IMG}/sopa-de-legumes.jpg` },
  // Lanches e snacks
  iogurte: { n:'Iogurte Natural',     p:'1 pote (170g)',k:100, pr:7,  c:10, g:3,  img:`${IMG}/iogurte-com-frutas.jpg` },
  whey:    { n:'Whey Protein',        p:'1 scoop',      k:120, pr:24, c:3,  g:1,  img:`${IMG}/whey-protein.jpg` },
  aveia:   { n:'Aveia em Flocos',     p:'2 col (30g)',  k:110, pr:4,  c:17, g:2 },
  banana:  { n:'Banana Prata',        p:'1 unidade',    k:70,  pr:1,  c:18, g:0 },
  maca:    { n:'Maçã',               p:'1 unidade',    k:50,  pr:0,  c:13, g:0 },
  castanha:{ n:'Mix de Castanhas',    p:'1 punhado',    k:180, pr:4,  c:6,  g:16, img:`${IMG}/mix-castanhas.jpg` },
  mamao:   { n:'Mamão com Aveia',     p:'1 fatia + 2col',k:130,pr:3,  c:25, g:2,  img:`${IMG}/mamao-com-aveia.jpg` },
  gelatina:{ n:'Gelatina Diet',       p:'1 taça',       k:20,  pr:2,  c:3,  g:0 },
  cha:     { n:'Chá com Torrada',     p:'1 xíc + 2 torr',k:80, pr:2,  c:16, g:1 },
};

type FD = typeof F[keyof typeof F];

const item = (f: FD, isPri: boolean, subs: FD[]) => ({
  id: uid(), instanceId: uid(),
  name: f.n, title: f.n,
  kcal: f.k, protein: f.pr, carbs: f.c, fat: f.g,
  quantity: 1, quantity_display: f.p,
  macros: { kcal: f.k, protein_g: f.pr, carbs_g: f.c, fat_g: f.g },
  imageUrl: (f as any).img || null,
  is_primary: isPri,
  substitutions: subs.map(s => ({
    id: uid(), instanceId: uid(),
    name: s.n, title: s.n,
    kcal: s.k, protein: s.pr, carbs: s.c, fat: s.g,
    quantity: 1, quantity_display: s.p,
    macros: { kcal: s.k, protein_g: s.pr, carbs_g: s.c, fat_g: s.g },
    imageUrl: (s as any).img || null,
  }))
});

const meal = (name: string, time: string, main: { f: FD; s: FD[] }, sides: { f: FD; s: FD[] }[]) => ({
  id: uid(), name, time,
  items: [
    item(main.f, true, main.s),
    ...sides.map(si => item(si.f, false, si.s))
  ]
});

// Gera 7 dias com rotação simples de proteínas para variedade
const build7Days = (mealDefs: Array<() => ReturnType<typeof meal>>) => {
  return [0, 1, 2, 3, 4, 5, 6].map(d => ({
    day_of_week: d,
    meals: mealDefs.map(fn => fn())
  }));
};

export const generatePremiumTemplates = () => [
  {
    slug: 'anti-inflamatorio-premium', title: 'Anti-inflamatório Premium 1800 kcal',
    description: 'Rico em ômega-3, antioxidantes e baixa carga glicêmica.',
    template_type: 'visual_v3', objective: 'clinico', visual_style: 'premium',
    kcal_profiles: [1800],
    meal_distribution: [
      { slot:'Café da Manhã', time:'08:00' }, { slot:'Lanche da Manhã', time:'10:30' },
      { slot:'Almoço', time:'12:30' }, { slot:'Lanche da Tarde', time:'16:00' },
      { slot:'Jantar', time:'19:30' }, { slot:'Ceia', time:'21:30' }
    ],
    plan_snapshot: { "1800": { days: build7Days([
      () => meal('Café da Manhã','08:00', {f:F.ovo,s:[F.crepioca]}, [{f:F.mamao,s:[F.banana]}]),
      () => meal('Lanche da Manhã','10:30', {f:F.castanha,s:[F.iogurte]}, []),
      () => meal('Almoço','12:30', {f:F.salmao,s:[F.tilapia]}, [{f:F.arrozI,s:[F.batata]},{f:F.salada,s:[F.legumes]}]),
      () => meal('Lanche da Tarde','16:00', {f:F.iogurte,s:[F.castanha]}, [{f:F.banana,s:[F.maca]}]),
      () => meal('Jantar','19:30', {f:F.sopa,s:[F.frango]}, [{f:F.salada,s:[F.legumes]}]),
      () => meal('Ceia','21:30', {f:F.cha,s:[F.gelatina]}, []),
    ]) } }
  },
  {
    slug: 'hipertrofia-premium-v2', title: 'Hipertrofia Estrutural 2500 kcal',
    description: 'Alta proteína e densidade calórica para ganho muscular.',
    template_type: 'visual_v3', objective: 'hipertrofia', visual_style: 'premium',
    kcal_profiles: [2500],
    meal_distribution: [
      { slot:'Café da Manhã', time:'07:00' }, { slot:'Lanche da Manhã', time:'10:00' },
      { slot:'Almoço', time:'13:00' }, { slot:'Pós-Treino', time:'16:30' },
      { slot:'Jantar', time:'20:00' }, { slot:'Ceia', time:'22:00' }
    ],
    plan_snapshot: { "2500": { days: build7Days([
      () => meal('Café da Manhã','07:00', {f:F.ovo,s:[F.crepioca]}, [{f:F.pao,s:[F.tapioca]},{f:F.banana,s:[F.mamao]}]),
      () => meal('Lanche da Manhã','10:00', {f:F.iogurte,s:[F.whey]}, [{f:F.castanha,s:[F.aveia]}]),
      () => meal('Almoço','13:00', {f:F.acem,s:[F.patinho]}, [{f:F.arroz,s:[F.macarrao]},{f:F.feijao,s:[F.lentilha]},{f:F.salada,s:[F.legumes]}]),
      () => meal('Pós-Treino','16:30', {f:F.whey,s:[F.iogurte]}, [{f:F.banana,s:[F.batata]}]),
      () => meal('Jantar','20:00', {f:F.frango,s:[F.maminha]}, [{f:F.arrozI,s:[F.batata]},{f:F.legumes,s:[F.salada]}]),
      () => meal('Ceia','22:00', {f:F.iogurte,s:[F.gelatina]}, [{f:F.castanha,s:[F.aveia]}]),
    ]) } }
  },
  {
    slug: 'low-carb-premium-real', title: 'Low Carb Premium 1600 kcal',
    description: 'Restrição de carboidratos com alta proteína e gorduras boas.',
    template_type: 'visual_v3', objective: 'low_carb', visual_style: 'premium',
    kcal_profiles: [1600],
    meal_distribution: [
      { slot:'Café da Manhã', time:'08:30' }, { slot:'Lanche da Manhã', time:'10:30' },
      { slot:'Almoço', time:'13:00' }, { slot:'Lanche da Tarde', time:'16:30' },
      { slot:'Jantar', time:'20:00' }, { slot:'Ceia', time:'22:00' }
    ],
    plan_snapshot: { "1600": { days: build7Days([
      () => meal('Café da Manhã','08:30', {f:F.ovo,s:[F.crepioca]}, [{f:F.castanha,s:[F.iogurte]}]),
      () => meal('Lanche da Manhã','10:30', {f:F.castanha,s:[F.iogurte]}, []),
      () => meal('Almoço','13:00', {f:F.maminha,s:[F.tilapia]}, [{f:F.legumes,s:[F.salada]}]),
      () => meal('Lanche da Tarde','16:30', {f:F.iogurte,s:[F.castanha]}, []),
      () => meal('Jantar','20:00', {f:F.frango,s:[F.patinho]}, [{f:F.salada,s:[F.legumes]}]),
      () => meal('Ceia','22:00', {f:F.gelatina,s:[F.cha]}, []),
    ]) } }
  },
  {
    slug: 'emagrecimento-clinico-real', title: 'Emagrecimento Clínico 1400 kcal',
    description: 'Densidade nutricional controlada com déficit calórico seguro.',
    template_type: 'visual_v3', objective: 'emagrecimento', visual_style: 'premium',
    kcal_profiles: [1400],
    meal_distribution: [
      { slot:'Café da Manhã', time:'08:00' }, { slot:'Lanche da Manhã', time:'10:00' },
      { slot:'Almoço', time:'13:00' }, { slot:'Lanche da Tarde', time:'16:00' },
      { slot:'Jantar', time:'19:30' }, { slot:'Ceia', time:'21:30' }
    ],
    plan_snapshot: { "1400": { days: build7Days([
      () => meal('Café da Manhã','08:00', {f:F.iogurte,s:[F.ovo]}, [{f:F.maca,s:[F.banana]}]),
      () => meal('Lanche da Manhã','10:00', {f:F.maca,s:[F.banana]}, []),
      () => meal('Almoço','13:00', {f:F.frango,s:[F.tilapia]}, [{f:F.arrozI,s:[F.batata]},{f:F.salada,s:[F.legumes]}]),
      () => meal('Lanche da Tarde','16:00', {f:F.castanha,s:[F.iogurte]}, []),
      () => meal('Jantar','19:30', {f:F.sopa,s:[F.tilapia]}, [{f:F.salada,s:[F.legumes]}]),
      () => meal('Ceia','21:30', {f:F.gelatina,s:[F.cha]}, []),
    ]) } }
  },
  {
    slug: 'diabetes-premium-real', title: 'Controle Glicêmico 1800 kcal',
    description: 'Fibras, proteínas e baixo índice glicêmico para estabilidade insulínica.',
    template_type: 'visual_v3', objective: 'clinico', visual_style: 'premium',
    kcal_profiles: [1800],
    meal_distribution: [
      { slot:'Café da Manhã', time:'07:30' }, { slot:'Lanche da Manhã', time:'10:00' },
      { slot:'Almoço', time:'12:30' }, { slot:'Lanche da Tarde', time:'16:00' },
      { slot:'Jantar', time:'19:30' }, { slot:'Ceia', time:'21:30' }
    ],
    plan_snapshot: { "1800": { days: build7Days([
      () => meal('Café da Manhã','07:30', {f:F.ovo,s:[F.crepioca]}, [{f:F.mamao,s:[F.maca]},{f:F.aveia,s:[F.castanha]}]),
      () => meal('Lanche da Manhã','10:00', {f:F.castanha,s:[F.iogurte]}, []),
      () => meal('Almoço','12:30', {f:F.frango,s:[F.tilapia]}, [{f:F.arrozI,s:[F.batata]},{f:F.feijao,s:[F.lentilha]},{f:F.salada,s:[F.legumes]}]),
      () => meal('Lanche da Tarde','16:00', {f:F.iogurte,s:[F.castanha]}, [{f:F.maca,s:[F.banana]}]),
      () => meal('Jantar','19:30', {f:F.tilapia,s:[F.sopa]}, [{f:F.legumes,s:[F.salada]}]),
      () => meal('Ceia','21:30', {f:F.cha,s:[F.gelatina]}, []),
    ]) } }
  },
  {
    slug: 'lifestyle-saudavel-premium', title: 'Brasileiro Saudável 2000 kcal',
    description: 'Dieta equilibrada com pratos tradicionais brasileiros.',
    template_type: 'visual_v3', objective: 'saude', visual_style: 'premium',
    kcal_profiles: [2000],
    meal_distribution: [
      { slot:'Café da Manhã', time:'07:30' }, { slot:'Lanche da Manhã', time:'10:00' },
      { slot:'Almoço', time:'12:30' }, { slot:'Lanche da Tarde', time:'16:00' },
      { slot:'Jantar', time:'19:30' }, { slot:'Ceia', time:'22:00' }
    ],
    plan_snapshot: { "2000": { days: build7Days([
      () => meal('Café da Manhã','07:30', {f:F.pao,s:[F.tapioca]}, [{f:F.ovo,s:[F.iogurte]},{f:F.mamao,s:[F.banana]}]),
      () => meal('Lanche da Manhã','10:00', {f:F.banana,s:[F.maca]}, []),
      () => meal('Almoço','12:30', {f:F.frango,s:[F.patinho]}, [{f:F.arroz,s:[F.macarrao]},{f:F.feijao,s:[F.lentilha]},{f:F.salada,s:[F.legumes]}]),
      () => meal('Lanche da Tarde','16:00', {f:F.iogurte,s:[F.whey]}, [{f:F.aveia,s:[F.castanha]}]),
      () => meal('Jantar','19:30', {f:F.macarrao,s:[F.arrozI]}, [{f:F.patinho,s:[F.frango]},{f:F.salada,s:[F.legumes]}]),
      () => meal('Ceia','22:00', {f:F.gelatina,s:[F.cha]}, []),
    ]) } }
  },
  {
    slug: 'gestantes-premium', title: 'Gestantes 2200 kcal',
    description: 'Nutrientes essenciais e calorias adequadas para gestação.',
    template_type: 'visual_v3', objective: 'saude', visual_style: 'premium',
    kcal_profiles: [2200],
    meal_distribution: [
      { slot:'Café da Manhã', time:'08:00' }, { slot:'Lanche da Manhã', time:'10:00' },
      { slot:'Almoço', time:'13:00' }, { slot:'Lanche da Tarde', time:'16:00' },
      { slot:'Jantar', time:'19:30' }, { slot:'Ceia', time:'21:30' }
    ],
    plan_snapshot: { "2200": { days: build7Days([
      () => meal('Café da Manhã','08:00', {f:F.pao,s:[F.tapioca]}, [{f:F.ovo,s:[F.iogurte]},{f:F.maca,s:[F.banana]}]),
      () => meal('Lanche da Manhã','10:00', {f:F.iogurte,s:[F.mamao]}, [{f:F.aveia,s:[F.castanha]}]),
      () => meal('Almoço','13:00', {f:F.patinho,s:[F.frango]}, [{f:F.arroz,s:[F.macarrao]},{f:F.feijao,s:[F.lentilha]},{f:F.salada,s:[F.legumes]}]),
      () => meal('Lanche da Tarde','16:00', {f:F.banana,s:[F.maca]}, [{f:F.castanha,s:[F.aveia]}]),
      () => meal('Jantar','19:30', {f:F.sopa,s:[F.tilapia]}, [{f:F.pao,s:[F.arrozI]}]),
      () => meal('Ceia','21:30', {f:F.cha,s:[F.gelatina]}, []),
    ]) } }
  },
  {
    slug: 'bariatrico-premium', title: 'Bariátrica Fase Sólida 1200 kcal',
    description: 'Pequenos volumes, alta proteína, para pós-bariátrica.',
    template_type: 'visual_v3', objective: 'clinico', visual_style: 'premium',
    kcal_profiles: [1200],
    meal_distribution: [
      { slot:'Café da Manhã', time:'08:00' }, { slot:'Lanche da Manhã', time:'10:00' },
      { slot:'Almoço', time:'13:00' }, { slot:'Lanche da Tarde', time:'16:00' },
      { slot:'Jantar', time:'19:30' }, { slot:'Ceia', time:'21:30' }
    ],
    plan_snapshot: { "1200": { days: build7Days([
      () => meal('Café da Manhã','08:00', {f:F.ovo,s:[F.iogurte]}, []),
      () => meal('Lanche da Manhã','10:00', {f:F.iogurte,s:[F.gelatina]}, []),
      () => meal('Almoço','13:00', {f:F.frango,s:[F.tilapia]}, [{f:F.legumes,s:[F.batata]}]),
      () => meal('Lanche da Tarde','16:00', {f:F.whey,s:[F.castanha]}, []),
      () => meal('Jantar','19:30', {f:F.patinho,s:[F.sopa]}, [{f:F.legumes,s:[F.salada]}]),
      () => meal('Ceia','21:30', {f:F.gelatina,s:[F.cha]}, []),
    ]) } }
  },
];

// ─── SEEDER PRINCIPAL ───
export const seedPremiumV3Templates = async () => {
  try {
    console.log('[Seeder] Gerando templates inline autossuficientes...');

    // Desativar templates oficiais antigos
    await supabase
      .from('v3_diet_templates')
      .update({ active: false } as any)
      .is('nutritionist_id', null);

    const templates = generatePremiumTemplates();
    for (const t of templates) {
      const { error } = await supabase.from('v3_diet_templates').upsert({
        slug: t.slug,
        title: t.title,
        description: t.description,
        template_type: t.template_type,
        objective: t.objective,
        visual_style: t.visual_style,
        kcal_profiles: t.kcal_profiles,
        plan_snapshot: t.plan_snapshot,
        meal_distribution: t.meal_distribution,
        cluster_map: {},
        sovereign_validated: true,
        active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'slug' });

      if (error) console.error('Erro template:', t.title, error);
      else console.log(`[Seeder] ✓ ${t.title}`);
    }
    return true;
  } catch (err) {
    console.error('Fatal error seeding:', err);
    return false;
  }
};
