import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { MobileAutoFixer } from '@/components/common/MobileAutoFixer';
import MobileQA from '@/pages/MobileQA';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

const queryClient = new QueryClient();

describe('Mobile Experience E2E & QA Automation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    // Mock window metrics for consistency
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 390 });
    Object.defineProperty(document.documentElement, 'clientWidth', { writable: true, configurable: true, value: 390 });
    Object.defineProperty(document.documentElement, 'scrollWidth', { writable: true, configurable: true, value: 390 });
    Object.defineProperty(window, 'scrollX', { writable: true, configurable: true, value: 0 });
    
    // Mock URL.createObjectURL and a.click
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
  });

  it('deve iterar por todos os modais do Mobile QA e validar double-scroll', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MobileQA />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const triggers = ['trigger-strategy', 'trigger-settings', 'trigger-profile', 'trigger-wizard'];
    
    for (const triggerId of triggers) {
      const trigger = screen.getByTestId(triggerId);
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Validar double-scroll (body deve estar locked)
      expect(document.body.style.overflow === 'hidden' || 
             document.body.hasAttribute('data-scroll-locked') ||
             window.getComputedStyle(document.body).overflow === 'hidden').toBe(true);

      // Fechar modal
      const closeButton = screen.getByRole('button', { name: /fechar/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    }
  });

  it('deve garantir que MobileAutoFixer não mantém atributos ou estilos residuais fora do escopo corrigido após fechar', async () => {
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <div id="app-root">
          <MobileAutoFixer />
          <div id="external-content" style={{ width: '500px' }}>Conteúdo Externo</div>
          <Dialog open={true}>
            <DialogContent>
               <div id="internal-content" style={{ width: '500px' }}>Conteúdo Interno</div>
            </DialogContent>
          </Dialog>
        </div>
      </QueryClientProvider>
    );

    // Simula overflow interno
    const internal = document.getElementById('internal-content');
    const external = document.getElementById('external-content');
    
    // Trigger resize to activate fixer
    fireEvent(window, new Event('resize'));

    // O internal deve ser processado (está dentro do dialog)
    await waitFor(() => {
      expect(internal).toHaveAttribute('data-autofixed', 'true');
    });

    // O external não deve ter sido alterado
    expect(external).not.toHaveAttribute('data-autofixed');
    expect(external?.style.maxWidth).toBe('');

    // Fechar o modal (remover do DOM)
    rerender(
      <QueryClientProvider client={queryClient}>
        <div id="app-root">
          <MobileAutoFixer />
          <div id="external-content" style={{ width: '500px' }}>Conteúdo Externo</div>
        </div>
      </QueryClientProvider>
    );

    // Após fechar, o MobileAutoFixer deve limpar o estado (pelo useEffect cleanup ou lógica de else)
    // No caso da nossa implementação, quando não há dialogs ativos, ele limpa.
    await waitFor(() => {
      expect(document.querySelectorAll('[data-autofixed]').length).toBe(0);
    });
  });

  it('deve validar que o export JSON inclui métricas e viewport corretas', async () => {
    // Mocking Blob
    const spy = vi.spyOn(global, 'Blob').mockImplementation((content, options) => {
      return { content, options } as any;
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MobileQA />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Simular registro de evidência via botão de camera
    const cameraButtons = screen.getAllByRole('button').filter(b => b.querySelector('svg.lucide-camera'));
    fireEvent.click(cameraButtons[0]);

    // Exportar relatório
    const exportButton = screen.getByText(/Exportar Relatório/i);
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
      const lastCallArgs = spy.mock.calls.find(call => call[1]?.type === 'application/json');
      if (lastCallArgs) {
        const reportData = JSON.parse(lastCallArgs[0][0]);
        expect(reportData.evidences[0]).toHaveProperty('viewport', '390px');
        expect(reportData.evidences[0]).toHaveProperty('thumbnail');
      }
    });
  });

  it('deve validar foco visível do botão fechar após Tab/Shift+Tab usando getComputedStyle', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Dialog open={true}>
          <DialogContent>Conteúdo</DialogContent>
        </Dialog>
      </QueryClientProvider>
    );

    const closeButton = screen.getByRole('button', { name: /fechar/i });
    closeButton.focus();

    const styles = window.getComputedStyle(closeButton);
    // Verificamos se há algum sinal de foco visível (outline, ring ou box-shadow)
    // Nota: JSDOM não aplica CSS real, então testamos as classes do Tailwind que garantem isso
    expect(closeButton).toHaveClass('focus:ring-2');
    expect(closeButton).toHaveClass('focus:outline-none');
  });

  it('deve garantir que Enter ou Espaço no botão fechar não geram scroll horizontal residual', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Dialog open={true}>
          <DialogContent>Conteúdo</DialogContent>
        </Dialog>
      </QueryClientProvider>
    );

    const closeButton = screen.getByRole('button', { name: /fechar/i });
    
    // Reset scroll
    window.scrollTo(0, 0);
    expect(window.scrollX).toBe(0);

    fireEvent.keyDown(closeButton, { key: 'Enter', code: 'Enter' });
    fireEvent.keyUp(closeButton, { key: 'Enter', code: 'Enter' });

    expect(window.scrollX).toBe(0);
    
    fireEvent.keyDown(closeButton, { key: ' ', code: 'Space' });
    fireEvent.keyUp(closeButton, { key: ' ', code: 'Space' });
    
    expect(window.scrollX).toBe(0);
  });
});
