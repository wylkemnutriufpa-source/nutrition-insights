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
  addMealWithHeader: (name: string, time: string) => void;
  hydrateMeals: (meals: Meal[]) => void;
  addMeal: () => void;
  removeMeal: (mealId: string) => void;
  updateMealHeader: (mealId: string, name: string, time: string, description?: string) => void;
  addMarmitaToMeal: (mealId: string, marmita: Food) => Promise<void>;
  addFoodToMeal: (mealId: string, food: Food) => void;
  applyTemplateToMeal: (mealId: string, template: MealTemplate) => void;
  removeFood: (mealId: string, instanceId: string) => void;
  updateFoodQuantity: (mealId: string, instanceId: string, quantity: number) => void;
  updateMealItem: (mealId: string, instanceId: string, updates: Partial<MealItem>) => void;
  generatePlan: (goal: string, baseCalories: number, availableFoods: Food[], replaceExisting?: boolean) => void;
  generateMeal: (mealId: string, goal: string, availableFoods: Food[], baseCalories?: number) => void;
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

      addMealWithHeader: (name, time) => {
        set((state) => ({
          meals: [
            ...state.meals,
            {
              id: Math.random().toString(36).substring(2, 9),
              name,
              items: [],
              time,
            },
          ],
          planStatus: 'draft',
        }));
        toast.success(`Refeição "${name}" adicionada!`);
      },

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

      updateMealHeader: (mealId, name, time, description) => {
        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId ? { ...m, name, time, description: description !== undefined ? description : m.description } : m
          ),
          planStatus: 'draft',
        }));
      },

      addMarmitaToMeal: async (mealId, marmita) => {
        let calculatedMacros = { kcal: marmita.kcal, protein: marmita.protein, carbs: marmita.carbs, fat: marmita.fat };
        
        // Se os macros estiverem zerados e houver ingredientes, calculamos
        if (calculatedMacros.kcal === 0 && marmita.ingredients && marmita.ingredients.length > 0) {
          const { getFoodMacrosByName } = await import('./utils/dataFetcher');
          const names = marmita.ingredients.map((i: any) => (i.name || i.food).toLowerCase());
          const macrosMap = await getFoodMacrosByName(names);
          
          let totalKcal = 0, totalP = 0, totalC = 0, totalF = 0;
          
          marmita.ingredients.forEach((ing: any) => {
            const name = (ing.name || ing.food).toLowerCase();
            const grams = ing.grams || ing.base_grams || 100;
            const factor = grams / 100;
            const macros = macrosMap[name];
            
            if (macros) {
              totalKcal += macros.kcal * factor;
              totalP += macros.protein * factor;
              totalC += macros.carbs * factor;
              totalF += macros.fat * factor;
            }
          });
          
          calculatedMacros = { kcal: totalKcal, protein: totalP, carbs: totalC, fat: totalF };
        }

        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId
              ? { 
                  ...m, 
                  items: [
                    ...m.items, 
                    { 
                      ...marmita, 
                      ...calculatedMacros, 
                      calories: calculatedMacros.kcal,
                      instanceId: makeInstanceId(), 
                      quantity: 1 
                    }
                  ] 
                }
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
      updateMealItem: (mealId, instanceId, updates) => {
        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId
              ? {
                  ...m,
                  items: m.items.map((i) =>
                    i.instanceId === instanceId ? { ...i, ...updates } : i
                  ),
                }
              : m
          ),
          planStatus: 'draft',
        }));
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

      generatePlan: (goal, baseCalories, replaceExisting = false) => {
        let currentMeals = get().meals;
        
        if (replaceExisting) {
          currentMeals = initialMeals.map(m => ({ ...m, items: [] }));
        }

        const newMeals = generatePlanWithEngine(currentMeals, goal, baseCalories);
        set({ meals: newMeals, planStatus: 'draft' });
        toast.success(`Plano estruturado para ${goal} com ${baseCalories}kcal`);
      },

      generateMeal: (mealId, goal, baseCalories = 2000) => {
        const meals = get().meals;
        const meal = meals.find(m => m.id === mealId);
        if (!meal) return;

        const newItems = generateMealWithEngine(meal, goal, baseCalories);
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