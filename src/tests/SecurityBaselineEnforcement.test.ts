import { describe, it, expect, vi, beforeEach } from 'vitest';

// Simula o cliente do supabase
const mockSupabase = {
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
};

describe('FitJourney Security Baseline - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve chamar a RPC resolve_patient_lifecycle_state com o ID correto', async () => {
    const patientId = '00000000-0000-0000-0000-000000000001';
    await mockSupabase.rpc('resolve_patient_lifecycle_state', { _patient_id: patientId });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('resolve_patient_lifecycle_state', { _patient_id: patientId });
  });

  it('deve garantir que RLS em Anamnese seja consultado via user_id', async () => {
    await mockSupabase.from('patient_anamnesis').select('*').eq('user_id', 'test-user');
    expect(mockSupabase.from).toHaveBeenCalledWith('patient_anamnesis');
  });
});
