import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Meal, Food, MealItem } from './types';
import { generatePlanWithEngine } from './engine';
import { MealTemplate } from './constants';
import { toast } from 'sonner';

interface EditorState {
  meals: Meal[];
  patientId: string | null;
  planStatus: 'draft' | 'saving' | 'saved';

  setPatientId: (id: string) => void;
  hydrateMeals: (meals: Meal[]) => void;
  addMarmitaToMeal: (mealId: string, marmita: Food) => void;
  addFoodToMeal: (mealId: string, food: Food) => void;
  applyTemplateToMeal: (mealId: string, template: MealTemplate) => void;
  removeFood: (mealId: string, instanceId: string) => void;
  generatePlan: (goal: string) => void;
  savePlan: () => Promise<void>;
  resetEditor: () => void;
}

const initialMeals: Meal[] = [
  { id: '1', name: 'Café da Manhã', items: [], time: '08:00' },
  { id: '2', name: 'Lanche da Manhã', items: [], time: '10:00' },
  { id: '3', name: 'Almoço', items: [], time: '12:00' },
  { id: '4', name: 'Lanche da Tarde', items: [], time: '16:00' },
  { id: '5', name: 'Jantar', items: [], time: '20:00' },
  { id: '6', name: 'Ceia', items: [], time: '22:00' },
];

const makeInstanceId = () => Math.random().toString(36).substring(2, 10);

export const useEditorState = create<EditorState>()(
  persist(
    (set, get) => ({
      meals: initialMeals,
      patientId: null,
      planStatus: 'draft',

      setPatientId: (id) => set({ patientId: id }),

      hydrateMeals: (meals) => set({ meals, planStatus: 'saved' }),

      addMarmitaToMeal: (mealId, marmita) => {
        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId
              ? { ...m, items: [...m.items, { ...marmita, instanceId: makeInstanceId(), quantity: 1 }] }
              : m
          ),
          planStatus: 'draft',
        }));
        toast.success(`${marmita.name} adicionada!`);
      },

      addFoodToMeal: (mealId, food) => {
        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId
              ? { ...m, items: [...m.items, { ...food, instanceId: makeInstanceId(), quantity: 1, locked: false }] }
              : m
          ),
          planStatus: 'draft',
        }));
        toast.success(`${food.name} adicionado!`);
      },

      applyTemplateToMeal: (mealId, template) => {
        const newItems: MealItem[] = template.items.map((f) => ({
          ...f,
          instanceId: makeInstanceId(),
          quantity: 1,
          locked: false,
        }));
        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId ? { ...m, items: [...m.items, ...newItems] } : m
          ),
          planStatus: 'draft',
        }));
        toast.success(`Template "${template.name}" aplicado!`);
      },

      removeFood: (mealId, instanceId) => {
        const meal = get().meals.find((m) => m.id === mealId);
        const item = meal?.items.find((i) => i.instanceId === instanceId);

        if (item?.locked) {
          toast.error('Itens LOCKED não podem ser editados individualmente.');
          return;
        }

        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId
              ? { ...m, items: m.items.filter((i) => i.instanceId !== instanceId) }
              : m
          ),
          planStatus: 'draft',
        }));
      },

      generatePlan: (goal) => {
        const currentMeals = get().meals;
        const newMeals = generatePlanWithEngine(currentMeals, goal);
        set({ meals: newMeals, planStatus: 'draft' });
        toast.success('Plano gerado pela engine V3');
      },

      savePlan: async () => {
        set({ planStatus: 'saving' });
        await new Promise((resolve) => setTimeout(resolve, 1000));
        set({ planStatus: 'saved' });
        toast.success('Plano salvo com sucesso!');
      },

      resetEditor: () => set({ meals: initialMeals, planStatus: 'draft' }),
    }),
    {
      name: 'fitjourney-editor-v3-storage',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted: any, version) => {
        if (!persisted || version < 2) {
          return { ...(persisted ?? {}), meals: initialMeals, planStatus: 'draft' };
        }
        return persisted;
      },
    }
  )
);
