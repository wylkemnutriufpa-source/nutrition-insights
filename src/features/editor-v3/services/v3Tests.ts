import { supabase } from '@/integrations/supabase/client';
import { loadOrCreateDraft, saveDraft } from './draftService';
import type { Meal } from '../types';

/**
 * Suite de Testes de Integração - Editor V3
 */
export async function runV3IntegrationTests(patientId: string) {
  console.group('V3 Integration Tests');
  const results = {
    step1_loadOrCreate: false,
    step2_persistence: false,
    step3_saveAction: false,
    errors: [] as string[]
  };

  try {
    // 1. Validar criação automática de draft
    console.log('Test 1: loadOrCreateDraft...');
    const draft = await loadOrCreateDraft(patientId);
    if (draft && draft.id) {
      console.log('✅ Draft ID:', draft.id);
      results.step1_loadOrCreate = true;
    } else {
      throw new Error('Draft initialization failed (null returned)');
    }

    // 2. Validar persistência no banco
    console.log('Test 2: DB persistence check...');
    const { data: dbRecord, error: dbErr } = await supabase
      .from('v3_drafts' as any)
      .select('id')
      .eq('id', (draft as any).id)
      .single();

    if (dbErr || !dbRecord) {
      throw new Error(`Draft not found in DB after creation: ${dbErr?.message}`);
    }
    console.log('✅ Found in DB');
    results.step2_persistence = true;

    // 3. Validar ação de save
    console.log('Test 3: saveDraft...');
    const mealsToSave: Meal[] = (draft as any).payload.meals;
    const saved = await saveDraft((draft as any).id, mealsToSave);
    
    if (saved && (saved as any).id === (draft as any).id) {
      console.log('✅ Save successful');
      results.step3_saveAction = true;
    } else {
      throw new Error('Save action failed to return valid record');
    }

  } catch (err: any) {
    console.error('❌ Test failed:', err.message);
    results.errors.push(err.message);
  }

  console.groupEnd();
  return results;
}
