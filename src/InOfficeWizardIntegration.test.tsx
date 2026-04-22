import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InOfficeWizard from './pages/InOfficeWizard';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { supabase } from './integrations/supabase/client';

// Mock dependências pesadas
vi.mock('./components/layout/DashboardLayout', () => ({
  default: ({ children }: any) => <div data-testid="layout">{children}</div>
}));

// Mock do Supabase
vi.mock('./integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

// Mock do hook useAuth
vi.mock('./lib/auth', () => ({
  useAuth: () => ({ user: { id: 'nutri1' } }),
  AuthProvider: ({ children }: any) => <div>{children}</div>
}));

// Mock do resolver de identidade
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

  const setupMocks = (patientName: string, hasMealPlan = false) => {
    (supabase.from as any).mockImplementation((table: string) => {
      const chain = getMockChain();

      if (table === 'profiles') {
        chain.maybeSingle.mockResolvedValue({ data: { full_name: patientName, user_id: 'p1' }, error: null });
      } else if (table === 'in_office_sessions') {
        chain.maybeSingle.mockResolvedValue({ 
          data: hasMealPlan ? { id: 'sess_1', meal_plan_id: 'plan_1', current_step: 4 } : null, 
          error: null 
        });
        chain.single.mockResolvedValue({ data: { id: 'sess_1' }, error: null });
      } else if (table === 'nutritionist_patients') {
        chain.maybeSingle.mockResolvedValue({ data: { tenant_id: 't1' }, error: null });
      } else if (table === 'meal_plans') {
        chain.maybeSingle.mockResolvedValue({ 
          data: hasMealPlan ? { id: 'plan_1', plan_status: 'draft' } : null, 
          error: null 
        });
        // Para insert().select().single()
        const insertChain = getMockChain();
        insertChain.single.mockResolvedValue({ data: { id: 'plan_1' }, error: null });
        chain.insert.mockReturnValue({ select: () => insertChain });
      } else if (table === 'meal_plan_items') {
        chain.select.mockResolvedValue({ data: [], error: null });
      } else if (table === 'patient_anamnesis' || table === 'physical_assessments') {
        chain.maybeSingle.mockResolvedValue({ data: null, error: null });
      }

      return chain;
    });
  };

  it('deve simular o fluxo completo para Mayara Leite', async () => {
    setupMocks('Mayara Leite', false);
    
    render(<InOfficeWizard />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Mayara Leite/i)).toBeInTheDocument();
    });

    const nextBtn = screen.getByRole('button', { name: /Próximo/i });
    
    // Cadastro -> Anamnese
    fireEvent.click(nextBtn);
    await waitFor(() => expect(screen.getByText(/Anamnese Rápida/i)).toBeInTheDocument());

    // Anamnese -> Avaliação
    fireEvent.click(nextBtn);
    await waitFor(() => expect(screen.getByText(/Avaliação Física Rápida/i)).toBeInTheDocument());

    // Avaliação -> Plano
    fireEvent.click(nextBtn);
    await waitFor(() => expect(screen.getByText(/Criar Plano Presencial/i)).toBeInTheDocument());

    // Criar Plano
    const createBtn = screen.getByRole('button', { name: /Criar Plano Presencial/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('meal_plans');
    });

    // Plano -> Finalizar
    fireEvent.click(screen.getByRole('button', { name: /Próximo/i }));

    await waitFor(() => {
      expect(screen.getByText(/Resumo da Sessão/i)).toBeInTheDocument();
    });

    // Publicar
    const publishBtn = screen.getByRole('button', { name: /Publicar Plano/i });
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(screen.getByText(/Plano publicado com sucesso/i)).toBeInTheDocument();
    });
  });

  it('deve simular o fluxo completo para Josiane', async () => {
    setupMocks('Josiane', true);
    
    render(<Wrapper patientId="p2"><InOfficeWizard /></Wrapper>);

    await waitFor(() => expect(screen.getByText(/Josiane/i)).toBeInTheDocument());

    // Pula para o plano via stepper
    fireEvent.click(screen.getByText(/Plano/i));

    await waitFor(() => {
      expect(screen.getByText(/Duplicar/i)).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /Próximo/i }));
    await waitFor(() => {
      expect(screen.getByText(/Resumo da Sessão/i)).toBeInTheDocument();
    });
  });
});
