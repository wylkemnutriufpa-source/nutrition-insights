import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeeklyGrid } from '../components/meal-editor-v2/WeeklyGrid';
import { useMealPlanEditorV2Store } from '../stores/mealPlanEditorV2Store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

const queryClient = new QueryClient();

// Mock store
vi.mock('../stores/mealPlanEditorV2Store', () => ({
  useMealPlanEditorV2Store: vi.fn(),
}));

vi.mock('../lib/auth', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' } }))
}));

vi.mock('../lib/tenantContext', () => ({
  useTenant: vi.fn(() => ({ tenantId: 'tenant-1' }))
}));

import { sortMealPlanItems } from '../lib/mealPlanSort';

describe('Deterministic Order E2E', () => {
  const itemPrimary = {
    id: 'id-1',
    title: 'Café da Manhã Principal',
    calories_target: 300,
    is_primary: true,
    day_of_week: 0,
    meal_type: 'breakfast'
  } as any;

  const itemSub1 = {
    id: 'id-2',
    title: 'Sub 1 (Menos Caloria)',
    calories_target: 200,
    is_primary: false,
    day_of_week: 0,
    meal_type: 'breakfast'
  } as any;

  const itemSub2 = {
    id: 'id-3',
    title: 'Sub 2 (Mais Caloria)',
    calories_target: 400,
    is_primary: false,
    day_of_week: 0,
    meal_type: 'breakfast'
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve exibir itens na ordem determinística (Primário > Caloria Descendente > ID)', () => {
    const items = [itemSub1, itemSub2, itemPrimary];
    
    // O store real agora usa sortMealPlanItems internamente.
    const sortedItems = sortMealPlanItems(items);

    (useMealPlanEditorV2Store as any).mockReturnValue({
      items: sortedItems,
      syncingMap: {},
      planId: 'plan-1',
      addItem: vi.fn(),
      swapCells: vi.fn(),
      clipboardItems: null,
      copyCell: vi.fn(),
      pasteToCell: vi.fn(),
      substitutionCount: 3,
      updatePlan: vi.fn(),
      plan: { id: 'plan-1' }
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <WeeklyGrid />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verifica a ordem no DOM
    const mealCards = screen.getAllByTestId(/^edit-meal-/);
    
    // 1. Primário (id-1)
    expect(mealCards[0]).toHaveAttribute('data-testid', 'edit-meal-id-1');
    // 2. Sub com mais caloria (id-3, 400kcal)
    expect(mealCards[1]).toHaveAttribute('data-testid', 'edit-meal-id-3');
    // 3. Sub com menos caloria (id-2, 200kcal)
    expect(mealCards[2]).toHaveAttribute('data-testid', 'edit-meal-id-2');
  });
});
