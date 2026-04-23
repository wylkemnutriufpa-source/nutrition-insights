
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mocks de Componentes e Hooks
import OnboardingPaciente from '@/pages/OnboardingPaciente';
import PatientMealPlan from '@/pages/PatientMealPlan';
import NextMealWidget from '@/components/patient/NextMealWidget';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    then: vi.fn(),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    })
  };
  return { supabase: { from: vi.fn(() => mockQuery), channel: vi.fn(() => mockQuery.channel()) } };
});

// Mock do useAuth - ESSENCIAL: Mock completo para evitar quebras no DashboardLayout/TrialCountdown
vi.mock('@/lib/auth', () => ({ 
  useAuth: () => ({ 
    user: { id: 'patient-123' }, 
    isPatient: true, 
    loading: false,
    subscription: { subscribed: true, is_trial: false, plan_id: 'premium' }
  }),
  AuthProvider: ({ children }: any) => <div>{children}</div>
}));

// Mock do Contexto de Tenant
vi.mock('@/lib/tenantContext', () => ({
  useTenant: () => ({ tenantId: 'tenant-123' }),
  TenantProvider: ({ children }: any) => <div>{children}</div>
}));

// Mock do DashboardLayout para simplificar o render (evita testar o menu lateral complexo)
vi.mock('@/components/layout/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-layout">{children}</div>
}));

// Mock do useOnboardingGuard
vi.mock('@/hooks/useOnboardingGuard', () => ({
  useOnboardingGuard: vi.fn(() => ({ requirement: 'must_complete' })),
  isOnboardingAllowedRoute: (path: string) => path.startsWith('/onboarding')
}));

// Mock de Navegação
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('Fluxo E2E Paciente: Onboarding -> Plano -> Macros', () => {
  const mockPlanId = 'plan-789';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    
    const mockSupabase = supabase as any;
    
    // Mock base do supabase
    mockSupabase.from.mockImplementation((table: string) => {
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(() => {
          if (table === 'meal_plans') {
            return Promise.resolve({ data: { id: mockPlanId, title: 'Plano E2E', start_date: '2026-01-01', plan_status: 'published_to_patient' }, error: null });
          }
          if (table === 'profiles') {
            return Promise.resolve({ data: { full_name: 'Wannubia Teste' }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        }),
        then: (resolve: any) => {
          if (table === 'meal_plan_items') {
            const dayOfWeek = (new Date().getDay() + 6) % 7;
            return resolve({ 
              data: [
                { id: 'item-1', meal_type: 'lunch', title: 'Frango com Arroz', calories_target: 600, protein_target: 40, carbs_target: 60, fat_target: 15, day_of_week: dayOfWeek }
              ], 
              error: null 
            });
          }
          if (table === 'meal_item_completions' || table === 'patient_meal_substitutions') {
             return resolve({ data: [], error: null });
          }
          return chain.maybeSingle().then(resolve);
        }
      };
      return chain;
    });
  });

  it('1. percorre onboarding e valida redirect', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/onboarding-paciente']}>
          <Routes>
            <Route path="/onboarding-paciente" element={<OnboardingPaciente />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const skipBtn = screen.getByText(/Pular/i);
    fireEvent.click(skipBtn);

    expect(localStorage.getItem('patient_onboarding_completed')).toBe('true');
    expect(mockNavigate).toHaveBeenCalledWith('/paciente/dashboard');
  });

  it('2. acessa plano e valida rendering de alimentos', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PatientMealPlan />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Frango com Arroz/i)).toBeInTheDocument();
    });
  });

  it('3. valida persistência de macros após refresh simulado', async () => {
    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NextMealWidget />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/600 kcal/i)).toBeInTheDocument();
    });

    unmount();
    
    // Remonta o componente para simular refresh
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NextMealWidget />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/600 kcal/i)).toBeInTheDocument();
      expect(screen.getByText(/P 40g/i)).toBeInTheDocument();
    });
    
    console.log("✅ E2E Completo: Onboarding -> Plano -> Macros (Persistente)");
  });
});
