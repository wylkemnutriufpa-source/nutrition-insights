
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function auditTemplates() {
  const { data: templates, error } = await supabase
    .from('v3_diet_templates')
    .select('*')
    .eq('active', true);

  if (error) {
    console.error('Error fetching templates:', error);
    return;
  }

  console.log(`Auditing ${templates.length} active templates...`);

  const auditResults = [];

  for (const template of templates) {
    const result = {
      id: template.id,
      title: template.title,
      profiles: [] as any[]
    };

    const snapshot = template.plan_snapshot || {};
    const profiles = Object.keys(snapshot);

    for (const kcal of profiles) {
      const data = snapshot[kcal];
      const days = data?.days || [];
      const daysCount = days.length;
      
      const dayStats = days.map((day: any) => {
        const meals = day.meals || [];
        return {
          day_of_week: day.day_of_week,
          meals_count: meals.length,
          meals_info: meals.map((m: any) => ({
            name: m.name || m.slot,
            items_count: (m.items || []).length,
            items_missing_data: (m.items || []).filter((i: any) => !i.quantity_display || i.kcal === undefined).map((i: any) => i.name)
          }))
        };
      });

      result.profiles.push({
        kcal,
        days_count: daysCount,
        day_stats: dayStats
      });
    }

    auditResults.push(result);
  }

  console.log(JSON.stringify(auditResults, null, 2));
}

auditTemplates();
