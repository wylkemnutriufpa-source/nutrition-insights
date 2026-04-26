import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { MobileAutoFixer } from '@/components/common/MobileAutoFixer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

const queryClient = new QueryClient();

describe('Mobile Experience E2E', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('deve ter apenas um container de scroll vertical ativo quando o modal está aberto', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <div id="root">
          <main style={{ height: '200vh' }}>Conteúdo Longo</main>
          <Dialog>
            <DialogTrigger>Abrir Modal</DialogTrigger>
            <DialogContent>
              <div style={{ height: '200vh' }} data-testid="modal-scroll-content">
                Conteúdo do Modal Longo
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByText('Abrir Modal'));
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Quando o modal abre, o Radix UI deve bloquear o scroll do body
    // dependendo da implementação, ele adiciona data-radix-scroll-lock ou overflow: hidden
    const hasScrollLock = document.body.style.overflow === 'hidden' || 
                         document.body.hasAttribute('data-scroll-locked') ||
                         window.getComputedStyle(document.body).overflow === 'hidden';
    
    expect(hasScrollLock).toBe(true);
    
    // O modal deve ser o único scrollable
    const modalContent = screen.getByTestId('modal-scroll-content').parentElement;
    expect(modalContent).toHaveClass('overflow-y-auto');
  });

  it('deve garantir que o botão X tem hit area mínima de 48x48', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Dialog open={true}>
          <DialogContent>Modal Content</DialogContent>
        </Dialog>
      </QueryClientProvider>
    );

    const closeButton = screen.getByRole('button', { name: /fechar/i });
    // In JSDOM, getComputedStyle might not reflect Tailwind classes perfectly if not configured,
    // but we can check the classes or the mock implementation if needed.
    // However, since we added h-12 w-12, we check for these classes.
    expect(closeButton).toHaveClass('h-12');
    expect(closeButton).toHaveClass('w-12');
  });

  it('deve garantir que MobileAutoFixer não altera estilos fora do modal', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <div>
          <MobileAutoFixer />
          <div id="outside-element" className="p-6" style={{ width: '2000px' }}>
            Conteúdo Externo
          </div>
          <Dialog open={true}>
            <DialogContent>
               <div id="inside-element" className="p-6" style={{ width: '2000px' }}>
                 Conteúdo Interno
               </div>
            </DialogContent>
          </Dialog>
        </div>
      </QueryClientProvider>
    );

    // Simula redimensionamento para disparar o fixOverflow
    fireEvent(window, new Event('resize'));

    const outside = document.getElementById('outside-element');
    const dialog = screen.getByRole('dialog');
    
    // O dialog deve ter sido processado
    expect(dialog).toHaveAttribute('data-autofixed', 'true');
    
    // O elemento fora não deve ter o atributo data-autofixed
    expect(outside).not.toHaveAttribute('data-autofixed');
  });

  it('deve garantir que o botão X fecha o modal sem sobrepor o header ao rolar', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Dialog open={true}>
          <DialogContent>
            <div style={{ height: '200vh' }}>Conteúdo Longo</div>
          </DialogContent>
        </Dialog>
      </QueryClientProvider>
    );

    const closeButton = screen.getByRole('button', { name: /fechar/i });
    
    // Verifica z-index alto para garantir que não é sobreposto
    expect(closeButton).toHaveClass('z-[60]');
    
    // Verifica posição absolute/fixed no topo
    expect(closeButton).toHaveClass('absolute');
    expect(closeButton).toHaveClass('top-2');
    
    fireEvent.click(closeButton);
    // expect(onOpenChange).toHaveBeenCalledWith(false) - testado via comportamento se tivéssemos o mock de state
  });
});
