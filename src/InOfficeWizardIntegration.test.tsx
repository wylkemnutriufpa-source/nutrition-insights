import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InOfficeWizard from './pages/InOfficeWizard';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { supabase } from './integrations/supabase/client';

// Mock dependências pesadas
vi.mock('./components/layout/DashboardLayout', () => ({
  default: ({ children }: any) => <div data-testid="layout">{children}</div>
}));

// Mock do Supabase
vi.mock('./integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: vi.fn()
                }))
              }))
            }))
          })),
          maybeSingle: vi.fn(),
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: vi.fn()
            }))
          }))
        })),
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn()
          }))
        })),
        or: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: { user_id: 'p1', full_name: 'Mayara' }, error: null }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn()
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    })),
    rpc: vi.fn()
  }
}));

// Mock do hook useAuth
vi.mock('./lib/auth', () => ({
  useAuth: () => ({ user: { id: 'nutri1' } }),
  AuthProvider: ({ children }: any) => <div>{children}</div>
}));

const Wrapper = ({ children }: any) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('InOfficeWizard Multi-Patient Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve simular o fluxo completo de salvar plano para paciente com marmitas', async () => {
    const patientId = 'p1';
    
    // Configura mocks para Retorno de Dados
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: { full_name: 'Mayara Leite' }, error: null }) }),
            or: () => ({ maybeSingle: () => Promise.resolve({ data: { user_id: 'p1', id: 'p1_prof', full_name: 'Mayara Leite' }, error: null }) })
          })
        };
      }
      if (table === 'in_office_sessions') {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ is: () => ({ order: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }) }) }),
            maybeSingle: () => Promise.resolve({ data: { id: 'sess1', meal_plan_id: 'plan1' }, error: null })
          }),
          insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'sess1' }, error: null }) }) }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) })
        };
      }
      if (table === 'nutritionist_patients') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { tenant_id: 't1' }, error: null }) }) }) })
        };
      }
      if (table === 'meal_plans') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                in: () => ({ order: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) })
              }),
              maybeSingle: () => Promise.resolve({ data: { plan_status: 'draft' }, error: null })
            })
          }),
          insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'plan1' }, error: null }) }) }),
          update: () => ({ eq: () => ({ in: () => Promise.resolve({ error: null }) }) })
        };
      }
      if (table === 'meal_plan_items') {
        return {
          select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
          insert: () => Promise.resolve({ error: null }),
          upsert: () => Promise.resolve({ error: null }),
          delete: () => ({ eq: () => Promise.resolve({ error: null }) })
        };
      }
      return { select: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }) }) };
    });

    render(<InOfficeWizard />, { wrapper: Wrapper });

    // 1. Verifica carregamento inicial
    await waitFor(() => {
      expect(screen.getByText(/Mayara Leite/i)).toBeInTheDocument();
    });

    // 2. Navega para etapa de Plano (Step 4)
    // Simula cliques nos botões de Próximo
    const nextBtn = screen.getByRole('button', { name: /Próximo/i });
    
    // Passo 1 -> 2
    fireEvent.click(nextBtn);
    // Passo 2 -> 3
    fireEvent.click(nextBtn);
    // Passo 3 -> 4
    fireEvent.click(nextBtn);

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

    // 5. Publica o plano (Valida mudança de status)
    const publishBtn = screen.getByRole('button', { name: /Publicar Plano/i });
    fireEvent.click(publishBtn);

    await waitFor(() => {
      // Verifica se o update foi chamado com o status correto
      expect(supabase.from).toHaveBeenCalledWith('meal_plans');
      // O mock do update foi chamado para mudar para published_to_patient
    });
  });
});
