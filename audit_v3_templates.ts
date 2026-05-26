
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
          issue: 'Missing snapshot',
          divergencePct: 100,
          diagnosis: 'Snapshot data is completely missing'
        });
        continue;
      }

      const day1 = snapshot.days?.find((d: any) => d.day_of_week === 1) || (snapshot.days && snapshot.days[0]);
      if (!day1) {
          report.push({
            id: template.id,
            title: template.title,
            targetKcal,
            realKcal: 0,
            status: 'Inviable',
            issue: 'Missing days',
            divergencePct: 100,
            diagnosis: 'Days array is missing or empty'
          });
          continue;
      }

      let totalKcal = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
      let itemType = 'unknown';
      let hasMacros = false;

      day1.meals?.forEach((meal: any) => {
        // Pattern 1: V3 Sovereign (items)
        if (meal.items) {
          itemType = 'v3_sovereign';
          meal.items.forEach((item: any) => {
            const m = item.macros || {};
            if (m.kcal !== undefined) hasMacros = true;
            totalKcal += Number(m.kcal || item.kcal || 0);
            totalProtein += Number(m.protein_g || item.protein || 0);
            totalCarbs += Number(m.carbs_g || item.carbs || 0);
            totalFat += Number(m.fat_g || item.fat || 0);
          });
        } 
        // Pattern 2: V2 Legacy (foods)
        else if (meal.foods) {
          itemType = 'v2_legacy';
          meal.foods.forEach((food: any) => {
            totalKcal += Number(food.kcal || 0);
            // V2 often lacks protein/carbs/fat in the snapshot
            if (food.protein) totalProtein += Number(food.protein);
            if (food.carbs) totalCarbs += Number(food.carbs);
            if (food.fat) totalFat += Number(food.fat);
          });
        }
      });

      const divergence = Math.abs(totalKcal - targetKcal);
      const divergencePct = (divergence / targetKcal) * 100;

      let status = 'Safe';
      let diagnosis = 'Integrity Validated';
      
      if (itemType === 'v2_legacy') {
          status = 'Inviable';
          diagnosis = 'Legacy V2 Format (Non-deterministic)';
      } else if (totalKcal === 0) {
          status = 'Inviable';
          diagnosis = 'Zero calories (Empty Composition)';
      } else if (divergencePct > 5) {
          status = 'Critical';
          diagnosis = 'High Caloric Divergence';
      } else if (divergencePct > 1) {
          status = 'Warning';
          diagnosis = 'Minor Imbalance';
      }

      report.push({
        title: template.title,
        targetKcal,
        realKcal: Math.round(totalKcal),
        protein: Math.round(totalProtein),
        carbs: Math.round(totalCarbs),
        fat: Math.round(totalFat),
        divergencePct: divergencePct.toFixed(2),
        status,
        diagnosis,
        format: itemType
      });
    }
  }

  const stats = {
      total: report.length,
      v3_sovereign: report.filter(r => r.format === 'v3_sovereign').length,
      v2_legacy: report.filter(r => r.format === 'v2_legacy').length,
      safe: report.filter(r => r.status === 'Safe').length,
      warning: report.filter(r => r.status === 'Warning').length,
      critical: report.filter(r => r.status === 'Critical').length,
      inviable: report.filter(r => r.status === 'Inviable').length
  };

  console.log('--- CLINICAL AUDIT REPORT (REFINED) ---');
  console.log('Stats:', stats);
  console.log('\n--- SAMPLE OF INVIABLE (LEGACY) ---');
  console.table(report.filter(r => r.format === 'v2_legacy').slice(0, 10));
  
  console.log('\n--- CRITICAL V3 DIVERGENCES ---');
  console.table(report.filter(r => r.format === 'v3_sovereign' && r.status !== 'Safe').sort((a, b) => Number(b.divergencePct) - Number(a.divergencePct)).slice(0, 10));

  fs.writeFileSync('audit_report.json', JSON.stringify({ stats, report }, null, 2));
}

auditTemplates();
