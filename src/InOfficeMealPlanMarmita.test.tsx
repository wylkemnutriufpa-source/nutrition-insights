import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InOfficeWizard from './pages/InOfficeWizard';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from './integrations/supabase/client';
import { useAuth } from './lib/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mocks
vi.mock('@/components/layout/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));

vi.mock('./integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
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
  }
}));

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
    
    // Configura os retornos do Supabase para o carregamento inicial da página
    mockSupabase.maybeSingle.mockImplementation((path: string) => {
      // Perfil do paciente
      if (mockSupabase.from.calls.some((c: any) => c[0] === 'profiles')) {
        return Promise.resolve({ data: { full_name: 'Wannubia Teste' }, error: null });
      }
      // Sessão ativa
      if (mockSupabase.from.calls.some((c: any) => c[0] === 'in_office_sessions')) {
        return Promise.resolve({ data: { id: mockSessionId, current_step: 4, patient_id: mockPatientId }, error: null });
      }
      // Tenant do paciente
      if (mockSupabase.from.calls.some((c: any) => c[0] === 'nutritionist_patients')) {
        return Promise.resolve({ data: { tenant_id: 'tenant-789' }, error: null });
      }
      // Plano existente
      if (mockSupabase.from.calls.some((c: any) => c[0] === 'meal_plans')) {
        return Promise.resolve({ data: { id: mockMealPlanId, plan_status: 'draft' }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    // Mock para listas (templates e itens do plano)
    mockSupabase.select.mockImplementation(() => ({
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: (resolve: any) => {
        // Se estiver buscando templates
        if (mockSupabase.from.calls.some((c: any) => c[0] === 'quick_meal_templates')) {
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
        // Se estiver buscando itens do plano
        if (mockSupabase.from.calls.some((c: any) => c[0] === 'meal_plan_items')) {
          return resolve({ data: [], error: null });
        }
        return resolve({ data: [], error: null });
      }
    }));

    mockSupabase.insert.mockResolvedValue({ data: { id: 'new-id' }, error: null });
    mockSupabase.update.mockResolvedValue({ data: null, error: null });
    mockSupabase.delete.mockResolvedValue({ data: null, error: null });
  });

  it('deve aplicar template de marmita sem macros individuais e verificar persistência com fallback', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <InOfficeWizard />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Aguarda carregar o passo 4 (Plano)
    await waitFor(() => expect(screen.getByText(/Carregar template/i)).toBeInTheDocument());

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
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          title: 'Frango com Batata',
          calories_target: 500, // Fallback do template
          protein_target: 40,
          carbs_target: 50,
          fat_target: 15
        })
      ]));
    });

    // Agora simula o avanço para o passo 5 para verificar mudança de status
    fireEvent.click(screen.getByText(/Próximo/i));

    await waitFor(() => {
      // Verifica se a sessão foi marcada como meal_plan_completed
      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        meal_plan_completed: true,
        current_step: 5
      }));
    });

    expect(screen.getByText(/Finalizar/i)).toBeInTheDocument();
  });
});
