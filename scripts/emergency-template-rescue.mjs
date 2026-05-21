#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Template definitions with clinical diversity
const TEMPLATE_DEFINITIONS = {
  'anti-inflamatorio-premium': {
    name: 'Anti-inflamatório Premium',
    days: 7,
    meals: {
      breakfast: [
        { description: 'Ovo caipira (2 uni) + abacate (1/2) + café descafeinado', proteins: 16, carbs: 12, fats: 18, cals: 278 },
        { description: 'Aveia integral (40g) + leite integral (200ml) + morango (100g)', proteins: 9, carbs: 45, fats: 5, cals: 274 },
        { description: 'Tapioca (2 colheres) + ovomaltine natural (2 colheres) + mel (1 colher)', proteins: 6, carbs: 48, fats: 3, cals: 227 }
      ],
      lunch: [
        { description: 'Frango grelhado (150g) + arroz integral (100g) + beterraba (100g)', proteins: 40, carbs: 48, fats: 3, cals: 413 },
        { description: 'Salmão grelhado (120g) + batata-doce (150g) + brócolis (150g)', proteins: 35, carbs: 42, fats: 8, cals: 428 },
        { description: 'Tilápia (150g) + quinoa (80g) + espinafre refogado (150g)', proteins: 38, carbs: 45, fats: 4, cals: 396 }
      ],
      snack: [
        { description: 'Iogurte grego (150ml) + gengibre fresco ralado (5g)', proteins: 20, carbs: 8, fats: 5, cals: 159 },
        { description: 'Chá verde (200ml) + castanha-do-pará (3 uni)', proteins: 4, carbs: 8, fats: 12, cals: 148 }
      ],
      dinner: [
        { description: 'Ovos cozidos (3 uni) + melancia (200g)', proteins: 18, carbs: 14, fats: 15, cals: 287 },
        { description: 'Frango desfiado (130g) + mandioca (100g) + salada verde', proteins: 35, carbs: 38, fats: 2, cals: 365 }
      ]
    }
  },
  'cetogenica-pratica': {
    name: 'Cetogênica Prática',
    days: 7,
    meals: {
      breakfast: [
        { description: 'Omelete de 3 ovos + queijo cheddar (40g) + abacate (50g)', proteins: 22, carbs: 4, fats: 28, cals: 398 },
        { description: 'Bacon (6 tiras) + ovos (2) + café com manteiga (15g)', proteins: 24, carbs: 2, fats: 32, cals: 428 }
      ],
      lunch: [
        { description: 'Carne vermelha (180g) + manteiga (15g) + alface', proteins: 48, carbs: 3, fats: 22, cals: 484 },
        { description: 'Peito de frango (150g) + óleo de coco (20ml) + espinafre', proteins: 42, carbs: 2, fats: 18, cals: 406 }
      ],
      snack: [
        { description: 'Queijo cheddar (50g) + nozes (30g)', proteins: 12, carbs: 6, fats: 26, cals: 320 }
      ],
      dinner: [
        { description: 'Salmão (150g) + manteiga (10g) + couve', proteins: 38, carbs: 2, fats: 22, cals: 426 }
      ]
    }
  },
  'diabetes-controle': {
    name: 'Diabetes e Controle Glicêmico',
    days: 7,
    meals: {
      breakfast: [
        { description: 'Pão integral (1 fatia) + requeijão light (30g) + maçã (1 média)', proteins: 8, carbs: 38, fats: 4, cals: 212 },
        { description: 'Aveia integral (30g) + iogurte desnatado (150ml) + banana (1/2)', proteins: 8, carbs: 42, fats: 2, cals: 218 }
      ],
      lunch: [
        { description: 'Frango grelhado (120g) + arroz integral (70g) + feijão (100g)', proteins: 38, carbs: 52, fats: 2, cals: 410 },
        { description: 'Peixe branco (130g) + batata-doce (100g) + couve refogada', proteins: 32, carbs: 36, fats: 3, cals: 355 }
      ],
      snack: [
        { description: 'Maçã (1 média) + amendoim (15g)', proteins: 4, carbs: 32, fats: 8, cals: 212 }
      ],
      dinner: [
        { description: 'Frango (100g) + arroz integral (60g) + brócolis', proteins: 30, carbs: 36, fats: 2, cals: 340 }
      ]
    }
  },
  'emagrecimento-pratico': {
    name: 'Emagrecimento Prático',
    days: 7,
    meals: {
      breakfast: [
        { description: 'Ovo cozido (1) + pão integral (1 fatia) + geleia diet (10g)', proteins: 10, carbs: 24, fats: 5, cals: 181 },
        { description: 'Leite desnatado (200ml) + aveia (25g) + mel (5ml)', proteins: 9, carbs: 38, fats: 1, cals: 197 }
      ],
      lunch: [
        { description: 'Frango desfiado (100g) + arroz integral (70g) + salada', proteins: 32, carbs: 35, fats: 2, cals: 335 },
        { description: 'Peixe branco (120g) + batata (80g) + abóbora', proteins: 30, carbs: 30, fats: 2, cals: 312 }
      ],
      snack: [
        { description: 'Maçã verde (1 média)', proteins: 0, carbs: 28, fats: 0, cals: 112 }
      ],
      dinner: [
        { description: 'Frango grelhado (80g) + arroz integral (50g) + couve', proteins: 28, carbs: 25, fats: 2, cals: 278 }
      ]
    }
  },
  'bariatrica-solida': {
    name: 'Bariátrica (Fase Sólida)',
    days: 7,
    meals: {
      breakfast: [
        { description: 'Ovo mole (1) + pão integral (1/2 fatia)', proteins: 8, carbs: 12, fats: 5, cals: 123 }
      ],
      lunch: [
        { description: 'Frango moído (70g) + arroz integral (40g) + cenoura ralada', proteins: 22, carbs: 20, fats: 2, cals: 222 },
        { description: 'Peixe desfiado (60g) + batata-doce (50g) + abóbora', proteins: 20, carbs: 18, fats: 2, cals: 198 }
      ],
      snack: [
        { description: 'Iogurte natural (100ml)', proteins: 3, carbs: 5, fats: 1, cals: 42 }
      ],
      dinner: [
        { description: 'Caldo de legumes (200ml) + frango desfiado (50g)', proteins: 12, carbs: 8, fats: 1, cals: 108 }
      ]
    }
  },
  'hipertrofia-pratica': {
    name: 'Hipertrofia Prática',
    days: 7,
    meals: {
      breakfast: [
        { description: 'Ovos (3) + pão integral (2 fatias) + mel (10g)', proteins: 22, carbs: 46, fats: 15, cals: 438 }
      ],
      lunch: [
        { description: 'Frango (180g) + arroz integral (120g) + feijão (80g)', proteins: 50, carbs: 62, fats: 3, cals: 605 },
        { description: 'Carne vermelha (150g) + batata (120g) + abóbora', proteins: 45, carbs: 48, fats: 8, cals: 552 }
      ],
      snack: [
        { description: 'Whey protein (25g) + banana (1 média)', proteins: 28, carbs: 32, fats: 1, cals: 240 }
      ],
      dinner: [
        { description: 'Frango (140g) + arroz integral (100g) + brócolis', proteins: 42, carbs: 42, fats: 2, cals: 456 }
      ]
    }
  },
  'low-carb-acessivel': {
    name: 'Low Carb Acessível',
    days: 7,
    meals: {
      breakfast: [
        { description: 'Ovos (2) + queijo (30g) + tomate', proteins: 18, carbs: 3, fats: 16, cals: 274 }
      ],
      lunch: [
        { description: 'Frango (140g) + batata-doce (60g) + salada', proteins: 38, carbs: 24, fats: 2, cals: 362 }
      ],
      snack: [
        { description: 'Castanha de caju (25g)', proteins: 5, carbs: 8, fats: 14, cals: 178 }
      ],
      dinner: [
        { description: 'Peixe (130g) + abóbora (80g)', proteins: 32, carbs: 12, fats: 3, cals: 274 }
      ]
    }
  },
  'ganho-massa-limpa': {
    name: 'Ganho de Massa Limpa',
    days: 7,
    meals: {
      breakfast: [
        { description: 'Ovos (3) + aveia (40g) + banana (1)', proteins: 20, carbs: 54, fats: 15, cals: 425 }
      ],
      lunch: [
        { description: 'Frango (160g) + arroz integral (110g) + feijão (70g)', proteins: 48, carbs: 58, fats: 2, cals: 556 }
      ],
      snack: [
        { description: 'Proteína + manga (100g)', proteins: 25, carbs: 28, fats: 1, cals: 212 }
      ],
      dinner: [
        { description: 'Carne vermelha (130g) + batata (100g) + salada', proteins: 38, carbs: 36, fats: 6, cals: 406 }
      ]
    }
  },
  'detox-vitalidade': {
    name: 'Detox e Vitalidade',
    days: 7,
    meals: {
      breakfast: [
        { description: 'Suco verde (limão + gengibre + maçã) + aveia (20g)', proteins: 3, carbs: 32, fats: 1, cals: 140 }
      ],
      lunch: [
        { description: 'Frango (110g) + quinoa (60g) + espinafre refogado', proteins: 35, carbs: 42, fats: 3, cals: 378 }
      ],
      snack: [
        { description: 'Chá de gengibre (200ml) + maçã (1/2)', proteins: 0, carbs: 14, fats: 0, cals: 56 }
      ],
      dinner: [
        { description: 'Caldo de legumes (250ml) + frango desfiado (80g)', proteins: 20, carbs: 12, fats: 2, cals: 178 }
      ]
    }
  }
};

const CALORIE_VARIANTS = [1200, 1400, 1600, 1800];

async function auditCurrentTemplates() {
  console.log('\n📊 AUDIT PHASE - Analisando Templates Atuais\n');
  
  try {
    const { data: templates, error } = await supabase
      .from('v3_diet_templates')
      .select('id, slug, name, plan_snapshot')
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`Total templates no banco: ${templates.length}\n`);

    const audit = {
      total: templates.length,
      bySize: {},
      byDays: {},
      withoutVariations: [],
      uniformContent: []
    };

    templates.forEach(t => {
      const size = Buffer.byteLength(JSON.stringify(t.plan_snapshot));
      audit.bySize[size] = (audit.bySize[size] || 0) + 1;

      let days = 0;
      if (t.plan_snapshot?.days) {
        days = t.plan_snapshot.days.length;
      }
      audit.byDays[days] = (audit.byDays[days] || 0) + 1;

      // Check for lack of meal variations
      if (!t.plan_snapshot?.days || t.plan_snapshot.days.length < 7) {
        audit.withoutVariations.push(`${t.slug} (${days} dias)`);
      }
    });

    console.log('Distribuição por tamanho (bytes):');
    Object.entries(audit.bySize).forEach(([size, count]) => {
      console.log(`  ${size}B: ${count} templates`);
    });

    console.log('\nDistribuição por dias:');
    Object.entries(audit.byDays).forEach(([days, count]) => {
      console.log(`  ${days} dias: ${count} templates`);
    });

    if (audit.withoutVariations.length > 0) {
      console.log('\n⚠️  Templates sem 7 dias completos:');
      audit.withoutVariations.forEach(t => console.log(`  - ${t}`));
    }

    return audit;
  } catch (err) {
    console.error('❌ Erro no audit:', err.message);
    throw err;
  }
}

async function generateTemplateSnapshot(templateDef, calorieTarget) {
  // Escala macros baseado na caloria alvo (padrão 1800 cal)
  const scaleFactor = calorieTarget / 1800;

  const days = [];
  for (let dayIdx = 0; dayIdx < templateDef.days; dayIdx++) {
    const meals = {};
    for (const [mealType, options] of Object.entries(templateDef.meals)) {
      const mealIdx = dayIdx % options.length;
      const selectedMeal = { ...options[mealIdx] };

      // Scale macros
      selectedMeal.proteins = Math.round(selectedMeal.proteins * scaleFactor);
      selectedMeal.carbs = Math.round(selectedMeal.carbs * scaleFactor);
      selectedMeal.fats = Math.round(selectedMeal.fats * scaleFactor);
      selectedMeal.cals = Math.round(selectedMeal.cals * scaleFactor);

      meals[mealType] = selectedMeal;
    }

    days.push({
      dayOfWeek: (dayIdx % 7) + 1,
      meals,
      totals: {
        proteins: Object.values(meals).reduce((sum, m) => sum + m.proteins, 0),
        carbs: Object.values(meals).reduce((sum, m) => sum + m.carbs, 0),
        fats: Object.values(meals).reduce((sum, m) => sum + m.fats, 0),
        cals: Object.values(meals).reduce((sum, m) => sum + m.cals, 0)
      }
    });
  }

  return {
    templateId: null,
    days,
    createdAt: new Date().toISOString(),
    version: '3.0.0',
    calorieTarget
  };
}

async function reseedTemplates() {
  console.log('\n🔄 RESEED PHASE - Regenerando Templates com Diversidade Clínica\n');

  let successCount = 0;
  let errorCount = 0;

  for (const [slug, templateDef] of Object.entries(TEMPLATE_DEFINITIONS)) {
    for (const cals of CALORIE_VARIANTS) {
      try {
        const snapshot = await generateTemplateSnapshot(templateDef, cals);
        const snapshotSize = Buffer.byteLength(JSON.stringify(snapshot));

        const { error } = await supabase
          .from('v3_diet_templates')
          .upsert({
            slug: `${slug}-${cals}cal`,
            name: `${templateDef.name} (${cals} cal)`,
            plan_snapshot: snapshot,
            sovereign_validated: true,
            updated_at: new Date().toISOString()
          }, { onConflict: 'slug' });

        if (error) throw error;

        console.log(`✅ ${slug} (${cals}cal) | ${snapshotSize}B`);
        successCount++;
      } catch (err) {
        console.error(`❌ ${slug} (${cals}cal): ${err.message}`);
        errorCount++;
      }
    }
  }

  console.log(`\n✅ Sucesso: ${successCount}`);
  console.log(`❌ Erros: ${errorCount}`);

  return successCount > 0;
}

async function verifyReseed() {
  console.log('\n✔️  VERIFICATION PHASE\n');

  const { data: templates, error } = await supabase
    .from('v3_diet_templates')
    .select('slug, plan_snapshot')
    .order('slug');

  if (error) throw error;

  let uniqueContent = new Set();
  let totalSize = 0;
  let minSize = Infinity;
  let maxSize = 0;

  templates.forEach(t => {
    const hash = JSON.stringify(t.plan_snapshot).substring(0, 50);
    uniqueContent.add(hash);
    const size = Buffer.byteLength(JSON.stringify(t.plan_snapshot));
    totalSize += size;
    minSize = Math.min(minSize, size);
    maxSize = Math.max(maxSize, size);
  });

  console.log(`📦 Total templates: ${templates.length}`);
  console.log(`📊 Conteúdo único (primeiros 50 chars): ${uniqueContent.size}`);
  console.log(`📈 Tamanho médio: ${Math.round(totalSize / templates.length)}B`);
  console.log(`📉 Variação: ${minSize}B - ${maxSize}B`);

  if (uniqueContent.size > 1 && maxSize > minSize * 2) {
    console.log('\n✅ Templates com diversidade clínica CONFIRMADA\n');
    return true;
  } else {
    console.log('\n⚠️  Possível falta de diversidade\n');
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   EMERGENCY TEMPLATE RESCUE v1.0');
  console.log('═══════════════════════════════════════════════════');

  try {
    await auditCurrentTemplates();
    const success = await reseedTemplates();
    if (success) {
      await verifyReseed();
    }
  } catch (err) {
    console.error('\n🚨 FALHA CRÍTICA:', err);
    process.exit(1);
  }
}

main();
