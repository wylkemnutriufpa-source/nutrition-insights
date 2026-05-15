
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

describe('Validação de Fallbacks de Macros', () => {
  const mockPlanId = 'plan-zero-macros';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe mensagem amigável ou fallback quando macros retornam zerados da API', async () => {
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
            // Retorna itens SEM macros (parcial/erro de banco)
            return Promise.resolve({ 
              data: [
                { tipo_refeicao: 'Almoço', title: 'Marmita em Processamento', meta_calorias: 0, meta_proteinas: 0, meta_carboidratos: 0, meta_gorduras: 0, day_of_week: dayOfWeek }
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

    await waitFor(() => {
      // O sistema deve detectar o total zerado e mostrar uma indicação de processamento (implementado no NextMealWidget)
      expect(screen.queryByText(/^0 kcal$/i)).not.toBeInTheDocument();
      // Deve mostrar reticências ou algo similar indicando que está aguardando os dados
      expect(screen.getAllByText(/\.\.\./i).length).toBeGreaterThan(0);
    });
  });
});
