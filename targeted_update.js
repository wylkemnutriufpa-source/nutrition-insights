
import { supabase } from "./src/integrations/supabase/client.js";

async function run() {
  const { data: library } = await supabase.from('meal_visual_library').select('name, display_name, image_url');
  if (!library) return;

  const normalize = (s) => (s || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  
  const imageMap = new Map();
  library.forEach(item => {
    if (item.image_url) {
      imageMap.set(normalize(item.name), item.image_url);
      imageMap.set(normalize(item.display_name), item.image_url);
    }
  });

  const { data: v3Templates } = await supabase.from('v3_diet_templates').select('*');
  if (v3Templates) {
    for (const template of v3Templates) {
      let changed = false;
      const snapshot = template.plan_snapshot;
      if (!snapshot) continue;

      for (const kcal in snapshot) {
        if (snapshot[kcal].meals) {
          snapshot[kcal].meals.forEach(meal => {
            if (meal.items) {
              meal.items.forEach(item => {
                const normName = normalize(item.name || item.title);
                const matchedUrl = imageMap.get(normName);
                if (matchedUrl && (!item.imageUrl || item.imageUrl.includes('unsplash'))) {
                  item.imageUrl = matchedUrl;
                  changed = true;
                }
                if (item.substitutions) {
                  item.substitutions.forEach(sub => {
                    const normSub = normalize(sub.name || sub.title);
                    const matchedSubUrl = imageMap.get(normSub);
                    if (matchedSubUrl && (!sub.imageUrl || sub.imageUrl.includes('unsplash'))) {
                      sub.imageUrl = matchedSubUrl;
                      changed = true;
                    }
                  });
                }
              });
            }
          });
        }
      }
      if (changed) {
        await supabase.from('v3_diet_templates').update({ plan_snapshot: snapshot }).eq('id', template.id);
        console.log(`Updated images for: ${template.title}`);
      }
    }
  }
}
run();
