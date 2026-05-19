
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const PATIENT_ID = '6699274a-af91-48e6-8163-36ca484b3c2b'; // Silvia Luz
const NUTRITIONIST_ID = '38b17a2b-2ac0-4df0-8d12-ec602e3ab704';
const TENANT_ID = '20081963-8db9-4a6c-8181-6a820b86e12f';

async function auditTemplates() {
  console.log("🚀 Starting Template Audit for patient Silvia Luz...");
  
  const results = {
    v3: [] as any[],
    v2: [] as any[]
  };

  // 1. Fetch V3 Templates
  const { data: v3Templates, error: v3Err } = await supabase
    .from('v3_diet_templates')
    .select('*')
    .eq('active', true);

  if (v3Err) {
    console.error("Error fetching V3 templates:", v3Err);
  } else {
    for (const t of v3Templates || []) {
      const audit: any = { id: t.id, title: t.title, version: 'V3', status: 'pending', reason: '' };
      try {
        if (!t.plan_snapshot) {
          audit.status = 'fail';
          audit.reason = 'Missing plan_snapshot';
        } else {
          const profiles = Object.keys(t.plan_snapshot);
          if (profiles.length === 0) {
            audit.status = 'fail';
            audit.reason = 'Empty plan_snapshot (no calorie profiles)';
          } else {
            const firstProfile = t.plan_snapshot[profiles[0]];
            if (!firstProfile || !firstProfile.days || firstProfile.days.length === 0) {
              audit.status = 'fail';
              audit.reason = 'First profile is empty or has no days';
            } else {
              const totalItems = firstProfile.days[0].meals.reduce((acc: number, m: any) => acc + (m.items?.length || 0), 0);
              if (totalItems === 0) {
                audit.status = 'fail';
                audit.reason = 'Template has no items in any meal';
              } else {
                audit.status = 'pass';
                audit.details = `${profiles.length} profiles, ${totalItems} items in first profile.`;
              }
            }
          }
        }
      } catch (e: any) {
        audit.status = 'fail';
        audit.reason = e.message;
      }
      results.v3.push(audit);
    }
  }

  // 2. Fetch V2 Templates
  const { data: v2Templates, error: v2Err } = await supabase
    .from('diet_templates')
    .select('*')
    .eq('is_active', true);

  if (v2Err) {
    console.error("Error fetching V2 templates:", v2Err);
  } else {
    for (const t of v2Templates || []) {
      const audit: any = { id: t.id, title: t.name, version: 'V2', status: 'pending', reason: '' };
      try {
        const meals = t.meals || [];
        if (meals.length === 0) {
          audit.status = 'fail';
          audit.reason = 'Empty meals array';
        } else {
          let totalItems = 0;
          let hasEmptyMeals = false;
          for (const m of meals) {
            const blocks = m.blocks || [];
            const foods = m.foods || [];
            const itemsInMeal = blocks.reduce((acc: number, b: any) => acc + (b.options?.length || 0), 0) + foods.length;
            if (itemsInMeal === 0) hasEmptyMeals = true;
            totalItems += itemsInMeal;
          }

          if (totalItems === 0) {
            audit.status = 'fail';
            audit.reason = 'Total items is 0';
          } else if (hasEmptyMeals) {
            audit.status = 'warning';
            audit.reason = 'Some meals are empty, but has total items';
          } else {
            audit.status = 'pass';
            audit.details = `${meals.length} meals, ${totalItems} total items.`;
          }
        }
      } catch (e: any) {
        audit.status = 'fail';
        audit.reason = e.message;
      }
      results.v2.push(audit);
    }
  }

  console.log("\n--- AUDIT SUMMARY ---");
  console.log(`V3: ${results.v3.filter(r => r.status === 'pass').length} passed, ${results.v3.filter(r => r.status === 'fail').length} failed`);
  console.log(`V2: ${results.v2.filter(r => r.status === 'pass').length} passed, ${results.v2.filter(r => r.status === 'fail').length} failed`);
  
  console.log("\nDetailed Fails:");
  [...results.v3, ...results.v2].filter(r => r.status === 'fail').forEach(r => {
    console.log(`- [${r.version}] ${r.title}: ${r.reason}`);
  });

  return results;
}

auditTemplates().catch(console.error);
