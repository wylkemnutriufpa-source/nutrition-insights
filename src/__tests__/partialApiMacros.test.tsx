
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
                  meal_type: 'lunch', 
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

    // Aguarda carregar e verifica fallbacks
    await waitFor(() => {
      const kcalPill = screen.getByText(/\.\.\. kcal/i);
      expect(kcalPill).toBeInTheDocument();
      expect(screen.queryByText(/^0 kcal$/i)).not.toBeInTheDocument();
      
      const proteinPill = screen.getByText(/P \.\.\./i);
      expect(proteinPill).toBeInTheDocument();
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

    // Valida que o resumo de macros do dia mostra processamento
    await waitFor(() => {
      // Procura pelos placeholders de resumo
      const placeholders = screen.getAllByText(/\.\.\./);
      expect(placeholders.length).toBeGreaterThanOrEqual(4); // Cal, Prot, Carb, Gord
      
      // Garante que não há texto "0" explícito nos valores de macros
      expect(screen.queryByText(/^0$/)).not.toBeInTheDocument();
    });
    
    console.log("✅ E2E: Fallbacks de API parcial validados em NextMealWidget e MacroSummary.");
  });
});
