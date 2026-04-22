import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InOfficeWizard from './pages/InOfficeWizard';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from './integrations/supabase/client';
import { useAuth } from './lib/auth';
import '@testing-library/jest-dom';

// Mock supabase
vi.mock('./integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      single: vi.fn(),
    })),
  },
}));

// Mock auth
vi.mock('./lib/auth', () => ({
  useAuth: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const renderWizard = () => {
  return render(
    <BrowserRouter>
      <InOfficeWizard />
    </BrowserRouter>
  );
};

describe('InOfficeWizard - Navegação e Persistência', () => {
  const mockUser = { id: 'nutri-123' };
  const mockSession = { id: 'sess-123', current_step: 1 };
  const mockProfile = { full_name: 'Paciente Teste' };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser });
    
    // Default mock responses
    (supabase.from as any)().maybeSingle
      .mockResolvedValueOnce({ data: mockProfile, error: null }) // Profile
      .mockResolvedValueOnce({ data: mockSession, error: null }); // Session
  });

  it('deve carregar a etapa inicial corretamente', async () => {
    renderWizard();
    
    await waitFor(() => {
      expect(screen.getByText('Modo Consultório')).toBeInTheDocument();
      expect(screen.getByText('Paciente Teste — Atendimento presencial')).toBeInTheDocument();
    });
    
    // Verifica se o Stepper mostra a primeira etapa como ativa
    const buttons = screen.getAllByRole('button');
    const cadastroBtn = buttons.find(b => b.textContent?.includes('Cadastro'));
    expect(cadastroBtn).toHaveClass('bg-primary');
  });

  it('deve avançar para a próxima etapa e persistir no banco', async () => {
    renderWizard();

    await waitFor(() => screen.getByText('Próximo'));
    
    const nextBtn = screen.getByText('Próximo');
    fireEvent.click(nextBtn);

    // Verifica se o estado da UI mudou
    await waitFor(() => {
      const anamneseBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('Anamnese'));
      expect(anamneseBtn).toHaveClass('bg-primary');
    });

    // Verifica se chamou o update do supabase
    expect(supabase.from).toHaveBeenCalledWith('in_office_sessions');
    const fromCall = (supabase.from as any)();
    expect(fromCall.update).toHaveBeenCalledWith(expect.objectContaining({
      current_step: 2
    }));
  });

  it('deve permitir voltar para a etapa anterior', async () => {
    // Mock inicia na etapa 2
    (supabase.from as any)().maybeSingle
      .mockResolvedValueOnce({ data: mockProfile, error: null })
      .mockResolvedValueOnce({ data: { ...mockSession, current_step: 2 }, error: null });

    renderWizard();

    await waitFor(() => screen.getByText('Anterior'));
    
    const prevBtn = screen.getByText('Anterior');
    fireEvent.click(prevBtn);

    await waitFor(() => {
      const cadastroBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('Cadastro'));
      expect(cadastroBtn).toHaveClass('bg-primary');
    });
  });

  it('deve marcar o plano alimentar como concluído ao sair da etapa 4', async () => {
    // Mock inicia na etapa 4
    (supabase.from as any)().maybeSingle
      .mockResolvedValueOnce({ data: mockProfile, error: null })
      .mockResolvedValueOnce({ data: { ...mockSession, current_step: 4 }, error: null });

    renderWizard();

    await waitFor(() => screen.getByText('Próximo'));
    
    const nextBtn = screen.getByText('Próximo');
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('in_office_sessions');
      const fromCall = (supabase.from as any)();
      expect(fromCall.update).toHaveBeenCalledWith(expect.objectContaining({
        meal_plan_completed: true,
        current_step: 5
      }));
    });
  });

  it('deve finalizar a sessão corretamente', async () => {
    // Mock inicia na etapa 5
    (supabase.from as any)().maybeSingle
      .mockResolvedValueOnce({ data: mockProfile, error: null })
      .mockResolvedValueOnce({ data: { ...mockSession, current_step: 5 }, error: null });

    renderWizard();

    await waitFor(() => screen.getByText('Finalizar Sessão'));
    
    const finishBtn = screen.getByText('Finalizar Sessão');
    fireEvent.click(finishBtn);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('in_office_sessions');
      const fromCall = (supabase.from as any)();
      expect(fromCall.update).toHaveBeenCalledWith(expect.objectContaining({
        completed_at: expect.any(String),
        current_step: 5
      }));
    });
  });
});
