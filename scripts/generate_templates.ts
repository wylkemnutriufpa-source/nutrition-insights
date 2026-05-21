import crypto from "crypto";
import fs from 'fs';


const IMG = "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library";
const uid = () => crypto.randomUUID();




const F: any = {
  // Proteínas
  frango:  { n:'Frango Grelhado',     p:'150g', k:240, pr:45, c:0,  g:6,  img:`${IMG}/frango-grelhado.jpg` },
  tilapia: { n:'Filé de Tilápia',     p:'150g', k:200, pr:40, c:0,  g:4,  img:`${IMG}/tilapia-grelhada.jpg` },
  patinho: { n:'Patinho Moído',       p:'150g',  k:300, pr:40, c:0,  g:12, img:`${IMG}/patinho-moido.jpg` },
  ovo:     { n:'Ovos Mexidos',        p:'3 ovos',        k:220, pr:18, c:1,  g:15, img:`${IMG}/ovo-mexido.jpg` },
  maminha: { n:'Maminha Grelhada',    p:'120g',k:270, pr:39, c:0,  g:12, img:`${IMG}/maminha-grelhada.jpg` },
  salmao:  { n:'Salmão Grelhado',     p:'150g', k:280, pr:35, c:0,  g:18, img:`${IMG}/salmao-grelhado.jpg` },
  peito:   { n:'Peito de Frango',     p:'150g', k:220, pr:48, c:0,  g:2,  img:`${IMG}/peito-frango.jpg` },
  ovofrito:{ n:'Ovos Fritos',         p:'2 ovos',        k:180, pr:12, c:1,  g:14, img:`${IMG}/ovo-frito.jpg` },
  carne:   { n:'Carne Vermelha',      p:'150g', k:320, pr:38, c:0,  g:18, img:`${IMG}/carne-vermelha.jpg` },
  linguado:{ n:'Filé de Linguado',    p:'150g', k:180, pr:38, c:0,  g:2,  img:`${IMG}/linguado.jpg` },
  
  // Carboidratos
  arroz:   { n:'Arroz Branco',        p:'100g', k:130, pr:2,  c:28, g:0,  img:`${IMG}/arroz-com-frango.png` },
  arrozI:  { n:'Arroz Integral',      p:'100g', k:120, pr:3,  c:25, g:1,  img:`${IMG}/arroz-com-frango.png` },
  feijao:  { n:'Feijão Carioca',      p:'1 concha',     k:70,  pr:5,  c:13, g:0,  img:`${IMG}/feijao-carioca.jpg` },
  batata:  { n:'Batata Doce',         p:'120g',     k:90,  pr:1,  c:20, g:0,  img:`${IMG}/batata-doce.jpg` },
  macarrao:{ n:'Macarrão',            p:'100g',     k:150, pr:5,  c:30, g:1,  img:`${IMG}/arroz-com-frango.png` },
  pao:     { n:'Pão Integral',        p:'2 fatias',     k:120, pr:4,  c:24, g:1,  img:`${IMG}/pao-integral.jpg` },
  tapioca: { n:'Tapioca',             p:'50g',    k:150, pr:0,  c:37, g:0,  img:`${IMG}/crepioca.jpg` },
  batataB: { n:'Batata Branca',       p:'120g', k:100, pr:2,  c:23, g:0,  img:`${IMG}/batata-branca.jpg` },
  polenta: { n:'Polenta',             p:'100g', k:140, pr:3,  c:28, g:1,  img:`${IMG}/polenta.jpg` },
  milho:   { n:'Milho',               p:'100g', k:110, pr:3,  c:24, g:1,  img:`${IMG}/milho.jpg` },
  
  // Frutas
  banana:  { n:'Banana Prata',        p:'1 unidade',    k:70,  pr:1,  c:18, g:0,  img:`${IMG}/banana-com-aveia.jpg` },
  maca:    { n:'Maçã',               p:'1 unidade',    k:50,  pr:0,  c:13, g:0,  img:`${IMG}/maca.jpg` },
  mamao:   { n:'Mamão',              p:'100g',         k:45,  pr:0,  c:11, g:0,  img:`${IMG}/mamao-com-aveia.jpg` },
  laranja: { n:'Laranja',             p:'1 unidade',    k:60,  pr:1,  c:15, g:0,  img:`${IMG}/laranja.jpg` },
  morango: { n:'Morango',             p:'100g',         k:30,  pr:0,  c:7,  g:0,  img:`${IMG}/morango.jpg` },
  melancia:{ n:'Melancia',            p:'150g',         k:40,  pr:0,  c:10, g:0,  img:`${IMG}/melancia.jpg` },
  abacaxi: { n:'Abacaxi',             p:'100g',         k:50,  pr:0,  c:13, g:0,  img:`${IMG}/abacaxi.jpg` },
  uva:     { n:'Uva',                 p:'100g',         k:70,  pr:0,  c:18, g:0,  img:`${IMG}/uva.jpg` },
  
  // Laticínios
  iogurte: { n:'Iogurte Natural',     p:'170g',k:100, pr:7,  c:10, g:3,  img:`${IMG}/kefir.jpg` },
  queijo:  { n:'Queijo Branco',       p:'30g',       k:70,  pr:5,  c:1,   g:5,  img:`${IMG}/pao-frances.jpg` },
  leite:   { n:'Leite Integral',      p:'200ml',     k:140, pr:7,  c:10, g:8,  img:`${IMG}/leite.jpg` },
  requeijao:{ n:'Requeijão',          p:'30g',       k:100, pr:6,  c:1,  g:8,  img:`${IMG}/requeijao.jpg` },
  
  // Oleaginosas
  castanha:{ n:'Mix de Castanhas',    p:'30g',    k:180, pr:4,  c:6,  g:16, img:`${IMG}/mix-castanhas.jpg` },
  amendoim:{ n:'Amendoim',            p:'30g',    k:170, pr:7,  c:5,  g:14, img:`${IMG}/amendoim.jpg` },
  
  // Vegetais
  salada:  { n:'Salada Verde',        p:'1 prato',      k:15,  pr:1,  c:3,  g:0,  img:`${IMG}/salada-verde.jpg` },
  legumes: { n:'Legumes no Vapor',    p:'100g',     k:40,  pr:2,  c:8,  g:0,  img:`${IMG}/legumes-vapor.jpg` },
  brocolis:{ n:'Brócolis',            p:'100g',     k:35,  pr:3,  c:7,  g:0,  img:`${IMG}/brocolis.jpg` },
  couve:   { n:'Couve',               p:'100g',     k:30,  pr:3,  c:5,  g:0,  img:`${IMG}/couve.jpg` },
  
  // Cereais
  aveia:   { n:'Aveia em Flocos',     p:'30g',  k:110, pr:4,  c:17, g:2,  img:`${IMG}/banana-com-aveia.jpg` },
  granola: { n:'Granola',             p:'30g',  k:140, pr:4,  c:18, g:5,  img:`${IMG}/granola.jpg` },
  
  // Suplementos
  whey:    { n:'Whey Protein',        p:'30g',      k:120, pr:24, c:3,  g:1,  img:`${IMG}/whey-protein.jpg` },
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
  // ===== CAFÉ DA MANHÃ VARIADO =====
  {
    slug: 'cafe-classico-ovo', title: 'Café Clássico com Ovo',
    objective: 'saude', kcal: 1800,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.ovo, true, [F.ovofrito]), item(F.pao, false, [F.tapioca]), item(F.banana, false, [F.maca])]),
      meal('Almoço', '12:30', [item(F.frango, true, [F.tilapia]), item(F.arroz, false, [F.batata]), item(F.salada, false, [F.legumes])]),
      meal('Lanche', '16:00', [item(F.iogurte, true, [F.castanha]), item(F.castanha, false, [])]),
      meal('Jantar', '19:30', [item(F.tilapia, true, [F.frango]), item(F.legumes, false, [F.salada])])
    ]
  },
  {
    slug: 'cafe-aveia-frutas', title: 'Café com Aveia e Frutas',
    objective: 'saude', kcal: 1700,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.aveia, true, [F.granola]), item(F.iogurte, false, [F.leite]), item(F.morango, false, [F.banana])]),
      meal('Almoço', '12:30', [item(F.frango, true, [F.peito]), item(F.arrozI, false, [F.batata]), item(F.feijao, false, []), item(F.salada, false, [])]),
      meal('Lanche', '16:00', [item(F.banana, true, [F.maca]), item(F.castanha, false, [])]),
      meal('Jantar', '19:30', [item(F.tilapia, true, [F.linguado]), item(F.legumes, false, [F.brocolis])])
    ]
  },
  {
    slug: 'cafe-pao-queijo', title: 'Café com Pão e Queijo',
    objective: 'saude', kcal: 1800,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.pao, true, [F.tapioca]), item(F.queijo, false, [F.requeijao]), item(F.laranja, false, [F.abacaxi])]),
      meal('Almoço', '12:30', [item(F.patinho, true, [F.carne]), item(F.arroz, false, [F.macarrao]), item(F.feijao, false, []), item(F.salada, false, [])]),
      meal('Lanche', '16:00', [item(F.iogurte, true, [F.leite]), item(F.banana, false, [])]),
      meal('Jantar', '19:30', [item(F.frango, true, [F.tilapia]), item(F.batata, false, [F.batataB]), item(F.legumes, false, [])])
    ]
  },
  {
    slug: 'cafe-tapioca-carne', title: 'Café com Tapioca e Carne',
    objective: 'saude', kcal: 1900,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.tapioca, true, [F.pao]), item(F.queijo, false, [F.ovo]), item(F.maca, false, [F.banana])]),
      meal('Almoço', '12:30', [item(F.carne, true, [F.patinho]), item(F.arroz, false, [F.batata]), item(F.feijao, false, []), item(F.salada, false, [])]),
      meal('Lanche', '16:00', [item(F.castanha, true, [F.amendoim]), item(F.laranja, false, [])]),
      meal('Jantar', '19:30', [item(F.tilapia, true, [F.frango]), item(F.legumes, false, [F.couve])])
    ]
  },
  {
    slug: 'cafe-whey-banana', title: 'Café com Whey e Banana',
    objective: 'hipertrofia', kcal: 2000,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.whey, true, [F.iogurte]), item(F.banana, false, [F.maca]), item(F.pao, false, [F.tapioca])]),
      meal('Almoço', '12:30', [item(F.frango, true, [F.peito]), item(F.arroz, false, [F.macarrao]), item(F.feijao, false, []), item(F.salada, false, [])]),
      meal('Lanche', '16:00', [item(F.banana, true, [F.abacaxi]), item(F.castanha, false, [])]),
      meal('Jantar', '19:30', [item(F.carne, true, [F.maminha]), item(F.batata, false, [F.arroz]), item(F.legumes, false, [])])
    ]
  },

  // ===== ALMOÇO VARIADO =====
  {
    slug: 'almoco-frango-arroz', title: 'Almoço Frango e Arroz',
    objective: 'saude', kcal: 1800,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.ovo, true, [F.ovofrito]), item(F.pao, false, [F.tapioca]), item(F.banana, false, [])]),
      meal('Almoço', '12:30', [item(F.frango, true, [F.peito]), item(F.arroz, false, [F.arrozI]), item(F.feijao, false, []), item(F.salada, false, [F.legumes])]),
      meal('Lanche', '16:00', [item(F.iogurte, true, []), item(F.maca, false, [])]),
      meal('Jantar', '19:30', [item(F.tilapia, true, [F.linguado]), item(F.batata, false, [F.legumes])])
    ]
  },
  {
    slug: 'almoco-peixe-batata', title: 'Almoço Peixe e Batata',
    objective: 'saude', kcal: 1700,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.aveia, true, [F.granola]), item(F.iogurte, false, []), item(F.banana, false, [F.morango])]),
      meal('Almoço', '12:30', [item(F.tilapia, true, [F.salmao]), item(F.batata, false, [F.batataB]), item(F.salada, false, [F.brocolis])]),
      meal('Lanche', '16:00', [item(F.castanha, true, [F.amendoim]), item(F.laranja, false, [])]),
      meal('Jantar', '19:30', [item(F.frango, true, [F.peito]), item(F.arroz, false, [F.macarrao]), item(F.legumes, false, [])])
    ]
  },
  {
    slug: 'almoco-carne-polenta', title: 'Almoço Carne e Polenta',
    objective: 'saude', kcal: 1900,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.pao, true, [F.tapioca]), item(F.queijo, false, [F.ovo]), item(F.maca, false, [])]),
      meal('Almoço', '12:30', [item(F.carne, true, [F.patinho]), item(F.polenta, false, [F.arroz]), item(F.feijao, false, []), item(F.salada, false, [])]),
      meal('Lanche', '16:00', [item(F.iogurte, true, [F.castanha]), item(F.banana, false, [])]),
      meal('Jantar', '19:30', [item(F.tilapia, true, [F.frango]), item(F.legumes, false, [F.couve])])
    ]
  },
  {
    slug: 'almoco-macarrao-legumes', title: 'Almoço Macarrão e Legumes',
    objective: 'saude', kcal: 1800,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.ovo, true, [F.ovofrito]), item(F.pao, false, []), item(F.laranja, false, [F.abacaxi])]),
      meal('Almoço', '12:30', [item(F.frango, true, [F.tilapia]), item(F.macarrao, false, [F.arroz]), item(F.salada, false, [F.legumes])]),
      meal('Lanche', '16:00', [item(F.iogurte, true, []), item(F.maca, false, [F.banana])]),
      meal('Jantar', '19:30', [item(F.tilapia, true, [F.linguado]), item(F.batata, false, [F.legumes])])
    ]
  },

  // ===== CLÍNICOS =====
  {
    slug: 'anti-inflamatorio-premium', title: 'Anti-inflamatório Premium',
    objective: 'clinico', kcal: 1800,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.aveia, true, [F.granola]), item(F.iogurte, false, [F.leite]), item(F.morango, false, [F.banana])]),
      meal('Almoço', '12:30', [item(F.salmao, true, [F.tilapia]), item(F.arrozI, false, [F.batata]), item(F.salada, false, [F.brocolis])]),
      meal('Lanche', '16:00', [item(F.castanha, true, [F.amendoim]), item(F.laranja, false, [])]),
      meal('Jantar', '19:30', [item(F.tilapia, true, [F.linguado]), item(F.legumes, false, [F.couve])])
    ]
  },
  {
    slug: 'cetogenica-premium', title: 'Cetogênica Prática',
    objective: 'clinico', kcal: 1500,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.ovo, true, [F.ovofrito]), item(F.castanha, false, [F.amendoim]), item(F.queijo, false, [])]),
      meal('Almoço', '13:00', [item(F.carne, true, [F.maminha]), item(F.salada, false, [F.legumes])]),
      meal('Lanche', '16:00', [item(F.castanha, true, [F.amendoim])]),
      meal('Jantar', '20:00', [item(F.tilapia, true, [F.salmao]), item(F.legumes, false, [F.brocolis])])
    ]
  },
  {
    slug: 'colesterol-alto', title: 'Colesterol e Saúde do Coração',
    objective: 'clinico', kcal: 1800,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.aveia, true, [F.granola]), item(F.iogurte, false, [F.leite]), item(F.maca, false, [F.banana])]),
      meal('Almoço', '13:00', [item(F.tilapia, true, [F.linguado]), item(F.arrozI, false, [F.batata]), item(F.feijao, false, []), item(F.salada, false, [F.brocolis])]),
      meal('Lanche', '16:00', [item(F.castanha, true, [F.amendoim]), item(F.laranja, false, [])]),
      meal('Jantar', '20:00', [item(F.frango, true, [F.peito]), item(F.legumes, false, [F.couve])])
    ]
  },
  {
    slug: 'diabetes-controle', title: 'Diabetes e Controle Glicêmico',
    objective: 'clinico', kcal: 1800,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.ovo, true, [F.ovofrito]), item(F.aveia, false, [F.granola]), item(F.mamao, false, [F.morango])]),
      meal('Almoço', '12:30', [item(F.frango, true, [F.tilapia]), item(F.arrozI, false, [F.batata]), item(F.feijao, false, []), item(F.salada, false, [])]),
      meal('Lanche', '16:00', [item(F.iogurte, true, [F.castanha]), item(F.maca, false, [])]),
      meal('Jantar', '19:30', [item(F.tilapia, true, [F.linguado]), item(F.legumes, false, [F.salada])])
    ]
  },
  {
    slug: 'fodmaps-reduzida', title: 'FODMAPs (Saúde Intestinal)',
    objective: 'clinico', kcal: 1700,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.ovo, true, [F.ovofrito]), item(F.banana, false, [F.maca])]),
      meal('Almoço', '13:00', [item(F.frango, true, [F.tilapia]), item(F.arroz, false, [F.batata]), item(F.legumes, false, [F.brocolis])]),
      meal('Lanche', '16:00', [item(F.iogurte, true, [F.castanha])]),
      meal('Jantar', '20:00', [item(F.tilapia, true, [F.linguado]), item(F.arroz, false, [F.batata]), item(F.salada, false, [])])
    ]
  },
  {
    slug: 'pre-pos-operatorio', title: 'Pré e Pós Operatório',
    objective: 'clinico', kcal: 2000,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.ovo, true, [F.ovofrito]), item(F.whey, false, [F.iogurte]), item(F.pao, false, [F.tapioca])]),
      meal('Almoço', '13:00', [item(F.frango, true, [F.peito]), item(F.arroz, false, [F.batata]), item(F.legumes, false, [])]),
      meal('Lanche', '16:30', [item(F.whey, true, [F.iogurte]), item(F.banana, false, [F.maca])]),
      meal('Jantar', '20:00', [item(F.tilapia, true, [F.linguado]), item(F.arroz, false, [F.batata]), item(F.salada, false, [])])
    ]
  },
  {
    slug: 'bariatrica-solida', title: 'Bariátrica (Fase Sólida)',
    objective: 'clinico', kcal: 1200,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.ovo, true, [F.ovofrito]), item(F.whey, false, [])]),
      meal('Lanche', '10:30', [item(F.iogurte, true, [F.castanha])]),
      meal('Almoço', '13:00', [item(F.frango, true, [F.tilapia]), item(F.legumes, false, [F.brocolis])]),
      meal('Lanche', '16:30', [item(F.whey, true, [F.iogurte])]),
      meal('Jantar', '20:00', [item(F.tilapia, true, [F.linguado]), item(F.salada, false, [])])
    ]
  },
  {
    slug: 'gestantes-saudavel', title: 'Gestantes e Lactantes',
    objective: 'saude', kcal: 2200,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.pao, true, [F.tapioca]), item(F.ovo, false, [F.ovofrito]), item(F.iogurte, false, [F.leite]), item(F.banana, false, [F.maca])]),
      meal('Almoço', '13:00', [item(F.frango, true, [F.tilapia]), item(F.arroz, false, [F.batata]), item(F.feijao, false, []), item(F.salada, false, [F.legumes])]),
      meal('Lanche', '16:00', [item(F.iogurte, true, [F.castanha]), item(F.maca, false, [F.banana])]),
      meal('Jantar', '20:00', [item(F.tilapia, true, [F.frango]), item(F.batata, false, [F.arroz]), item(F.legumes, false, [])])
    ]
  },

  // ===== EMAGRECIMENTO =====
  {
    slug: 'emagrecimento-pratico', title: 'Emagrecimento Prático',
    objective: 'emagrecimento', kcal: 1400,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.iogurte, true, [F.leite]), item(F.maca, false, [F.banana]), item(F.granola, false, [])]),
      meal('Almoço', '12:30', [item(F.frango, true, [F.tilapia]), item(F.arrozI, false, [F.batata]), item(F.salada, false, [F.legumes])]),
      meal('Lanche', '16:00', [item(F.castanha, true, [F.amendoim])]),
      meal('Jantar', '19:30', [item(F.tilapia, true, [F.linguado]), item(F.legumes, false, [F.brocolis])])
    ]
  },
  {
    slug: 'emagrecimento-proteina', title: 'Emagrecimento com Proteína',
    objective: 'emagrecimento', kcal: 1500,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.ovo, true, [F.ovofrito]), item(F.pao, false, [F.tapioca]), item(F.maca, false, [])]),
      meal('Almoço', '12:30', [item(F.frango, true, [F.peito]), item(F.arrozI, false, [F.batata]), item(F.feijao, false, []), item(F.salada, false, [])]),
      meal('Lanche', '16:00', [item(F.iogurte, true, [F.castanha]), item(F.banana, false, [])]),
      meal('Jantar', '19:30', [item(F.tilapia, true, [F.linguado]), item(F.legumes, false, [F.couve])])
    ]
  },
  {
    slug: 'low-carb-acessivel', title: 'Low Carb Acessível',
    objective: 'low_carb', kcal: 1600,
    meals: [
      meal('Café da Manhã', '08:30', [item(F.ovo, true, [F.ovofrito]), item(F.queijo, false, [F.requeijao])]),
      meal('Almoço', '13:00', [item(F.carne, true, [F.maminha]), item(F.salada, false, [F.legumes])]),
      meal('Lanche', '16:30', [item(F.castanha, true, [F.amendoim]), item(F.iogurte, false, [])]),
      meal('Jantar', '20:00', [item(F.tilapia, true, [F.salmao]), item(F.legumes, false, [F.brocolis])])
    ]
  },

  // ===== HIPERTROFIA =====
  {
    slug: 'hipertrofia-pratica', title: 'Hipertrofia Prática',
    objective: 'hipertrofia', kcal: 2500,
    meals: [
      meal('Café da Manhã', '07:30', [item(F.ovo, true, [F.ovofrito]), item(F.pao, false, [F.tapioca]), item(F.banana, false, [F.maca])]),
      meal('Almoço', '12:30', [item(F.carne, true, [F.patinho]), item(F.arroz, false, [F.macarrao]), item(F.feijao, false, []), item(F.salada, false, [])]),
      meal('Pós-Treino', '16:30', [item(F.whey, true, [F.iogurte]), item(F.banana, false, [F.abacaxi])]),
      meal('Jantar', '20:00', [item(F.frango, true, [F.peito]), item(F.arroz, false, [F.batata]), item(F.legumes, false, [])])
    ]
  },
  {
    slug: 'hipertrofia-avancada', title: 'Hipertrofia Avançada',
    objective: 'hipertrofia', kcal: 2800,
    meals: [
      meal('Café da Manhã', '07:00', [item(F.ovo, true, [F.ovofrito]), item(F.pao, false, [F.tapioca]), item(F.banana, false, [F.maca]), item(F.castanha, false, [])]),
      meal('Almoço', '12:00', [item(F.carne, true, [F.patinho]), item(F.arroz, false, [F.macarrao]), item(F.feijao, false, []), item(F.salada, false, [F.legumes])]),
      meal('Lanche', '15:00', [item(F.whey, true, [F.iogurte]), item(F.banana, false, [F.abacaxi]), item(F.pao, false, [])]),
      meal('Pós-Treino', '17:30', [item(F.whey, true, []), item(F.banana, false, [F.maca])]),
      meal('Jantar', '20:00', [item(F.frango, true, [F.peito]), item(F.batata, false, [F.arroz]), item(F.legumes, false, [])])
    ]
  },

  // ===== PRÁTICO E RÁPIDO =====
  {
    slug: 'pratico-rapido-barato', title: 'Cardápio Fácil e Prático',
    objective: 'saude', kcal: 1800,
    meals: [
      meal('Café da Manhã', '07:30', [item(F.pao, true, [F.tapioca]), item(F.ovo, false, [F.ovofrito]), item(F.banana, false, [F.maca])]),
      meal('Almoço', '12:30', [item(F.frango, true, [F.tilapia]), item(F.arroz, false, [F.batata]), item(F.feijao, false, []), item(F.salada, false, [])]),
      meal('Lanche', '16:00', [item(F.banana, true, [F.maca]), item(F.iogurte, false, [F.castanha])]),
      meal('Jantar', '19:30', [item(F.ovo, true, [F.frango]), item(F.arroz, false, [F.batata]), item(F.salada, false, [])])
    ]
  },
  {
    slug: 'pratico-rapido-proteina', title: 'Prático com Proteína',
    objective: 'saude', kcal: 1900,
    meals: [
      meal('Café da Manhã', '08:00', [item(F.ovo, true, [F.ovofrito]), item(F.pao, false, [F.tapioca]), item(F.laranja, false, [F.abacaxi])]),
      meal('Almoço', '12:30', [item(F.frango, true, [F.peito]), item(F.arroz, false, [F.macarrao]), item(F.feijao, false, []), item(F.salada, false, [F.legumes])]),
      meal('Lanche', '16:00', [item(F.iogurte, true, [F.castanha]), item(F.banana, false, [])]),
      meal('Jantar', '19:30', [item(F.tilapia, true, [F.linguado]), item(F.batata, false, [F.legumes])])
    ]
  },
];

const chunks = [
  templates.slice(0, 6),
  templates.slice(6, 12),
  templates.slice(12, 18),
  templates.slice(18, 24)
];

chunks.forEach((chunk, i) => {
  const sql = chunk.map(t => {
    const snapshot = { [t.kcal.toString()]: buildPlan(t.meals) };
    const dist = t.meals.map(m => ({ slot: m.name, time: m.time }));
    return `INSERT INTO public.v3_diet_templates (slug, title, description, template_type, objective, visual_style, kcal_profiles, meal_distribution, plan_snapshot, cluster_map, active, sovereign_validated) VALUES ('${t.slug}', '${t.title}', '${t.title} ${t.kcal} kcal', 'visual_v3', '${t.objective}', 'premium', '[${t.kcal}]'::jsonb, '${JSON.stringify(dist)}'::jsonb, '${JSON.stringify(snapshot)}'::jsonb, '{}'::jsonb, true, true);`;
  }).join('\n');
  fs.writeFileSync(`migration_chunk_${i+1}.sql`, sql);
});
console.log('Split into 4 chunks.');
