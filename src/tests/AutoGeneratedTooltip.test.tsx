import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MealSlotItemCard from '../components/hybrid-builder/MealSlotItemCard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

const queryClient = new QueryClient();

describe('Auto-Generated Substitution Tooltip', () => {
  const mockItem = {
    id: 'item-1',
    title: 'Frango Grelhado',
    meta_calorias: 200,
    meta_proteinas: 30,
    meta_carboidratos: 0,
    meta_gorduras: 8,
    item_origin: 'auto_generated_sub',
    is_primary: false,
  } as any;

  it('deve mostrar o selo AUTO com o tooltip correto para itens auto_generated_sub', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MealSlotItemCard
            item={mockItem}
            qty={100}
            editingId={null}
            editGrams=""
            setEditingId={vi.fn()}
            setEditGrams={vi.fn()}
            onApplyGramsChange={vi.fn()}
            onApplyGramsChangeAllDays={vi.fn()}
            onToggleLock={vi.fn()}
            onDuplicate={vi.fn()}
            onDelete={vi.fn()}
            onReplace={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Encontra o selo "Auto"
    const autoBadge = screen.getByText(/Auto/i).closest('span');
    expect(autoBadge).toBeInTheDocument();

    // Verifica o tooltip (atributo title)
    expect(autoBadge).toHaveAttribute(
      'title',
      'Esta substituição foi gerada automaticamente pelo motor de nutrição para garantir o equilíbrio de macros.'
    );
  });
});
