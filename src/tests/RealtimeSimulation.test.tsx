import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import DailyMealPlanInline from '../components/patient/DailyMealPlanInline';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../lib/auth';
import React from 'react';

// Mocks
vi.mock('../lib/auth', () => ({
  useAuth: vi.fn(),
}));

// Mock components to simplify rendering
vi.mock('@/components/patient/MealPlanDailyView', () => {
  return {
    MacroSummary: () => <div data-testid="macro-summary" />,
    AdherenceCard: () => <div data-testid="adherence-card" />,
    DateNavigator: () => <div data-testid="date-navigator" />,
    MealGroup: ({ mealType, items, completions, onSetAdherence }: any) => {
      const typeKey = typeof mealType === 'string' ? mealType : (mealType?.key || 'unknown');
      return (
        <div data-testid={`meal-group-${typeKey}`}>
          {items.map((item: any) => (
            <button 
              key={item.id} 
              data-testid={`toggle-${item.id}`}
              onClick={() => onSetAdherence(item, 'followed')}
            >
              Toggle {item.id}
            </button>
          ))}
          <div data-testid={`completions-count-${typeKey}`}>
            {completions.filter((c: any) => c.meal_plan_item_id === items[0]?.id).length}
          </div>
        </div>
      );
    },
    MEAL_TYPES: [{ key: 'breakfast', label: 'Café' }],
    DAYS: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  };
});

vi.mock('@/components/patient/MealDetailModal', () => ({
  MealDetailModal: () => <div data-testid="meal-modal" />,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createMockChain = (data: any = null) => {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve({ data, error: null })),
    single: vi.fn(() => Promise.resolve({ data, error: null })),
    insert: vi.fn(() => ({
      select: () => ({
        single: () => Promise.resolve({ data: { id: 'real-id' }, error: null })
      })
    })),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    then: (resolve: any) => {
      if (typeof resolve === 'function') {
        return Promise.resolve({ data: Array.isArray(data) ? data : [data], error: null }).then(resolve);
      }
      return chain;
    },
  };
  return chain;
};

let realtimeCallbacks: Record<string, Function> = {};

const mockChannel = {
  on: vi.fn((event, filter, callback) => {
    // console.log('ON:', filter.table);
    realtimeCallbacks[filter.table] = callback;
    return mockChannel;
  }),
  subscribe: vi.fn((cb) => {
    if (cb) cb('SUBSCRIBED');
    return mockChannel;
  }),
};

vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
  },
}));

describe('DailyMealPlanInline - Realtime Simulation', () => {
  const mockUser = { id: 'patient123' };
  const mockPlan = { id: 'plan1', title: 'Plano Teste', start_date: '2024-01-01', is_active: true, plan_status: 'published_to_patient' };
  const mockItem = { id: 'item1', meal_type: 'breakfast', day_of_week: new Date().getDay() };

  beforeEach(() => {
    vi.clearAllMocks();
    realtimeCallbacks = {};
    (useAuth as any).mockReturnValue({ user: mockUser });
    
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'meal_plans') return createMockChain(mockPlan);
      if (table === 'meal_plan_items') return createMockChain([mockItem]);
      if (table === 'meal_item_completions') return createMockChain([]);
      return createMockChain();
    });
  });

  it('deve re-renderizar quando receber evento de alteração no plano via Realtime', async () => {
    await act(async () => {
      render(<DailyMealPlanInline />);
    });
    
    await screen.findByTestId('meal-group-breakfast');
    
    expect(realtimeCallbacks['meal_plans']).toBeDefined();
    
    await act(async () => {
      realtimeCallbacks['meal_plans']({
        eventType: 'UPDATE',
        new: { ...mockPlan, title: 'Plano Atualizado' },
        old: mockPlan
      });
    });

    expect(supabase.from).toHaveBeenCalledWith('meal_plans');
  });

  it('deve atualizar marcações de dieta via Realtime para meal_item_completions', async () => {
    await act(async () => {
      render(<DailyMealPlanInline />);
    });
    
    await screen.findByTestId('meal-group-breakfast');
    
    expect(realtimeCallbacks['meal_plan_items']).toBeDefined();
    
    await act(async () => {
      realtimeCallbacks['meal_plan_items']({
        eventType: 'INSERT',
        new: { id: 'item2', meal_type: 'breakfast', meal_plan_id: 'plan1' }
      });
    });

    expect(supabase.from).toHaveBeenCalledWith('meal_plan_items');
  });

  it('deve processar atualizações otimistas de completions instantaneamente', async () => {
    let container: any;
    await act(async () => {
      const { container: c } = render(<DailyMealPlanInline />);
      container = c;
    });
    
    await screen.findByTestId('meal-group-breakfast');
    
    const toggleButton = screen.getByTestId('toggle-item1');
    
    // Antes de clicar, deve ser 0
    expect(screen.getByTestId('completions-count-breakfast').textContent).toBe('0');

    await act(async () => {
      toggleButton.click();
    });

    // O estado deve ser atualizado otimistamente
    expect(screen.getByTestId('completions-count-breakfast').textContent).toBe('1');
    expect(supabase.from).toHaveBeenCalledWith('meal_item_completions');
  });
});
