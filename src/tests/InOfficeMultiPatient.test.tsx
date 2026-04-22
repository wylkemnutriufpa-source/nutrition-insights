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

const createMockChain = (initialData: any = {}) => {
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
    single: vi.fn(() => Promise.resolve({ data: initialData, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: initialData, error: null })),
    ilike: vi.fn(() => chain),
    then: undefined,
  };
  return chain;
};

vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
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
  ];

  it('deve percorrer lista de pacientes e validar persistência para cada um', async () => {
    for (const patient of patients) {
      let currentSession: any = { id: 'sess_' + patient.id, meal_plan_id: null, current_step: 1 };
      let currentPlan: any = null;

      (supabase.from as any).mockImplementation((table: string) => {
        const chain = createMockChain();
        if (table === 'profiles') chain.maybeSingle.mockResolvedValue({ data: { full_name: patient.name, user_id: patient.id }, error: null });
        if (table === 'in_office_sessions') {
          chain.maybeSingle.mockImplementation(() => Promise.resolve({ data: currentSession, error: null }));
          chain.single.mockImplementation(() => Promise.resolve({ data: currentSession, error: null }));
          chain.update.mockImplementation((data: any) => { Object.assign(currentSession, data); return Promise.resolve({ error: null }); });
        }
        if (table === 'meal_plans') {
          chain.maybeSingle.mockImplementation(() => Promise.resolve({ data: currentPlan, error: null }));
          chain.insert.mockImplementation(() => {
            currentPlan = { id: 'plan_' + patient.id, plan_status: 'draft' };
            currentSession.meal_plan_id = currentPlan.id;
            return { select: () => ({ single: () => Promise.resolve({ data: currentPlan, error: null }) }) };
          });
          chain.update.mockImplementation((data: any) => { if (currentPlan) Object.assign(currentPlan, data); return { in: () => Promise.resolve({ error: null }) }; });
        }
        if (table === 'nutritionist_patients') chain.maybeSingle.mockResolvedValue({ data: { tenant_id: 't1' }, error: null });
        if (table === 'meal_plan_items') {
          chain.select.mockResolvedValue({ data: [], error: null });
          chain.upsert.mockResolvedValue({ error: null });
          chain.delete.mockResolvedValue({ error: null });
        }
        return chain;
      });

      const { unmount } = render(<Wrapper patientId={patient.id}><InOfficeWizard /></Wrapper>);

      // Step 1 Load
      expect(await screen.findByText(new RegExp(patient.name, 'i'))).toBeInTheDocument();

      // Go to Step 4
      fireEvent.click(screen.getByText(/Plano/i));

      // Create Plan if not exists
      const createBtn = await screen.findByText(/Criar Plano Presencial/i);
      fireEvent.click(createBtn);

      // If marmita, check for Duplicar
      if (patient.hasMarmita) {
        // Wait for editor to load (it loads when meal_plan_id is set)
        const dupBtn = await screen.findByText(/Duplicar/i);
        fireEvent.click(dupBtn);
        await waitFor(() => {
          expect(supabase.from).toHaveBeenCalledWith('meal_plan_items');
        });
      }

      // Finalize Session
      const nextBtn = screen.getByRole('button', { name: /Próximo/i });
      fireEvent.click(nextBtn);
      
      const finishBtn = await screen.findByRole('button', { name: /Finalizar Sessão/i });
      fireEvent.click(finishBtn);

      // Verify persistence
      await waitFor(() => {
        expect(currentSession.completed_at).toBeTruthy();
        expect(currentSession.meal_plan_completed).toBe(true);
      });

      unmount();
      vi.clearAllMocks();
    }
  });
});
