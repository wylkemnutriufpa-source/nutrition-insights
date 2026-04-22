import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InOfficeWizard from './pages/InOfficeWizard';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from './integrations/supabase/client';
import { useAuth } from './lib/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mocks simplificados para evitar renderização pesada e problemas de contexto
vi.mock('@/components/layout/DashboardLayout', () => ({
  default: ({ children }: any) => <div data-testid="layout">{children}</div>
}));

// Mocks dos passos individuais
vi.mock('@/components/in-office/InOfficeStepPatient', () => ({ default: () => <div data-testid="step-1">Cadastro</div> }));
vi.mock('@/components/in-office/InOfficeStepAnamnesis', () => ({ default: () => <div data-testid="step-2">Anamnese</div> }));
vi.mock('@/components/in-office/InOfficeStepAssessment', () => ({ default: () => <div data-testid="step-3">Avaliação</div> }));
vi.mock('@/components/in-office/InOfficeStepMealPlan', () => ({ default: () => <div data-testid="step-4">Plano</div> }));
vi.mock('@/components/in-office/InOfficeStepFinalize', () => ({ default: () => <div data-testid="step-5">Finalizar</div> }));

// Mock Supabase
vi.mock('./integrations/supabase/client', () => {
  const mock = {
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
    rpc: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    getChannels: vi.fn(() => []),
  };
  return { supabase: mock };
});

vi.mock('./lib/auth', () => ({
  useAuth: vi.fn(),
}));

// Mock window.matchMedia
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

window.scrollTo = vi.fn();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWizard = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <InOfficeWizard />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('InOfficeWizard - Fluxo de Navegação', () => {
  const mockUser = { id: 'nutri-123' };
  const mockProfile = { full_name: 'Paciente Teste' };
  const mockSession = { id: 'sess-123', current_step: 1, patient_id: 'pat-123' };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser, loading: false });
    
    const mockSupabase = supabase as any;
    // Forçamos que todos os chamados iniciais retornem a sessão ativa diretamente
    mockSupabase.maybeSingle.mockResolvedValue({ data: mockSession, error: null });
    // Mas o primeiro chamado de perfil precisa retornar o nome
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: mockProfile, error: null });
    
    mockSupabase.update.mockResolvedValue({ data: null, error: null });
  });

  it('deve percorrer todas as etapas do wizard passo a passo', async () => {
    const mockSupabase = supabase as any;
    renderWizard();

    // Aguarda carregar a primeira etapa (Cadastro) e sair do loading
    await waitFor(() => {
      expect(screen.getByTestId('step-1')).toBeInTheDocument();
    }, { timeout: 4000 });

    // 1 -> 2
    fireEvent.click(screen.getByText(/Próximo/i));
    await waitFor(() => expect(screen.getByTestId('step-2')).toBeInTheDocument());
    expect(mockSupabase.from).toHaveBeenCalledWith('in_office_sessions');
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ current_step: 2 }));

    // 2 -> 3
    fireEvent.click(screen.getByText(/Próximo/i));
    await waitFor(() => expect(screen.getByTestId('step-3')).toBeInTheDocument());
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ current_step: 3 }));

    // 3 -> 4
    fireEvent.click(screen.getByText(/Próximo/i));
    await waitFor(() => expect(screen.getByTestId('step-4')).toBeInTheDocument());
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ current_step: 4 }));

    // 4 -> 5 (Mark meal plan as completed)
    fireEvent.click(screen.getByText(/Próximo/i));
    await waitFor(() => expect(screen.getByTestId('step-5')).toBeInTheDocument());
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ 
        current_step: 5,
        meal_plan_completed: true 
    }));

    // Test reverse 5 -> 4
    fireEvent.click(screen.getByText(/Anterior/i));
    await waitFor(() => expect(screen.getByTestId('step-4')).toBeInTheDocument());
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ current_step: 4 }));

    // Back to 5
    fireEvent.click(screen.getByText(/Próximo/i));
    await waitFor(() => expect(screen.getByTestId('step-5')).toBeInTheDocument());

    // Finalize
    fireEvent.click(screen.getByText(/Finalizar Sessão/i));
    await waitFor(() => {
        expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
            completed_at: expect.any(String),
            current_step: 5
        }));
    });
  });
});
