import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

interface MealPlanState {
  patientId: string | null;
  meals: Meal[];
  activeMealId: string | null;
  setPatientId: (id: string) => void;
  setActiveMeal: (id: string | null) => void;
  addFoodToMeal: (mealId: string, food: Food) => void;
  removeFoodFromMeal: (mealId: string, instanceId: string) => void;
  updateFoodQuantity: (mealId: string, instanceId: string, quantity: number) => void;
  addSubstitution: (mealId: string, instanceId: string, food: Food) => void;
  removeSubstitution: (mealId: string, instanceId: string, foodId: string) => void;
  resetPlan: () => void;
  generateDeterministicPlan: (goal: string, anamnesis: any) => void;
}

const DEFAULT_MEALS = [
  { id: '1', name: 'Café da Manhã', items: [] },
  { id: '2', name: 'Almoço', items: [] },
  { id: '3', name: 'Lanche da Tarde', items: [] },
  { id: '4', name: 'Jantar', items: [] },
];

export const useMealEditorV3Store = create<MealPlanState>()(
  persist(
    (set, get) => ({
      patientId: null,
      meals: DEFAULT_MEALS,
      activeMealId: '1',

      setPatientId: (id) => set({ patientId: id }),
      
      setActiveMeal: (id) => set({ activeMealId: id }),

      addFoodToMeal: (mealId, food) => {
        const instanceId = Math.random().toString(36).substring(7);
        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId
              ? { ...m, items: [...m.items, { ...food, instanceId, quantity: 1 }] }
              : m
          ),
        }));
      },

      removeFoodFromMeal: (mealId, instanceId) => {
        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId
              ? { ...m, items: m.items.filter((item) => item.instanceId !== instanceId) }
              : m
          ),
        }));
      },

      updateFoodQuantity: (mealId, instanceId, quantity) => {
        set((state) => ({
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

      resetPlan: () => set({ meals: DEFAULT_MEALS }),

      generateDeterministicPlan: (goal, anamnesis) => {
        // Logic for Etapa 5 & 6
        // Simplified for now, will expand later
        const newMeals = [...DEFAULT_MEALS];
        // ... build logic based on goal ...
        set({ meals: newMeals });
      },
    }),
    {
      name: 'meal-editor-v3-storage',
      storage: createJSONStorage(() => localStorage),
      // We could use a custom key per patient by modifying the storage dynamically if needed, 
      // but standard persist with patientId in state is often enough if we handle switching.
    }
  )
);
