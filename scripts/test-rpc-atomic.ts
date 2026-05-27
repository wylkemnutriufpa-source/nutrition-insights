
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  const patientId = '73f27125-9f5b-4395-8857-4170e599b50b';
  const nutritionistId = '902a249c-a128-4467-9d7a-ec4b8d7894d3';
  const tenantId = '20081963-8db9-4a6c-8181-6a820b86e12f';

  console.log('--- TEST 1: Publish Empty Plan ---');
  try {
    const { data, error } = await supabase.rpc('publish_meal_plan_v3', {
      p_plan_id: null,
      p_patient_id: patientId,
      p_nutritionist_id: nutritionistId,
      p_tenant_id: tenantId,
      p_payload: { title: 'Empty Plan', start_date: '2026-05-27' },
      p_items: []
    });
    console.log('Result:', data, error ? `Error: ${error.message}` : 'Success');
  } catch (e) {
    console.log('Caught Error:', e);
  }

  console.log('\n--- Setup for Test 2 ---');
  // Create an active plan manually
  const { data: initialPlan } = await supabase.from('meal_plans').insert({
    patient_id: patientId,
    nutritionist_id: nutritionistId,
    tenant_id: tenantId,
    title: 'Initial Active Plan',
    is_active: true,
    plan_status: 'published_to_patient',
    start_date: '2026-05-27',
    editor_version: 'v3'
  }).select().single();
  console.log('Initial Plan ID:', initialPlan.id);

  console.log('\n--- TEST 2: Rollback on Error ---');
  const { error: error2 } = await supabase.rpc('publish_meal_plan_v3', {
    p_plan_id: null,
    p_patient_id: patientId,
    p_nutritionist_id: nutritionistId,
    p_tenant_id: tenantId,
    p_payload: { title: 'Broken Plan' }, // Missing start_date in payload logic? Wait, payload is just JSONB
    p_items: [] // Empty items will trigger RAISE EXCEPTION
  });
  console.log('RPC Error:', error2?.message);

  const { data: checkPlan } = await supabase.from('meal_plans').select('id, is_active').eq('id', initialPlan.id).single();
  console.log('Initial Plan still active after failed RPC?', checkPlan?.is_active);

  console.log('\n--- TEST 3: Publish Valid Plan ---');
  const validItems = [{
    tipo_refeicao: 'Café',
    day_of_week: 1,
    title: 'Banana',
    description: '1 unidade',
    meta_calorias: 100,
    meta_proteinas: 1,
    meta_carboidratos: 25,
    meta_gorduras: 0,
    image_url: '...',
    is_primary: true,
    substitution_group_id: '73f27125-9f5b-4395-8857-4170e599b50b'
  }];

  const { data: validRes, error: validErr } = await supabase.rpc('publish_meal_plan_v3', {
    p_plan_id: null,
    p_patient_id: patientId,
    p_nutritionist_id: nutritionistId,
    p_tenant_id: tenantId,
    p_payload: { 
        title: 'Valid Plan V3', 
        start_date: '2026-05-27', 
        total_meta_calorias: 100,
        total_meta_proteinas: 1,
        total_meta_carboidratos: 25,
        total_meta_gorduras: 0,
        snapshot: { targets: { kcal: 100 } }
    },
    p_items: validItems
  });

  if (validErr) {
    console.log('Valid Plan Error:', validErr.message);
  } else {
    console.log('Valid Plan Success! New ID:', validRes.plan_id);
    const { data: newPlanCheck } = await supabase.from('meal_plans').select('is_active').eq('id', validRes.plan_id).single();
    const { data: oldPlanCheck } = await supabase.from('meal_plans').select('is_active, plan_status').eq('id', initialPlan.id).single();
    const { data: itemsCheck } = await supabase.from('meal_plan_items').select('id').eq('meal_plan_id', validRes.plan_id);

    console.log('New Plan is_active:', newPlanCheck?.is_active);
    console.log('Old Plan is_active:', oldPlanCheck?.is_active);
    console.log('Old Plan status:', oldPlanCheck?.plan_status);
    console.log('Items inserted count:', itemsCheck?.length);
  }

  // Cleanup
  await supabase.from('meal_plan_items').delete().eq('meal_plan_id', initialPlan.id);
  if (validRes?.plan_id) await supabase.from('meal_plan_items').delete().eq('meal_plan_id', validRes.plan_id);
  await supabase.from('meal_plans').delete().in('id', [initialPlan.id, validRes?.plan_id].filter(Boolean));
}

runTests();
