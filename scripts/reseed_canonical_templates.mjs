import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// ─── Parse .env ───
const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[key] = val;
  }
});
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

// ─── FOOD DATABASE (mirror of clinicalDataEngine.ts) ───
const IMG = "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library";
const uid = () => crypto.randomUUID();
const F = {
  frango:  { n:'Frango Grelhado', p:'150g', k:240, pr:45, c:0, g:6, img:`${IMG}/frango-grelhado.jpg` },
  tilapia: { n:'Filé de Tilápia', p:'150g', k:200, pr:40, c:0, g:4, img:`${IMG}/peixe-com-legumes.jpg` },
  patinho: { n:'Patinho Moído', p:'150g', k:300, pr:40, c:0, g:12, img:`${IMG}/carne-com-batata.jpg` },
  salmao:  { n:'Salmão Assado', p:'150g', k:350, pr:35, c:0, g:22, img:`${IMG}/peixe-com-legumes-1.jpg` },
  ovo:     { n:'Ovos Mexidos', p:'3 ovos', k:220, pr:18, c:1, g:15, img:`${IMG}/ovos-mexidos.jpg` },
  omelete: { n:'Omelete de Ervas', p:'2 ovos', k:180, pr:14, c:2, g:12, img:`${IMG}/omelete.jpg` },
  maminha: { n:'Maminha Grelhada', p:'120g', k:270, pr:39, c:0, g:12, img:`${IMG}/bife-acebolado.jpg` },
  whey:    { n:'Whey Protein', p:'1 scoop', k:120, pr:24, c:3, g:1, img:`${IMG}/panqueca-proteica.jpg` },
  arrozI:  { n:'Arroz Integral', p:'100g', k:120, pr:3, c:25, g:1, img:`${IMG}/arroz-integral.jpg` },
  feijao:  { n:'Feijão Carioca', p:'100g', k:70, pr:5, c:13, g:0, img:`${IMG}/feijao-carioca.jpg` },
  lentilha:{ n:'Lentilha Cozida', p:'100g', k:80, pr:6, c:14, g:0, img:`${IMG}/lentilha.jpg` },
  batata:  { n:'Batata Doce', p:'100g', k:90, pr:1, c:20, g:0, img:`${IMG}/carne-com-batata.jpg` },
  tapioca: { n:'Tapioca', p:'1 un', k:150, pr:0, c:37, g:0, img:`${IMG}/tapioca-com-queijo.jpg` },
  crepioca:{ n:'Crepioca', p:'1 un', k:180, pr:12, c:18, g:8, img:`${IMG}/crepioca/crepioca-1.jpg` },
  aveia:   { n:'Aveia em Flocos', p:'30g',  k:110, pr:4,  c:17, g:2,  img:`${IMG}/banana-com-aveia.jpg` },
  castanha:{ n:'Mix de Castanhas', p:'20g',  k:120, pr:3,  c:4,  g:11, img:`${IMG}/abacate.jpg` },
  abacate: { n:'Abacate', p:'100g', k:160, pr:2,  c:9,  g:15, img:`${IMG}/abacate.jpg` },
  azeite:  { n:'Azeite de Oliva', p:'1 colher', k:90, pr:0, c:0, g:10, img:`${IMG}/peixe-com-legumes.jpg` },
  salada:  { n:'Salada Verde', p:'1 prato', k:20,  pr:1,  c:4,  g:0,  img:`${IMG}/peixe-com-legumes-1.jpg` },
  legumes: { n:'Legumes no Vapor', p:'100g', k:40,  pr:2,  c:8,  g:0,  img:`${IMG}/peixe-com-legumes.jpg` },
  sopa:    { n:'Sopa de Legumes', p:'1 prato', k:150, pr:5,  c:25, g:3,  img:`${IMG}/sopa-de-legumes.jpg` },
  mamao:   { n:'Mamão',              p:'100g', k:45,  pr:0,  c:11, g:0,  img:`${IMG}/banana-com-aveia.jpg` },
  banana:  { n:'Banana',             p:'1 un',  k:90,  pr:1,  c:23, g:0,  img:`${IMG}/banana-com-aveia-1.jpg` },
  maca:    { n:'Maçã',               p:'1 un',  k:60,  pr:0,  c:15, g:0,  img:`${IMG}/vitamina-de-fruta/vitamina-de-fruta.jpg` },
  iogurte: { n:'Iogurte Natural',     p:'170g', k:100, pr:7,  c:10, g:3,  img:`${IMG}/iogurte-com-granola.jpg` },
  gelatina:{ n:'Gelatina Diet',       p:'1 taça', k:10,  pr:1,  c:1,  g:0,  img:`${IMG}/sopa-de-legumes.jpg` },
  cha:     { n:'Chá de Camomila',     p:'1 xícara', k:0, pr:0, c:0, g:0,  img:`${IMG}/peixe-com-legumes-1.jpg` },
};

const scaleFood = (food, factor) => {
  const match = food.p.match(/^(\d+)(.*)$/);
  if (!match) return food;
  const num = parseInt(match[1]);
  const unit = match[2];
  const newNum = Math.round(num * factor);
  const safeNum = newNum < 1 ? 1 : newNum;
  return { ...food, p: `${safeNum}${unit}`, k: Math.round(food.k * factor), pr: Math.round(food.pr * factor), c: Math.round(food.c * factor), g: Math.round(food.g * factor) };
};

const createItem = (food, isPrimary, substitutions = []) => ({
  id: uid(), instanceId: uid(), name: food.n, title: food.n, kcal: food.k, protein: food.pr, carbs: food.c, fat: food.g,
  quantity: 1, quantity_display: food.p, clinical_mass_g: parseInt(food.p) || 100,
  macros: { kcal: food.k, protein_g: food.pr, carbs_g: food.c, fat_g: food.g },
  imageUrl: food.img, is_primary: isPrimary,
  substitutions: substitutions.map(s => ({
    id: uid(), instanceId: uid(), name: s.n, title: s.n, kcal: s.k, protein: s.pr, carbs: s.c, fat: s.g,
    quantity: 1, quantity_display: s.p, clinical_mass_g: parseInt(s.p) || 100,
    macros: { kcal: s.k, protein_g: s.pr, carbs_g: s.c, fat_g: s.g }, imageUrl: s.img,
  }))
});

const createMeal = (name, time, items) => ({
  id: uid(), name, time, items: items.map(it => createItem(it.f, it.isPri, it.s || []))
});

// ─── CANONICAL BLUEPRINTS ───
const blueprints = [
  { name: 'Anti-inflamatório Premium', slug: 'anti-inflamatorio-premium', obj: 'clinico', mainP: [F.salmao, F.tilapia, F.ovo], mainC: [F.arrozI, F.lentilha], snacks: [F.abacate, F.castanha] },
  { name: 'Pré e Pós Operatório', slug: 'pre-pos-operatorio', obj: 'clinico', mainP: [F.frango, F.tilapia, F.whey], mainC: [F.arrozI, F.batata], snacks: [F.iogurte, F.gelatina] },
  { name: 'Cetogênica Prática', slug: 'cetogenica-pratica', obj: 'clinico', mainP: [F.maminha, F.patinho, F.ovo], mainC: [F.salada], snacks: [F.abacate, F.castanha] },
  { name: 'Controle de Colesterol', slug: 'colesterol-alto', obj: 'clinico', mainP: [F.tilapia, F.frango, F.ovo], mainC: [F.aveia, F.lentilha, F.arrozI], snacks: [F.maca, F.iogurte] },
  { name: 'Baixa em FODMAPs', slug: 'fodmaps-saude-intestinal', obj: 'clinico', mainP: [F.frango, F.tilapia, F.ovo], mainC: [F.arrozI, F.batata], snacks: [F.banana, F.castanha] },
  { name: 'Cardápio Fácil e Prático', slug: 'pratico-rapido-barato', obj: 'saude', mainP: [F.ovo, F.frango, F.patinho], mainC: [F.arrozI, F.feijao], snacks: [F.banana, F.maca] },
  { name: 'Diabetes e Controle Glicêmico', slug: 'diabetes-controle', obj: 'clinico', mainP: [F.tilapia, F.frango, F.patinho], mainC: [F.lentilha, F.arrozI, F.feijao], snacks: [F.mamao, F.iogurte] },
  { name: 'Gestantes e Lactantes', slug: 'gestantes-saudavel', obj: 'saude', mainP: [F.patinho, F.frango, F.ovo], mainC: [F.arrozI, F.feijao, F.batata], snacks: [F.iogurte, F.mamao] },
  { name: 'Bariátrica (Fase Sólida)', slug: 'bariatrica-solida', obj: 'clinico', mainP: [F.whey, F.tilapia, F.frango], mainC: [F.legumes], snacks: [F.iogurte, F.gelatina] },
  { name: 'Emagrecimento Prático', slug: 'emagrecimento-pratico', obj: 'emagrecimento', mainP: [F.frango, F.tilapia, F.ovo], mainC: [F.arrozI, F.feijao], snacks: [F.iogurte, F.maca] },
  { name: 'Hipertrofia Prática', slug: 'hipertrofia-pratica', obj: 'hipertrofia', mainP: [F.patinho, F.frango, F.whey], mainC: [F.arrozI, F.batata, F.feijao], snacks: [F.banana, F.iogurte] },
  { name: 'Low Carb Acessível', slug: 'low-carb-acessivel', obj: 'low_carb', mainP: [F.maminha, F.ovo, F.frango], mainC: [F.legumes, F.arrozI], snacks: [F.abacate, F.castanha] },
  { name: 'Ganho de Massa Limpa', slug: 'ganho-massa-limpa', obj: 'hipertrofia', mainP: [F.patinho, F.salmao, F.frango], mainC: [F.arrozI, F.batata, F.lentilha], snacks: [F.iogurte, F.banana] },
  { name: 'Detox e Vitalidade', slug: 'detox-vitalidade', obj: 'saude', mainP: [F.tilapia, F.ovo, F.sopa], mainC: [F.legumes, F.arrozI], snacks: [F.mamao, F.cha] },
];

function generateTemplates() {
  const kcalLevels = [1200, 1400, 1600, 1800];
  return blueprints.map(bp => {
    const snapshots = {};
    kcalLevels.forEach(kcal => {
      const factor = kcal / 1600;
      const days = [1, 2, 3, 4, 5, 6, 0].map(day => {
        const p1 = bp.mainP[day % bp.mainP.length];
        const p2 = bp.mainP[(day + 1) % bp.mainP.length];
        const c1 = bp.mainC[day % bp.mainC.length];
        const s1 = bp.snacks[day % bp.snacks.length];
        return {
          day_of_week: day,
          meals: [
            createMeal('Café da Manhã', '08:00', [{ f: scaleFood(F.ovo, factor), isPri: true }, { f: scaleFood(s1, factor), isPri: false }]),
            createMeal('Lanche da Manhã', '10:30', [{ f: scaleFood(s1, factor), isPri: true }]),
            createMeal('Almoço', '12:30', [{ f: scaleFood(p1, factor), isPri: true }, { f: scaleFood(c1, factor), isPri: false }, { f: F.salada, isPri: false }]),
            createMeal('Lanche da Tarde', '16:00', [{ f: scaleFood(F.iogurte, factor), isPri: true }, { f: scaleFood(F.maca, factor), isPri: false }]),
            createMeal('Jantar', '19:30', [{ f: scaleFood(p2, factor), isPri: true }, { f: F.salada, isPri: false }]),
            createMeal('Ceia', '21:30', [{ f: F.cha, isPri: true }])
          ]
        };
      });
      snapshots[kcal.toString()] = { days };
    });
    return {
      slug: bp.slug, title: bp.name, description: `Protocolo de ${bp.name} com 7 dias variados.`,
      template_type: 'visual_v3', objective: bp.obj, visual_style: 'premium', kcal_profiles: kcalLevels,
      plan_snapshot: snapshots, cluster_map: {}, active: true, sovereign_validated: true,
      meal_distribution: [{ slot:'Café', time:'08:00' }, { slot:'Almoço', time:'12:30' }, { slot:'Jantar', time:'19:30' }]
    };
  });
}

// ─── MAIN ───
async function main() {
  console.log("═══════════════════════════════════════");
  console.log("   RESEED CANONICAL TEMPLATES");
  console.log("═══════════════════════════════════════\n");

  // 1. Delete orphan duplicates
  const orphanSlugs = [
    'anti-inflamatorio-premium-v3', 'pre-pos-op-premium-v3', 'cetogenica-premium-v3',
    'colesterol-premium-v3', 'fodmap-premium-v3', 'pratico-premium-v3',
    'diabetes-premium-v3', 'gestantes-premium-v3', 'bariatrica-premium-v3',
    'emagrecimento-premium-v3', 'hipertrofia-premium-v3', 'low-carb-premium-v3',
    'massa-limpa-premium-v3', 'detox-premium-v3',
  ];

  console.log(`[STEP 1] Deleting ${orphanSlugs.length} orphan -premium-v3 duplicates...`);
  const { error: delErr, count: delCount } = await supabase
    .from('v3_diet_templates')
    .delete({ count: 'exact' })
    .in('slug', orphanSlugs);

  if (delErr) {
    console.error("  ❌ Delete error:", delErr.message);
  } else {
    console.log(`  ✅ Deleted ${delCount} orphan rows.\n`);
  }

  // 2. Generate and upsert canonical templates
  const templates = generateTemplates();
  console.log(`[STEP 2] Upserting ${templates.length} canonical templates...`);

  let successCount = 0;
  for (const t of templates) {
    const snapshotSize = JSON.stringify(t.plan_snapshot).length;
    const { error } = await supabase.from('v3_diet_templates').upsert(t, { onConflict: 'slug' });
    if (error) {
      console.error(`  ❌ ${t.title} (${t.slug}): ${error.message}`);
    } else {
      console.log(`  ✅ ${t.title} | slug: ${t.slug} | snapshot: ${snapshotSize} bytes`);
      successCount++;
    }
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`  RESULT: ${successCount}/${templates.length} templates updated.`);
  console.log(`═══════════════════════════════════════\n`);

  // 3. Verification audit
  console.log("[STEP 3] Verification audit...");
  const { data: all, error: auditErr } = await supabase
    .from('v3_diet_templates')
    .select('slug, title, plan_snapshot')
    .order('slug');

  if (auditErr) {
    console.error("  Audit error:", auditErr.message);
    return;
  }

  console.log(`  Total templates in DB: ${all.length}`);
  const orphansRemaining = all.filter(r => r.slug.endsWith('-premium-v3'));
  console.log(`  Orphans remaining: ${orphansRemaining.length}`);

  const skeletons = all.filter(r => JSON.stringify(r.plan_snapshot).length < 20000);
  console.log(`  Skeletons (<20KB): ${skeletons.length}`);

  if (orphansRemaining.length === 0 && skeletons.length === 0) {
    console.log("\n  🎉 ALL TEMPLATES ARE HEALTHY. Zero orphans. Zero skeletons.");
  } else {
    if (orphansRemaining.length > 0) console.log("  ⚠️ Orphans still exist:", orphansRemaining.map(r => r.slug).join(', '));
    if (skeletons.length > 0) console.log("  ⚠️ Skeletons still exist:", skeletons.map(r => `${r.slug} (${JSON.stringify(r.plan_snapshot).length}b)`).join(', '));
  }
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
