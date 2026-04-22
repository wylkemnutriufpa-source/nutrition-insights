import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InOfficeWizard from './pages/InOfficeWizard';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from './integrations/supabase/client';
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

vi.mock('./integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  }
}));

vi.mock('./lib/auth', () => ({ useAuth: vi.fn() }));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })),
});

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('InOfficeWizard - Fluxo de Etapas', () => {
  const mockUser = { id: 'nutri-123' };
  const mockProfile = { full_name: 'Paciente Teste' };
  const mockSession = { id: 'sess-123', current_step: 1, patient_id: 'pat-123' };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser, loading: false });
    
    const mockSupabase = supabase as any;
    // Wizard precisa do nome do paciente e da sessão
    mockSupabase.maybeSingle.mockImplementation(async (q: any) => {
      // Diferenciação simples baseada na ordem de chamada interna
      return { data: mockSession, error: null };
    });
    // Forçamos a primeira chamada a ser o perfil
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: mockProfile, error: null });
    
    mockSupabase.update.mockResolvedValue({ data: null, error: null });
  });

  it('deve percorrer o fluxo completo e atualizar current_step', async () => {
    const mockSupabase = supabase as any;
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <InOfficeWizard />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Aguarda o fim do loading
    await waitFor(() => expect(screen.getByTestId('step-1')).toBeInTheDocument(), { timeout: 4000 });

    // Avançar (1 -> 2)
    fireEvent.click(screen.getByText(/Próximo/i));
    await waitFor(() => expect(screen.getByTestId('step-2')).toBeInTheDocument());
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ current_step: 2 }));

    // Avançar (2 -> 3)
    fireEvent.click(screen.getByText(/Próximo/i));
    await waitFor(() => expect(screen.getByTestId('step-3')).toBeInTheDocument());
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ current_step: 3 }));

    // Voltar (3 -> 2)
    fireEvent.click(screen.getByText(/Anterior/i));
    await waitFor(() => expect(screen.getByTestId('step-2')).toBeInTheDocument());
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ current_step: 2 }));
  });
});
