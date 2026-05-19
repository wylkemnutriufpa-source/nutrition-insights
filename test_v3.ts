import { supabase } from "./src/integrations/supabase/client";

async function testAllTemplates() {
  const nutritionistId = "67f47696-a778-4ada-9ff9-9615fb7a7c48";
  
  console.log("Fetching V3 Templates...");
  const { data: templates } = await supabase.from("v3_diet_templates").select("*");
  if (!templates) return;

  for (const template of templates) {
    console.log(`Testing template: ${template.title}`);
    if (!template.plan_snapshot) {
      console.error(`ERROR: ${template.title} has no plan_snapshot`);
      continue;
    }
    
    const kcal = template.kcal_profiles?.[0];
    if (!kcal) {
      console.error(`ERROR: ${template.title} has no kcal_profiles`);
      continue;
    }

    const profile = template.plan_snapshot[String(kcal)];
    if (!profile) {
      console.error(`ERROR: ${template.title} has no profile for ${kcal} kcal`);
      continue;
    }

    const day = profile.days?.[0];
    if (!day || !day.meals || day.meals.length === 0) {
      console.error(`ERROR: ${template.title} has no meals in first day`);
      continue;
    }

    console.log(`SUCCESS: ${template.title} is valid with ${day.meals.length} meals`);
  }
}

testAllTemplates();
