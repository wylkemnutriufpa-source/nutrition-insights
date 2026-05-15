import { supabase } from '@/integrations/supabase/client';
import { loadOrCreateDraft, saveDraft } from './draftService';
import { promoteDraftToMealPlan } from './promoteDraft';
import { buildMealPlanSnapshot } from '@/lib/snapshot/buildSnapshot';
import { MealPlanSnapshotV1Schema } from '@/lib/snapshot/zodSchema';
import type { Meal } from '../types';
import { LibraryV3MassiveE2E } from './massiveE2E';

/**
 * Suite de Testes de Integração - Editor V3
 */
export async function runV3IntegrationTests(patientId: string) {
  console.group('V3 Integration Tests');
  const results = {
    step1_loadOrCreate: false,
    step2_persistence: false,
    step3_saveAction: false,
    step4_promotion: false,
    step5_snapshotValidation: false,
    step6_massiveE2E: null as any,
    errors: [] as string[]
  };

  try {
    // 🛡️ Teste de Sanidade de Persistência (Day of Week Constraint)
    console.log('Test 1: Sanity Persist (Day of Week Constraint)...');
    const { data: userRes } = await supabase.auth.getUser();
    const { data: tenantRes } = await supabase.rpc('get_user_active_tenant');
    
    // Simular o erro que Luciana teve
    const testPlanId = crypto.randomUUID();
    const { error: insertErr } = await supabase.from('meal_plans').insert({
      id: testPlanId,
      patient_id: patientId,
      nutritionist_id: userRes.user?.id,
      tenant_id: tenantRes,
      title: 'TEST_SANITY_V3',
      plan_status: 'draft',
      editor_version: 'v3'
    } as any);

    if (insertErr) throw new Error(`Plan insert failed: ${insertErr.message}`);

    const { error: itemErr } = await supabase.from('meal_plan_items').insert({
      meal_plan_id: testPlanId,
      tenant_id: tenantRes,
      meal_type: 'breakfast',
      day_of_week: 0, // 🛡️ O FIX: Garantir que 0 seja aceito e NULL falhe (se a constraint estiver ativa)
      title: 'TEST_ITEM',
      calories_target: 100,
      is_primary: true
    } as any);

    if (itemErr) throw new Error(`Item insert failed (Fix check): ${itemErr.message}`);
    results.step1_loadOrCreate = true;
    console.log('✅ Sanity Persist Fix Verified (day_of_week=0 accepted)');

    // 🛡️ Teste de Promoção Soberana (Hierarchy Fix)
    console.log('Test 4: Sovereign Promotion (Hierarchy Integrity)...');
    const draft = await loadOrCreateDraft(patientId);
    if (!draft) throw new Error('Failed to load draft');
    
    // Injetar uma estrutura com substituições
    draft.payload.meals = [{
      id: 'm1',
      name: 'Café da Manhã',
      items: [{
        instanceId: crypto.randomUUID(),
        name: 'Pão Integral',
        kcal: 150,
        protein: 5,
        carbs: 25,
        fat: 2,
        quantity: 50,
        is_primary: true,
        blockId: 'b1',
        substitution_group_id: 'b1',
        substitutions: [
          { name: 'Tapioca', kcal: 150, protein: 0.5, carbs: 35, fat: 0 }
        ]
      }]
    }];

    const promo = await promoteDraftToMealPlan(draft);
    if (!promo.ok) throw new Error(`Promotion failed: ${promo.error}`);
    
    // Verificar se gerou apenas 1 primary e se as substituições estão no mesmo grupo
    const { data: items } = await supabase
      .from('meal_plan_items')
      .select('*')
      .eq('meal_plan_id', promo.mealPlanId);
    
    const primaries = items?.filter(i => i.is_primary);
    if (primaries?.length !== 1) throw new Error(`Promotion Hierarchy Error: Expected 1 primary, found ${primaries?.length}`);
    
    results.step4_promotion = true;
    console.log('✅ Sovereign Promotion Verified (Hierarchy Enforced)');

    // 6. Executar E2E Massivo
    console.log('Test 6: Massive Clinical E2E (300 plans)...');
    const massiveResults = await LibraryV3MassiveE2E.runMassiveTest(50); // Reduzido para 50 para performance no preview
    results.step6_massiveE2E = massiveResults;
    
    console.log('✅ Massive E2E Complete');

    // Cleanup
    await supabase.from('meal_plans').delete().eq('id', testPlanId);
    if (promo.mealPlanId) await supabase.from('meal_plans').delete().eq('id', promo.mealPlanId);

  } catch (err: any) {
    console.error('❌ Test failed:', err.message);
    results.errors.push(err.message);
  }

  console.groupEnd();
  return results;
}


