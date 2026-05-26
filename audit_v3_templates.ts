
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditTemplates() {
  const { data: templates, error } = await supabase
    .from('v3_diet_templates')
    .select('id, title, plan_snapshot, kcal_profiles, template_type, objective');

  if (error) {
    console.error('Error fetching templates:', error);
    return;
  }

  const report = [];

  for (const template of templates) {
    const profiles = template.kcal_profiles || [];
    const snapshots = template.plan_snapshot || {};

    for (const targetKcal of profiles) {
      const snapshot = snapshots[targetKcal.toString()];
      if (!snapshot) {
        report.push({
          id: template.id,
          title: template.title,
          targetKcal,
          realKcal: 0,
          status: 'Inviable',
          issue: 'Missing snapshot for target kcal',
          divergence: 100
        });
        continue;
      }

      // Summing Day 1 (assuming day 1 is the reference)
      const day1 = snapshot.days?.find((d: any) => d.day_of_week === 1);
      if (!day1) {
          report.push({
            id: template.id,
            title: template.title,
            targetKcal,
            realKcal: 0,
            status: 'Inviable',
            issue: 'Missing Day 1 in snapshot',
            divergence: 100
          });
          continue;
      }

      let totalKcal = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;

      day1.meals?.forEach((meal: any) => {
        meal.items?.forEach((item: any) => {
          // Some items might have macros in a 'macros' object, others might have them at top level
          const m = item.macros || item;
          totalKcal += Number(m.kcal || 0);
          totalProtein += Number(m.protein_g || m.protein || 0);
          totalCarbs += Number(m.carbs_g || m.carbs || 0);
          totalFat += Number(m.fat_g || m.fat || 0);
        });
      });

      const divergence = Math.abs(totalKcal - targetKcal);
      const divergencePct = (divergence / targetKcal) * 100;

      let status = 'Safe';
      if (divergencePct > 10) status = 'Inviable';
      else if (divergencePct > 5) status = 'Critical';
      else if (divergencePct > 1) status = 'Warning';

      report.push({
        id: template.id,
        title: template.title,
        template_type: template.template_type,
        objective: template.objective,
        targetKcal,
        realKcal: totalKcal,
        realProtein: totalProtein,
        realCarbs: totalCarbs,
        realFat: totalFat,
        divergence,
        divergencePct,
        status,
        issue: divergencePct > 1 ? `Divergence of ${divergence.toFixed(1)} kcal (${divergencePct.toFixed(1)}%)` : 'OK'
      });
    }
  }

  // Sort by divergence % descending
  report.sort((a, b) => b.divergencePct - a.divergencePct);

  console.log(JSON.stringify(report, null, 2));
}

auditTemplates();
