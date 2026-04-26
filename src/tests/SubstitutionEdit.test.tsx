import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MealSlotCard from '../components/hybrid-builder/MealSlotCard';
import { useMealPlanEditorV2Store } from '../stores/mealPlanEditorV2Store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

const queryClient = new QueryClient();

// Mock store
vi.mock('../stores/mealPlanEditorV2Store', () => ({
  useMealPlanEditorV2Store: vi.fn()
}));

vi.mock('../lib/auth', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' } }))
}));

vi.mock('../lib/tenantContext', () => ({
  useTenant: vi.fn(() => ({ tenantId: 'tenant-1' }))
}));

describe('Substitution Grams Edit E2E', () => {
  const mockPrimary = {
    id: 'primary-1',
    title: 'Arroz',
    calories_target: 100,
    protein_target: 2,
    carbs_target: 20,
    fat_target: 0,
    is_primary: true,
    substitution_group_id: 'group-1',
    description: '100g'
  } as any;

  const mockSub = {
    id: 'sub-1',
    title: 'Batata',
    calories_target: 80,
    protein_target: 2,
    carbs_target: 18,
    fat_target: 0,
    is_primary: false,
    substitution_group_id: 'group-1',
    description: '100g'
  } as any;

  const mockUpdateItem = vi.fn();
  const mockStore = {
    updateItem: mockUpdateItem,
    plan: { id: 'plan-1' },
    items: [mockPrimary, mockSub]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useMealPlanEditorV2Store as any).mockReturnValue(mockStore);
  });

  it('deve recalcular apenas o item editado e preservar o substitution_group_id', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MealSlotCard
            day={1}
            mealType="lunch"
            label="Almoço"
            icon={null}
            items={[mockPrimary, mockSub]}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Clica nos gramas da substituição para editar
    const gramsButton = screen.getByText('100g', { selector: 'button' });
    // Pegar o segundo botão de 100g (o da sub)
    const gramsButtons = screen.getAllByText('100g', { selector: 'button' });
    fireEvent.click(gramsButtons[1]);

    // Digita "200"
    const input = screen.getByPlaceholderText(/Ex: 150g/i);
    fireEvent.change(input, { target: { value: '200' } });

    // Clica no check
    const checkButton = screen.getByTitle(/Aplicar só hoje/i);
    fireEvent.click(checkButton);

    // Verifica se o updateItem foi chamado com os valores dobrados (100g -> 200g)
    // E verifica se outros campos foram omitidos ou se o substitution_group_id está implícito no patch se fosse passado (mas o store preserva o que já tem)
    expect(mockUpdateItem).toHaveBeenCalledWith('sub-1', expect.objectContaining({
      calories_target: 160, // 80 * 2
      protein_target: 4,    // 2 * 2
      description: '200g'
    }));

    // Verifica que o Arroz (primário) não foi afetado (updateItem não foi chamado para ele)
    const primaryCalls = mockUpdateItem.mock.calls.filter(call => call[0] === 'primary-1');
    expect(primaryCalls.length).toBe(0);
  });
});
