import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InOfficeWizard from './pages/InOfficeWizard';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from './integrations/supabase/client';
import { useAuth } from './lib/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mocks simples para componentes complexos
vi.mock('@/components/layout/DashboardLayout', () => ({
  default: ({ children }: any) => <div data-testid="layout">{children}</div>
}));

vi.mock('@/components/in-office/InOfficeStepPatient', () => ({
  default: () => <div data-testid="step-1">Cadastro</div>
}));

vi.mock('@/components/in-office/InOfficeStepAnamnesis', () => ({
  default: () => <div data-testid="step-2">Anamnese</div>
}));

// Mock Supabase
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

// Mock tenant context
vi.mock('./lib/tenantContext', () => ({
  TenantProvider: ({ children }: any) => <>{children}</>,
  useTenant: () => ({ tenantId: 't1' }),
  useCurrentTenantId: () => 't1',
}));

// Mock workspace context
vi.mock('./hooks/useWorkspaceContext', () => ({
  WorkspaceContext: { Provider: ({ children, value }: any) => <>{children}</> },
  useWorkspaceContext: () => ({
    activeContext: 'professional',
    setContext: vi.fn(),
    isHybridUser: false,
    isProfessionalContext: true,
    isPatientContext: false,
  })
}));

// Mocks globais do browser
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

describe('InOfficeWizard - Navegação e Persistência', () => {
  const mockUser = { id: 'nutri-123' };
  const mockSession = { id: 'sess-123', current_step: 1, patient_id: 'pat-123' };
  const mockProfile = { full_name: 'Paciente Teste' };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser, loading: false });
    
    const mockSupabase = supabase as any;
    // Wizard init sequence
    mockSupabase.maybeSingle.mockImplementation(async () => ({ data: mockProfile, error: null }));
    mockSupabase.update.mockResolvedValue({ data: null, error: null });
    
    // Specifically handle the session loading
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: mockProfile, error: null }) // profile name
      .mockResolvedValueOnce({ data: mockSession, error: null }); // session
  });

  it('deve navegar entre as etapas e persistir progresso', async () => {
    const mockSupabase = supabase as any;
    renderWizard();
    
    // Verifica carregamento inicial (agora aguardando o fim do loading)
    await waitFor(() => {
      expect(screen.getByTestId('step-1')).toBeInTheDocument();
    }, { timeout: 4000 });

    // Clica no próximo (etapa 1 -> 2)
    const nextBtn = screen.getByText(/Próximo/i);
    fireEvent.click(nextBtn);

    // Verifica se mudou a etapa
    await waitFor(() => {
      expect(screen.getByTestId('step-2')).toBeInTheDocument();
    });

    // Verifica persistência no banco
    expect(mockSupabase.from).toHaveBeenCalledWith('in_office_sessions');
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
      current_step: 2
    }));
  });

  it('deve permitir voltar para a etapa anterior', async () => {
    const mockSupabase = supabase as any;
    // Mock iniciando na etapa 2
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: mockProfile, error: null })
      .mockResolvedValueOnce({ data: { ...mockSession, current_step: 2 }, error: null });

    renderWizard();

    await waitFor(() => expect(screen.getByTestId('step-2')).toBeInTheDocument());
    
    const prevBtn = screen.getByText(/Anterior/i);
    fireEvent.click(prevBtn);

    await waitFor(() => expect(screen.getByTestId('step-1')).toBeInTheDocument());
  });
});
