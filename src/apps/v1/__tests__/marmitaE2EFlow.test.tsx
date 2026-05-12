
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mocks
import NextMealWidget from '@/components/patient/NextMealWidget';

vi.mock('@/integrations/supabase/client', () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    then: vi.fn()
  };
  return { supabase: { from: vi.fn(() => mockQuery) } };
});

vi.mock('@/lib/auth', () => ({ 
  useAuth: () => ({ user: { id: 'patient-123' }, loading: false })
}));

vi.mock('@/lib/tenantContext', () => ({
  useTenant: () => ({ tenantId: 'tenant-123' })
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('Validação E2E: Visualização Paciente', () => {
  const mockPlanId = 'plan-789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Paciente deve visualizar macros corretos (sem zerar)', async () => {
    const mockSupabase = supabase as any;
    
    mockSupabase.from.mockImplementation((table: string) => {
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(() => {
          if (table === 'meal_plans') {
            return Promise.resolve({ data: { id: mockPlanId }, error: null });
          }
          if (table === 'meal_plan_items') {
            const dayOfWeek = (new Date().getDay() + 6) % 7;
            return Promise.resolve({ 
              data: [
                { meal_type: 'lunch', title: 'Marmita E2E', calories_target: 2000, protein_target: 150, carbs_target: 200, fat_target: 60, day_of_week: dayOfWeek }
              ], 
              error: null 
            });
          }
          return Promise.resolve({ data: [], error: null });
        })
      };
      // For grouped queries that use .then()
      chain.then = (resolve: any) => chain.maybeSingle().then(resolve);
      return chain;
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NextMealWidget />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Kcal pill should show the mock value (2000)
    const kcalPill = await screen.findByText(/2000 kcal/i);
    expect(kcalPill).toBeInTheDocument();
    expect(screen.getByText(/P 150g/i)).toBeInTheDocument();
    
    console.log("✅ Validação de macros concluída: Paciente visualiza 2000 kcal corretamente.");
  });
});
