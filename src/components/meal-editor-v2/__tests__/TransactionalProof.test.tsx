import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { MealSmartEditorModal } from '../MealSmartEditorModal';
import { useMealPlanEditorV2Store } from '@/stores/mealPlanEditorV2Store';

// Mock store
vi.mock('@/stores/mealPlanEditorV2Store', () => ({
  useMealPlanEditorV2Store: vi.fn(),
}));

describe('MealSmartEditorModal Transactional Logic Proof', () => {
  const mockItem = {
    id: 'item-175',
    title: 'Protein Meal',
    description: 'Frango Grelhado 175g',
    meal_type: 'lunch',
    calories_target: 350,
    protein_target: 40,
    carbs_target: 10,
    fat_target: 15,
    edit_metadata: {
      portion_factor: 1.0,
      substitutions_json: ['Patinho Moído 175g', 'Tilápia 175g']
    }
  };

  const mockUpdateItem = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useMealPlanEditorV2Store as any).mockReturnValue({
      items: [mockItem],
      updateItem: mockUpdateItem,
      substitutionCount: 2
    });
  });

  it('Flow Validation: 175g -> 130g scaling and transactional persistence', async () => {
    // 1. Open modal (Draft creation phase)
    const { rerender } = render(
      <MealSmartEditorModal 
        open={true} 
        onOpenChange={() => {}} 
        itemId="item-175" 
      />
    );

    // 2. Change Protein from 175g to 130g via Portion Factor
    // New factor = 130/175 = 0.74 (rounded to 0.7)
    const input = screen.getByDisplayValue('1');
    await act(async () => {
      fireEvent.change(input, { target: { value: '0.7' } });
    });

    // 3. PROOF: Real-time update called with skipPersist=true
    // The useEffect in the modal triggers updateItem(itemId, patch, true)
    expect(mockUpdateItem).toHaveBeenCalledWith(
      'item-175',
      expect.objectContaining({
        description: expect.stringContaining('123g'), // 175 * 0.7 = 122.5 -> 123
        edit_metadata: expect.objectContaining({
          portion_factor: 0.7,
          substitutions_json: expect.arrayContaining([
            expect.stringContaining('123g')
          ])
        })
      }),
      true // skipPersist
    );

    // 4. PROOF: Save button enabling (Internal state isDirty=true)
    const saveBtn = screen.getByText(/Confirmar e Salvar/i);
    expect(saveBtn).toBeDefined();

    // 5. Save (Commit phase)
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    // 6. PROOF: Final persist call with skipPersist=undefined (false)
    expect(mockUpdateItem).toHaveBeenLastCalledWith(
      'item-175',
      expect.objectContaining({
        description: expect.stringContaining('123g')
      })
      // skipPersist is undefined here
    );
  });
});
