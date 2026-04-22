import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InOfficeWizard from './pages/InOfficeWizard';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { supabase } from './integrations/supabase/client';
import { toast } from 'sonner';

// Mock dependências globais
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

// Mock do hook useAuth e do resolver
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'nutri1' }, isAdmin: false }),
  AuthProvider: ({ children }: any) => <div data-testid="auth-provider">{children}</div>
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

describe('InOfficeWizard Resilience & Multi-Patient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const getMockChain = () => {
    const chain: any = {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
      upsert: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      neq: vi.fn(() => chain),
      in: vi.fn(() => chain),
      is: vi.fn(() => chain),
      or: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      ilike: vi.fn(() => chain),
    };
    return chain;
  };

  const setupComplexMocks = (patientName: string, hasMealPlan = false) => {
    let sessionState = { id: 'sess_1', meal_plan_id: hasMealPlan ? 'plan_1' : null, current_step: hasMealPlan ? 4 : 1 };
    let planState = hasMealPlan ? { id: 'plan_1', plan_status: 'draft', title: 'Plano' } : null;

    (supabase.from as any).mockImplementation((table: string) => {
      const chain = getMockChain();

      chain.single.mockImplementation(() => Promise.resolve({ data: (table === 'meal_plans' ? planState : sessionState), error: null }));
      
      chain.maybeSingle.mockImplementation(() => {
        if (table === 'profiles') return Promise.resolve({ data: { full_name: patientName, user_id: 'p1' }, error: null });
        if (table === 'in_office_sessions') return Promise.resolve({ data: sessionState.id ? sessionState : null, error: null });
        if (table === 'meal_plans') return Promise.resolve({ data: planState, error: null });
        if (table === 'nutritionist_patients') return Promise.resolve({ data: { tenant_id: 't1' }, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      chain.insert.mockImplementation(() => {
        if (table === 'meal_plans') {
          planState = { id: 'plan_1', plan_status: 'draft', title: 'Plano' };
          sessionState.meal_plan_id = 'plan_1';
        }
        return { select: () => ({ single: () => Promise.resolve({ data: planState || sessionState, error: null }) }) };
      });

      chain.update.mockImplementation((data: any) => {
        if (table === 'in_office_sessions') Object.assign(sessionState, data);
        if (table === 'meal_plans') if (planState) Object.assign(planState, data);
        return Promise.resolve({ error: null });
      });

      return chain;
    });
  };

  it('deve simular o fluxo completo e resiliente para Mayara Leite', async () => {
    setupComplexMocks('Mayara Leite');
    
    render(<InOfficeWizard />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText(/Mayara Leite/i)).toBeInTheDocument());

    // Step 1 -> Step 4 (Plano)
    fireEvent.click(screen.getByText(/Plano/i));
    
    await waitFor(() => expect(screen.getByText(/Criar Plano Presencial/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Criar Plano Presencial/i));

    // Passo final
    await waitFor(() => expect(screen.getByText(/Duplicar/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Próximo/i }));

    await waitFor(() => expect(screen.getByText(/Resumo da Sessão/i)).toBeInTheDocument());
    
    // Publicar
    const publishBtn = screen.getByRole('button', { name: /Publicar Plano/i });
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Plano publicado'));
    });
  });
});
