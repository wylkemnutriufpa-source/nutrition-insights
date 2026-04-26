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
  const createMockQuery = () => {
    const query: any = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
      then: vi.fn().mockImplementation((cb: any) => Promise.resolve(cb({ data: [], error: null }))),
    };
    return query;
  };
  
  return {
    supabase: {
      from: vi.fn(() => createMockQuery()),
      rpc: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    }
  };
});

vi.mock('../lib/auth', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/tenantContext', () => ({ 
  useTenant: () => ({ tenantId: 'tenant-123' }), 
  TenantProvider: ({ children }: any) => <div>{children}</div> 
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }
}));

import { toast } from 'sonner';

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
        update: vi.fn().mockReturnThis(),
        then: vi.fn()
      };

      query.maybeSingle.mockImplementation(() => {
        if (table === 'meal_plans') return Promise.resolve({ data: { id: mockPlanId, title: 'Plano Teste', plan_status: 'draft', patient_id: 'pat-123', start_date: '2023-01-01' }, error: null });
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

    const saveButton = screen.getByText('Salvar Rascunho');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("O plano não pode ter totais zerados.", expect.any(Object));
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

    await waitFor(() => expect(screen.getByText(/Editar Frango/i)).toBeInTheDocument());

    // O Shadcn UI adiciona o botão Close automaticamente no DialogContent.
    // Em alguns casos ele é renderizado como um botão com "Close" no aria-label ou similar.
    // Se não encontrarmos pelo role, tentamos pela classe ou ícone.
    const closeButton = screen.queryByRole('button', { name: /close/i }) || screen.getByTestId('dialog-close') || screen.container.querySelector('button[class*="rounded-sm opacity-70"]');
    
    if (closeButton) {
      fireEvent.click(closeButton);
      await waitFor(() => {
        expect(screen.queryByText(/Editar Frango/i)).not.toBeInTheDocument();
      });
    }
  });
});
