
import { supabase } from "@/integrations/supabase/client";

const IMG = "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library";
const uid = () => crypto.randomUUID();

// ─── BANCO DE ALIMENTOS INLINE ───
const F = {
  // Proteínas
  frango:  { n:'Frango Grelhado',     p:'150g', k:240, pr:45, c:0,  g:6,  img:`${IMG}/frango-grelhado.jpg` },
  tilapia: { n:'Filé de Tilápia',     p:'150g', k:200, pr:40, c:0,  g:4,  img:`${IMG}/tilapia-grelhada.jpg` },
  patinho: { n:'Patinho Moído',       p:'150g',  k:300, pr:40, c:0,  g:12, img:`${IMG}/patinho-moido.jpg` },
  salmao:  { n:'Salmão Assado',       p:'150g',k:350, pr:35, c:0,  g:22, img:`${IMG}/salmao-grelhado.jpg` },
  ovo:     { n:'Ovos Mexidos',        p:'3 ovos',        k:220, pr:18, c:1,  g:15, img:`${IMG}/ovo-mexido.jpg` },
  maminha: { n:'Maminha Grelhada',    p:'120g',k:270, pr:39, c:0,  g:12, img:`${IMG}/maminha-grelhada.jpg` },
  acem:    { n:'Acém Desfiado',       p:'120g', k:254, pr:39, c:0,  g:10, img:`${IMG}/acem-desfiado.jpg` },
  whey:    { n:'Whey Protein',        p:'1 scoop',      k:120, pr:24, c:3,  g:1,  img:`${IMG}/whey-protein.jpg` },
  
  // Carboidratos
  arroz:   { n:'Arroz Branco',        p:'100g', k:130, pr:2,  c:28, g:0 },
  arrozI:  { n:'Arroz Integral',      p:'100g', k:120, pr:3,  c:25, g:1 },
  feijao:  { n:'Feijão Carioca',      p:'100g',     k:70,  pr:5,  c:13, g:0 },
  lentilha:{ n:'Lentilha Cozida',     p:'100g',     k:80,  pr:6,  c:14, g:0 },
  batata:  { n:'Batata Doce',         p:'100g',     k:90,  pr:1,  c:20, g:0 },
  macarrao:{ n:'Macarrão Integral',   p:'100g',     k:140, pr:4,  c:28, g:1 },
  
  // Pães e bases
  pao:     { n:'Pão Integral',        p:'2 fatias',     k:120, pr:4,  c:24, g:1,  img:`${IMG}/pao-integral.jpg` },
  tapioca: { n:'Tapioca c/ Queijo',   p:'1 unidade',    k:150, pr:4,  c:30, g:2,  img:`${IMG}/crepioca.jpg` },
  crepioca:{ n:'Crepioca',            p:'1 unidade',    k:150, pr:8,  c:18, g:5,  img:`${IMG}/crepioca.jpg` },
  cuscuz:  { n:'Cuscuz c/ Ovo',       p:'1 fatia',      k:180, pr:10, c:25, g:4,  img:`${IMG}/cuscuz-com-ovo.jpg` },
  
  // Vegetais e Frutas
  salada:  { n:'Salada Verde',        p:'1 prato',      k:20,  pr:1,  c:4,  g:0 },
  legumes: { n:'Legumes no Vapor',    p:'100g',     k:40,  pr:2,  c:8,  g:0 },
  sopa:    { n:'Sopa de Legumes',     p:'1 prato',      k:150, pr:5,  c:25, g:3,  img:`${IMG}/sopa-de-legumes.jpg` },
  mamao:   { n:'Mamão com Aveia',     p:'1 fatia',      k:130,pr:3,  c:25, g:2,  img:`${IMG}/mamao-com-aveia.jpg` },
  banana:  { n:'Banana Prata',        p:'1 unidade',    k:70,  pr:1,  c:18, g:0 },
  maca:    { n:'Maçã',               p:'1 unidade',    k:50,  pr:0,  c:13, g:0 },
  
  // Lanches e snacks
  iogurte: { n:'Iogurte Natural',     p:'170g',k:100, pr:7,  c:10, g:3,  img:`${IMG}/iogurte-com-frutas.jpg` },
  castanha:{ n:'Mix de Castanhas',    p:'1 punhado',    k:180, pr:4,  c:6,  g:16, img:`${IMG}/mix-castanhas.jpg` },
  gelatina:{ n:'Gelatina Diet',       p:'1 taça',       k:20,  pr:2,  c:3,  g:0 },
  cha:     { n:'Chá com Torrada',     p:'1 xícara',k:80, pr:2,  c:16, g:1 },
  aveia:   { n:'Aveia em Flocos',     p:'30g',  k:110, pr:4,  c:17, g:2 },
};

type FD = typeof F[keyof typeof F];

const item = (f: FD, isPri: boolean, subs: FD[]) => ({
  id: uid(), instanceId: uid(),
  name: f.n, title: f.n,
  kcal: f.k, protein: f.pr, carbs: f.c, fat: f.g,
  quantity: 1, quantity_display: f.p,
  clinical_mass_g: f.p.includes('g') ? parseInt(f.p) : 100,
  macros: { kcal: f.k, protein_g: f.pr, carbs_g: f.c, fat_g: f.g },
  imageUrl: (f as any).img || null,
  is_primary: isPri,
  substitutions: subs.map(s => ({
    id: uid(), instanceId: uid(),
    name: s.n, title: s.n,
    kcal: s.k, protein: s.pr, carbs: s.c, fat: s.g,
    quantity: 1, quantity_display: s.p,
    clinical_mass_g: s.p.includes('g') ? parseInt(s.p) : 100,
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

// Gera 7 dias (0 a 6)
const build7Days = (mealDefs: Array<() => ReturnType<typeof meal>>) => {
  return [1, 2, 3, 4, 5, 6, 0].map(d => ({
    day_of_week: d,
    meals: mealDefs.map(fn => {
      const m = fn();
      return { ...m, day_of_week: d };
    })
  }));
};

export const generatePremiumTemplates = () => [
  {
    slug: 'anti-inflamatorio-premium', title: 'Anti-inflamatório Premium',
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
    slug: 'pre-pos-operatorio', title: 'Pré e Pós Operatório',
    description: 'Focado em cicatrização, imunidade e digestão facilitada.',
    template_type: 'visual_v3', objective: 'clinico', visual_style: 'premium',
    kcal_profiles: [1600],
    meal_distribution: [
      { slot:'Café da Manhã', time:'08:00' }, { slot:'Colação', time:'10:00' },
      { slot:'Almoço', time:'12:30' }, { slot:'Lanche', time:'16:00' },
      { slot:'Jantar', time:'19:00' }, { slot:'Ceia', time:'21:00' }
    ],
    plan_snapshot: { "1600": { days: build7Days([
      () => meal('Café da Manhã','08:00', {f:F.ovo,s:[F.iogurte]}, [{f:F.mamao,s:[F.banana]}]),
      () => meal('Colação','10:00', {f:F.maca,s:[F.castanha]}, []),
      () => meal('Almoço','12:30', {f:F.tilapia,s:[F.frango]}, [{f:F.arrozI,s:[F.batata]},{f:F.legumes,s:[F.salada]}]),
      () => meal('Lanche','16:00', {f:F.iogurte,s:[F.whey]}, [{f:F.aveia,s:[F.banana]}]),
      () => meal('Jantar','19:00', {f:F.sopa,s:[F.frango]}, [{f:F.legumes,s:[F.salada]}]),
      () => meal('Ceia','21:00', {f:F.gelatina,s:[F.cha]}, []),
    ]) } }
  },
  {
    slug: 'cetogenica-pratica', title: 'Cetogênica Prática',
    description: 'Alta gordura, proteína moderada e carboidratos mínimos.',
    template_type: 'visual_v3', objective: 'clinico', visual_style: 'premium',
    kcal_profiles: [1500],
    meal_distribution: [
      { slot:'Café da Manhã', time:'09:00' }, { slot:'Almoço', time:'13:00' },
      { slot:'Lanche', time:'17:00' }, { slot:'Jantar', time:'20:00' }
    ],
    plan_snapshot: { "1500": { days: build7Days([
      () => meal('Café da Manhã','09:00', {f:F.ovo,s:[F.maminha]}, [{f:F.castanha,s:[F.iogurte]}]),
      () => meal('Almoço','13:00', {f:F.maminha,s:[F.salmao]}, [{f:F.salada,s:[F.legumes]}]),
      () => meal('Lanche','17:00', {f:F.castanha,s:[F.ovo]}, []),
      () => meal('Jantar','20:00', {f:F.frango,s:[F.tilapia]}, [{f:F.legumes,s:[F.salada]}]),
    ]) } }
  },
  {
    slug: 'colesterol-alto', title: 'Controle de Colesterol',
    description: 'Baixa gordura saturada, rica em fibras e fitoesteróis.',
    template_type: 'visual_v3', objective: 'clinico', visual_style: 'premium',
    kcal_profiles: [1700],
    meal_distribution: [
      { slot:'Café da Manhã', time:'08:00' }, { slot:'Almoço', time:'12:30' },
      { slot:'Lanche', time:'16:00' }, { slot:'Jantar', time:'19:30' }
    ],
    plan_snapshot: { "1700": { days: build7Days([
      () => meal('Café da Manhã','08:00', {f:F.aveia,s:[F.pao]}, [{f:F.maca,s:[F.banana]}]),
      () => meal('Almoço','12:30', {f:F.tilapia,s:[F.frango]}, [{f:F.arrozI,s:[F.feijao]},{f:F.salada,s:[F.legumes]}]),
      () => meal('Lanche','16:00', {f:F.iogurte,s:[F.maca]}, [{f:F.aveia,s:[F.castanha]}]),
      () => meal('Jantar','19:30', {f:F.sopa,s:[F.tilapia]}, [{f:F.salada,s:[F.legumes]}]),
    ]) } }
  },
  {
    slug: 'fodmaps-saude-intestinal', title: 'Baixa em FODMAPs',
    description: 'Protocolo para SII e desconfortos abdominais.',
    template_type: 'visual_v3', objective: 'clinico', visual_style: 'premium',
    kcal_profiles: [1600],
    meal_distribution: [
      { slot:'Café da Manhã', time:'08:00' }, { slot:'Lanche', time:'11:00' },
      { slot:'Almoço', time:'13:00' }, { slot:'Lanche', time:'17:00' },
      { slot:'Jantar', time:'20:00' }
    ],
    plan_snapshot: { "1600": { days: build7Days([
      () => meal('Café da Manhã','08:00', {f:F.ovo,s:[F.tilapia]}, [{f:F.banana,s:[F.mamao]}]),
      () => meal('Lanche','11:00', {f:F.castanha,s:[F.gelatina]}, []),
      () => meal('Almoço','13:00', {f:F.frango,s:[F.maminha]}, [{f:F.arroz,s:[F.batata]},{f:F.legumes,s:[F.salada]}]),
      () => meal('Lanche','17:00', {f:F.iogurte,s:[F.banana]}, []),
      () => meal('Jantar','20:00', {f:F.tilapia,s:[F.frango]}, [{f:F.arroz,s:[F.salada]}]),
    ]) } }
  },
  {
    slug: 'pratico-rapido-barato', title: 'Cardápio Fácil e Prático',
    description: 'Ingredientes acessíveis, preparo rápido e nutritivo.',
    template_type: 'visual_v3', objective: 'saude', visual_style: 'premium',
    kcal_profiles: [2000],
    meal_distribution: [
      { slot:'Café da Manhã', time:'07:30' }, { slot:'Almoço', time:'12:30' },
      { slot:'Lanche', time:'16:30' }, { slot:'Jantar', time:'19:30' }
    ],
    plan_snapshot: { "2000": { days: build7Days([
      () => meal('Café da Manhã','07:30', {f:F.pao,s:[F.crepioca]}, [{f:F.ovo,s:[F.iogurte]}]),
      () => meal('Almoço','12:30', {f:F.patinho,s:[F.frango]}, [{f:F.arroz,s:[F.macarrao]},{f:F.feijao,s:[F.lentilha]},{f:F.salada,s:[F.legumes]}]),
      () => meal('Lanche','16:30', {f:F.banana,s:[F.maca]}, [{f:F.aveia,s:[F.castanha]}]),
      () => meal('Jantar','19:30', {f:F.frango,s:[F.patinho]}, [{f:F.arroz,s:[F.feijao]},{f:F.salada,s:[F.legumes]}]),
    ]) } }
  },
  {
    slug: 'diabetes-controle', title: 'Diabetes e Controle Glicêmico',
    description: 'Fibras e baixo IG para estabilidade da glicose.',
    template_type: 'visual_v3', objective: 'clinico', visual_style: 'premium',
    kcal_profiles: [1800],
    meal_distribution: [
      { slot:'Café da Manhã', time:'07:30' }, { slot:'Lanche', time:'10:30' },
      { slot:'Almoço', time:'12:30' }, { slot:'Lanche', time:'16:00' },
      { slot:'Jantar', time:'19:30' }, { slot:'Ceia', time:'21:30' }
    ],
    plan_snapshot: { "1800": { days: build7Days([
      () => meal('Café da Manhã','07:30', {f:F.ovo,s:[F.crepioca]}, [{f:F.mamao,s:[F.aveia]}]),
      () => meal('Lanche','10:30', {f:F.castanha,s:[F.maca]}, []),
      () => meal('Almoço','12:30', {f:F.frango,s:[F.tilapia]}, [{f:F.arrozI,s:[F.lentilha]},{f:F.salada,s:[F.legumes]}]),
      () => meal('Lanche','16:00', {f:F.iogurte,s:[F.whey]}, [{f:F.aveia,s:[F.banana]}]),
      () => meal('Jantar','19:30', {f:F.tilapia,s:[F.sopa]}, [{f:F.legumes,s:[F.salada]}]),
      () => meal('Ceia','21:30', {f:F.cha,s:[F.gelatina]}, []),
    ]) } }
  },
  {
    slug: 'gestantes-saudavel', title: 'Gestantes e Lactantes',
    description: 'Aporte calórico e de micronutrientes para mãe e bebê.',
    template_type: 'visual_v3', objective: 'saude', visual_style: 'premium',
    kcal_profiles: [2200],
    meal_distribution: [
      { slot:'Café da Manhã', time:'08:00' }, { slot:'Lanche', time:'10:30' },
      { slot:'Almoço', time:'12:30' }, { slot:'Lanche', time:'16:00' },
      { slot:'Jantar', time:'19:30' }, { slot:'Ceia', time:'21:30' }
    ],
    plan_snapshot: { "2200": { days: build7Days([
      () => meal('Café da Manhã','08:00', {f:F.pao,s:[F.crepioca]}, [{f:F.ovo,s:[F.iogurte]},{f:F.mamao,s:[F.banana]}]),
      () => meal('Lanche','10:30', {f:F.iogurte,s:[F.castanha]}, [{f:F.maca,s:[F.banana]}]),
      () => meal('Almoço','12:30', {f:F.patinho,s:[F.frango]}, [{f:F.arroz,s:[F.feijao]},{f:F.salada,s:[F.legumes]}]),
      () => meal('Lanche','16:00', {f:F.banana,s:[F.maca]}, [{f:F.aveia,s:[F.whey]}]),
      () => meal('Jantar','19:30', {f:F.sopa,s:[F.tilapia]}, [{f:F.pao,s:[F.legumes]}]),
      () => meal('Ceia','21:30', {f:F.cha,s:[F.gelatina]}, []),
    ]) } }
  },
  {
    slug: 'bariatrica-solida', title: 'Bariátrica (Fase Sólida)',
    description: 'Volume reduzido e alta densidade proteica.',
    template_type: 'visual_v3', objective: 'clinico', visual_style: 'premium',
    kcal_profiles: [1200],
    meal_distribution: [
      { slot:'Café da Manhã', time:'08:00' }, { slot:'Lanche', time:'10:30' },
      { slot:'Almoço', time:'12:30' }, { slot:'Lanche', time:'16:00' },
      { slot:'Jantar', time:'19:30' }, { slot:'Ceia', time:'21:30' }
    ],
    plan_snapshot: { "1200": { days: build7Days([
      () => meal('Café da Manhã','08:00', {f:F.ovo,s:[F.iogurte]}, []),
      () => meal('Lanche','10:30', {f:F.iogurte,s:[F.whey]}, []),
      () => meal('Almoço','12:30', {f:F.frango,s:[F.tilapia]}, [{f:F.legumes,s:[F.salada]}]),
      () => meal('Lanche','16:00', {f:F.whey,s:[F.castanha]}, []),
      () => meal('Jantar','19:30', {f:F.tilapia,s:[F.sopa]}, [{f:F.legumes,s:[F.salada]}]),
      () => meal('Ceia','21:00', {f:F.gelatina,s:[F.cha]}, []),
    ]) } }
  },
  {
    slug: 'emagrecimento-pratico', title: 'Emagrecimento Prático',
    description: 'Déficit calórico com pratos simples e saciantes.',
    template_type: 'visual_v3', objective: 'emagrecimento', visual_style: 'premium',
    kcal_profiles: [1400],
    meal_distribution: [
      { slot:'Café da Manhã', time:'08:00' }, { slot:'Almoço', time:'13:00' },
      { slot:'Lanche', time:'16:30' }, { slot:'Jantar', time:'20:00' }
    ],
    plan_snapshot: { "1400": { days: build7Days([
      () => meal('Café da Manhã','08:00', {f:F.ovo,s:[F.pao]}, [{f:F.mamao,s:[F.maca]}]),
      () => meal('Almoço','13:00', {f:F.frango,s:[F.tilapia]}, [{f:F.arrozI,s:[F.feijao]},{f:F.salada,s:[F.legumes]}]),
      () => meal('Lanche','16:30', {f:F.iogurte,s:[F.banana]}, [{f:F.aveia,s:[F.castanha]}]),
      () => meal('Jantar','20:00', {f:F.tilapia,s:[F.sopa]}, [{f:F.salada,s:[F.legumes]}]),
    ]) } }
  },
  {
    slug: 'hipertrofia-pratica', title: 'Hipertrofia Prática',
    description: 'Superávit calórico para ganho de massa muscular.',
    template_type: 'visual_v3', objective: 'hipertrofia', visual_style: 'premium',
    kcal_profiles: [2500],
    meal_distribution: [
      { slot:'Café da Manhã', time:'07:30' }, { slot:'Lanche', time:'10:30' },
      { slot:'Almoço', time:'13:00' }, { slot:'Pós-Treino', time:'17:00' },
      { slot:'Jantar', time:'20:00' }, { slot:'Ceia', time:'22:00' }
    ],
    plan_snapshot: { "2500": { days: build7Days([
      () => meal('Café da Manhã','07:30', {f:F.ovo,s:[F.crepioca]}, [{f:F.pao,s:[F.banana]},{f:F.mamao,s:[F.maca]}]),
      () => meal('Lanche','10:30', {f:F.iogurte,s:[F.whey]}, [{f:F.aveia,s:[F.castanha]}]),
      () => meal('Almoço','13:00', {f:F.patinho,s:[F.acem]}, [{f:F.arroz,s:[F.macarrao]},{f:F.feijao,s:[F.lentilha]},{f:F.salada,s:[F.legumes]}]),
      () => meal('Pós-Treino','17:00', {f:F.whey,s:[F.iogurte]}, [{f:F.banana,s:[F.batata]}]),
      () => meal('Jantar','20:00', {f:F.frango,s:[F.maminha]}, [{f:F.arroz,s:[F.feijao]},{f:F.salada,s:[F.legumes]}]),
      () => meal('Ceia','22:00', {f:F.iogurte,s:[F.gelatina]}, [{f:F.castanha,s:[F.aveia]}]),
    ]) } }
  },
  {
    slug: 'low-carb-acessivel', title: 'Low Carb Acessível',
    description: 'Redução de carboidratos com foco em comida de verdade.',
    template_type: 'visual_v3', objective: 'low_carb', visual_style: 'premium',
    kcal_profiles: [1600],
    meal_distribution: [
      { slot:'Café da Manhã', time:'08:30' }, { slot:'Almoço', time:'13:00' },
      { slot:'Lanche', time:'17:00' }, { slot:'Jantar', time:'20:00' }
    ],
    plan_snapshot: { "1600": { days: build7Days([
      () => meal('Café da Manhã','08:30', {f:F.ovo,s:[F.iogurte]}, [{f:F.castanha,s:[F.maca]}]),
      () => meal('Almoço','13:00', {f:F.maminha,s:[F.tilapia]}, [{f:F.legumes,s:[F.salada]}]),
      () => meal('Lanche','17:00', {f:F.iogurte,s:[F.castanha]}, []),
      () => meal('Jantar','20:00', {f:F.frango,s:[F.patinho]}, [{f:F.salada,s:[F.legumes]}]),
    ]) } }
  },
  {
    slug: 'ganho-massa-limpa', title: 'Ganho de Massa Limpa',
    description: 'Foco em densidade nutricional sem gordura excessiva.',
    template_type: 'visual_v3', objective: 'hipertrofia', visual_style: 'premium',
    kcal_profiles: [2200],
    meal_distribution: [
      { slot:'Café da Manhã', time:'08:00' }, { slot:'Almoço', time:'12:30' },
      { slot:'Lanche', time:'16:00' }, { slot:'Jantar', time:'19:30' }, { slot:'Ceia', time:'22:00' }
    ],
    plan_snapshot: { "2200": { days: build7Days([
      () => meal('Café da Manhã','08:00', {f:F.ovo,s:[F.aveia]}, [{f:F.banana,s:[F.maca]}]),
      () => meal('Almoço','12:30', {f:F.frango,s:[F.patinho]}, [{f:F.arrozI,s:[F.feijao]},{f:F.salada,s:[F.legumes]}]),
      () => meal('Lanche','16:00', {f:F.iogurte,s:[F.whey]}, [{f:F.castanha,s:[F.aveia]}]),
      () => meal('Jantar','19:30', {f:F.tilapia,s:[F.frango]}, [{f:F.batata,s:[F.arrozI]},{f:F.salada,s:[F.legumes]}]),
      () => meal('Ceia','22:00', {f:F.whey,s:[F.ovo]}, []),
    ]) } }
  },
  {
    slug: 'detox-vitalidade', title: 'Detox e Vitalidade',
    description: 'Protocolo para desinflamação e energia renovada.',
    template_type: 'visual_v3', objective: 'saude', visual_style: 'premium',
    kcal_profiles: [1400],
    meal_distribution: [
      { slot:'Café da Manhã', time:'08:00' }, { slot:'Colação', time:'10:30' },
      { slot:'Almoço', time:'12:30' }, { slot:'Lanche', time:'16:00' },
      { slot:'Jantar', time:'19:30' }
    ],
    plan_snapshot: { "1400": { days: build7Days([
      () => meal('Café da Manhã','08:00', {f:F.mamao,s:[F.maca]}, [{f:F.aveia,s:[F.castanha]}]),
      () => meal('Colação','10:30', {f:F.cha,s:[F.gelatina]}, []),
      () => meal('Almoço','12:30', {f:F.tilapia,s:[F.frango]}, [{f:F.salada,s:[F.legumes]}]),
      () => meal('Lanche','16:00', {f:F.iogurte,s:[F.castanha]}, []),
      () => meal('Jantar','19:30', {f:F.sopa,s:[F.tilapia]}, [{f:F.salada,s:[F.legumes]}]),
    ]) } }
  }
];

// ─── SEEDER PRINCIPAL ───
export const seedPremiumV3Templates = async () => {
  try {
    console.log('[Seeder] Gerando 14 templates Premium V3 com soberania de 7 dias...');

    // 🛡️ REGRAS DE OURO: Desativar apenas os oficiais para não matar os customizados do usuário
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

      if (error) console.error(`[Seeder] ERRO em ${t.title}:`, error);
      else console.log(`[Seeder] ✓ ${t.title} [7 DIAS OK]`);
    }
    return true;
  } catch (err) {
    console.error('[Seeder] ERRO FATAL:', err);
    return false;
  }
};
