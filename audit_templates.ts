
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditTemplates() {
  const { data: templates, error } = await supabase
    .from('v3_diet_templates')
    .select('*')
    .eq('active', true);

  if (error) {
    console.error('Error fetching templates:', error);
    return;
  }

  const report = [];

  for (const template of templates) {
    const templateAudit = {
      id: template.id,
      name: template.title,
      slug: template.slug,
      status: 'OK',
      issues: [],
      days_count: 0,
      kcal_profiles: Object.keys(template.plan_snapshot || {}),
      complete_structure: true
    };

    if (!template.plan_snapshot || Object.keys(template.plan_snapshot).length === 0) {
      templateAudit.status = 'FAIL';
      templateAudit.issues.push('Missing plan_snapshot');
      report.push(templateAudit);
      continue;
    }

    // Check each kcal profile
    for (const [kcal, snapshot] of Object.entries(template.plan_snapshot)) {
      const castSnapshot = snapshot as any;
      if (!castSnapshot.days || !Array.isArray(castSnapshot.days)) {
        templateAudit.status = 'FAIL';
        templateAudit.issues.push(`Kcal profile ${kcal} missing days array`);
        continue;
      }

      templateAudit.days_count = castSnapshot.days.length;
      if (castSnapshot.days.length < 7) {
        templateAudit.status = 'WARNING';
        templateAudit.issues.push(`Kcal profile ${kcal} has only ${castSnapshot.days.length} days`);
      }

      for (const day of castSnapshot.days) {
        if (!day.meals || !Array.isArray(day.meals) || day.meals.length === 0) {
          templateAudit.status = 'FAIL';
          templateAudit.issues.push(`Day ${day.day_of_week} in ${kcal} kcal profile has no meals`);
          continue;
        }

        const mealTypes = day.meals.map((m: any) => m.name?.toLowerCase());
        const requiredMeals = ['café', 'almoço', 'jantar'];
        for (const req of requiredMeals) {
           if (!mealTypes.some((t: string) => t.includes(req))) {
             templateAudit.status = 'WARNING';
             templateAudit.issues.push(`Day ${day.day_of_week} in ${kcal} kcal profile missing ${req}`);
           }
        }

        for (const meal of day.meals) {
          if (!meal.items || !Array.isArray(meal.items) || meal.items.length === 0) {
            templateAudit.status = 'FAIL';
            templateAudit.issues.push(`Meal ${meal.name} in Day ${day.day_of_week} (${kcal} kcal) has no items`);
            continue;
          }

          for (const item of meal.items) {
            if (!item.clinical_mass_g && !item.quantity) {
              templateAudit.status = 'FAIL';
              templateAudit.issues.push(`Item ${item.name} in ${meal.name} (Day ${day.day_of_week}, ${kcal} kcal) missing quantity/mass`);
            }
            if (item.kcal === undefined || item.protein === undefined) {
              templateAudit.status = 'FAIL';
              templateAudit.issues.push(`Item ${item.name} in ${meal.name} (Day ${day.day_of_week}, ${kcal} kcal) missing macros`);
            }
            if (!item.imageUrl && !item.image_url) {
              // WARNING only, some items might not have images, but user wants images
              templateAudit.status = 'WARNING';
              templateAudit.issues.push(`Item ${item.name} in ${meal.name} (Day ${day.day_of_week}, ${kcal} kcal) missing image`);
            }
            
            // Check substitutions
            if (item.substitutions && Array.isArray(item.substitutions)) {
               for (const sub of item.substitutions) {
                  if (!sub.imageUrl && !sub.image_url) {
                    // templateAudit.issues.push(`Substitution ${sub.name} for ${item.name} missing image`);
                  }
               }
            }
          }
        }
      }
    }

    report.push(templateAudit);
  }

  console.log(JSON.stringify(report, null, 2));
}

auditTemplates();
