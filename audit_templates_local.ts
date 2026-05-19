
import fs from 'fs';

async function auditTemplates() {
  const data = JSON.parse(fs.readFileSync('templates_dump.json', 'utf8'));

  const report = data.map(t => {
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
          if (item.imageUrl && item.imageUrl !== '<nil>' && item.imageUrl.startsWith('http')) itemsWithImages++;
          if (item.quantity_display && (item.quantity_display.includes('g') || item.quantity_display.includes('ml'))) itemsWithGrams++;
          
          (item.substitutions || []).forEach(sub => {
            totalSubstitutions++;
            if (sub.imageUrl && sub.imageUrl !== '<nil>' && sub.imageUrl.startsWith('http')) substitutionsWithImages++;
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
      title: t.title,
      profiles: profileStats
    };
  });

  console.log(JSON.stringify(report, null, 2));
}

auditTemplates();
