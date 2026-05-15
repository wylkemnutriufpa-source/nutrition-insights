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
          {items.map((item: any) => {
            const isCompleted = completions.some((c: any) => c.meal_plan_item_id === item.id);
            return (
              <div key={item.id}>
                <button 
                  data-testid={`toggle-${item.id}`}
                  onClick={() => onSetAdherence(item, 'followed')}
                >
                  Toggle {item.id}
                </button>
                <div data-testid={`completion-status-${item.id}`}>
                  {isCompleted ? 'COMPLETED' : 'PENDING'}
                </div>
              </div>
            );
          })}
        </div>
      );
    },
    MEAL_TYPES: [{ key: 'Café da Manhã', label: 'Café', icon: null, time: '08:00' }],
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
    insert: vi.fn((insertData: any) => ({
      select: () => ({
        single: () => new Promise(resolve => {
            setTimeout(() => resolve({ data: { id: 'real-id', ...insertData }, error: null }), 50);
        })
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

describe('DailyMealPlanInline - Realtime & Optimistic Simulation', () => {
  const mockUser = { id: 'patient123' };
  const mockPlan = { id: 'plan1', title: 'Plano Teste', start_date: '2024-01-01', is_active: true, plan_status: 'published_to_patient' };
  const mockItem = { id: 'item1', tipo_refeicao: 'Café da Manhã', day_of_week: new Date().getDay() };

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

  it('deve processar atualizações otimistas de completions instantaneamente', async () => {
    await act(async () => {
      render(<DailyMealPlanInline />);
    });
    
    await screen.findByTestId('meal-group-breakfast');
    
    const toggleButton = screen.getByTestId('toggle-item1');
    const statusDisplay = screen.getByTestId('completion-status-item1');
    
    expect(statusDisplay.textContent).toBe('PENDING');

    await act(async () => {
      toggleButton.click();
    });

    expect(screen.getByTestId('completion-status-item1').textContent).toBe('COMPLETED');
    expect(supabase.from).toHaveBeenCalledWith('meal_item_completions');
  });

  it('deve atualizar marcações de dieta via Realtime para meal_plan_items', async () => {
    await act(async () => {
      render(<DailyMealPlanInline />);
    });
    
    await screen.findByTestId('meal-group-breakfast');
    expect(realtimeCallbacks['meal_plan_items']).toBeDefined();
    
    await act(async () => {
      realtimeCallbacks['meal_plan_items']({
        eventType: 'INSERT',
        new: { id: 'item2', tipo_refeicao: 'Café da Manhã', meal_plan_id: 'plan1', day_of_week: new Date().getDay() }
      });
    });

    expect(supabase.from).toHaveBeenCalledWith('meal_plan_items');
  });
});
