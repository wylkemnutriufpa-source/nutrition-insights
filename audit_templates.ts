
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditTemplates() {
  console.log('--- INICIANDO AUDITORIA FORENSE DOS 14 TEMPLATES ---');
  
  const { data: templates, error } = await supabase
    .from('v3_diet_templates')
    .select('*');

  if (error) {
    console.error('Erro ao buscar templates:', error);
    return;
  }

  const results = [];

  for (const template of templates) {
    const audit: any = {
      id: template.id,
      title: template.title,
      slug: template.slug,
      status: 'APROVADO',
      issues: [],
      profilesChecked: []
    };

    if (!template.plan_snapshot || Object.keys(template.plan_snapshot).length === 0) {
      audit.status = 'QUEBRADO';
      audit.issues.push('Snapshot ausente ou vazio');
      results.push(audit);
      continue;
    }

    const profiles = Object.keys(template.plan_snapshot);
    for (const profileKey of profiles) {
      const snapshot = template.plan_snapshot[profileKey];
      const profileInfo: any = { profile: profileKey, daysCount: 0, issues: [] };

      if (!snapshot.days || !Array.isArray(snapshot.days)) {
        profileInfo.issues.push('Dias ausentes ou não são array');
      } else {
        profileInfo.daysCount = snapshot.days.length;
        if (snapshot.days.length !== 7) {
          profileInfo.issues.push(`Esperava 7 dias, encontrou ${snapshot.days.length}`);
        }

        snapshot.days.forEach((day, dIdx) => {
          if (!day.meals || day.meals.length === 0) {
            profileInfo.issues.push(`Dia ${dIdx + 1}: Sem refeições`);
          } else {
            day.meals.forEach((meal, mIdx) => {
              if (!meal.items || meal.items.length === 0) {
                profileInfo.issues.push(`Dia ${dIdx + 1}, Refeição ${mIdx + 1} (${meal.name}): Sem alimentos`);
              } else {
                meal.items.forEach((item, iIdx) => {
                  const prefix = `Dia ${dIdx + 1}, Ref ${mIdx + 1}, Item ${iIdx + 1} (${item.name})`;
                  
                  if (!item.amount || item.amount <= 0) {
                    profileInfo.issues.push(`${prefix}: Gramagem ausente ou zero (${item.amount})`);
                  }
                  if (!item.quantity_display || item.quantity_display.trim() === '') {
                    profileInfo.issues.push(`${prefix}: quantity_display vazio`);
                  }
                  if (item.kcal === undefined || item.kcal === null) {
                    profileInfo.issues.push(`${prefix}: Calorias ausentes`);
                  }
                  if (!item.image_url || item.image_url.includes('placeholder') || item.image_url === '') {
                    profileInfo.issues.push(`${prefix}: Imagem ausente ou placeholder (${item.image_url})`);
                  }
                });
              }
            });
          }
        });
      }

      if (profileInfo.issues.length > 0) {
        audit.status = 'QUEBRADO';
        audit.issues.push(...profileInfo.issues.map(i => `[Perfil ${profileKey}] ${i}`));
      }
      audit.profilesChecked.push(profileInfo);
    }

    results.push(audit);
  }

  console.log('\n--- RELATÓRIO FINAL ---');
  results.forEach(r => {
    console.log(`\nTemplate: ${r.title} (${r.slug})`);
    console.log(`Status: ${r.status}`);
    if (r.issues.length > 0) {
      console.log('Pendências:');
      r.issues.slice(0, 10).forEach(i => console.log(` - ${i}`));
      if (r.issues.length > 10) console.log(` ... e mais ${r.issues.length - 10} erros.`);
    } else {
      console.log('Tudo OK: 7 dias, gramagens, imagens e macros validados.');
    }
  });

  return results;
}

auditTemplates();
