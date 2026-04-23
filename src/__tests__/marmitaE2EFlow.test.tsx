
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mocks
import GenerationModeSelector from '@/components/hybrid-builder/GenerationModeSelector';
import NextMealWidget from '@/components/patient/NextMealWidget';

vi.mock('@/integrations/supabase/client', () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn()
  };
  return { supabase: { from: vi.fn(() => mockQuery), functions: { invoke: vi.fn() } } };
});

vi.mock('@/lib/auth', () => ({ 
  useAuth: () => ({ user: { id: 'nutri-123' }, loading: false }),
  AuthProvider: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@/lib/tenantContext', () => ({
  useTenant: () => ({ tenantId: 'tenant-123' })
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('Fluxo E2E Automatizado: Marmita Semanal -> Publicação -> Visualização Paciente', () => {
  const mockPatientId = 'patient-456';
  const mockPlanId = 'plan-789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve reproduzir o fluxo completo sem macros zeradas ou loops', async () => {
    const mockSupabase = supabase as any;
    
    // Configura o mock do supabase para retornar dados válidos em todas as chamadas
    mockSupabase.from.mockImplementation((table: string) => {
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(),
        single: vi.fn(),
        then: vi.fn((resolve) => {
          if (table === 'meal_recipes') {
            const recipes = [];
            for (let i = 0; i < 14; i++) {
              recipes.push({ meal_type: i < 7 ? 'lunch' : 'dinner', is_active: true, is_fixed: false });
            }
            return resolve({ data: recipes, error: null });
          }
          if (table === 'marmita_generation_settings') {
            return resolve({ data: { weekly_min_lunch: 7, weekly_min_dinner: 7 }, error: null });
          }
          if (table === 'meal_plans') {
            return resolve({ data: { id: mockPlanId, is_active: true }, error: null });
          }
          if (table === 'meal_plan_items') {
            const dayOfWeek = (new Date().getDay() + 6) % 7;
            return resolve({ 
              data: [
                { meal_type: 'lunch', title: 'Marmita E2E', calories_target: 2000, protein_target: 150, carbs_target: 200, fat_target: 60, day_of_week: dayOfWeek }
              ], 
              error: null 
            });
          }
          return resolve({ data: [], error: null });
        })
      };
      
      chain.maybeSingle.mockImplementation(() => chain.then((res: any) => res));
      chain.single.mockImplementation(() => chain.then((res: any) => res));
      
      return chain;
    });

    // NUTRICIONISTA: GERAR PLANO SEMANAL
    mockSupabase.functions.invoke.mockResolvedValue({ 
      data: { success: true, mealPlanId: mockPlanId, items_count: 14 }, 
      error: null 
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GenerationModeSelector patientId={mockPatientId} onGenerated={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const weeklyBtn = await screen.findByText(/Cardápio Semanal de Marmitas/i);
    const button = weeklyBtn.closest('button');
    
    // Wait for the button to be enabled (async checks in the component)
    await waitFor(() => expect(button).not.toBeDisabled(), { timeout: 3000 });

    fireEvent.click(button!);
    
    await waitFor(() => {
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('generate-meal-plan', expect.objectContaining({
        body: expect.objectContaining({ generationMode: 'weekly_marmita' })
      }));
    });

    // LIMPAR E RENDERIZAR VISUALIZAÇÃO PACIENTE
    document.body.innerHTML = '';
    
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NextMealWidget />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Valida que Kcal NÃO está zerada (2000 kcal do mock)
    const kcalPill = await screen.findByText(/2000 kcal/i);
    expect(kcalPill).toBeInTheDocument();
    expect(screen.queryByText(/0 kcal/i)).not.toBeInTheDocument();
  });
});
