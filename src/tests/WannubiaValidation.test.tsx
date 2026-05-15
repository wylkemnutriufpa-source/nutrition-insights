import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MealSmartEditorModal } from '../components/meal-editor-v2/MealSmartEditorModal';
import { useMealPlanEditorV2Store } from '../stores/mealPlanEditorV2Store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mocks
vi.mock('../stores/mealPlanEditorV2Store', () => ({
  useMealPlanEditorV2Store: vi.fn()
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  }
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('Wannubia Specific Validation Test', () => {
  const mockItem = {
    id: 'item-1',
    title: 'Almoço',
    meta_calorias: 0,
    meta_proteinas: 0,
    meta_carboidratos: 0,
    meta_gorduras: 0,
    description: '',
    tipo_refeicao: 'Almoço',
    metadata: { is_fixed: true }
  };

  const mockUpdateItem = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useMealPlanEditorV2Store as any).mockReturnValue({
      items: [mockItem],
      updateItem: mockUpdateItem,
      substitutionCount: 3,
      patientName: 'Wannubia'
    });
  });

  it('bloqueia adição de comida isolada para Wannubia e direciona para Refeições Prontas', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MealSmartEditorModal open={true} onOpenChange={() => {}} itemId="item-1" />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Deve mostrar o aviso para Wannubia
    expect(screen.getByText(/Apenas Marmitas Permitidas/i)).toBeInTheDocument();
    
    // Clica no botão para ir para Refeições Prontas
    const readyMealsButton = screen.getByText(/Ir para Refeições Prontas/i);
    fireEvent.click(readyMealsButton);

    // Verifica se os templates de marmita aparecem na lista
    await waitFor(() => {
       const templates = screen.getAllByText(/Marmita/i);
       expect(templates.length).toBeGreaterThan(1);
    });
  });

  it('bloqueia salvamento com macros zerados', async () => {
    const { toast } = await import('sonner');
    
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MealSmartEditorModal open={true} onOpenChange={() => {}} itemId="item-1" />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Tenta salvar com macros zerados
    const saveButton = screen.getByText(/Salvar alterações/i);
    fireEvent.click(saveButton);

    // Verifica se o toast de erro foi chamado
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("Não é possível salvar uma refeição com macros zerados."),
      expect.anything()
    );
    
    // UpdateItem não deve ter sido chamado
    expect(mockUpdateItem).not.toHaveBeenCalled();
  });

  it('bloqueia combinações específicas de proteínas para Wannubia', async () => {
     const { validateMealSubstitutions } = await import('../lib/mealPlanSubstitutionValidator');
     
     const itemWithMixedProteins = {
       ...mockItem,
       meta_calorias: 500,
       meta_proteinas: 30,
       edit_metadata: {
         substitutions_json: ["Frango e Ovo"] // Combinação proibida
       }
     };

     const result = validateMealSubstitutions(itemWithMixedProteins as any, 4, 'Wannubia');
     
     expect(result.valid).toBe(false);
     expect(result.errors[0]).toContain("Combinação bloqueada para esta paciente");
  });
});
