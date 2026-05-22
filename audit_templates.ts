
import { supabase } from './src/integrations/supabase/client';

async function auditTemplates() {
  const { data: templates, error } = await supabase
    .from('v3_diet_templates')
    .select('id, slug, title, plan_snapshot, kcal_profiles');

  if (error) {
    console.error('Error fetching templates:', error);
    return;
  }

  const report = {
    total: templates.length,
    empty_snapshot: 0,
    missing_profiles: 0,
    broken_days: 0,
    zero_macros: 0,
    missing_images: 0,
    details: [] as any[]
  };

  for (const t of templates) {
    const snapshot = t.plan_snapshot as any;
    const profiles = t.kcal_profiles as any[];
    
    let isBroken = false;
    let missingImages = 0;
    let zeroMacros = 0;

    if (!snapshot || Object.keys(snapshot).length === 0) {
      report.empty_snapshot++;
      isBroken = true;
    } else {
      for (const kcal of Object.keys(snapshot)) {
        const profile = snapshot[kcal];
        if (!profile.days || !Array.isArray(profile.days)) {
          report.broken_days++;
          isBroken = true;
          continue;
        }

        profile.days.forEach((day: any) => {
          day.meals.forEach((meal: any) => {
            meal.items.forEach((item: any) => {
              if (!item.imageUrl && !item.visual?.image_url) missingImages++;
              if ((item.kcal || item.macros?.kcal || 0) === 0) zeroMacros++;
            });
          });
        });
      }
    }

    if (missingImages > 0) report.missing_images++;
    if (zeroMacros > 0) report.zero_macros++;

    report.details.push({
      slug: t.slug,
      title: t.title,
      is_broken: isBroken,
      missing_images: missingImages,
      zero_macros: zeroMacros
    });
  }

  console.log('--- AUDIT REPORT ---');
  console.log(JSON.stringify(report, null, 2));
}

auditTemplates();
