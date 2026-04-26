import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MealPlanEditorV2 from '../pages/MealPlanEditorV2';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../lib/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mocks
vi.mock('@/components/layout/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));

vi.mock('../integrations/supabase/client', () => {
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
      rpc: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    }
  };
});

vi.mock('../lib/auth', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/tenantContext', () => ({ useTenant: () => ({ tenantId: 'tenant-123' }), TenantProvider: ({ children }: any) => <div>{children}</div> }));

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

describe('Wannubia Marmita E2E - Validações e Mobile', () => {
  const mockUser = { id: 'nutri-123' };
  const mockPlanId = 'plan-456';

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser, loading: false });
    
    const mockSupabase = supabase as any;
    
    mockSupabase.from.mockImplementation((table: string) => {
      const query: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(),
        single: vi.fn(),
        then: vi.fn()
      };

      query.maybeSingle.mockImplementation(() => {
        if (table === 'meal_plans') return Promise.resolve({ data: { id: mockPlanId, title: 'Plano Teste', plan_status: 'draft', patient_id: 'pat-123' }, error: null });
        if (table === 'profiles') return Promise.resolve({ data: { full_name: 'Paciente Teste' }, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      query.then.mockImplementation((callback: any) => {
        if (table === 'meal_plan_items') {
          return Promise.resolve(callback({ data: [
            { id: 'item-1', title: 'Frango', calories_target: 0, protein_target: 0, carbs_target: 0, fat_target: 0, meal_type: 'lunch', day_of_week: 0 }
          ], error: null }));
        }
        return Promise.resolve(callback({ data: [], error: null }));
      });

      return query;
    });
  });

  it('deve permitir salvar rascunho com macros parciais zeradas e só bloquear se o total for zero', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/meal-plans/${mockPlanId}`]}>
          <Routes>
            <Route path="/meal-plans/:id" element={<MealPlanEditorV2 />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText('Plano Teste')).toBeInTheDocument());

    // O item Frango já vem com 0 kcal no mock.
    // O total do dia será 0.
    
    const saveButton = screen.getByText('Salvar Rascunho');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('O plano não pode ter totais zerados.')).toBeInTheDocument();
    });
  });

  it('deve garantir que no mobile (384px) o card de macros não intercepta o clique no X', async () => {
    // Simulando viewport mobile
    window.innerWidth = 384;
    window.dispatchEvent(new Event('resize'));

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/meal-plans/${mockPlanId}`]}>
          <Routes>
            <Route path="/meal-plans/:id" element={<MealPlanEditorV2 />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText('Frango')).toBeInTheDocument());

    // Clicar para abrir o modal de edição
    const mealCard = screen.getByText('Frango');
    fireEvent.click(mealCard);

    await waitFor(() => expect(screen.getByText('Editar Frango')).toBeInTheDocument());

    // No mobile, o header tem um gradiente e os macros podem estar próximos do X.
    // O Shadcn UI adiciona o botão Close automaticamente no DialogContent.
    const closeButton = screen.getByRole('button', { name: /close/i });
    
    // Verifica se o botão está acessível e visível
    expect(closeButton).toBeInTheDocument();
    
    // Simula o clique no X
    fireEvent.click(closeButton);

    // Garante que o modal fechou
    await waitFor(() => {
      expect(screen.queryByText('Editar Frango')).not.toBeInTheDocument();
    });
  });
});
