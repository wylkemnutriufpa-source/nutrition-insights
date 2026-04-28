import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { QUICK_FOODS, MARMITAS } from './constants';

export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portionValue: number;
  portionUnit: string;
  isMarmita?: boolean;
  imageUrl?: string;
  usageCount?: number;
}

export interface MealItem extends Food {
  instanceId: string;
  quantity: number; // multiplier for portionValue
  substitutions?: Food[];
}

export interface Meal {
  id: string;
  name: string;
  items: MealItem[];
}

interface HistoryState {
  past: Meal[][];
  future: Meal[][];
}

interface MealPlanState {
  patientId: string | null;
  meals: Meal[];
  activeMealId: string | null;
  fastMode: boolean;
  history: HistoryState;
  
  setPatientId: (id: string) => void;
  setActiveMeal: (id: string | null) => void;
  setFastMode: (enabled: boolean) => void;
  
  addFoodToMeal: (mealId: string, food: Food) => void;
  removeFoodFromMeal: (mealId: string, instanceId: string) => void;
  updateFoodQuantity: (mealId: string, instanceId: string, quantity: number) => void;
  addSubstitution: (mealId: string, instanceId: string, food: Food) => void;
  removeSubstitution: (mealId: string, instanceId: string, foodId: string) => void;
  
  duplicateMeal: (mealId: string) => void;
  clearMeal: (mealId: string) => void;
  balanceMacros: (mealId: string, targetKcal: number) => void;
  
  undo: () => void;
  redo: () => void;
  
  resetPlan: () => void;
  generateDeterministicPlan: (goal: string, context?: any) => void;
}

const DEFAULT_MEALS = [
  { id: '1', name: 'Café da Manhã', items: [] },
  { id: '2', name: 'Almoço', items: [] },
  { id: '3', name: 'Lanche da Tarde', items: [] },
  { id: '4', name: 'Jantar', items: [] },
];

const saveHistory = (state: MealPlanState) => ({
  past: [...state.history.past.slice(-20), state.meals],
  future: [],
});

export const useMealEditorV3Store = create<MealPlanState>()(
  persist(
    (set, get) => ({
      patientId: null,
      meals: DEFAULT_MEALS,
      activeMealId: '1',
      fastMode: false,
      history: { past: [], future: [] },

      setPatientId: (id) => set({ patientId: id }),
      setActiveMeal: (id) => set({ activeMealId: id }),
      setFastMode: (enabled) => set({ fastMode: enabled }),

      addFoodToMeal: (mealId, food) => {
        const instanceId = Math.random().toString(36).substring(7);
        set((state) => ({
          history: saveHistory(state),
          meals: state.meals.map((m) =>
            m.id === mealId
              ? { ...m, items: [...m.items, { ...food, instanceId, quantity: 1 }] }
              : m
          ),
        }));
      },

      removeFoodFromMeal: (mealId, instanceId) => {
        set((state) => ({
          history: saveHistory(state),
          meals: state.meals.map((m) =>
            m.id === mealId
              ? { ...m, items: m.items.filter((item) => item.instanceId !== instanceId) }
              : m
          ),
        }));
      },

      updateFoodQuantity: (mealId, instanceId, quantity) => {
        set((state) => ({
          history: saveHistory(state),
          meals: state.meals.map((m) =>
            m.id === mealId
              ? {
                  ...m,
                  items: m.items.map((item) =>
                    item.instanceId === instanceId && !item.isMarmita
                      ? { ...item, quantity }
                      : item
                  ),
                }
              : m
          ),
        }));
      },

      addSubstitution: (mealId, instanceId, food) => {
        set((state) => ({
          history: saveHistory(state),
          meals: state.meals.map((m) =>
            m.id === mealId
              ? {
                  ...m,
                  items: m.items.map((item) =>
                    item.instanceId === instanceId
                      ? { ...item, substitutions: [...(item.substitutions || []), food] }
                      : item
                  ),
                }
              : m
          ),
        }));
      },

      removeSubstitution: (mealId, instanceId, foodId) => {
        set((state) => ({
          history: saveHistory(state),
          meals: state.meals.map((m) =>
            m.id === mealId
              ? {
                  ...m,
                  items: m.items.map((item) =>
                    item.instanceId === instanceId
                      ? {
                          ...item,
                          substitutions: (item.substitutions || []).filter((s) => s.id !== foodId),
                        }
                      : item
                  ),
                }
              : m
          ),
        }));
      },

      duplicateMeal: (mealId) => {
        set((state) => {
          const meal = state.meals.find(m => m.id === mealId);
          if (!meal) return state;
          const newId = Math.random().toString(36).substring(7);
          return {
            history: saveHistory(state),
            meals: [...state.meals, { ...meal, id: newId, name: `${meal.name} (Cópia)` }]
          };
        });
      },

      clearMeal: (mealId) => {
        set((state) => ({
          history: saveHistory(state),
          meals: state.meals.map(m => m.id === mealId ? { ...m, items: [] } : m)
        }));
      },

      balanceMacros: (mealId, targetKcal) => {
        set((state) => {
          const meal = state.meals.find(m => m.id === mealId);
          if (!meal || meal.items.length === 0) return state;
          
          const currentKcal = meal.items.reduce((acc, item) => acc + (item.calories * item.quantity), 0);
          const ratio = targetKcal / currentKcal;
          
          return {
            history: saveHistory(state),
            meals: state.meals.map(m => 
              m.id === mealId 
                ? { ...m, items: m.items.map(item => item.isMarmita ? item : { ...item, quantity: item.quantity * ratio }) } 
                : m
            )
          };
        });
      },

      undo: () => {
        set((state) => {
          if (state.history.past.length === 0) return state;
          const prev = state.history.past[state.history.past.length - 1];
          return {
            meals: prev,
            history: {
              past: state.history.past.slice(0, -1),
              future: [state.meals, ...state.history.future],
            },
          };
        });
      },

      redo: () => {
        set((state) => {
          if (state.history.future.length === 0) return state;
          const next = state.history.future[0];
          return {
            meals: next,
            history: {
              past: [...state.history.past, state.meals],
              future: state.history.future.slice(1),
            },
          };
        });
      },

      resetPlan: () => set({ meals: DEFAULT_MEALS, history: { past: [], future: [] } }),

      generateDeterministicPlan: (goal, context) => {
        const meals: Meal[] = JSON.parse(JSON.stringify(DEFAULT_MEALS));
        const foodMap = QUICK_FOODS.reduce((acc, f) => ({ ...acc, [f.id]: f }), {} as any);
        
        const createItem = (foodId: string, quantity = 1): MealItem => ({
          ...foodMap[foodId],
          instanceId: Math.random().toString(36).substring(7),
          quantity
        });

        const breakfast = meals.find(m => m.id === '1')!;
        const lunch = meals.find(m => m.id === '2')!;
        const snack = meals.find(m => m.id === '3')!;
        const dinner = meals.find(m => m.id === '4')!;

        breakfast.items.push(createItem('q2')); 
        breakfast.items.push(createItem('q1', goal === 'muscle-gain' ? 3 : 2));
        breakfast.items.push(createItem('q8'));

        snack.items.push(createItem('q6'));

        if (goal === 'marmitas') {
          lunch.items.push({ ...MARMITAS[0], instanceId: Math.random().toString(36).substring(7), quantity: 1 });
          dinner.items.push({ ...MARMITAS[1], instanceId: Math.random().toString(36).substring(7), quantity: 1 });
        } else {
          lunch.items.push(createItem('q10', 1.5)); 
          lunch.items.push(createItem('q9', 1.2)); 
          dinner.items.push(createItem('q10', 1.2)); 
          dinner.items.push(createItem('q9', 1.0)); 
        }

        if (goal === 'muscle-gain') {
          snack.items.push(createItem('q7'));
        }

        set((state) => ({ 
          history: saveHistory(state),
          meals, 
          activeMealId: '1' 
        }));
      },
    }),
    {
      name: 'meal-editor-v3-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);


