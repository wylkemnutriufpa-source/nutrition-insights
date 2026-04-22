import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import InOfficeWizard from './pages/InOfficeWizard';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from './integrations/supabase/client';
import { useAuth } from './lib/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkspaceContext } from './hooks/useWorkspaceContext';
import '@testing-library/jest-dom';

// Mock DashboardLayout to simplify the testing environment
vi.mock('@/components/layout/DashboardLayout', () => ({
  default: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>
}));

// Mock child steps
vi.mock('@/components/in-office/InOfficeStepPatient', () => ({
  default: () => <div data-testid="step-patient">Etapa Cadastro</div>
}));

vi.mock('@/components/in-office/InOfficeStepAnamnesis', () => ({
  default: () => <div data-testid="step-anamnesis">Etapa Anamnese</div>
}));

vi.mock('@/components/in-office/InOfficeStepAssessment', () => ({
  default: () => <div data-testid="step-assessment">Etapa Avaliação</div>
}));

vi.mock('@/components/in-office/InOfficeStepMealPlan', () => ({
  default: () => <div data-testid="step-meal-plan">Etapa Plano</div>
}));

vi.mock('@/components/in-office/InOfficeStepFinalize', () => ({
  default: () => <div data-testid="step-finalize">Etapa Finalizar</div>
}));

// Mock supabase
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

// Mock auth
vi.mock('./lib/auth', () => ({
  useAuth: vi.fn(),
}));

// Mock tenant context
vi.mock('./lib/tenantContext', () => ({
  TenantProvider: ({ children }: any) => <>{children}</>,
  useTenant: () => ({ tenantId: 't1' }),
  useCurrentTenantId: () => 't1',
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
          <InOfficeWizard />
        </WorkspaceContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('InOfficeWizard - Navegação e Persistência', () => {
  const mockUser = { id: 'nutri-123' };
  const mockSession = { id: 'sess-123', current_step: 1, patient_id: 'pat-123' };
  const mockProfile = { full_name: 'Paciente Teste' };
  const mockNutritionistPatient = { tenant_id: 'tenant-123' };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ 
      user: mockUser, 
      loading: false 
    });
    
    const mockSupabase = supabase as any;
    // Sequential calls during wizard initialization:
    // 1. profile name (maybeSingle)
    // 2. existing session (maybeSingle)
    // 3. (if no session) nutritionist_patient (maybeSingle)
    // 4. (if no session) create session (insert.single)
    
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: mockProfile, error: null }) // Patient name
      .mockResolvedValueOnce({ data: mockSession, error: null }); // Session
    
    mockSupabase.update.mockResolvedValue({ data: null, error: null });
    mockSupabase.insert.mockResolvedValue({ data: { id: 'new' }, error: null });
    mockSupabase.single.mockResolvedValue({ data: mockSession, error: null });
  });

  it('deve carregar a etapa inicial e avançar para a próxima', async () => {
    const mockSupabase = supabase as any;
    
    await act(async () => {
      renderWizard();
    });
    
    // Wait for content to render after loading finishes
    await waitFor(() => {
      expect(screen.queryByTestId('step-patient')).toBeInTheDocument();
      expect(screen.getByText(/Paciente Teste/)).toBeInTheDocument();
    });

    const nextBtn = screen.getByText('Próximo');
    await act(async () => {
      fireEvent.click(nextBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('step-anamnesis')).toBeInTheDocument();
    });

    // Check database persistence
    expect(mockSupabase.from).toHaveBeenCalledWith('in_office_sessions');
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
      current_step: 2
    }));
  });

  it('deve permitir navegação por botões do stepper', async () => {
    const mockSupabase = supabase as any;
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: mockProfile, error: null })
      .mockResolvedValueOnce({ data: mockSession, error: null });

    await act(async () => {
      renderWizard();
    });
    
    await waitFor(() => screen.getByText('Anamnese'));
    
    const anamneseStepBtn = screen.getByText('Anamnese');
    await act(async () => {
      fireEvent.click(anamneseStepBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('step-anamnesis')).toBeInTheDocument();
    });
    
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
      current_step: 2
    }));
  });
});
