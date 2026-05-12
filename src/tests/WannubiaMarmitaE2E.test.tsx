import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MealPlanEditorV2 from '../pages/MealPlanEditorV2';
import { MealSmartEditorModal } from '../components/meal-editor-v2/MealSmartEditorModal';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../lib/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mock store to control state precisely
const mockStore = {
  items: [
    { id: 'item-1', title: 'Frango', calories_target: 0, protein_target: 0, carbs_target: 0, fat_target: 0, meal_type: 'lunch' as const, day_of_week: 0, description: 'Desc original', edit_metadata: { is_fixed: true, kcal_base: 500, protein_base: 30, carbs_base: 40, fat_base: 10, portion_factor: 1.0 } }
  ],
  plan: { id: 'plan-456', title: 'Plano Teste', plan_status: 'draft', patient_id: 'pat-123', start_date: '2023-01-01' },
  planId: 'plan-456',
  syncingMap: {},
  patientName: 'Paciente Teste',
  hydrated: true,
  hydrating: false,
  syncStatus: 'idle',
  substitutionCount: 2,
  hydrate: vi.fn(),
  updatePlan: vi.fn(),
  setSubstitutionCount: vi.fn(),
  _flushQueue: vi.fn().mockResolvedValue(true),
  updateItem: vi.fn(),
};

vi.mock('@/stores/mealPlanEditorV2Store', () => ({
  useMealPlanEditorV2Store: () => mockStore
}));

// Mocks
vi.mock('@/components/layout/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));

vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      limit: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
  }
}));

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

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser, loading: false });
  });

  it('deve permitir salvar rascunho com macros parciais zeradas e só bloquear se o total for zero', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/meal-plans/plan-456`]}>
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

  it('deve resetar o estado local ao fechar o modal de edição', async () => {
    const onOpenChange = vi.fn();
    
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MealSmartEditorModal open={true} onOpenChange={onOpenChange} itemId="item-1" />
      </QueryClientProvider>
    );

    const textarea = screen.getByPlaceholderText(/Os alimentos selecionados aparecerão aqui/i);
    fireEvent.change(textarea, { target: { value: 'Nova descrição temporária' } });
    expect(textarea).toHaveValue('Nova descrição temporária');

    // Fechar o modal
    rerender(
      <QueryClientProvider client={queryClient}>
        <MealSmartEditorModal open={false} onOpenChange={onOpenChange} itemId="item-1" />
      </QueryClientProvider>
    );

    // Reabrir o modal
    rerender(
      <QueryClientProvider client={queryClient}>
        <MealSmartEditorModal open={true} onOpenChange={onOpenChange} itemId="item-1" />
      </QueryClientProvider>
    );

    // O valor deve ter voltado para o original (Desc original)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Os alimentos selecionados aparecerão aqui/i)).toHaveValue('Desc original');
    });
  });

  it('deve validar macros base ausentes em marmitas fixas', async () => {
    // Alterar mockStore temporariamente para simular marmita com macros ausentes
    const originalItem = mockStore.items[0];
    mockStore.items[0] = { 
      ...originalItem, 
      edit_metadata: { ...originalItem.edit_metadata, kcal_base: undefined } as any
    };

    render(
      <QueryClientProvider client={queryClient}>
        <MealSmartEditorModal open={true} onOpenChange={vi.fn()} itemId="item-1" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Dados Base Incompletos", expect.any(Object));
    });

    // Restaurar
    mockStore.items[0] = originalItem;
  });
});
