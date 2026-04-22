import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InOfficeWizard from './pages/InOfficeWizard';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { supabase } from './integrations/supabase/client';
import { toast } from 'sonner';

// Mock dependências
vi.mock('./components/layout/DashboardLayout', () => ({
  default: ({ children }: any) => <div data-testid="layout">{children}</div>
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }
}));

// Mock do Supabase
vi.mock('./integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    functions: {
      invoke: vi.fn()
    }
  }
}));

// Mock useAuth e Resolver
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'nutri1' }, isAdmin: false }),
  AuthProvider: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@/lib/onboardingPlanResolver', () => ({
  resolvePatientIdentity: vi.fn((id) => Promise.resolve({ canonicalId: id, profileId: id + '_prof', allIds: [id] }))
}));

const Wrapper = ({ children, patientId = 'p1' }: any) => (
  <MemoryRouter initialEntries={[`/in-office/${patientId}`]}>
    <Routes>
      <Route path="/in-office/:patientId" element={children} />
    </Routes>
  </MemoryRouter>
);

describe('InOfficeWizard Multi-Patient Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupComplexMocks = (patientName: string) => {
    let sessionState = { id: 'sess_1', meal_plan_id: null as string | null, current_step: 1 };
    let planState = null as any;

    const mockFrom = (table: string) => {
      const chain: any = {
        select: vi.fn(() => chain),
        insert: vi.fn((data) => {
          if (table === 'meal_plans') {
            planState = { id: 'plan_1', plan_status: 'draft' };
            sessionState.meal_plan_id = 'plan_1';
          }
          return { select: () => ({ single: () => Promise.resolve({ data: planState || sessionState, error: null }) }) };
        }),
        update: vi.fn((data) => {
          if (table === 'in_office_sessions') Object.assign(sessionState, data);
          if (table === 'meal_plans' && planState) Object.assign(planState, data);
          return chain;
        }),
        delete: vi.fn(() => chain),
        upsert: vi.fn(() => chain),
        eq: vi.fn(() => Promise.resolve({ error: null })),
        neq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        is: vi.fn(() => chain),
        or: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        single: vi.fn(() => Promise.resolve({ data: (table === 'meal_plans' ? planState : sessionState), error: null })),
        maybeSingle: vi.fn(() => {
          if (table === 'profiles') return Promise.resolve({ data: { full_name: patientName, user_id: 'p1' }, error: null });
          if (table === 'in_office_sessions') return Promise.resolve({ data: sessionState.id ? sessionState : null, error: null });
          if (table === 'meal_plans') return Promise.resolve({ data: planState, error: null });
          if (table === 'nutritionist_patients') return Promise.resolve({ data: { tenant_id: 't1' }, error: null });
          return Promise.resolve({ data: null, error: null });
        }),
        ilike: vi.fn(() => chain),
      };
      
      // Override for specific chains
      chain.in.mockReturnValue({
          eq: vi.fn(() => Promise.resolve({ error: null }))
      });

      return chain;
    };

    (supabase.from as any).mockImplementation(mockFrom);
  };

  it('deve simular o fluxo resiliente para Mayara Leite', async () => {
    setupComplexMocks('Mayara Leite');
    
    render(<InOfficeWizard />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText(/Mayara Leite/i)).toBeInTheDocument());

    // Pula para Plano
    fireEvent.click(screen.getByText(/Plano/i));
    
    await waitFor(() => expect(screen.getByText(/Criar Plano Presencial/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Criar Plano Presencial/i));

    // Agora deve carregar o editor
    await waitFor(() => expect(screen.getByText(/Duplicar/i)).toBeInTheDocument());

    // Próximo -> Finalizar
    fireEvent.click(screen.getByRole('button', { name: /Próximo/i }));

    await waitFor(() => expect(screen.getByText(/Resumo da Sessão/i)).toBeInTheDocument());
    
    // Publicar
    const publishBtn = screen.getByRole('button', { name: /Publicar Plano/i });
    fireEvent.click(publishBtn);

    await waitFor(() => {
      // Verifica se o supabase foi chamado para atualizar status
      expect(supabase.from).toHaveBeenCalledWith('meal_plans');
    });
  });
});
