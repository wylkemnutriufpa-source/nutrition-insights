
import { createClient } from '@supabase/supabase-client-helpers';
import { supabase } from '../integrations/supabase/client';

async function runAudit() {
  console.log("--- STARTING SOVEREIGN NUTRITIONAL AUDIT (V3) ---");
  
  const { data: templates, error } = await supabase
    .from('v3_diet_templates')
    .select('id, title, plan_snapshot, kcal_profiles, family');

  if (error) {
    console.error("Error fetching templates:", error);
    return;
  }

  const report: any[] = [];
  let totalCritical = 0;
  let totalWarning = 0;

  for (const template of templates) {
    const snapshot = template.plan_snapshot as any;
    if (!snapshot) continue;

    const profiles = Object.keys(snapshot);
    
    for (const profileKey of profiles) {
      const targetKcal = parseInt(profileKey);
      const profileData = snapshot[profileKey];
      const days = profileData?.days || [];
      
      if (days.length === 0) {
        report.push({
          id: template.id,
          title: template.title,
          profile: profileKey,
          status: 'CRITICAL',
          message: 'No days found in snapshot',
          divergence: 100
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
            // Priority to macros object, fallback to top level fields
            const macros = item.macros || {};
            totalDayKcal += macros.kcal || item.kcal || 0;
            totalDayProtein += macros.protein_g || item.protein || 0;
            totalDayCarbs += macros.carbs_g || item.carbs || 0;
            totalDayFat += macros.fat_g || item.fat || 0;
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

      // Check for clinical risks (e.g. extremely low protein)
      if (avgProtein < 40 && targetKcal > 1500) {
        status = 'CRITICAL';
        risk = 'Dangerous Protein Deficiency';
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
        diff_pct: diffPct.toFixed(2) + '%',
        status,
        risk
      });
    }
  }

  // Print summary
  console.log("\n--- AUDIT SUMMARY ---");
  console.log(`Total Templates Audited: ${templates.length}`);
  console.log(`Total Critical Inconsistencies: ${totalCritical}`);
  console.log(`Total Warnings: ${totalWarning}`);
  
  console.log("\n--- TOP CRITICAL TEMPLATES ---");
  const criticals = report.filter(r => r.status === 'CRITICAL').sort((a,b) => parseFloat(b.diff_pct) - parseFloat(a.diff_pct));
  criticals.slice(0, 20).forEach(r => {
    console.log(`[${r.status}] ${r.template} (${r.profile}kcal) -> Real: ${r.real_kcal}kcal (${r.diff_pct} diff). Risk: ${r.risk}`);
  });

  console.log("\n--- TOP WARNING TEMPLATES ---");
  const warnings = report.filter(r => r.status === 'WARNING').sort((a,b) => parseFloat(b.diff_pct) - parseFloat(a.diff_pct));
  warnings.slice(0, 20).forEach(r => {
    console.log(`[${r.status}] ${r.template} (${r.profile}kcal) -> Real: ${r.real_kcal}kcal (${r.diff_pct} diff). Risk: ${r.risk}`);
  });

  console.log("\n--- COMPLETE REPORT JSON ---");
  console.log(JSON.stringify(report, null, 2));
}

runAudit();
