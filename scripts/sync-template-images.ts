
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  console.log('--- STARTING TEMPLATE IMAGE SYNC ---');

  // 1. Load visual library
  const { data: library } = await supabase.from('meal_visual_library').select('name, image_url, display_name');
  if (!library) return;

  const libraryMap = new Map();
  library.forEach(item => {
    // Index by slug/name and display name
    libraryMap.set(item.name.toLowerCase(), item.image_url);
    if (item.display_name) {
      libraryMap.set(item.display_name.toLowerCase(), item.image_url);
    }
  });

  function findImage(name: string) {
    if (!name) return null;
    const cleanName = name.toLowerCase().trim();
    // Try exact match
    if (libraryMap.has(cleanName)) return libraryMap.get(cleanName);
    
    // Try fuzzy match (if library name is in food name or vice versa)
    for (const [libName, url] of libraryMap.entries()) {
      if (cleanName.includes(libName) || libName.includes(cleanName)) {
        return url;
      }
    }
    return null;
  }

  // 2. Update meal_plan_templates
  const { data: templates } = await supabase.from('meal_plan_templates').select('id, name, meals');
  if (templates) {
    for (const template of templates) {
      let updated = false;
      const meals = template.meals || [];
      
      const newMeals = meals.map((meal: any) => {
        const items = (meal.items || []).map((item: any) => {
          const title = item.title || item.name;
          const img = findImage(title);
          if (img && (!item.image_url || item.image_url.includes('placeholder') || item.image_url.includes('unsplash'))) {
            updated = true;
            return { ...item, image_url: img, imageUrl: img };
          }
          return item;
        });
        return { ...meal, items };
      });

      if (updated) {
        await supabase.from('meal_plan_templates').update({ meals: newMeals }).eq('id', template.id);
        console.log(`Updated images for meal_plan_template: ${template.name}`);
      }
    }
  }

  // 3. Update v3_diet_templates
  const { data: v3Templates } = await supabase.from('v3_diet_templates').select('id, title, plan_snapshot');
  if (v3Templates) {
    for (const template of v3Templates) {
      let updated = false;
      const snapshot = template.plan_snapshot || {};
      const meals = snapshot.meals || [];
      
      const newMeals = meals.map((meal: any) => {
        const items = (meal.items || []).map((item: any) => {
          const title = item.title || item.name;
          const img = findImage(title);
          if (img && (!item.image_url || item.image_url.includes('placeholder') || item.image_url.includes('unsplash'))) {
            updated = true;
            return { ...item, image_url: img, imageUrl: img };
          }
          return item;
        });
        return { ...meal, items };
      });

      if (updated) {
        snapshot.meals = newMeals;
        await supabase.from('v3_diet_templates').update({ plan_snapshot: snapshot }).eq('id', template.id);
        console.log(`Updated images for v3_diet_template: ${template.title}`);
      }
    }
  }

  console.log('--- TEMPLATE IMAGE SYNC COMPLETE ---');
}

run();
