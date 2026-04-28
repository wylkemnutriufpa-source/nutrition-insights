import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PatientMealPlan from '@/pages/PatientMealPlan';
import { supabase } from '@/integrations/supabase/client';
import { useExperienceUI } from '@/hooks/useExperienceUI';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({ data: null })),
          order: vi.fn(() => ({ data: [] })),
          limit: vi.fn(() => ({ maybeSingle: vi.fn(() => ({ data: null })) })),
          gte: vi.fn(() => ({ lte: vi.fn(() => ({ data: [] })) }))
        })),
        limit: vi.fn(() => ({ maybeSingle: vi.fn(() => ({ data: null })) }))
      }))
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis()
    })),
    removeChannel: vi.fn()
  }
}));

vi.mock('@/hooks/useExperienceUI', () => ({
  useExperienceUI: vi.fn()
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'test-user' } })
}));

describe('PatientMealPlan - Basic Mode', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const mockPlan = {
    id: 'plan-1',
    title: 'Test Plan',
    start_date: new Date().toISOString(),
    items: [
      {
        id: 'item-1',
        title: 'Café da Manhã Teste',
        meal_type: 'breakfast',
        day_of_week: new Date().getDay(),
        calories_target: 500,
        metadata: { calories: 500 }
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useExperienceUI as any).mockReturnValue({ isBasic: true });
    (supabase.rpc as any).mockResolvedValue({ data: mockPlan, error: null });
  });

  it('should always open on today by default in basic mode', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PatientMealPlan />
        </MemoryRouter>
      </QueryClientProvider>
    );
    
    const todayLabel = await screen.findByText(/Hoje/i);
    expect(todayLabel).toBeDefined();
  });

  it('should have accessibility attributes for current meal (AGORA)', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PatientMealPlan />
        </MemoryRouter>
      </QueryClientProvider>
    );
    
    const nowBadges = await screen.findAllByText(/Sua vez/i);
    expect(nowBadges.length).toBeGreaterThan(0);
    
    const currentRegion = screen.getByRole('region', { name: /Agora/i });
    expect(currentRegion).toHaveAttribute('aria-current', 'time');
  });

  it('should retry fetching data when "Tentar atualizar" is clicked', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({ data: null, error: { message: 'Error' } });
    
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PatientMealPlan />
        </MemoryRouter>
      </QueryClientProvider>
    );
    
    const retryButton = await screen.findByText(/Tentar atualizar/i);
    fireEvent.click(retryButton);
    
    expect(supabase.rpc).toHaveBeenCalledTimes(2);
  });
});
