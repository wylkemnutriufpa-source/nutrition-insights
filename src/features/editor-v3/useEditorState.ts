import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Meal, Food, MealItem } from './types';
import { generatePlanWithEngine } from './engine';
import { toast } from 'sonner';

interface EditorState {
  meals: Meal[];
  patientId: string | null;
  planStatus: 'draft' | 'saving' | 'saved';
  
  setPatientId: (id: string) => void;
  addMarmitaToMeal: (mealId: string, marmita: Food) => void;
  removeFood: (mealId: string, instanceId: string) => void;
  generatePlan: (goal: string) => void;
  savePlan: () => Promise<void>;
  resetEditor: () => void;
}

const initialMeals: Meal[] = [
  { id: '1', name: 'Café da Manhã', items: [], time: '08:00' },
  { id: '2', name: 'Almoço', items: [], time: '12:00' },
  { id: '3', name: 'Jantar', items: [], time: '20:00' },
];

export const useEditorState = create<EditorState>()(
  persist(
    (set, get) => ({
      meals: initialMeals,
      patientId: null,
      planStatus: 'draft',

      setPatientId: (id) => set({ patientId: id }),

      addMarmitaToMeal: (mealId, marmita) => {
        const instanceId = Math.random().toString(36).substring(7);
        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId
              ? { ...m, items: [...m.items, { ...marmita, instanceId, quantity: 1 }] }
              : m
          ),
          planStatus: 'draft'
        }));
        toast.success(`${marmita.name} adicionada!`);
      },

      removeFood: (mealId, instanceId) => {
        const meal = get().meals.find(m => m.id === mealId);
        const item = meal?.items.find(i => i.instanceId === instanceId);
        
        if (item?.locked) {
          toast.error("Itens LOCKED não podem ser editados individualmente.");
          return;
        }

        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId
              ? { ...m, items: m.items.filter((i) => i.instanceId !== instanceId) }
              : m
          ),
          planStatus: 'draft'
        }));
      },

      generatePlan: (goal) => {
        // Evita duplicar se já foi gerado algo similar recentemente ou se já existem refeições geradas
        const currentMeals = get().meals;
        const hasGenerated = currentMeals.some(m => m.id === 'generated-v3');
        
        if (hasGenerated) {
          toast.error("O plano já foi gerado para este objetivo.");
          return;
        }

        const newMeals = generatePlanWithEngine(currentMeals, goal);
        set({ meals: newMeals, planStatus: 'draft' });
        toast.success('Plano gerado pela engine V3');
      },

      savePlan: async () => {
        set({ planStatus: 'saving' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        set({ planStatus: 'saved' });
        toast.success('Plano salvo com sucesso!');
      },

      resetEditor: () => set({ meals: initialMeals, planStatus: 'draft' })
    }),
    {
      name: 'fitjourney-editor-v3-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);