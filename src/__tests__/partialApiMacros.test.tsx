
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Componentes a testar
import NextMealWidget from '@/components/patient/NextMealWidget';
import PatientMealPlan from '@/pages/PatientMealPlan';

vi.mock('@/integrations/supabase/client', () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    then: vi.fn()
  };
  return { 
    supabase: { 
      from: vi.fn(() => mockQuery), 
      channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
      removeChannel: vi.fn() 
    } 
  };
});

vi.mock('@/lib/auth', () => ({ 
  useAuth: () => ({ 
    user: { id: 'patient-123' }, 
    isPatient: true, 
    loading: false,
    subscription: { subscribed: true, is_trial: false }
  })
}));

vi.mock('@/lib/tenantContext', () => ({
  useTenant: () => ({ tenantId: 'tenant-123' })
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-layout">{children}</div>
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('E2E: Proteção contra Dados Parciais (API returning 0/null)', () => {
  const mockPlanId = 'plan-partial-data';

  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockSupabase = supabase as any;
    mockSupabase.from.mockImplementation((table: string) => {
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(async () => {
          if (table === 'meal_plans') {
            return { data: { id: mockPlanId, title: 'Plano Incompleto', start_date: '2026-01-01' }, error: null };
          }
          if (table === 'profiles') return { data: { full_name: 'Paciente Teste' }, error: null };
          return { data: null, error: null };
        }),
        then: vi.fn((resolve: any) => {
          if (table === 'meal_plan_items') {
            const dayOfWeek = (new Date().getDay() + 6) % 7;
            return Promise.resolve(resolve({ 
              data: [
                { 
                  id: 'item-zero', 
                  meal_type: 'Almoço', 
                  title: 'Processando Macros...', 
                  calories_target: 0, // SIMULAÇÃO DE DADO ZERADO/PARCIAL
                  protein_target: 0, 
                  carbs_target: 0, 
                  fat_target: 0, 
                  day_of_week: dayOfWeek 
                }
              ], 
              error: null 
            }));
          }
          if (table === 'meal_item_completions' || table === 'patient_meal_substitutions') {
             return Promise.resolve(resolve({ data: [], error: null }));
          }
          return chain.maybeSingle().then(resolve);
        })
      };
      return chain;
    });
  });

  it('NextMealWidget deve mostrar "..." em vez de 0 ou NaN', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NextMealWidget />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      // Verifica o container de macros do widget
      const widgetMacros = screen.getByRole('link').querySelector('[data-macro-tile="next-meal"]');
      expect(widgetMacros).toBeInTheDocument();
      
      // O texto deve conter as reticências
      expect(widgetMacros?.textContent).toContain("...");
      // Não deve conter "0 kcal" (pode conter "0" se for parte de "2000", mas não "0 kcal")
      expect(widgetMacros?.textContent).not.toContain("0 kcal");
    });
  });

  it('MacroSummary (no PatientMealPlan) deve mostrar "..." em vez de 0 ou NaN', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/my-diet']}>
          <PatientMealPlan />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      // Procura especificamente pelas áreas de valor dos macros
      // No Componente, temos labels "Calorias", "Proteína", etc.
      const caloriesVal = screen.getByText(/Calorias/i).parentElement;
      expect(caloriesVal?.textContent).toContain("...");
      expect(caloriesVal?.textContent).not.toContain("0");

      const proteinVal = screen.getByText(/Proteína/i).parentElement;
      expect(proteinVal?.textContent).toContain("...");
      expect(proteinVal?.textContent).not.toContain("0");
    });
    
    console.log("✅ E2E: Fallbacks de API parcial validados.");
  });
});
