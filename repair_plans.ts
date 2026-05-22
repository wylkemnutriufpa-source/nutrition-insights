
import { supabase } from './src/integrations/supabase/client';

const FALLBACK_IMAGE = "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/fruta.jpg";

async function repairActivePlans() {
  console.log("Starting Repair on active meal_plans snapshots...");
  
  const { data: plans, error } = await supabase
    .from('meal_plans')
    .select('id, snapshot, title')
    .eq('is_active', true);

  if (error) {
    console.error("Error fetching plans:", error);
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

  for (const p of plans) {
    const snapshot = p.snapshot as any;
    if (!snapshot || !snapshot.days) continue;

    let modified = false;

    for (const day of snapshot.days) {
      if (!day.meals) continue;
      for (const meal of day.meals) {
        if (!meal.items) continue;
        for (const item of meal.items) {
          const currentImg = item.imageUrl || item.image_url || item.visual?.image_url;
          const isInvalid = !currentImg || String(currentImg) === "undefined" || String(currentImg) === "null" || String(currentImg).includes("placeholder");
          
          if (isInvalid) {
            const name = (item.name || item.title || "").toLowerCase().trim();
            const found = visualMap.get(name);
            const final = found || FALLBACK_IMAGE;
            
            item.imageUrl = final;
            if (!item.visual) item.visual = {};
            item.visual.image_url = final;
            modified = true;
          }

          if (!item.macros) {
            item.macros = {
              kcal: Math.round(item.kcal || 0),
              protein_g: Number((item.protein || 0).toFixed(1)),
              carbs_g: Number((item.carbs || 0).toFixed(1)),
              fat_g: Number((item.fat || 0).toFixed(1))
            };
            modified = true;
          }
        }
      }
    }

    if (modified) {
      await supabase.from('meal_plans').update({ snapshot }).eq('id', p.id);
      repairedCount++;
    }
  }

  console.log(`Repaired ${repairedCount} active plans.`);
}

repairActivePlans();
