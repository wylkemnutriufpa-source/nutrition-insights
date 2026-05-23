
import { createClient } from '@supabase/supabase-client';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditTemplates() {
  const { data: templates, error } = await supabase
    .from('v3_diet_templates')
    .select('*');

  if (error) {
    console.error('Error fetching templates:', error);
    return;
  }

  const report = {
    total: templates.length,
    integros: 0,
    quebrados: 0,
    sem_imagem: 0,
    repetidos: 0,
    hibridos_v2_v3: 0,
    issues: [] as string[]
  };

  const slugs = new Set();
  const names = new Set();

  for (const template of templates) {
    let templateBroken = false;
    let hasHybrid = false;
    let missingImages = false;

    if (slugs.has(template.slug)) {
      report.repetidos++;
      report.issues.push(`Template ${template.id}: Slug repetido ${template.slug}`);
    }
    slugs.add(template.slug);

    if (names.has(template.title)) {
      report.issues.push(`Template ${template.id}: Título repetido ${template.title}`);
    }
    names.add(template.title);

    if (!template.plan_snapshot || Object.keys(template.plan_snapshot).length === 0) {
      templateBroken = true;
      report.issues.push(`Template ${template.id}: plan_snapshot vazio`);
    } else {
      for (const [kcal, profile] of Object.entries(template.plan_snapshot)) {
        const p = profile as any;
        if (!p.days || p.days.length === 0) {
          templateBroken = true;
          report.issues.push(`Template ${template.id} (${kcal} kcal): Sem dias no snapshot`);
          continue;
        }

        for (const day of p.days) {
          if (!day.meals || day.meals.length === 0) {
            templateBroken = true;
            report.issues.push(`Template ${template.id} (${kcal} kcal): Dia sem refeições`);
            continue;
          }

          for (const meal of day.meals) {
            if (meal.foods) {
              hasHybrid = true;
            }
            if (!meal.items || meal.items.length === 0) {
              templateBroken = true;
              report.issues.push(`Template ${template.id} (${kcal} kcal): Refeição ${meal.name} sem items`);
              continue;
            }

            for (const item of meal.items) {
              if (!item.imageUrl || item.imageUrl.includes('placeholder') || item.imageUrl.includes('undefined')) {
                missingImages = true;
              }
              if (item.foods) hasHybrid = true;
              
              const macros = item.macros || {};
              if (!macros.kcal || macros.kcal === 0) {
                // report.issues.push(`Template ${template.id} (${kcal} kcal): Item ${item.name} com kcal zero`);
              }
            }
          }
        }
      }
    }

    if (templateBroken) report.quebrados++;
    else report.integros++;

    if (hasHybrid) report.hibridos_v2_v3++;
    if (missingImages) report.sem_imagem++;
  }

  console.log(JSON.stringify(report, null, 2));
}

auditTemplates();
