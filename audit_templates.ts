
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function auditTemplates() {
  const { data: templates, error } = await supabase
    .from('v3_diet_templates')
    .select('*');

  if (error) {
    console.error('Error fetching templates:', error);
    return;
  }

  const report = templates.map(t => {
    const snapshot = t.plan_snapshot || {};
    const profiles = Object.keys(snapshot);
    
    const profileStats = profiles.map(p => {
      const days = snapshot[p]?.days || [];
      const day1 = days[0] || { meals: [] };
      const meals = day1.meals || [];
      
      let totalItems = 0;
      let itemsWithImages = 0;
      let itemsWithGrams = 0;
      let totalSubstitutions = 0;
      let substitutionsWithImages = 0;

      meals.forEach(m => {
        (m.items || []).forEach(item => {
          totalItems++;
          if (item.imageUrl && item.imageUrl !== '<nil>') itemsWithImages++;
          if (item.quantity_display && item.quantity_display.includes('g')) itemsWithGrams++;
          
          (item.substitutions || []).forEach(sub => {
            totalSubstitutions++;
            if (sub.imageUrl && sub.imageUrl !== '<nil>') substitutionsWithImages++;
          });
        });
      });

      return {
        kcal: p,
        mealCount: meals.length,
        mealNames: meals.map(m => m.name),
        imageCoverage: totalItems > 0 ? (itemsWithImages / totalItems * 100).toFixed(1) + '%' : '0%',
        gramCoverage: totalItems > 0 ? (itemsWithGrams / totalItems * 100).toFixed(1) + '%' : '0%',
        subCount: totalSubstitutions,
        subImageCoverage: totalSubstitutions > 0 ? (substitutionsWithImages / totalSubstitutions * 100).toFixed(1) + '%' : '0%'
      };
    });

    return {
      id: t.id,
      title: t.title,
      profiles: profileStats
    };
  });

  console.log(JSON.stringify(report, null, 2));
}

auditTemplates();
