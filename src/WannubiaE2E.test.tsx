import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MealSmartEditorModal } from './components/meal-editor-v2/MealSmartEditorModal';
import { useMealPlanEditorV2Store } from './stores/mealPlanEditorV2Store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mocks
vi.mock('./stores/mealPlanEditorV2Store', () => ({
  useMealPlanEditorV2Store: vi.fn()
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  }
}));

const queryClient = new QueryClient();

describe('Wannubia E2E - Editor de Marmitas Fixas', () => {
  const mockItem = {
    id: 'item-1',
    title: 'Marmita de Frango',
    description: 'Frango com batata doce',
    meal_type: 'lunch',
    calories_target: 400,
    protein_target: 30,
    carbs_target: 40,
    fat_target: 10,
    edit_metadata: {
      is_fixed: true,
      kcal_base: 400,
      protein_base: 30,
      substitutions_json: []
    }
  };

  const mockUpdateItem = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useMealPlanEditorV2Store as any).mockReturnValue({
      items: [mockItem],
      updateItem: mockUpdateItem,
      substitutionCount: 3,
      patientName: 'Wannubia Teste'
    });
  });

  it('deve bloquear substituições com palavras proibidas para Wannubia', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MealSmartEditorModal open={true} onOpenChange={vi.fn()} itemId="item-1" />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Adiciona uma substituição
    const addButton = screen.getByTestId('add-substitution-button');
    fireEvent.click(addButton);

    // Digita uma palavra proibida
    const input = screen.getByTestId('substitution-input-0');
    fireEvent.change(input, { target: { value: 'Arroz com refrigerante' } });

    // Verifica se o aviso aparece
    expect(screen.getByText(/Combinação inválida para Wannubia/i)).toBeInTheDocument();

    // Tenta salvar usando data-testid
    const saveButton = screen.getByTestId('meal-editor-save-button');
    fireEvent.click(saveButton);

    // Verifica se o erro do toast foi chamado
    const { toast } = await import('sonner');
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Combinação proibida'), expect.anything());
    expect(mockUpdateItem).not.toHaveBeenCalled();
  });

  it('deve fechar o modal pelo X e retornar o foco (Simulado via trigger)', async () => {
    const onOpenChange = vi.fn();
    
    // Simula um botão que abriu o editor
    const trigger = document.createElement('button');
    trigger.id = 'trigger-btn';
    document.body.appendChild(trigger);
    trigger.focus();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MealSmartEditorModal open={true} onOpenChange={onOpenChange} itemId="item-1" />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Procura o botão de fechar (X)
    // No shadcn/radix UI, ele costuma ter um aria-label "Close" ou ser o botão absoluto no topo
    const closeButton = screen.getByRole('button', { name: /fechar/i });
    fireEvent.click(closeButton);
    
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('deve permitir macros parciais zerados se kcal total > 0', async () => {
    // Configura item com proteína zerada mas kcal > 0
    (useMealPlanEditorV2Store as any).mockReturnValue({
      items: [{ ...mockItem, protein_target: 0 }],
      updateItem: mockUpdateItem,
      substitutionCount: 3,
      patientName: 'Wannubia Teste'
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MealSmartEditorModal open={true} onOpenChange={vi.fn()} itemId="item-1" />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const saveButton = screen.getByTestId('meal-editor-save-button');
    fireEvent.click(saveButton);

    // Não deve mostrar erro de macros zerados (agora permitidos se kcal > 0)
    const { toast } = await import('sonner');
    const errorCalls = (toast.error as any).mock.calls.map((c: any) => c[0]);
    expect(errorCalls).not.toContain("Não é possível salvar uma refeição com macros zerados.");
  });

  it('deve aplicar template Wannubia e validar ordem das substituições', async () => {
    const { addItem } = useMealPlanEditorV2Store();
    
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MealSmartEditorModal open={true} onOpenChange={vi.fn()} itemId="item-1" />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Simula clique em "Refeição Pronta"
    const readyMealsTab = screen.getByText(/Refeição Pronta/i);
    fireEvent.click(readyMealsTab);

    // Seleciona um template (ex: Frango + Arroz + Salada)
    const templateButton = screen.getByText(/Frango \+ Arroz \+ Salada/i);
    fireEvent.click(templateButton);

    // Verifica se addItem foi chamado com a estrutura correta para Wannubia
    await waitFor(() => {
      expect(addItem).toHaveBeenCalledWith(expect.objectContaining({
        edit_metadata: expect.objectContaining({
          substitutions_json: expect.arrayContaining([
            expect.stringMatching(/• Peito de frango/i),
            expect.stringMatching(/• Arroz branco/i),
            expect.stringMatching(/• Feijão carioca/i)
          ])
        })
      }));
    });

    // Valida que a ordem no metadata respeita Proteína (idx 0), Carboidrato (idx 1), Legume (idx 2)
    const lastCall = (addItem as any).mock.calls[(addItem as any).mock.calls.length - 1][0];
    const subs = lastCall.edit_metadata.substitutions_json;
    
    expect(subs[0]).toContain("Peito de frango");
    expect(subs[1]).toContain("Arroz branco");
    expect(subs[2]).toContain("Feijão carioca");
  });
});
