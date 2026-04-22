import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InOfficeWizard from '../pages/InOfficeWizard';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

// Mocks
vi.mock('../components/layout/DashboardLayout', () => ({
  default: ({ children }: any) => <div data-testid="layout">{children}</div>
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }
}));

// Supabase helper for infinite chain
const createMockChain = () => {
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
    single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    ilike: vi.fn(() => chain),
  };
  return chain;
};

vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => createMockChain()),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    functions: { invoke: vi.fn(() => Promise.resolve({ data: {}, error: null })) }
  }
}));

vi.mock('../lib/auth', () => ({
  useAuth: () => ({ user: { id: 'nutri1' }, isAdmin: false }),
  AuthProvider: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@/lib/onboardingPlanResolver', () => ({
  resolvePatientIdentity: vi.fn((id) => Promise.resolve({ canonicalId: id, profileId: id + '_prof', allIds: [id] }))
}));

const Wrapper = ({ children, patientId }: { children: React.ReactNode, patientId: string }) => (
  <MemoryRouter initialEntries={[`/in-office/${patientId}`]}>
    <Routes>
      <Route path="/in-office/:patientId" element={children} />
    </Routes>
  </MemoryRouter>
);

describe('InOffice Resilience & Multi-Patient Loop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const patients = [
    { id: 'p1', name: 'Mayara Leite', hasMarmita: true },
    { id: 'p2', name: 'Josiane', hasMarmita: false },
    { id: 'p3', name: 'Andrea Ferreira', hasMarmita: true },
  ];

  it('deve percorrer lista de pacientes e validar persistência para cada um', async () => {
    for (const patient of patients) {
      const mockChain = createMockChain();
      
      // Setup behavior for this specific loop iteration
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
          mockChain.maybeSingle.mockResolvedValueOnce({ data: { full_name: patient.name, user_id: patient.id }, error: null });
        }
        if (table === 'in_office_sessions') {
          mockChain.maybeSingle.mockResolvedValue({ data: { id: 'sess_' + patient.id, current_step: 1 }, error: null });
          mockChain.single.mockResolvedValue({ data: { id: 'sess_' + patient.id }, error: null });
        }
        if (table === 'meal_plans') {
          mockChain.maybeSingle.mockResolvedValue({ data: null, error: null });
          const insertChain = createMockChain();
          insertChain.single.mockResolvedValue({ data: { id: 'plan_' + patient.id }, error: null });
          mockChain.insert.mockReturnValue({ select: () => insertChain });
        }
        return mockChain;
      });

      const { unmount } = render(
        <Wrapper patientId={patient.id}>
          <InOfficeWizard />
        </Wrapper>
      );

      // 1. Validate Initial Load
      await waitFor(() => expect(screen.getByText(new RegExp(patient.name, 'i'))).toBeInTheDocument());

      // 2. Go to Meal Plan Step
      fireEvent.click(screen.getByText(/Plano/i));

      // 3. Create Plan
      await waitFor(() => expect(screen.getByText(/Criar Plano Presencial/i)).toBeInTheDocument());
      fireEvent.click(screen.getByText(/Criar Plano Presencial/i));

      // 4. If marmita patient, simulate action that uses withRetry
      if (patient.hasMarmita) {
        await waitFor(() => expect(screen.getByText(/Duplicar/i)).toBeInTheDocument());
        fireEvent.click(screen.getByText(/Duplicar/i));
        
        await waitFor(() => {
          // Verify upsert was called (idempotency check)
          expect(supabase.from).toHaveBeenCalledWith('meal_plan_items');
          const upsertCalls = mockChain.upsert.mock.calls;
          expect(upsertCalls.length).toBeGreaterThan(0);
        });
      }

      // 5. Finalize
      fireEvent.click(screen.getByRole('button', { name: /Próximo/i }));
      await waitFor(() => expect(screen.getByText(/Resumo da Sessão/i)).toBeInTheDocument());

      // 6. Complete Session
      fireEvent.click(screen.getByRole('button', { name: /Finalizar Sessão/i }));

      // 7. Verify session updated to completed
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('in_office_sessions');
        // Final update call
        expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({
          completed_at: expect.any(String),
          meal_plan_completed: true
        }));
      });

      unmount();
      vi.clearAllMocks();
    }
  });
});
