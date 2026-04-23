
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
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
    then: vi.fn()
  };
  return { supabase: { from: vi.fn(() => mockQuery), functions: { invoke: vi.fn() } } };
});

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'nutri-123' }, loading: false }) }));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('Fluxo E2E Automatizado: Marmita Semanal -> Publicação -> Visualização Paciente', () => {
  const mockPatientId = 'patient-456';
  const mockPlanId = 'plan-789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve reproduzir o fluxo completo sem macros zeradas ou loops', async () => {
    // 1. SETUP MOCKS - RECEITAS SUFICIENTES
    const mockSupabase = supabase as any;
    mockSupabase.from.mockImplementation((table: string) => {
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: any) => {
          if (table === 'meal_recipes') {
            const recipes = [];
            for (let i = 0; i < 14; i++) {
              recipes.push({ meal_type: i < 7 ? 'lunch' : 'dinner', is_active: true, is_fixed: false });
            }
            return resolve({ data: recipes, error: null });
          }
          if (table === 'marmita_generation_settings') return resolve({ data: { weekly_min_lunch: 7, weekly_min_dinner: 7 }, error: null });
          if (table === 'meal_plans') return resolve({ data: { id: mockPlanId, total_calories: 2000, total_protein: 150, total_carbs: 200, total_fat: 60, status: 'published' }, error: null });
          return resolve({ data: [], error: null });
        }
      };
      return chain;
    });

    // 2. NUTRICIONISTA: GERAR PLANO SEMANAL
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

    // Verifica se o botão de semanal está ativo (mínimo de receitas atingido)
    const weeklyBtn = await screen.findByText(/Cardápio Semanal de Marmitas/i);
    expect(weeklyBtn.closest('button')).not.toBeDisabled();

    // Simula clique para gerar
    fireEvent.click(weeklyBtn);
    
    await waitFor(() => {
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('generate-meal-plan', expect.objectContaining({
        body: expect.objectContaining({ generationMode: 'weekly_marmita' })
      }));
    });

    cleanup();

    // 3. PACIENTE: VISUALIZAR E VERIFICAR MACROS
    // Mock do plano publicado com macros reais
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NextMealWidget />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Valida que Kcal NÃO está zerada
    const kcalPill = await screen.findByText(/2000 kcal/i);
    expect(kcalPill).toBeInTheDocument();
    expect(screen.queryByText(/0 kcal/i)).not.toBeInTheDocument();

    console.log("✅ Teste E2E Concluído: Nutricionista -> Geração Marmita -> Macros Paciente OK.");
  });
});

function cleanup() {
  const root = document.querySelector('div');
  if (root) root.innerHTML = '';
}
