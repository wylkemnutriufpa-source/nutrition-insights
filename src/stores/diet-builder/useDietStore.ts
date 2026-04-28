import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  amount?: string;
  marmitaId?: string; // Para identificar itens de marmitas bloqueadas
  locked?: boolean;
  substitutions?: Omit<Food, 'id'>[];
}

export interface Meal {
  id: string;
  type: string;
  items: Food[];
}

export interface DietState {
  meals: Meal[];
  patientName: string;
  patientId: string | null;
  goal: string;
  calorieTarget: number;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  isFallback: boolean;
  templates: { name: string; items: Food[] }[];
  currentStep: number;
  
  // Actions
  addFood: (mealId: string, food: Omit<Food, 'id'>) => void;
  removeFood: (mealId: string, foodId: string) => void;
  replaceFood: (mealId: string, foodId: string, newFood: Omit<Food, 'id'>) => void;
  addTemplate: (mealId: string, templateName: string) => void;
  saveAsTemplate: (name: string, items: Food[]) => void;
  resetDiet: () => void;
  setMeals: (meals: Meal[]) => void;
  setGoal: (goal: string) => void;
  setCalorieTarget: (target: number) => void;
  setIsFallback: (isFallback: boolean) => void;
  setPatientData: (id: string, name: string) => void;
  setCurrentStep: (step: number) => void;
  loadFromBackend: (profileId: string) => Promise<void>;
  saveToBackend: () => Promise<void>;
}

const initialMeals: Meal[] = [
  { id: '1', type: 'Café da Manhã', items: [] },
  { id: '2', type: 'Almoço', items: [] },
  { id: '3', type: 'Lanche', items: [] },
  { id: '4', type: 'Jantar', items: [] },
];

export const useDietStore = create<DietState>()(
  persist(
    (set, get) => ({
      meals: initialMeals,
      patientName: 'Paciente Exemplo',
      patientId: null,
      goal: 'Hipertrofia',
      calorieTarget: 2000,
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      isFallback: false,
      currentStep: 1,
      templates: [
        { 
          name: 'Marmita Padrão', 
          items: [
            { id: 'm1', name: 'Arroz Integral', calories: 130, protein: 3, carbs: 28, fat: 1 },
            { id: 'm2', name: 'Frango Grelhado', calories: 165, protein: 31, carbs: 0, fat: 4 },
            { id: 'm3', name: 'Legumes', calories: 40, protein: 2, carbs: 8, fat: 0 },
          ] 
        }
      ],

      setPatientData: (id, name) => set({ patientId: id, patientName: name }),
      setCurrentStep: (step) => set({ currentStep: step }),

      loadFromBackend: async (profileId) => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('editor_state, last_editor_step, full_name')
            .eq('id', profileId)
            .maybeSingle();
          
          if (data) {
            const state = data.editor_state as any;
            if (state && state.meals) {
              set({ 
                meals: state.meals, 
                totals: calculateTotals(state.meals),
                goal: state.goal || get().goal,
                calorieTarget: state.calorieTarget || get().calorieTarget,
                isFallback: state.isFallback || false,
                currentStep: data.last_editor_step || 1,
                patientId: profileId,
                patientName: data.full_name || get().patientName
              });
            }
          }
        } catch (e) {
          console.error('[FJ:STORE] Erro ao carregar do backend:', e);
        }
      },

      saveToBackend: async () => {
        const { patientId, meals, goal, calorieTarget, isFallback, currentStep } = get();
        if (!patientId) return;

        try {
          await supabase.from('profiles').update({
            editor_state: { meals, goal, calorieTarget, isFallback },
            last_editor_step: currentStep,
            current_editor_mode: 'V3'
          }).eq('id', patientId);
        } catch (e) {
          console.error('[FJ:STORE] Erro ao salvar no backend:', e);
        }
      },

      addFood: (mealId, food) => {
        const newFood = { 
          ...food, 
          id: Math.random().toString(36).substr(2, 9),
          locked: (food as any).locked || false 
        };
        set((state) => {
          const newMeals = state.meals.map((m) =>
            m.id === mealId ? { ...m, items: [...m.items, newFood] } : m
          );
          return { meals: newMeals, totals: calculateTotals(newMeals) };
        });
        get().saveToBackend();
      },

      removeFood: (mealId, foodId) => {
        set((state) => {
          const newMeals = state.meals.map((m) =>
            m.id === mealId ? { ...m, items: m.items.filter((i) => i.id !== foodId) } : m
          );
          return { meals: newMeals, totals: calculateTotals(newMeals) };
        });
        get().saveToBackend();
      },

      replaceFood: (mealId, foodId, newFoodData) => {
        const newFood = { ...newFoodData, id: Math.random().toString(36).substr(2, 9) };
        set((state) => {
          const newMeals = state.meals.map((m) =>
            m.id === mealId ? { ...m, items: m.items.map(i => i.id === foodId ? newFood : i) } : m
          );
          return { meals: newMeals, totals: calculateTotals(newMeals) };
        });
        get().saveToBackend();
      },

      addTemplate: (mealId, templateName) => {
        const template = get().templates.find(t => t.name === templateName);
        if (!template) return;
        
        set((state) => {
          const newItems = template.items.map(i => ({ ...i, id: Math.random().toString(36).substr(2, 9) }));
          const newMeals = state.meals.map((m) =>
            m.id === mealId ? { ...m, items: [...m.items, ...newItems] } : m
          );
          return { meals: newMeals, totals: calculateTotals(newMeals) };
        });
        get().saveToBackend();
      },

      saveAsTemplate: (name, items) => {
        set((state) => ({
          templates: [...state.templates, { name, items: items.map(({ id, ...rest }) => ({ ...rest, id: Math.random().toString(36).substr(2, 9) })) }]
        }));
      },

      resetDiet: () => {
        set({ meals: initialMeals, totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } });
        get().saveToBackend();
      },
      setMeals: (meals) => {
        set({ meals, totals: calculateTotals(meals) });
        get().saveToBackend();
      },
      setGoal: (goal) => {
        set({ goal });
        get().saveToBackend();
      },
      setCalorieTarget: (calorieTarget) => {
        set({ calorieTarget });
        get().saveToBackend();
      },
      setIsFallback: (isFallback) => {
        set({ isFallback });
        get().saveToBackend();
      },
    }),
    { name: 'diet-builder-storage' }
  )
);

function calculateTotals(meals: Meal[]) {
  return meals.reduce(
    (acc, meal) => {
      meal.items.forEach((item) => {
        acc.calories += item.calories;
        acc.protein += item.protein;
        acc.carbs += item.carbs;
        acc.fat += item.fat;
      });
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}
