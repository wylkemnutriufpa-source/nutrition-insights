import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Meal, Food, MealItem } from './types';
import { generatePlanWithEngine, generateMealWithEngine } from './engine';
import { MealTemplate } from './constants';
import { toast } from 'sonner';

interface EditorState {
  meals: Meal[];
  patientId: string | null;
  planStatus: 'draft' | 'saving' | 'saved';

  setPatientId: (id: string) => void;
  hydrateMeals: (meals: Meal[]) => void;
  addMeal: () => void;
  removeMeal: (mealId: string) => void;
  updateMealHeader: (mealId: string, name: string, time: string) => void;
  addMarmitaToMeal: (mealId: string, marmita: Food) => void;
  addFoodToMeal: (mealId: string, food: Food) => void;
  applyTemplateToMeal: (mealId: string, template: MealTemplate) => void;
  removeFood: (mealId: string, instanceId: string) => void;
  updateFoodQuantity: (mealId: string, instanceId: string, quantity: number) => void;
  generatePlan: (goal: string, replaceExisting?: boolean) => void;
  generateMeal: (mealId: string, goal: string) => void;
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

      addMeal: () => {
        set((state) => ({
          meals: [
            ...state.meals,
            {
              id: Math.random().toString(36).substring(2, 9),
              name: `Nova Refeição ${state.meals.length + 1}`,
              items: [],
              time: '00:00',
            },
          ],
          planStatus: 'draft',
        }));
        toast.success('Refeição adicionada!');
      },

      removeMeal: (mealId) => {
        set((state) => ({
          meals: state.meals.filter((m) => m.id !== mealId),
          planStatus: 'draft',
        }));
        toast.success('Refeição removida');
      },

      updateMealHeader: (mealId, name, time) => {
        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId ? { ...m, name, time } : m
          ),
          planStatus: 'draft',
        }));
      },

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
        let initialQuantity = 1;
        if (food.measurementType === 'gram') initialQuantity = 100;
        if (food.measurementType === 'ml') initialQuantity = 200;
        if (food.measurementType === 'spoon') initialQuantity = 1;
        if (food.measurementType === 'unit') initialQuantity = 1;

        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId
              ? { ...m, items: [...m.items, { ...food, instanceId: makeInstanceId(), quantity: initialQuantity, locked: false }] }
              : m
          ),
          planStatus: 'draft',
        }));
        toast.success(`${food.name} adicionado!`);
      },

      applyTemplateToMeal: (mealId, template) => {
        const newItems: MealItem[] = template.items.map((f) => {
          let initialQuantity = 1;
          if (f.measurementType === 'gram') initialQuantity = 100;
          if (f.measurementType === 'ml') initialQuantity = 200;
          if (f.measurementType === 'spoon') initialQuantity = 1;
          if (f.measurementType === 'unit') initialQuantity = 1;
          
          return {
            ...f,
            instanceId: makeInstanceId(),
            quantity: initialQuantity,
            locked: false,
          };
        });
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
      
      updateFoodQuantity: (mealId, instanceId, quantity) => {
        if (quantity < 0) return;
        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId
              ? {
                  ...m,
                  items: m.items.map((i) =>
                    i.instanceId === instanceId ? { ...i, quantity } : i
                  ),
                }
              : m
          ),
          planStatus: 'draft',
        }));
      },

      generatePlan: (goal, replaceExisting = false) => {
        let currentMeals = get().meals;
        
        if (replaceExisting) {
          currentMeals = initialMeals.map(m => ({ ...m, items: [] }));
        }

        const newMeals = generatePlanWithEngine(currentMeals, goal);
        set({ meals: newMeals, planStatus: 'draft' });
        toast.success('Plano alimentar estruturado pela Engine V3');
      },

      generateMeal: (mealId, goal) => {
        const meals = get().meals;
        const meal = meals.find(m => m.id === mealId);
        if (!meal) return;

        const newItems = generateMealWithEngine(meal, goal);
        set((state) => ({
          meals: state.meals.map(m => 
            m.id === mealId ? { ...m, items: newItems } : m
          ),
          planStatus: 'draft'
        }));
        toast.success(`Refeição "${meal.name}" otimizada!`);
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