
import fs from 'fs';

async function auditTemplates() {
  const data = fs.readFileSync('templates.json', 'utf-8');
  const templates = JSON.parse(data);

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
      let risk = 'Low';
      if (divergencePct > 10) {
          status = 'Inviable';
          risk = 'High (Metabolic Mismatch)';
      } else if (divergencePct > 5) {
          status = 'Critical';
          risk = 'Medium (Macro Imbalance)';
      } else if (divergencePct > 1) {
          status = 'Warning';
          risk = 'Low (Minor Deviation)';
      }

      report.push({
        title: template.title,
        targetKcal,
        realKcal: Math.round(totalKcal),
        realProtein: Math.round(totalProtein),
        realCarbs: Math.round(totalCarbs),
        realFat: Math.round(totalFat),
        divergence: divergence.toFixed(1),
        divergencePct: divergencePct.toFixed(2),
        status,
        objective: template.objective,
        risk
      });
    }
  }

  // Final statistics
  const stats = {
      total: report.length,
      safe: report.filter(r => r.status === 'Safe').length,
      warning: report.filter(r => r.status === 'Warning').length,
      critical: report.filter(r => r.status === 'Critical').length,
      inviable: report.filter(r => r.status === 'Inviable').length
  };

  console.log('--- CLINICAL AUDIT REPORT ---');
  console.log('Stats:', stats);
  console.log('\n--- TOP 20 CRITICAL TEMPLATES ---');
  console.table(report.sort((a, b) => Number(b.divergencePct) - Number(a.divergencePct)).slice(0, 20));
  
  fs.writeFileSync('audit_report.json', JSON.stringify({ stats, report }, null, 2));
}

auditTemplates();
