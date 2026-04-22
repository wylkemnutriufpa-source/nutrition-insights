import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InOfficeWizard from './pages/InOfficeWizard';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from './integrations/supabase/client';
import { useAuth } from './lib/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantProvider } from './lib/tenantContext';
import { WorkspaceContext } from './hooks/useWorkspaceContext';
import '@testing-library/jest-dom';

// Mock supabase
vi.mock('./integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
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
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    getChannels: vi.fn(() => []),
  },
}));

// Mock auth
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

// Mock window.scrollTo
window.scrollTo = vi.fn();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const mockWorkspaceValue = {
  activeContext: 'professional' as const,
  setContext: vi.fn(),
  isHybridUser: false,
  isProfessionalContext: true,
  isPatientContext: false,
};

const renderWizard = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <WorkspaceContext.Provider value={mockWorkspaceValue}>
          <TenantProvider>
            <InOfficeWizard />
          </TenantProvider>
        </WorkspaceContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('InOfficeWizard - Navegação e Persistência', () => {
  const mockUser = { id: 'nutri-123' };
  const mockSubscription = { is_trial: false, trial_end: null };
  const mockSession = { id: 'sess-123', current_step: 1, patient_id: 'pat-123', nutritionist_id: 'nutri-123' };
  const mockProfile = { full_name: 'Paciente Teste' };
  const mockRoles = ['nutritionist'];

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ 
      user: mockUser, 
      roles: mockRoles,
      subscription: mockSubscription,
      isNutritionist: true,
      isPersonal: false,
      isAdmin: false,
      loading: false
    });
    
    const fromMock = supabase.from as any;
    // Default mock behavior for profile, session, etc.
    fromMock().maybeSingle.mockImplementation(async () => {
      // In a real app we'd check the table name, but here we can just return a promise
      return { data: mockProfile, error: null };
    });
    
    fromMock().select.mockReturnThis();
    fromMock().eq.mockReturnThis();
    fromMock().in.mockReturnThis();
    fromMock().is.mockReturnThis();
    fromMock().order.mockReturnThis();
    fromMock().limit.mockReturnThis();
    fromMock().update.mockResolvedValue({ data: null, error: null });
    fromMock().insert.mockResolvedValue({ data: { id: 'new-id' }, error: null });
    fromMock().single.mockResolvedValue({ data: mockSession, error: null });
    
    // Mock rpc for workspace init
    (supabase.rpc as any).mockResolvedValue({ data: 'ws-123', error: null });
  });

  it('deve carregar a etapa inicial corretamente', async () => {
    const fromMock = supabase.from as any;
    // Sequential calls during wizard initialization
    fromMock().maybeSingle
      .mockResolvedValueOnce({ data: mockProfile, error: null }) // Patient profile
      .mockResolvedValueOnce({ data: mockSession, error: null }) // Session
      .mockResolvedValueOnce({ data: [], error: null }) // user_tenants (TenantProvider)
      .mockResolvedValueOnce({ data: { coach_bodybuilder_enabled: true }, error: null }) // professional_profiles (useProfessionalModules)
      .mockResolvedValueOnce({ data: { id: 'ws-123' }, error: null }); // workspace_profiles (useWorkspace)

    renderWizard();
    
    await waitFor(() => {
      expect(screen.getByText('Modo Consultório')).toBeInTheDocument();
      expect(screen.getByText(/Paciente Teste/i)).toBeInTheDocument();
    });
    
    const buttons = screen.getAllByRole('button');
    const cadastroBtn = buttons.find(b => b.textContent?.includes('Cadastro'));
    expect(cadastroBtn).toHaveClass('bg-primary');
  });

  it('deve avançar para a próxima etapa e persistir no banco', async () => {
    const fromMock = supabase.from as any;
    fromMock().maybeSingle
      .mockResolvedValueOnce({ data: mockProfile, error: null })
      .mockResolvedValueOnce({ data: mockSession, error: null });

    renderWizard();

    await waitFor(() => screen.getByText('Próximo'));
    
    const nextBtn = screen.getByText('Próximo');
    fireEvent.click(nextBtn);

    await waitFor(() => {
      const anamneseBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('Anamnese'));
      expect(anamneseBtn).toHaveClass('bg-primary');
    });

    expect(supabase.from).toHaveBeenCalledWith('in_office_sessions');
  });

  it('deve permitir voltar para a etapa anterior', async () => {
    const fromMock = supabase.from as any;
    fromMock().maybeSingle
      .mockResolvedValueOnce({ data: mockProfile, error: null })
      .mockResolvedValueOnce({ data: { ...mockSession, current_step: 2 }, error: null });

    renderWizard();

    await waitFor(() => screen.getByText('Anterior'));
    
    const prevBtn = screen.getByText('Anterior');
    fireEvent.click(prevBtn);

    await waitFor(() => {
      const cadastroBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('Cadastro'));
      expect(cadastroBtn).toHaveClass('bg-primary');
    });
  });

  it('deve marcar o plano alimentar como concluído ao sair da etapa 4', async () => {
    const fromMock = supabase.from as any;
    fromMock().maybeSingle
      .mockResolvedValueOnce({ data: mockProfile, error: null })
      .mockResolvedValueOnce({ data: { ...mockSession, current_step: 4 }, error: null });

    renderWizard();

    await waitFor(() => screen.getByText('Próximo'));
    
    const nextBtn = screen.getByText('Próximo');
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('in_office_sessions');
      const fromCall = fromMock();
      expect(fromCall.update).toHaveBeenCalledWith(expect.objectContaining({
        meal_plan_completed: true,
        current_step: 5
      }));
    });
  });
});
