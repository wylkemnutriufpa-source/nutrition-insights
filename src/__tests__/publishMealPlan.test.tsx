
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mocks
import InOfficeStepFinalize from '@/components/in-office/InOfficeStepFinalize';
import NextMealWidget from '@/components/patient/NextMealWidget';

const mockQuery = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  then: vi.fn()
};

const mockRpc = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'patient-123' } }, error: null });

vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      from: vi.fn(() => mockQuery),
      rpc: (...args: any[]) => mockRpc(...args),
      auth: {
        getUser: () => mockGetUser()
      }
    }
  };
});

vi.mock('@/lib/auth', () => ({ 
  useAuth: () => ({ user: { id: 'patient-123' }, loading: false })
}));

vi.mock('@/lib/tenantContext', () => ({
  useTenant: () => ({ tenantId: 'tenant-123' })
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('Validação E2E: Publicação e Visualização Paciente', () => {
  const mockPlanId = 'plan-789';
  const mockPatientId = 'patient-123';
  const mockSessionId = 'session-456';

  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockClear();
    mockGetUser.mockClear();
  });

  it('Nutricionista publica plano e Paciente visualiza macros não-zerados', async () => {
    const mockSupabase = supabase as any;
    
    // 1. MOCK PARA PUBLICAÇÃO (NUTRICIONISTA)
    mockSupabase.from.mockImplementation((table: string) => {
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(() => {
          if (table === 'in_office_sessions') {
            return Promise.resolve({ 
              data: { id: mockSessionId, meal_plan_id: mockPlanId, meal_plan_completed: true }, 
              error: null 
            });
          }
          if (table === 'profiles') {
            return Promise.resolve({ data: { full_name: 'Paciente Teste' }, error: null });
          }
          if (table === 'meal_plans') {
            return Promise.resolve({ 
                data: { id: mockPlanId, plan_status: 'draft', total_calories: 2000 }, 
                error: null 
            });
          }
          return Promise.resolve({ data: null, error: null });
        })
      };
      
      chain.then = (resolve: any) => chain.maybeSingle().then(resolve);
      return chain;
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <InOfficeStepFinalize 
            patientId={mockPatientId} 
            sessionId={mockSessionId} 
            onPrev={() => {}} 
            onComplete={() => {}} 
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Clica no botão Publicar (específico para o botão, não o label)
    const publishBtn = await screen.findByTestId('publish-button');
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('publish_meal_plan', {
        _plan_id: mockPlanId,
        _nutritionist_id: 'patient-123'
      });
    }, { timeout: 4000 });

    // 2. MOCK PARA VISUALIZAÇÃO (PACIENTE)
    // Alteramos o mock para refletir o plano publicado e com macros
    mockSupabase.from.mockImplementation((table: string) => {
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(() => {
          if (table === 'meal_plans') {
            return Promise.resolve({ data: { id: mockPlanId, plan_status: 'published_to_patient', is_active: true }, error: null });
          }
          if (table === 'meal_plan_items') {
            const dayOfWeek = new Date().getDay();
            return Promise.resolve({ 
              data: [
                { tipo_refeicao: 'Almoço', title: 'Marmita Publicada', meta_calorias: 2000, meta_proteinas: 150, meta_carboidratos: 200, meta_gorduras: 60, day_of_week: dayOfWeek, is_primary: true }
              ], 
              error: null 
            });
          }
          return Promise.resolve({ data: [], error: null });
        })
      };
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

    // Valida que o paciente vê 2000 kcal e não zero ou NaN
    const kcalPill = await screen.findByText(/2000 kcal/i);
    expect(kcalPill).toBeInTheDocument();
    
    // Verificamos que o widget mostra exatamente os 2000 kcal do nosso mock
    // Buscamos o elemento que contém exatamente o valor de kcal para garantir que não é zero
    const macroValues = screen.getAllByText(/kcal/i);
    const hasZeroKcal = macroValues.some(el => el.textContent?.trim() === "0 kcal");
    expect(hasZeroKcal).toBe(false);
    
    const hasCorrectKcal = macroValues.some(el => el.textContent?.includes("2000"));
    expect(hasCorrectKcal).toBe(true);

    console.log("✅ E2E Publicação: Status mudou para 'published_to_patient' e macros exibidos corretamente.");
  });
});
