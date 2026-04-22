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

  const setupMocks = (patientName: string) => {
    const mockFrom = (table: string) => {
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
      };

      if (table === 'profiles') {
        chain.maybeSingle.mockResolvedValue({ data: { full_name: patientName }, error: null });
      } else if (table === 'in_office_sessions') {
        chain.maybeSingle.mockResolvedValue({ data: null, error: null });
        chain.single.mockResolvedValue({ data: { id: 'sess_' + patientName }, error: null });
      } else if (table === 'nutritionist_patients') {
        chain.maybeSingle.mockResolvedValue({ data: { tenant_id: 't1' }, error: null });
      } else if (table === 'meal_plans') {
        chain.maybeSingle.mockResolvedValue({ data: { id: 'plan_' + patientName, plan_status: 'draft' }, error: null });
        chain.single.mockResolvedValue({ data: { id: 'plan_' + patientName }, error: null });
      } else if (table === 'meal_plan_items') {
        chain.maybeSingle.mockResolvedValue({ data: null, error: null });
        // Simular sucesso na inserção/upsert
        chain.single.mockResolvedValue({ data: { id: 'item1' }, error: null });
        return Promise.resolve({ data: [], error: null });
      }

      // Default implementation returns the chain to allow further method calls
      return chain;
    };

    (supabase.from as any).mockImplementation(mockFrom);
  };

  it('deve simular o fluxo completo para Mayara Leite (Marmitas)', async () => {
    setupMocks('Mayara Leite');
    
    render(<InOfficeWizard />, { wrapper: Wrapper });

    // 1. Verifica carregamento inicial (agora com mock do resolver)
    await waitFor(() => {
      expect(screen.getByText(/Mayara Leite/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // 2. Navega para etapa de Plano (Step 4)
    const nextBtn = screen.getByRole('button', { name: /Próximo/i });
    fireEvent.click(nextBtn); // Passo 1 -> 2
    fireEvent.click(nextBtn); // Passo 2 -> 3
    fireEvent.click(nextBtn); // Passo 3 -> 4

    await waitFor(() => {
      expect(screen.getByText(/Plano Alimentar/i)).toBeInTheDocument();
    });

    // 3. Simula criação de plano
    const createBtn = screen.getByRole('button', { name: /Criar Plano Presencial/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('meal_plans');
    });

    // 4. Navega para Finalizar (Step 5)
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText(/Resumo da Sessão/i)).toBeInTheDocument();
    });

    // 5. Publica o plano
    const publishBtn = screen.getByRole('button', { name: /Publicar Plano/i });
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('meal_plans');
      expect(screen.getByText(/Plano publicado com sucesso/i)).toBeInTheDocument();
    });
  });

  it('deve simular o fluxo completo para Josiane (Itens Manuais)', async () => {
    setupMocks('Josiane');
    
    render(<Wrapper patientId="p2"><InOfficeWizard /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByText(/Josiane/i)).toBeInTheDocument();
    });

    // Pula para o plano
    fireEvent.click(screen.getByRole('button', { name: /Próximo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Próximo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Próximo/i }));

    await waitFor(() => {
      expect(screen.getByText(/Plano Alimentar/i)).toBeInTheDocument();
    });
    
    // Verifica se mudou para a etapa final e pode publicar
    fireEvent.click(screen.getByRole('button', { name: /Próximo/i }));
    await waitFor(() => {
      expect(screen.getByText(/Resumo da Sessão/i)).toBeInTheDocument();
    });
  });
});
