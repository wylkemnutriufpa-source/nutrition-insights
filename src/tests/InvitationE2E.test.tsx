import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Invitation from '@/pages/Invitation';
import PatientRegister from '@/pages/PatientRegister';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
const mockQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  order: vi.fn().mockReturnThis(),
  insert: vi.fn().mockResolvedValue({ error: null }),
  update: vi.fn().mockReturnThis(),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => mockQuery),
    auth: { 
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    }
  },
}));

vi.mock('@/lib/auth', () => ({
  useAuth: vi.fn().mockReturnValue({ user: null, loading: false }),
  AuthProvider: ({ children }: any) => <>{children}</>
}));

describe('Invitation E2E Simulation', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock location
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'www.fitjourney.com.br',
        href: 'https://www.fitjourney.com.br/convite/TEST12',
        origin: 'https://www.fitjourney.com.br',
        host: 'www.fitjourney.com.br'
      },
      writable: true,
      configurable: true
    });
  });

  it('deve exibir erro se o domínio não for oficial', async () => {
    // Override hostname
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'evil-domain.com',
        href: 'https://evil-domain.com/convite/TEST12',
        origin: 'https://evil-domain.com',
        host: 'evil-domain.com'
      },
      writable: true,
      configurable: true
    });

    mockQuery.maybeSingle.mockResolvedValue({
      data: {
        id: '1',
        code: 'TEST12',
        professional_id: 'prof1',
        status: 'pending'
      },
      error: null
    });

    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/convite/TEST12']}>
          <Routes>
            <Route path="/convite/:code" element={<Invitation />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    );


    await waitFor(() => {
      expect(screen.getByText(/Este link de convite veio de uma origem não autorizada/i)).toBeInTheDocument();
    });
  });

  it('deve exibir informações do profissional e clínica corretamente', async () => {
    mockQuery.maybeSingle.mockResolvedValue({
      data: {
        id: '1',
        code: 'TEST12',
        professional_id: 'prof1',
        patient_name: 'João Silva',
        status: 'pending',
        professional: { full_name: 'Nutri Expert', avatar_url: null },
        clinic: { name: 'Clinica Fit' }
      },
      error: null
    });

    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/convite/TEST12']}>
          <Routes>
            <Route path="/convite/:code" element={<Invitation />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    );


    await waitFor(() => {
      expect(screen.getByText(/Nutri Expert/i)).toBeInTheDocument();
      expect(screen.getByText(/Clinica Fit/i)).toBeInTheDocument();
      expect(screen.getByText(/Olá, João/i)).toBeInTheDocument();
    });
  });

  it('deve validar erro de convite expirado', async () => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);

    mockQuery.maybeSingle.mockResolvedValue({
      data: {
        id: '1',
        code: 'EXPIRED',
        professional_id: 'prof1',
        status: 'pending',
        expires_at: pastDate.toISOString()
      },
      error: null
    });

    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/convite/EXPIRED']}>
          <Routes>
            <Route path="/convite/:code" element={<Invitation />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    );


    await waitFor(() => {
      expect(screen.getByText(/Este convite expirou/i)).toBeInTheDocument();
    });
  });
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('PatientRegister Invitation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar informações do convite na tela de registro e não mostrar erro ao recarregar', async () => {
    mockQuery.maybeSingle.mockResolvedValue({
      data: {
        id: 'inv-123',
        code: 'REG123',
        professional_id: 'prof1',
        status: 'pending',
        patient_email: 'paciente@teste.com',
        patient_name: 'Paciente Teste',
        profiles: { full_name: 'Nutri Alvo', avatar_url: null, phone: '999' },
        metadata: { clinic_name: 'Clinica Alvo' }
      },
      error: null
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/register?code=REG123']}>
          <Routes>
            <Route path="/register" element={<PatientRegister />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Deve mostrar o profissional
    await waitFor(() => {
      expect(screen.getByText(/Nutri Alvo/i)).toBeInTheDocument();
    });

    // Simula recarregamento
    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/register?code=REG123']}>
          <Routes>
            <Route path="/register" element={<PatientRegister />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verifica se o profissional ainda está lá e se não houve erro de "vínculo inválido"
    // (O erro de vínculo inválido no toast foi mockado em sonner, mas aqui verificamos a permanência do UI state)
    await waitFor(() => {
      expect(screen.getByText(/Nutri Alvo/i)).toBeInTheDocument();
    });
    
    // Verifica se os campos estão preenchidos
    const emailInput = screen.getByPlaceholderText(/seu@email.com/i) as HTMLInputElement;
    expect(emailInput.value).toBe('paciente@teste.com');
  });

  it('deve mostrar erro específico se o convite foi revogado', async () => {
    mockQuery.maybeSingle.mockResolvedValue({
      data: {
        id: 'inv-revoked',
        code: 'REVOKED',
        professional_id: 'prof1',
        status: 'revoked',
        profiles: { full_name: 'Nutri Revog' }
      },
      error: null
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/register?code=REVOKED']}>
          <Routes>
            <Route path="/register" element={<PatientRegister />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // O toast.error será chamado, mas como é mockado, podemos verificar se a UI reflete a falha
    // Na implementação, setSigValid(false) esconde o formulário ou mostra erro
    await waitFor(() => {
      // Verifica se o estado de validação falhou (botão desabilitado ou mensagem de erro)
      const submitButton = screen.getByRole('button', { name: /Concluir Cadastro/i });
      expect(submitButton).toBeDisabled();
    });
  });
});
