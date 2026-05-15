import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MealSlotCard from '../components/hybrid-builder/MealSlotCard';
import { useMealPlanEditorV2Store } from '../stores/mealPlanEditorV2Store';
import { TooltipProvider } from '../components/ui/tooltip';
import { sortMealPlanItems } from '../lib/mealPlanSort';
import '@testing-library/jest-dom';

// Mock the store
vi.mock('../stores/mealPlanEditorV2Store', () => ({
  useMealPlanEditorV2Store: vi.fn(),
}));

// Mock auth
vi.mock('../lib/auth', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' } })),
  AuthProvider: ({ children }: any) => <div>{children}</div>,
}));

// Mock tenant
vi.mock('../lib/tenantContext', () => ({
  useTenant: vi.fn(() => ({ tenantId: 'tenant-1' })),
  TenantProvider: ({ children }: any) => <div>{children}</div>,
}));

// Mock i18n if needed
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
    i18n: {
      changeLanguage: () => Promise.resolve(),
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}));

describe('Extended E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AUTO badge should support keyboard focus and show tooltip', async () => {
    const mockUpdateItem = vi.fn();
    (useMealPlanEditorV2Store as any).mockReturnValue({
      items: [
        { 
          id: 'sub-1', 
          title: 'Sub Auto', 
          item_origin: 'auto_generated_sub', 
          is_primary: false,
          day_of_week: 1,
          tipo_refeicao: 'Café da Manhã',
          meta_calorias: 100
        }
      ],
      updateItem: mockUpdateItem,
      plan: { id: 'plan-1' }
    });

    render(
      <TooltipProvider>
        <MealSlotCard 
          day={1} 
          mealType="Café da Manhã" 
          label="Café" 
          icon={null} 
          items={[
            { 
              id: 'sub-1', 
              title: 'Sub Auto', 
              item_origin: 'auto_generated_sub', 
              is_primary: false,
              day_of_week: 1,
              tipo_refeicao: 'Café da Manhã',
              meta_calorias: 100
            }
          ] as any}
        />
      </TooltipProvider>
    );

    const badge = screen.getByLabelText('Sugestões automáticas disponíveis');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('tabIndex', '0');

    // Focus the badge
    fireEvent.focus(badge);

    // Wait for tooltip to appear
    await waitFor(() => {
      const tooltips = screen.getAllByText('Sugestões geradas automaticamente pelo motor clínico');
      expect(tooltips.length).toBeGreaterThan(0);
    });

    // Press Enter to trigger toast (simulated here)
    fireEvent.keyDown(badge, { key: 'Enter' });
  });

  it('should maintain deterministic order after editing meta_calorias of primary item', () => {
    const itemPri = { id: 'pri', is_primary: true, meta_calorias: 500, day_of_week: 1, tipo_refeicao: 'Almoço' } as any;
    const itemSub = { id: 'sub', is_primary: false, meta_calorias: 600, day_of_week: 1, tipo_refeicao: 'Almoço' } as any;

    let items = [itemSub, itemPri];
    
    // Initial sort
    let sorted = sortMealPlanItems(items);
    expect(sorted[0].id).toBe('pri'); // Primary always first
    expect(sorted[1].id).toBe('sub');

    // Edit meta_calorias of primary
    const updatedPri = { ...itemPri, meta_calorias: 700 };
    items = [itemSub, updatedPri];
    
    // Sort again
    sorted = sortMealPlanItems(items);
    expect(sorted[0].id).toBe('pri'); // Still first
    expect(sorted[1].id).toBe('sub');

    // Even if sub has more calories than initial pri but less than updated pri, 
    // or vice versa, Primary is always first.
    // Let's test tie-breaking on ID if calories were same
    const itemPri2 = { id: 'pri-a', is_primary: true, meta_calorias: 500, day_of_week: 1, tipo_refeicao: 'Almoço' } as any;
    const itemPri3 = { id: 'pri-b', is_primary: true, meta_calorias: 500, day_of_week: 1, tipo_refeicao: 'Almoço' } as any;
    
    sorted = sortMealPlanItems([itemPri3, itemPri2]);
    expect(sorted[0].id).toBe('pri-a');
    expect(sorted[1].id).toBe('pri-b');

    // Change pri-b calories to 600
    sorted = sortMealPlanItems([itemPri2, { ...itemPri3, meta_calorias: 600 }]);
    expect(sorted[0].id).toBe('pri-b'); // 600 > 500
    expect(sorted[1].id).toBe('pri-a');
  });
});
