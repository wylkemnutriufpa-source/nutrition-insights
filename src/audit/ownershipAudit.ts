import { supabase } from './src/integrations/supabase/client';

async function auditOwnership() {
  console.log('--- AUDITORIA DE OWNERSHIP ---');
  
  // 1. Verificar órfãos
  const { data: orphans, error: err1 } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('is_orphan', true);
  
  console.log(`Pacientes Órfãos: ${orphans?.length || 0}`);
  if (orphans && orphans.length > 0) {
    orphans.forEach(o => console.log(` - ${o.full_name} (${o.email})`));
  }

  // 2. Verificar duplicações de vínculo
  const { data: duplicates, error: err2 } = await supabase.rpc('check_duplicate_relationships');
  console.log(`Vínculos Duplicados: ${duplicates ? 'SIM' : 'NÃO'}`);

  // 3. Verificar se há pacientes sem nutricionista associado
  const { data: missingLinks, error: err3 } = await supabase
    .from('profiles')
    .select('id, full_name')
    .is('experience_mode', 'patient')
    .not('id', 'in', (
      await supabase.from('nutritionist_patients').select('patient_id')
    ).data?.map(r => r.patient_id) || []);

  console.log(`Pacientes sem vínculo ativo: ${missingLinks?.length || 0}`);
}

// auditOwnership(); // Will be called via exec in a node script
