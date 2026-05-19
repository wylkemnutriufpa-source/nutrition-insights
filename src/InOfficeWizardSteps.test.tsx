import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InOfficeWizard from './pages/InOfficeWizard';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './lib/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mocks fundamentais
vi.mock('@/components/layout/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/in-office/InOfficeStepPatient', () => ({ default: () => <div data-testid="step-1">Cadastro</div> }));
vi.mock('@/components/in-office/InOfficeStepAnamnesis', () => ({ default: () => <div data-testid="step-2">Anamnese</div> }));
vi.mock('@/components/in-office/InOfficeStepAssessment', () => ({ default: () => <div data-testid="step-3">Avaliação</div> }));
vi.mock('@/components/in-office/InOfficeStepMealPlan', () => ({ default: () => <div data-testid="step-4">Plano</div> }));
vi.mock('@/components/in-office/InOfficeStepFinalize', () => ({ default: () => <div data-testid="step-5">Finalizar</div> }));

vi.mock('@/lib/onboardingPlanResolver', () => ({
  resolvePatientIdentity: vi.fn((id) => Promise.resolve({ canonicalId: id, profileId: id + '_prof', allIds: [id] }))
}));

vi.mock('@/integrations/supabase/client', () => {
  const mock = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    getChannels: vi.fn(() => []),
    then: vi.fn(),
  };
  return { supabase: mock };
});

vi.mock('./lib/auth', () => ({ useAuth: vi.fn() }));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })),
});

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('InOfficeWizard - Fluxo de Etapas', () => {
  const mockUser = { id: 'nutri-123' };
  let lastTable = '';

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser, loading: false });
    
    const mockSupabase = supabase as any;
    lastTable = '';

    mockSupabase.from.mockImplementation((table: string) => {
      lastTable = table;
      return mockSupabase;
    });

    const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'or', 'in', 'is', 'order', 'limit'];
    chainMethods.forEach(method => {
      mockSupabase[method].mockReturnValue(mockSupabase);
    });

    mockSupabase.maybeSingle.mockImplementation(() => {
      if (lastTable === 'profiles') {
        return Promise.resolve({ data: { id: 'pat-123', user_id: 'pat-123', full_name: 'Paciente Teste' }, error: null });
      }
      if (lastTable === 'in_office_sessions') {
        return Promise.resolve({ data: { id: 'sess-123', current_step: 1, patient_id: 'pat-123' }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    mockSupabase.single.mockImplementation(() => {
      if (lastTable === 'in_office_sessions') {
        return Promise.resolve({ data: { id: 'sess-123', current_step: 1, patient_id: 'pat-123' }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    mockSupabase.then.mockImplementation((onfulfilled: any) => {
      const res = { data: null, error: null };
      if (onfulfilled) return Promise.resolve(res).then(onfulfilled);
      return Promise.resolve(res);
    });
  });

  it('deve percorrer o fluxo completo e atualizar current_step', async () => {
    const mockSupabase = supabase as any;
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/in-office/pat-123']}>
          <Routes>
            <Route path="/in-office/:patientId" element={<InOfficeWizard />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Aguarda o fim do loading. Se travar aqui, algo nas promessas falhou.
    await waitFor(() => expect(screen.getByTestId('step-1')).toBeInTheDocument(), { timeout: 5000 });

    // 1 -> 2
    fireEvent.click(screen.getByText(/Próximo/i));
    await waitFor(() => expect(screen.getByTestId('step-2')).toBeInTheDocument());
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ current_step: 2 }));

    // 2 -> 3
    fireEvent.click(screen.getByText(/Próximo/i));
    await waitFor(() => expect(screen.getByTestId('step-3')).toBeInTheDocument());
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ current_step: 3 }));

    // 3 -> 4
    fireEvent.click(screen.getByText(/Próximo/i));
    await waitFor(() => expect(screen.getByTestId('step-4')).toBeInTheDocument());
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ current_step: 4 }));

    // 4 -> 5
    fireEvent.click(screen.getByText(/Próximo/i));
    await waitFor(() => expect(screen.getByTestId('step-5')).toBeInTheDocument());
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ current_step: 5, meal_plan_completed: true }));

    // Volta 5 -> 4
    fireEvent.click(screen.getByText(/Anterior/i));
    await waitFor(() => expect(screen.getByTestId('step-4')).toBeInTheDocument());
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ current_step: 4 }));
  });
});
