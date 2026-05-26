
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runAudit() {
  console.log("--- STARTING SOVEREIGN NUTRITIONAL AUDIT (V3) ---");
  
  const { data: templates, error } = await supabase
    .from('v3_diet_templates')
    .select('id, title, plan_snapshot, kcal_profiles, family');

  if (error) {
    console.error("Error fetching templates:", error);
    return;
  }

  const report = [];
  let totalCritical = 0;
  let totalWarning = 0;

  for (const template of templates) {
    const snapshot = template.plan_snapshot;
    if (!snapshot) continue;

    const profiles = Object.keys(snapshot);
    
    for (const profileKey of profiles) {
      const targetKcal = parseInt(profileKey);
      if (isNaN(targetKcal)) continue;

      const profileData = snapshot[profileKey];
      const days = profileData?.days || [];
      
      if (days.length === 0) {
        report.push({
          id: template.id,
          template: template.title,
          profile: profileKey,
          status: 'CRITICAL',
          risk: 'Empty Snapshot',
          diff_pct: '100%'
        });
        totalCritical++;
        continue;
      }

      let totalDayKcal = 0;
      let totalDayProtein = 0;
      let totalDayCarbs = 0;
      let totalDayFat = 0;

      for (const day of days) {
        const meals = day.meals || [];
        for (const meal of meals) {
          const items = meal.items || [];
          for (const item of items) {
            const macros = item.macros || {};
            totalDayKcal += Number(macros.kcal || item.kcal || 0);
            totalDayProtein += Number(macros.protein_g || item.protein || 0);
            totalDayCarbs += Number(macros.carbs_g || item.carbs || 0);
            totalDayFat += Number(macros.fat_g || item.fat || 0);
          }
        }
      }

      const avgKcal = totalDayKcal / days.length;
      const avgProtein = totalDayProtein / days.length;
      const avgCarbs = totalDayCarbs / days.length;
      const avgFat = totalDayFat / days.length;

      const diff = Math.abs(avgKcal - targetKcal);
      const diffPct = (diff / targetKcal) * 100;

      let status = 'OK';
      let risk = 'None';
      
      if (diffPct > 10) {
        status = 'CRITICAL';
        risk = 'Severe Caloric Misalignment';
        totalCritical++;
      } else if (diffPct > 5) {
        status = 'WARNING';
        risk = 'Moderate Caloric Misalignment';
        totalWarning++;
      }

      // Protein Deficiency Risk (Clinical)
      // Usually we expect ~1.2-1.5g protein per kg. For a standard 70kg person, that's ~84-105g.
      // If a template has < 60g protein and target is > 1800kcal, it's risky for many clinical objectives.
      if (avgProtein < 60 && targetKcal > 1800) {
        status = 'CRITICAL';
        risk = 'Low Protein for High Kcal (Clinical Risk)';
        totalCritical++;
      }

      report.push({
        template: template.title,
        family: template.family,
        profile: profileKey,
        target: targetKcal,
        real_kcal: Math.round(avgKcal),
        real_protein: Math.round(avgProtein),
        real_carbs: Math.round(avgCarbs),
        real_fat: Math.round(avgFat),
        diff_kcal: Math.round(avgKcal - targetKcal),
        diff_pct: diffPct.toFixed(2) + '%',
        status,
        risk
      });
    }
  }

  // Print results
  console.log("\n--- TOP CRITICAL DISCREPANCIES ---");
  report.filter(r => r.status === 'CRITICAL')
    .sort((a,b) => parseFloat(b.diff_pct) - parseFloat(a.diff_pct))
    .slice(0, 30)
    .forEach(r => {
      console.log(`[${r.status}] ${r.template} (${r.profile}kcal) -> Real: ${r.real_kcal}kcal (${r.diff_pct} diff). Risk: ${r.risk}`);
    });

  console.log("\n--- SUMMARY ---");
  console.log(`Audited: ${templates.length} templates`);
  console.log(`Critical Errors: ${totalCritical}`);
  console.log(`Warnings: ${totalWarning}`);
  
  if (totalCritical === 0 && totalWarning === 0) {
    console.log("SUCCESS: All templates within 5% tolerance.");
  }
}

runAudit();
