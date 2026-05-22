
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

  // Pre-fetch the visual library for faster lookup
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
    if (!snapshot) continue;

    let modified = false;

    for (const kcal of Object.keys(snapshot)) {
      const profile = snapshot[kcal];
      if (!profile.days || !Array.isArray(profile.days)) continue;

      profile.days.forEach((day: any) => {
        day.meals.forEach((meal: any) => {
          meal.items.forEach((item: any) => {
            // Repair image_url
            if (!item.imageUrl || item.imageUrl === "undefined" || item.imageUrl.includes("placeholder")) {
              const name = (item.name || item.title || "").toLowerCase().trim();
              const foundUrl = visualMap.get(name);
              if (foundUrl) {
                item.imageUrl = foundUrl;
                if (!item.visual) item.visual = {};
                item.visual.image_url = foundUrl;
                modified = true;
              } else {
                item.imageUrl = FALLBACK_IMAGE;
                if (!item.visual) item.visual = {};
                item.visual.image_url = FALLBACK_IMAGE;
                modified = true;
              }
            }
            
            // Repair macros structure
            if (!item.macros) {
              item.macros = {
                kcal: item.kcal || 0,
                protein_g: item.protein || 0,
                carbs_g: item.carbs || 0,
                fat_g: item.fat || 0
              };
              modified = true;
            }
          });
        });
      });
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
