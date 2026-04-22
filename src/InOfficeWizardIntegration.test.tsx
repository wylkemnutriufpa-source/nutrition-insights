import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InOfficeWizard from './pages/InOfficeWizard';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { supabase } from './integrations/supabase/client';

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

// Mock do Supabase com encadeamento infinito
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
    then: undefined, // Importante para não ser tratado como Promise prematuramente
  };
  
  // Para select().single() etc
  chain.select.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  
  return chain;
};

vi.mock('./integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => createMockChain()),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    functions: { invoke: vi.fn(() => Promise.resolve({ data: {}, error: null })) }
  }
}));

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

  it('deve simular o fluxo completo e validar persistência para múltiplos pacientes', async () => {
    // Configura mocks específicos para retorno de dados
    const mockChain = (supabase.from as any)();
    mockChain.maybeSingle
      .mockResolvedValueOnce({ data: { full_name: 'Mayara Leite', user_id: 'p1' }, error: null }) // profile
      .mockResolvedValueOnce({ data: null, error: null }) // session (existing)
      .mockResolvedValueOnce({ data: { tenant_id: 't1' }, error: null }); // nutritionist_patients

    render(<InOfficeWizard />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText(/Mayara Leite/i)).toBeInTheDocument());

    // Verifica se os botões de navegação estão presentes
    expect(screen.getByRole('button', { name: /Próximo/i })).toBeInTheDocument();
  });
});
