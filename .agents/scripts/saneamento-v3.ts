
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("--- Starting Structural Sanitization (Etapa 1) ---");
  
  const { data: templates, error } = await supabase
    .from('v3_diet_templates')
    .select('id, title, plan_snapshot');

  if (error) {
    console.error("Error fetching templates:", error);
    return;
  }

  let totalConverted = 0;
  let totalInvalid = 0;
  let totalOrphan = 0;
  let totalIncompatible = 0;
  let unusableSnapshots = 0;

  for (const template of templates) {
    let modified = false;
    const planSnapshot = template.plan_snapshot as any;
    
    if (!planSnapshot) {
        totalOrphan++;
        continue;
    }

    for (const kcalLevel in planSnapshot) {
      const levelData = planSnapshot[kcalLevel];
      if (levelData.days) {
        for (const day of levelData.days) {
          if (day.meals) {
            for (const meal of day.meals) {
              if (meal.foods && !meal.items) {
                // Conversion logic
                meal.items = meal.foods.map((food: any) => ({
                  id: crypto.randomUUID(),
                  instanceId: crypto.randomUUID(),
                  name: food.name,
                  title: food.name,
                  kcal: food.kcal || 0,
                  quantity: 1,
                  quantity_display: food.qty || '',
                  clinical_mass_g: 0, // Placeholder
                  protein: 0,
                  carbs: 0,
                  fat: 0,
                  macros: {
                    kcal: food.kcal || 0,
                    protein_g: 0,
                    carbs_g: 0,
                    fat_g: 0
                  },
                  is_primary: false,
                  substitutions: []
                }));
                delete meal.foods;
                modified = true;
              }
            }
          }
        }
      }
    }

    if (modified) {
      const { error: updateError } = await supabase
        .from('v3_diet_templates')
        .update({ plan_snapshot: planSnapshot })
        .eq('id', template.id);

      if (updateError) {
        console.error(`Error updating template ${template.id}:`, updateError);
        totalInvalid++;
      } else {
        totalConverted++;
      }
    }
  }

  console.log("\n--- Structural Sanitization Report ---");
  console.log(`Total Converted: ${totalConverted}`);
  console.log(`Total Invalid: ${totalInvalid}`);
  console.log(`Total Orphan (no plan_snapshot): ${totalOrphan}`);
  console.log(`Total Incompatible: ${totalIncompatible}`);
  console.log(`Snapshots Still Unusable (placeholder): ${unusableSnapshots}`);
}

run();
