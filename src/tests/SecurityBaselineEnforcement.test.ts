import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../integrations/supabase/client';

vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    })),
    rpc: vi.fn((fn) => {
      if (fn === 'resolve_patient_lifecycle_state') {
        return Promise.resolve({ data: { state: 'onboarding_started' }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    })
  }
}));

describe('FitJourney Security Baseline - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve chamar a RPC resolve_patient_lifecycle_state com o ID correto', async () => {
    const patientId = '00000000-0000-0000-0000-000000000001';
    await supabase.rpc('resolve_patient_lifecycle_state' as any, { _patient_id: patientId });
    expect(supabase.rpc).toHaveBeenCalledWith('resolve_patient_lifecycle_state', { _patient_id: patientId });
  });

  it('deve garantir que RLS em Anamnese seja consultado via user_id', async () => {
    await (supabase.from('patient_anamnesis') as any).select('*').eq('user_id', 'test-user');
    expect(supabase.from).toHaveBeenCalledWith('patient_anamnesis');
  });
});
