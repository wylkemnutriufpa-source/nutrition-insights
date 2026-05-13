
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const planId = "c5b81568-8865-4008-bdb5-fc672eb6b58d";

async function repair() {
  console.log(`[REPAIR] Fetching data for plan ${planId}`);
  
  const { data: plan, error: planErr } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('id', planId)
    .single();
    
  if (planErr) throw planErr;
  
  const { data: items, error: itemsErr } = await supabase
    .from('meal_plan_items')
    .select('*')
    .eq('meal_plan_id', planId);
    
  if (itemsErr) throw itemsErr;

  console.log(`[REPAIR] Found ${items.length} items. Building snapshot...`);

  // Simple grouping for single_day
  const mealsMap = new Map();
  for (const it of items) {
    const mealType = it.meal_type || 'unspecified';
    if (!mealsMap.has(mealType)) mealsMap.set(mealType, []);
    
    mealsMap.get(mealType).push({
      id: it.id,
      title: it.title,
      description: it.description,
      image_url: it.image_url,
      is_primary: it.is_primary,
      macros: {
        kcal: it.calories_target,
        protein_g: it.protein_target,
        carbs_g: it.carbs_target,
        fat_g: it.fat_target
      },
      edit_metadata: it.edit_metadata
    });
  }

  const snapshot = {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    plan: {
      plan_id: plan.id,
      title: plan.title,
      editor_version: "v3"
    },
    days: [
      {
        day_of_week: 0,
        meals: Array.from(mealsMap.entries()).map(([type, items]) => ({
          meal_type: type,
          items: items
        }))
      }
    ],
    targets: {
      kcal: plan.total_target_calories,
      protein_g: plan.total_target_protein,
      carbs_g: plan.total_target_carbs,
      fat_g: plan.total_target_fat
    }
  };

  console.log(`[REPAIR] Snapshot built. Persisting...`);

  const { error: updateErr } = await supabase
    .from('meal_plans')
    .update({
      snapshot: snapshot,
      snapshot_schema_version: "1.0.0",
      snapshot_generated_at: new Date().toISOString()
    })
    .eq('id', planId);

  if (updateErr) throw updateErr;

  console.log(`[REPAIR] SUCCESS. Plan ${planId} repaired.`);
}

repair().catch(console.error);
