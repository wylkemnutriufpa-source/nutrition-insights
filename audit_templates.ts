
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditTemplates() {
  const { data: templates, error } = await supabase
    .from('v3_diet_templates')
    .select('id, title, plan_snapshot');

  if (error) {
    console.error('Error fetching templates:', error);
    return;
  }

  const results = [];

  for (const t of templates) {
    const report: any = {
      id: t.id,
      title: t.title,
      profiles: {},
      status: 'APROVADO',
      failures: []
    };

    const snapshots = t.plan_snapshot || {};
    const profileKeys = Object.keys(snapshots);

    if (profileKeys.length === 0) {
      report.status = 'QUEBRADO';
      report.failures.push('Sem snapshots de perfil');
    }

    for (const key of profileKeys) {
      const snapshot = snapshots[key];
      const hash = crypto.createHash('md5').update(JSON.stringify(snapshot)).digest('hex');
      
      const profileReport: any = {
        hash,
        days_count: 0,
        issues: []
      };

      const days = snapshot.days || [];
      profileReport.days_count = days.length;

      if (days.length !== 7) {
        profileReport.issues.push(`Quantidade de dias inválida: ${days.length} (esperado 7)`);
      }

      days.forEach((day: any, dayIdx: number) => {
        const meals = day.meals || [];
        if (meals.length === 0) {
          profileReport.issues.push(`Dia ${dayIdx + 1} está vazio`);
        }

        meals.forEach((meal: any) => {
          if (!meal.name) profileReport.issues.push(`Refeição sem nome no dia ${dayIdx + 1}`);
          
          const items = meal.items || [];
          items.forEach((item: any) => {
            if (!item.name) profileReport.issues.push(`Item sem nome na refeição ${meal.name}, dia ${dayIdx + 1}`);
            if (!item.kcal || item.kcal <= 0) profileReport.issues.push(`Item ${item.name} com kcal zero ou inválida`);
            if (!item.clinical_mass_g || item.clinical_mass_g <= 1) profileReport.issues.push(`Item ${item.name} com gramagem inválida: ${item.clinical_mass_g}g`);
            if (!item.quantity_display) profileReport.issues.push(`Item ${item.name} sem quantity_display`);
            
            if (!item.image_url || item.image_url.includes('placeholder') || item.image_url.includes('default')) {
              profileReport.issues.push(`Item ${item.name} com imagem inválida/placeholder: ${item.image_url}`);
            }
          });
        });
      });

      if (profileReport.issues.length > 0) {
        report.status = 'QUEBRADO';
        report.failures.push(...profileReport.issues.map((i: string) => `Perfil ${key}: ${i}`));
      }

      report.profiles[key] = profileReport;
    }

    results.push(report);
  }

  console.log(JSON.stringify(results, null, 2));
}

auditTemplates();
