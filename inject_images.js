
import { supabase } from "./src/integrations/supabase/client.js";

async function run() {
  console.log("Starting Template Visual Injection...");

  // 1. Get Library
  const { data: library } = await supabase
    .from('meal_visual_library')
    .select('name, display_name, image_url');

  if (!library) {
    console.error("Library not found");
    return;
  }

  const imageMap = new Map();
  library.forEach(item => {
    if (item.image_url) {
      imageMap.set(item.name.toLowerCase().trim(), item.image_url);
      imageMap.set(item.display_name.toLowerCase().trim(), item.image_url);
    }
  });

  // 2. Process V3 Templates
  const { data: v3Templates } = await supabase
    .from('v3_diet_templates')
    .select('*');

  if (v3Templates) {
    for (const template of v3Templates) {
      if (!template.plan_snapshot) continue;
      
      let changed = false;
      const snapshot = template.plan_snapshot;

      // Iterate through kcal profiles
      for (const kcal in snapshot) {
        if (snapshot[kcal].meals) {
          snapshot[kcal].meals.forEach(meal => {
            if (meal.items) {
              meal.items.forEach(item => {
                const name = (item.name || item.title || "").toLowerCase().trim();
                const matchedUrl = imageMap.get(name);
                if (matchedUrl && !item.imageUrl) {
                  item.imageUrl = matchedUrl;
                  changed = true;
                  console.log(`Matched: ${name} -> ${matchedUrl}`);
                }
                
                // Process substitutions
                if (item.substitutions) {
                   item.substitutions.forEach(sub => {
                     const subName = (sub.name || sub.title || "").toLowerCase().trim();
                     const subMatchedUrl = imageMap.get(subName);
                     if (subMatchedUrl && !sub.imageUrl) {
                       sub.imageUrl = subMatchedUrl;
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
        await supabase
          .from('v3_diet_templates')
          .update({ plan_snapshot: snapshot })
          .eq('id', template.id);
        console.log(`Updated V3 template: ${template.title}`);
      }
    }
  }

  // 3. Process Legacy Diet Templates (just in case)
  const { data: dietTemplates } = await supabase
    .from('diet_templates')
    .select('*');

  if (dietTemplates) {
    for (const template of dietTemplates) {
      let changed = false;
      
      // Update meals jsonb
      if (Array.isArray(template.meals)) {
        template.meals.forEach(meal => {
           if (meal.items) {
             meal.items.forEach(item => {
               const name = (item.name || item.title || "").toLowerCase().trim();
               const matchedUrl = imageMap.get(name);
               if (matchedUrl && !item.image_url) {
                 item.image_url = matchedUrl;
                 changed = true;
               }
             });
           }
        });
      }

      // Update caloric_versions
      if (Array.isArray(template.caloric_versions)) {
        template.caloric_versions.forEach(version => {
           if (version.meals) {
             version.meals.forEach(meal => {
                if (meal.items) {
                  meal.items.forEach(item => {
                    const name = (item.name || item.title || "").toLowerCase().trim();
                    const matchedUrl = imageMap.get(name);
                    if (matchedUrl && !item.image_url) {
                      item.image_url = matchedUrl;
                      changed = true;
                    }
                  });
                }
             });
           }
        });
      }

      if (changed) {
        await supabase
          .from('diet_templates')
          .update({ 
            meals: template.meals,
            caloric_versions: template.caloric_versions
          })
          .eq('id', template.id);
        console.log(`Updated Legacy template: ${template.name}`);
      }
    }
  }

  console.log("Done!");
}

run();
