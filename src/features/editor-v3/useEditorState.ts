import { create } from 'zustand';
import { Meal, Food, MealItem } from '@/hooks/meal-editor-v3/types';
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
}

export const useEditorState = create<EditorState>((set, get) => ({
  meals: [
    { id: '1', name: 'Café da Manhã', items: [], time: '08:00' },
    { id: '2', name: 'Almoço', items: [], time: '12:00' },
    { id: '3', name: 'Jantar', items: [], time: '20:00' },
  ],
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
    
    // Regra: Marmitas/locked não podem ser removidas se for a regra do V3
    // Mas aqui vamos permitir a remoção do bloco inteiro, mas não alterar o conteúdo interno (que já é implícito)
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
    const newMeals = generatePlanWithEngine(get().meals, goal);
    set({ meals: newMeals, planStatus: 'draft' });
    toast.success('Plano atualizado pela engine V3');
  },

  savePlan: async () => {
    set({ planStatus: 'saving' });
    // Mock save delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    set({ planStatus: 'saved' });
    toast.success('Plano salvo com sucesso!');
  }
}));
