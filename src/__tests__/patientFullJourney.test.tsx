
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mocks de Componentes
import OnboardingPaciente from '@/pages/OnboardingPaciente';
import NextMealWidget from '@/components/patient/NextMealWidget';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    then: vi.fn()
  };
  return { 
    supabase: { 
      from: vi.fn(() => mockQuery), 
      removeChannel: vi.fn() 
    } 
  };
});

// Mock do useAuth
vi.mock('@/lib/auth', () => ({ 
  useAuth: () => ({ 
    user: { id: 'patient-123' }, 
    isPatient: true, 
    loading: false,
    subscription: { subscribed: true, is_trial: false }
  })
}));

// Mock do Contexto de Tenant
vi.mock('@/lib/tenantContext', () => ({
  useTenant: () => ({ tenantId: 'tenant-123' })
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

describe('Fluxo E2E Paciente: Onboarding -> Macros', () => {
  const mockPlanId = 'plan-789';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    const mockSupabase = supabase as any;
    mockSupabase.from.mockImplementation((table: string) => {
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(async () => {
          if (table === 'meal_plans') {
            return { data: { id: mockPlanId }, error: null };
          }
          return { data: null, error: null };
        }),
        then: vi.fn((resolve: any) => {
          if (table === 'meal_plan_items') {
            const dayOfWeek = (new Date().getDay() + 6) % 7;
            return Promise.resolve(resolve({ 
              data: [
                { id: 'item-1', meal_type: 'Almoço', title: 'Frango com Arroz', calories_target: 600, protein_target: 40, carbs_target: 60, fat_target: 15, day_of_week: dayOfWeek }
              ], 
              error: null 
            }));
          }
          return chain.maybeSingle().then(resolve);
        })
      };
      return chain;
    });
  });

  it('valida jornada: pular onboarding e renderizar macros persistentes', async () => {
    // 1. ONBOARDING
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <OnboardingPaciente />
        </MemoryRouter>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByText(/Pular/i));
    expect(localStorage.getItem('patient_onboarding_completed')).toBe('true');

    // 2. DASHBOARD / MACROS
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NextMealWidget />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/600 kcal/i)).toBeInTheDocument();
    });

    // 3. REFRESH SIMULADO (Remount)
    document.body.innerHTML = '';
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NextMealWidget />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/600 kcal/i)).toBeInTheDocument();
    });
    
    console.log("✅ E2E Paciente: Onboarding e Macros persistentes validados.");
  });
});
