
import { supabase } from './src/integrations/supabase/client';

const FALLBACK_IMAGE = "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/fruta.jpg";

async function repairTemplates() {
  console.log("Starting Aggressive Sovereign Repair...");
  
  const { data: templates, error } = await supabase
    .from('v3_diet_templates')
    .select('id, title, plan_snapshot');

  if (error) {
    console.error("Error fetching templates:", error);
    return;
  }

  // Fetch all images from both libraries for better matching
  const [libRes, v3Res] = await Promise.all([
    supabase.from('meal_visual_library').select('name, image_url'),
    supabase.from('v3_library_items').select('title, images:v3_library_images(image_url, image_asset)')
  ]);

  const visualMap = new Map();
  libRes.data?.forEach(item => {
    visualMap.set(item.name.toLowerCase().trim(), item.image_url);
  });
  v3Res.data?.forEach((item: any) => {
    const img = item.images?.[0]?.image_asset || item.images?.[0]?.image_url;
    if (img) visualMap.set(item.title.toLowerCase().trim(), img);
  });

  let totalRepaired = 0;

  for (const t of templates) {
    const snapshot = t.plan_snapshot as any;
    if (!snapshot) continue;

    let modified = false;

    for (const kcal of Object.keys(snapshot)) {
      const profile = snapshot[kcal];
      if (!profile?.days) continue;

      for (const day of profile.days) {
        if (!day?.meals) continue;
        for (const meal of day.meals) {
          if (!meal) continue;
          
          if (!meal.items && meal.foods) { meal.items = meal.foods; modified = true; }
          if (!meal.items) { meal.items = []; modified = true; }

          for (const item of meal.items) {
            // Aggressive Image Repair
            const currentImg = item.imageUrl || item.image_url || item.visual?.image_url;
            const isInvalid = !currentImg || String(currentImg) === "undefined" || String(currentImg) === "null" || String(currentImg).includes("placeholder");
            
            if (isInvalid) {
              const name = (item.name || item.title || "").toLowerCase().trim();
              const found = visualMap.get(name);
              const final = found || FALLBACK_IMAGE;
              
              item.imageUrl = final;
              if (!item.visual) item.visual = {};
              item.visual.image_url = final;
              item.visual.is_placeholder = !found;
              modified = true;
            }

            // Macros Repair
            if (!item.macros) {
              item.macros = {
                kcal: Math.round(item.kcal || item.calories || 0),
                protein_g: Number((item.protein || item.protein_g || 0).toFixed(1)),
                carbs_g: Number((item.carbs || item.carbs_g || 0).toFixed(1)),
                fat_g: Number((item.fat || item.fat_g || 0).toFixed(1))
              };
              modified = true;
            }
            
            // ID Repair
            if (!item.id) { item.id = crypto.randomUUID(); modified = true; }
            if (!item.instanceId) { item.instanceId = item.id; modified = true; }
          }
        }
      }
    }

    if (modified) {
      await supabase.from('v3_diet_templates').update({ plan_snapshot: snapshot }).eq('id', t.id);
      totalRepaired++;
    }
  }

  console.log(`Repaired ${totalRepaired} templates.`);
}

repairTemplates();
