
import { supabase } from './src/integrations/supabase/client';

const FALLBACK_IMAGE = "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/fruta.jpg";

async function repairTemplates() {
  console.log("Starting Sovereign Repair on v3_diet_templates...");
  
  const { data: templates, error } = await supabase
    .from('v3_diet_templates')
    .select('id, title, plan_snapshot');

  if (error) {
    console.error("Error fetching templates:", error);
    return;
  }

  const { data: visualLibrary } = await supabase
    .from('meal_visual_library')
    .select('name, image_url')
    .eq('is_active', true);

  const visualMap = new Map();
  visualLibrary?.forEach(item => {
    visualMap.set(item.name.toLowerCase().trim(), item.image_url);
  });

  let repairedCount = 0;

  for (const t of templates) {
    const snapshot = t.plan_snapshot as any;
    if (!snapshot || typeof snapshot !== 'object') continue;

    let modified = false;

    for (const kcal of Object.keys(snapshot)) {
      const profile = snapshot[kcal];
      if (!profile || !profile.days || !Array.isArray(profile.days)) continue;

      for (const day of profile.days) {
        if (!day || !day.meals || !Array.isArray(day.meals)) continue;

        for (const meal of day.meals) {
          if (!meal) continue;
          
          // Force items existence
          if (!meal.items) {
             if (Array.isArray(meal.foods)) {
               meal.items = meal.foods;
             } else {
               meal.items = [];
             }
             modified = true;
          }

          if (!Array.isArray(meal.items)) {
            meal.items = [];
            modified = true;
          }

          for (const item of meal.items) {
            if (!item) continue;

            // Repair image_url
            const existingImg = item.imageUrl || item.image_url || item.visual?.image_url;
            if (!existingImg || existingImg === "undefined" || existingImg === "null" || String(existingImg).includes("placeholder")) {
              const name = (item.name || item.title || "").toLowerCase().trim();
              const foundUrl = visualMap.get(name);
              const finalUrl = foundUrl || FALLBACK_IMAGE;
              
              item.imageUrl = finalUrl;
              if (!item.visual) item.visual = {};
              item.visual.image_url = finalUrl;
              item.visual.is_placeholder = !foundUrl;
              modified = true;
            }
            
            // Repair macros structure
            if (!item.macros) {
              item.macros = {
                kcal: Math.round(item.kcal || item.calories || 0),
                protein_g: Number((item.protein || item.protein_g || 0).toFixed(1)),
                carbs_g: Number((item.carbs || item.carbs_g || 0).toFixed(1)),
                fat_g: Number((item.fat || item.fat_g || 0).toFixed(1))
              };
              modified = true;
            }

            // Ensure stable IDs
            if (!item.id) {
               item.id = crypto.randomUUID();
               modified = true;
            }
            if (!item.instanceId) {
               item.instanceId = item.id;
               modified = true;
            }
          }
        }
      }
    }

    if (modified) {
      const { error: updateError } = await supabase
        .from('v3_diet_templates')
        .update({ plan_snapshot: snapshot })
        .eq('id', t.id);
      
      if (updateError) {
        console.error(`Error updating template ${t.title}:`, updateError);
      } else {
        repairedCount++;
      }
    }
  }

  console.log(`Repaired ${repairedCount} templates successfully.`);
}

repairTemplates();
