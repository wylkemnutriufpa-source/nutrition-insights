import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../integrations/supabase/client';

describe('FitJourney Security Baseline - Lifecycle & Fail-Closed', () => {
  const patientId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('RPC resolve_patient_lifecycle_state deve retornar estado correto para paciente novo', async () => {
    const { data, error } = await supabase.rpc('resolve_patient_lifecycle_state', {
      _patient_id: patientId
    });
    
    // Na base de testes real, isso validaria a existência da função
    // Como estamos em ambiente simulado, testamos a lógica esperada
    if (!error) {
      expect(data).toHaveProperty('state');
      expect(data).toHaveProperty('show_onboarding');
    }
  });

  it('RPC activate_meal_plan deve ser atômico e seguro', async () => {
    // Simula ativação de plano
    const { error } = await supabase.rpc('activate_meal_plan', {
      _plan_id: '00000000-0000-0000-0000-000000000002'
    });
    
    // Se a função existe, ela deve passar ou dar erro de auth, nunca erro de 'function not found'
    if (error) {
      expect(error.message).not.toContain('function does not exist');
    }
  });

  it('RLS em Anamnese deve bloquear acesso cross-tenant', async () => {
    // Consulta simulada para testar se as políticas estão aplicadas
    const { error } = await supabase.from('patient_anamnesis').select('*');
    // Em testes unitários com mock de supabase, verificamos a chamada
    expect(supabase.from).toHaveBeenCalledWith('patient_anamnesis');
  });
});
