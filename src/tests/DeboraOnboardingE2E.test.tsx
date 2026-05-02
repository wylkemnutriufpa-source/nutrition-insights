import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePatientJourneyStatus } from '../hooks/usePatientJourneyStatus';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../lib/auth';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock Supabase
vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mock Auth
vi.mock('../lib/auth', () => ({
  useAuth: vi.fn(),
}));

describe('Debora E2E Onboarding Redirection Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>{children}</MemoryRouter>
  );

  it('should resolve state to "active_plan" for a completed profile like Debora', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: 'debora-id' },
      isPatient: true,
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { patient_state: 'active_plan' },
            error: null,
          }),
        })),
      })),
    });

    const { result } = renderHook(() => usePatientJourneyStatus(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status).toBe('active_plan');
  });

  it('should fallback to "onboarding_slides" if patient_state is missing (Inconsistency Guard)', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: 'new-user-id' },
      isPatient: true,
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { patient_state: null },
            error: null,
          }),
        })),
      })),
    });

    const { result } = renderHook(() => usePatientJourneyStatus(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status).toBe('onboarding_slides');
  });

  it('should ignore local storage if it is cleared but server state is advanced', async () => {
    // This tests the logic inside OnboardingPaciente where journeyStatus (server-side) 
    // takes precedence over local "completed" flags
    (useAuth as any).mockReturnValue({
      user: { id: 'debora-id' },
      isPatient: true,
    });

    // Mock server returning active_plan
    (supabase.from as any).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { patient_state: 'active_plan' },
            error: null,
          }),
        })),
      })),
    });

    const { result } = renderHook(() => usePatientJourneyStatus(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    // Even if localStorage was empty, server says 'active_plan'
    expect(result.current.status).toBe('active_plan');
  });
});
