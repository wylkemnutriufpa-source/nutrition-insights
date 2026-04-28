import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MealGroup } from '../MealPlanDailyView';
import { useExperienceUI } from '@/hooks/useExperienceUI';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock dependencies
vi.mock('@/hooks/useExperienceUI', () => ({
  useExperienceUI: vi.fn()
}));

vi.mock('@/hooks/useMealVisualItem', () => ({
  useMealVisualItem: vi.fn(() => ({ item: null }))
}));

vi.mock('@/hooks/useSignedStorageUrl', () => ({
  useSignedStorageUrl: vi.fn(() => ({ url: null }))
}));

describe('MealPlanDailyView - Basic Mode Accessibility', () => {
  const mockMealType = {
    key: 'breakfast' as const,
    label: 'Café da Manhã',
    icon: <span>☕</span>,
    time: '06:00 - 23:59' // Current time should fall in this range for testing "AGORA"
  };

  const mockItems = [
    {
      id: 'item-1',
      title: 'Ovos Mexidos',
      description: '2 ovos',
      meal_type: 'breakfast' as const,
      day_of_week: 1,
      calories_target: 150,
      protein_target: 12,
      carbs_target: 1,
      fat_target: 10
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useExperienceUI as any).mockReturnValue({ isBasic: true, showMacros: true });
  });

  it('should display "AGORA" and have correct ARIA attributes when it is the current meal', () => {
    render(
      <TooltipProvider>
        <MealGroup
          mealType={mockMealType}
          items={mockItems}
          completions={[]}
          justCompleted={null}
          focusMode={false}
          onSetAdherence={() => {}}
          onOpenDetail={() => {}}
        />
      </TooltipProvider>
    );

    // Check "AGORA" text
    expect(screen.getByText(/AGORA: CAFÉ DA MANHÃ/i)).toBeDefined();
    
    // Check "Sua vez" badge
    expect(screen.getByText(/Sua vez/i)).toBeDefined();

    // Check ARIA region
    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-label', expect.stringContaining('Agora'));
    expect(region).toHaveAttribute('aria-current', 'time');
  });

  it('should have semantic labels for macro indicators', () => {
    render(
      <TooltipProvider>
        <MealGroup
          mealType={mockMealType}
          items={mockItems}
          completions={[]}
          justCompleted={null}
          focusMode={false}
          onSetAdherence={() => {}}
          onOpenDetail={() => {}}
        />
      </TooltipProvider>
    );

    // Check for kcal text (simple check for visibility)
    expect(screen.getByText(/150 kcal/i)).toBeDefined();
  });
});
