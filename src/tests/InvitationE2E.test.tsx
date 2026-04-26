import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Invitation from '@/pages/Invitation';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
  },
}));

describe('Invitation E2E Simulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock location
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'www.fitjourney.com.br',
        href: 'https://www.fitjourney.com.br/convite/TEST12',
        origin: 'https://www.fitjourney.com.br'
      },
      writable: true
    });
  });

  it('deve exibir erro se o domínio não for oficial', async () => {
    // Override hostname
    window.location.hostname = 'evil-domain.com';

    const fromMock = supabase.from as any;
    fromMock().select().eq().maybeSingle.mockResolvedValue({

      data: {
        id: '1',
        code: 'TEST12',
        professional_id: 'prof1',
        status: 'pending'
      },
      error: null
    });

    render(
      <MemoryRouter initialEntries={['/convite/TEST12']}>
        <Routes>
          <Route path="/convite/:code" element={<Invitation />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Este link de convite veio de uma origem não autorizada/i)).toBeInTheDocument();
    });
  });

  it('deve exibir informações do profissional e clínica corretamente', async () => {
    window.location.hostname = 'www.fitjourney.com.br';

    (supabase.maybeSingle as any).mockResolvedValue({
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
      <MemoryRouter initialEntries={['/convite/TEST12']}>
        <Routes>
          <Route path="/convite/:code" element={<Invitation />} />
        </Routes>
      </MemoryRouter>
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

    (supabase.maybeSingle as any).mockResolvedValue({
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
      <MemoryRouter initialEntries={['/convite/EXPIRED']}>
        <Routes>
          <Route path="/convite/:code" element={<Invitation />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Este convite expirou/i)).toBeInTheDocument();
    });
  });
});
