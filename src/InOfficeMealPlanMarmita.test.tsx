import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InOfficeWizard from './pages/InOfficeWizard';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { supabase } from './integrations/supabase/client';
import { useAuth } from './lib/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mocks
vi.mock('@/components/layout/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));

vi.mock('./integrations/supabase/client', () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    then: vi.fn()
  };
  
  return {
    supabase: {
      from: vi.fn(() => mockQuery),
    }
  };
});

vi.mock('./lib/auth', () => ({ useAuth: vi.fn() }));

// Fix para matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('InOfficeMealPlan Integration Test - Marmitas e Persistência', () => {
  const mockUser = { id: 'nutri-123' };
  const mockPatientId = 'pat-123';
  const mockSessionId = 'sess-123';
  const mockMealPlanId = 'plan-456';

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser, loading: false });
    
    const mockSupabase = supabase as any;
    
    // Mock robusto para o encadeamento do Supabase
    const createMockChain = () => {
      const chain: any = {
        select: vi.fn().mockImplementation(() => chain),
        insert: vi.fn().mockImplementation(() => chain),
        update: vi.fn().mockImplementation(() => chain),
        delete: vi.fn().mockImplementation(() => chain),
        eq: vi.fn().mockImplementation(() => chain),
        in: vi.fn().mockImplementation(() => chain),
        is: vi.fn().mockImplementation(() => chain),
        order: vi.fn().mockImplementation(() => chain),
        limit: vi.fn().mockImplementation(() => chain),
        maybeSingle: vi.fn(),
        single: vi.fn(),
        then: vi.fn()
      };
      return chain;
    };

    mockSupabase.from.mockImplementation((table: string) => {
      const chain = createMockChain();
      
      chain.maybeSingle.mockImplementation(() => {
        if (table === 'profiles') return Promise.resolve({ data: { full_name: 'Wannubia Teste' }, error: null });
        if (table === 'in_office_sessions') return Promise.resolve({ data: { id: mockSessionId, current_step: 4, patient_id: mockPatientId, meal_plan_id: mockMealPlanId }, error: null });
        if (table === 'nutritionist_patients') return Promise.resolve({ data: { tenant_id: 'tenant-789' }, error: null });
        if (table === 'meal_plans') return Promise.resolve({ data: { id: mockMealPlanId, plan_status: 'draft' }, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      chain.single.mockImplementation(() => {
        if (table === 'meal_plans') return Promise.resolve({ data: { id: mockMealPlanId }, error: null });
        return Promise.resolve({ data: { id: 'new-id' }, error: null });
      });

      chain.then.mockImplementation((resolve: any) => {
        if (table === 'quick_meal_templates') {
          return resolve({
            data: [{
              id: 'temp-999',
              template_name: 'Marmita Fitness',
              total_calories: 500,
              total_protein: 40,
              total_carbs: 50,
              total_fat: 15,
              items: [{ name: 'Frango com Batata', calories: 0, protein: 0, carbs: 0, fat: 0, meal_type: 'lunch' }]
            }],
            error: null
          });
        }
        if (table === 'meal_plan_items') {
          return resolve({ data: [], error: null });
        }
        return resolve({ data: [], error: null });
      });

      return chain;
    });
  });

  it('deve aplicar template de marmita sem macros individuais e verificar persistência com fallback', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/in-office/${mockPatientId}`]}>
          <Routes>
            <Route path="/in-office/:patientId" element={<InOfficeWizard />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Aguarda carregar o passo 4 (Plano)
    await waitFor(() => expect(screen.getByText(/Carregar template/i)).toBeInTheDocument(), { timeout: 5000 });

    // Abre modal de templates
    fireEvent.click(screen.getByText(/Carregar template/i));
    
    // Aguarda template aparecer e clica nele
    await waitFor(() => expect(screen.getByText('Marmita Fitness')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Marmita Fitness'));

    // Verifica preview e clica em aplicar
    await waitFor(() => expect(screen.getByText(/Aplicar ao dia/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Aplicar ao dia/i));

    // Verifica se o Supabase recebeu o insert com os macros do fallback
    const mockSupabase = supabase as any;
    
    await waitFor(() => {
      // Procura nos chamados de insert da tabela meal_plan_items
      const itemInserts = mockSupabase.from.mock.results
        .filter((r: any, i: number) => mockSupabase.from.mock.calls[i][0] === 'meal_plan_items')
        .map((r: any) => r.value.insert.mock.calls)
        .flat();
      
      const hasCorrectInsert = itemInserts.some((call: any) => {
        const data = Array.isArray(call[0]) ? call[0] : [call[0]];
        return data.some((item: any) => 
          item.title === 'Frango com Batata' && 
          item.calories_target === 500 && 
          item.protein_target === 40
        );
      });
      
      expect(hasCorrectInsert).toBe(true);
    });

    // Agora simula o avanço para o passo 5 para verificar mudança de status
    fireEvent.click(screen.getByText(/Próximo/i));

    await waitFor(() => {
      // Verifica se a sessão foi marcada como meal_plan_completed
      const sessionUpdates = mockSupabase.from.mock.results
        .filter((r: any, i: number) => mockSupabase.from.mock.calls[i][0] === 'in_office_sessions')
        .map((r: any) => r.value.update.mock.calls)
        .flat();

      const hasCorrectUpdate = sessionUpdates.some((call: any) => 
        call[0].meal_plan_completed === true && 
        call[0].current_step === 5
      );
      
      expect(hasCorrectUpdate).toBe(true);
    });

    // Verifica se chegamos na tela final (usando texto mais específico)
    expect(screen.getByText(/Resumo da Sessão/i)).toBeInTheDocument();
    expect(screen.getByText(/Finalizar Sessão/i)).toBeInTheDocument();
  });
});
