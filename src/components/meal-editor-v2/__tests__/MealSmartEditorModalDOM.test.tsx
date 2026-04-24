import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MealSmartEditorModal } from '../MealSmartEditorModal';
import { useMealPlanEditorV2Store } from '@/stores/mealPlanEditorV2Store';

// Mock the store
vi.mock('@/stores/mealPlanEditorV2Store', () => ({
  useMealPlanEditorV2Store: vi.fn(),
}));

describe('MealSmartEditorModal DOM & Accessibility', () => {
  const mockItem = {
    id: 'item-1',
    title: 'Test Meal',
    description: 'Initial description',
    meal_type: 'lunch',
    calories_target: 500,
    protein_target: 30,
    carbs_target: 50,
    fat_target: 15,
    edit_metadata: {
      substitutions_json: ['Sub 1', 'Sub 2', 'Sub 3', 'Sub 4']
    }
  };

  const mockUpdateItem = vi.fn();

  beforeEach(() => {
    (useMealPlanEditorV2Store as any).mockReturnValue({
      items: [mockItem],
      updateItem: mockUpdateItem,
    });
  });

  it('should render the aria-live region with correct attributes', () => {
    render(
      <MealSmartEditorModal 
        open={true} 
        onOpenChange={() => {}} 
        itemId="item-1" 
      />
    );

    // The status role is used for aria-live="polite"
    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toBeDefined();
    // In vitest/jsdom we can check attributes directly
    expect(statusRegion.getAttribute('aria-live')).toBe('polite');
  });

  it('should display the limit message when over limit', () => {
    const itemWithManySubs = {
      ...mockItem,
      edit_metadata: {
        substitutions_json: ['1', '2', '3', '4', '5'] // Over limit
      }
    };
    
    (useMealPlanEditorV2Store as any).mockReturnValue({
      items: [itemWithManySubs],
      updateItem: mockUpdateItem,
    });

    render(
      <MealSmartEditorModal 
        open={true} 
        onOpenChange={() => {}} 
        itemId="item-1" 
      />
    );

    const limitMessage = screen.getByText(/Limite Excedido/i);
    expect(limitMessage).toBeDefined();
    
    const ariaLiveRegion = screen.getByRole('status');
    expect(ariaLiveRegion.textContent).toContain('Apenas as 4 primeiras serão salvas');
  });
});
