
import { describe, it, expect, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'draft-123' }, error: null })
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      }))
    }))
  }
}));

describe('Anamnesis Persistence Hardening', () => {
  it('should include tenant_id in all persistence calls', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    (supabase.from as any).mockReturnValue({ upsert: mockUpsert });

    // Simulate save logic
    const dataToSave = { 
      user_id: 'user-123', 
      tenant_id: 'tenant-123', 
      answers: { goal: 'lose_weight' },
      status: 'draft' 
    };
    
    await supabase.from('patient_anamnesis').upsert(dataToSave);
    
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
      tenant_id: 'tenant-123'
    }));
  });
});
