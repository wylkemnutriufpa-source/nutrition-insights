import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MealSlotItemCard from '../components/hybrid-builder/MealSlotItemCard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

const queryClient = new QueryClient();

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

  it('deve permitir editar gramas de uma substituição e preservar metadados', () => {
    const onApplyGramsChange = vi.fn();
    const setEditingId = vi.fn();
    const setEditGrams = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MealSlotItemCard
            item={mockSub}
            qty={100}
            editingId="sub-1" // Simula que está editando este item
            editGrams="200"
            setEditingId={setEditingId}
            setEditGrams={setEditGrams}
            onApplyGramsChange={onApplyGramsChange}
            onApplyGramsChangeAllDays={vi.fn()}
            onToggleLock={vi.fn()}
            onDuplicate={vi.fn()}
            onDelete={vi.fn()}
            onReplace={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Clica no botão de check para aplicar
    const checkButton = screen.getByTitle(/Aplicar só hoje/i);
    fireEvent.click(checkButton);

    // Verifica se chamou a função de aplicação com o item correto
    expect(onApplyGramsChange).toHaveBeenCalledWith(mockSub);
  });
});
