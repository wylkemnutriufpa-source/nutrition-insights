import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { QUICK_FOODS, MARMITAS } from './constants';
import { getEquivalentFoods, applyClinicalRules, ClinicalLog } from './clinicalRules';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  quantity: number; 
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
  patientTargets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    isIntolerant?: boolean;
    drinksCoffee?: boolean;
  } | null;
  meals: Meal[];
  activeMealId: string | null;
  fastMode: boolean;
  history: HistoryState;
  planStatus: 'draft' | 'validated' | 'optimized' | 'syncing' | 'error' | 'success';
  clinicalLog: ClinicalLog | null;
  consistencyMessage: string | null;
  lastActionInsight: string | null;
  availableClinicalRules: any[];
  isPatientView: boolean;
  templates: any[];
  favorites: any[];

  setPatientId: (id: string) => void;
  setActiveMeal: (id: string | null) => void;
  setFastMode: (enabled: boolean) => void;
  setPatientView: (enabled: boolean) => void;
  
  fetchClinicalRules: () => Promise<void>;
  fetchTemplates: () => Promise<void>;
  applyTemplate: (template: any) => void;
  saveAsFavorite: (name: string, type: 'meal' | 'full_plan') => Promise<void>;
  clonePlan: (newPatientId: string, newTargets: any) => void;

  addFoodToMeal: (mealId: string, food: Food) => void;
  removeFoodFromMeal: (mealId: string, instanceId: string) => void;
  updateFoodQuantity: (mealId: string, instanceId: string, quantity: number) => void;
  addSubstitution: (mealId: string, instanceId: string, food: Food) => void;
  removeSubstitution: (mealId: string, instanceId: string, foodId: string) => void;

  duplicateMeal: (mealId: string) => void;
  clearMeal: (mealId: string) => void;
  balanceMacros: (mealId: string, targetKcal: number) => void;
  optimizePlan: () => void;
  validateAndSave: () => Promise<boolean>;

  undo: () => void;
  redo: () => void;
  
  resetPlan: () => void;
  generateDeterministicPlan: (goal: string, context?: any) => Promise<void>;
}

const DEFAULT_MEALS = [
  { id: '1', name: 'Café da Manhã', items: [] },
  { id: '2', name: 'Almoço', items: [] },
  { id: '3', name: 'Lanche da Tarde', items: [] },
  { id: '4', name: 'Jantar', items: [] },
];

const saveHistory = (state: MealPlanState) => ({
  past: [...state.history.past, JSON.parse(JSON.stringify(state.meals))].slice(-30),
  future: [],
});

export const useMealEditorV3Store = create<MealPlanState>()(
  persist(
    (set, get) => ({
      patientId: null,
      patientTargets: null,
      meals: DEFAULT_MEALS,
      activeMealId: '1',
      fastMode: false,
      history: { past: [], future: [] },
      planStatus: 'draft',
      clinicalLog: null,
      consistencyMessage: null,
      lastActionInsight: null,
      availableClinicalRules: [],
      isPatientView: false,
      templates: [],
      favorites: [],

      setPatientId: (id) => {
        const storedFastMode = localStorage.getItem(`fastMode_${id}`);
        set({ 
          patientId: id, 
          fastMode: storedFastMode === 'true',
          patientTargets: { 
            calories: 2000, 
            protein: 150, 
            carbs: 200, 
            fat: 60,
            isIntolerant: false,
            drinksCoffee: true
          } 
        });
      },
      setActiveMeal: (id) => set({ activeMealId: id }),
      setFastMode: (enabled) => {
        const { patientId } = get();
        if (patientId) {
          localStorage.setItem(`fastMode_${patientId}`, enabled.toString());
        }
        set({ fastMode: enabled });
      },
      setPatientView: (enabled) => set({ isPatientView: enabled }),

      fetchClinicalRules: async () => {
        const { data } = await supabase
          .from('meal_clinical_rules')
          .select('*')
          .order('condition_name');
        
        if (data) set({ availableClinicalRules: data });
      },

      fetchTemplates: async () => {
        const { data } = await supabase.from('meal_plan_templates').select('*');
        if (data) set({ templates: data });
      },

      applyTemplate: (template) => {
        const { patientTargets, availableClinicalRules } = get();
        let adaptedMeals = JSON.parse(JSON.stringify(template.meals)) as Meal[];

        // Clinical Adaptation from Template
        if (template.clinical_condition) {
          const condition = availableClinicalRules.find(r => r.condition_name === template.clinical_condition);
          if (condition) {
            const result = applyClinicalRules(adaptedMeals, condition.id);
            adaptedMeals = result.meals;
            set({ clinicalLog: result.log });
          }
        }

        const isHypertrophy = patientTargets?.calories && patientTargets.calories > 2500;
        const isWeightLoss = patientTargets?.calories && patientTargets.calories < 1800;

        adaptedMeals = adaptedMeals.map(meal => ({
          ...meal,
          items: meal.items.filter(item => {
            // Rule: intolerância -> remover leite
            if (patientTargets?.isIntolerant && item.name.toLowerCase().includes('leite')) return false;
            // Rule: paciente não toma café -> substituir automaticamente (por chá)
            if (patientTargets?.drinksCoffee === false && item.name.toLowerCase().includes('café')) {
              // We'll handle replacement in the next map step or here
              return true;
            }
            return true;
          }).map(item => {
            if (item.isMarmita) return item;
            
            let quantity = item.quantity;
            let name = item.name;
            let calories = item.calories;
            let fat = item.fat;

            // Rule: paciente não toma café -> trocar por Chá
            if (patientTargets?.drinksCoffee === false && name.toLowerCase().includes('café')) {
              name = 'Chá de Ervas';
              calories = 0;
              fat = 0;
            }

            // Rule: emagrecimento -> leite desnatado
            if (isWeightLoss && name.toLowerCase().includes('leite') && !name.toLowerCase().includes('desnatado')) {
              name = 'Leite Desnatado';
              calories = 35;
              fat = 0.1;
            }

            // Hypertrophy Rules
            if (isHypertrophy) {
              if (name.toLowerCase().includes('ovo')) quantity += 1;
              if (item.protein > 15) quantity *= 1.2;
            }

            // Weight Loss Rules
            if (isWeightLoss) {
              if (item.carbs > 20) quantity *= 0.8;
            }

            return { ...item, name, calories, fat, quantity };
          })
        }));

        // Rule: Hipertrofia -> Adicionar fruta no almoço/jantar se não existir
        if (isHypertrophy) {
          adaptedMeals = adaptedMeals.map(meal => {
            if ((meal.name === 'Almoço' || meal.name === 'Jantar') && !meal.items.some(i => i.name.toLowerCase().includes('fruta'))) {
              return {
                ...meal,
                items: [...meal.items, {
                  id: 'q15', name: 'Fruta da Estação', calories: 60, protein: 0.5, carbs: 15, fat: 0.1,
                  portionValue: 100, portionUnit: 'g', quantity: 1, instanceId: Math.random().toString(36).substring(7)
                }]
              };
            }
            return meal;
          });
        }

        set({ 
          meals: adaptedMeals, 
          planStatus: 'draft',
          lastActionInsight: `Template "${template.name}" adaptado dinamicamente para o perfil do paciente.`
        });
      },

      saveAsFavorite: async (name, type) => {
        const { meals } = get();
        const userData = (await supabase.auth.getUser()).data.user;
        if (!userData) return;

        const favoriteData = type === 'full_plan' ? meals : meals.find(m => m.id === get().activeMealId);
        if (!favoriteData) return;

        await supabase.from('meal_plan_favorites').insert([{
          name,
          type,
          data: favoriteData as any,
          user_id: userData.id
        }]);
        toast.success('Salvo nos favoritos');
      },

      clonePlan: (newPatientId, newTargets) => {
        const { meals } = get();
        const currentCals = meals.reduce((acc, m) => acc + m.items.reduce((a, i) => a + i.calories * i.quantity, 0), 0);
        const ratio = newTargets.calories / (currentCals || 1);

        const adaptedMeals = meals.map(m => ({
          ...m,
          items: m.items.map(i => i.isMarmita ? i : { ...i, quantity: i.quantity * ratio })
        }));

        set({ 
          patientId: newPatientId, 
          patientTargets: newTargets, 
          meals: adaptedMeals,
          lastActionInsight: 'Plano clonado e adaptado para o novo paciente.'
        });
      },

      addFoodToMeal: (mealId, food) => {
        const instanceId = Math.random().toString(36).substring(7);
        const subs = getEquivalentFoods(food.id);
        
        set((state) => ({
          history: saveHistory(state),
          planStatus: 'draft',
          meals: state.meals.map((m) =>
            m.id === mealId
              ? { ...m, items: [...m.items, { ...food, instanceId, quantity: 1, substitutions: subs }] }
              : m
          ),
        }));
      },

      removeFoodFromMeal: (mealId, instanceId) => {
        const { meals } = get();
        const meal = meals.find(m => m.id === mealId);
        const item = meal?.items.find(i => i.instanceId === instanceId);
        
        if (item?.isMarmita) {
          toast.error('Marmitas possuem composição fixa');
          return;
        }

        set((state) => ({
          history: saveHistory(state),
          planStatus: 'draft',
          meals: state.meals.map((m) =>
            m.id === mealId
              ? { ...m, items: m.items.filter((item) => item.instanceId !== instanceId) }
              : m
          ),
        }));
      },

      updateFoodQuantity: (mealId, instanceId, quantity) => {
        const { meals } = get();
        const meal = meals.find(m => m.id === mealId);
        const item = meal?.items.find(i => i.instanceId === instanceId);
        
        if (item?.isMarmita) {
          toast.error('Marmitas possuem composição fixa');
          return;
        }

        if (isNaN(quantity) || quantity < 0) {
          set({ consistencyMessage: 'Quantidade inválida detectada' });
          return;
        }
        
        set((state) => ({
          history: saveHistory(state),
          planStatus: 'draft',
          consistencyMessage: null,
          meals: state.meals.map((m) =>
            m.id === mealId
              ? {
                  ...m,
                  items: m.items.map((item) =>
                    item.instanceId === instanceId
                      ? { ...item, quantity }
                      : item
                  ),
                }
              : m
          ),
        }));
      },

      addSubstitution: (mealId, instanceId, food) => {
        const { meals } = get();
        const meal = meals.find(m => m.id === mealId);
        const item = meal?.items.find(i => i.instanceId === instanceId);
        
        if (item?.isMarmita) {
          toast.error('Marmitas não podem ser alteradas');
          return;
        }

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
        const { meals } = get();
        const meal = meals.find(m => m.id === mealId);
        const item = meal?.items.find(i => i.instanceId === instanceId);
        
        if (item?.isMarmita) {
          toast.error('Marmitas não podem ser alteradas');
          return;
        }

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
          if (currentKcal === 0) return state;
          const ratio = targetKcal / currentKcal;
          
          return {
            history: saveHistory(state),
            lastActionInsight: `Refeição ajustada para meta de ${targetKcal} kcal`,
            meals: state.meals.map(m => 
              m.id === mealId 
                ? { ...m, items: m.items.map(item => item.isMarmita ? item : { ...item, quantity: item.quantity * ratio }) } 
                : m
            )
          };
        });
      },

      optimizePlan: () => {
        // Optimization logic
      },

      validateAndSave: async () => {
        const { meals, patientTargets, patientId, clinicalLog } = get();
        if (!patientTargets) {
          toast.warning('Baseado em dados parciais (falta anamnese)');
        }

        const totals = meals.reduce((acc, meal) => {
          meal.items.forEach(item => {
            acc.calories += item.calories * item.quantity;
            acc.protein += item.protein * item.quantity;
          });
          return acc;
        }, { calories: 0, protein: 0 });

        const targetCals = patientTargets?.calories || 2000;
        const targetProt = patientTargets?.protein || 150;

        const calDiff = Math.abs(totals.calories - targetCals) / targetCals;
        const protDiff = Math.abs(totals.protein - targetProt) / targetProt;

        if (calDiff > 0.15 || protDiff > 0.15) {
          set({ planStatus: 'error', consistencyMessage: 'Plano inválido: macros fora da meta (>15%)' });
          toast.error('Plano inválido para este paciente');
          return false;
        }

        if (clinicalLog) {
          await supabase.from('meal_clinical_decision_log').insert([{
            patient_id: patientId,
            condition_applied: clinicalLog.conditionId,
            rules_applied: clinicalLog.appliedRules,
            substitutions: clinicalLog.changes.filter(c => c.type === 'substitution'),
            reasons: clinicalLog.changes.map(c => c.reason)
          }]);
        }

        set({ planStatus: 'validated', consistencyMessage: null });
        return true;
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

      resetPlan: () => set({ meals: DEFAULT_MEALS, history: { past: [], future: [] }, planStatus: 'draft' }),

      generateDeterministicPlan: async (goal, context) => {
        const meals: Meal[] = JSON.parse(JSON.stringify(DEFAULT_MEALS));
        const foodMap = QUICK_FOODS.reduce((acc, f) => ({ ...acc, [f.id]: f }), {} as any);
        
        const createItem = (foodId: string, quantity = 1): MealItem => ({
          ...foodMap[foodId],
          instanceId: Math.random().toString(36).substring(7),
          quantity,
          substitutions: getEquivalentFoods(foodId)
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

        let finalMeals = meals;
        let finalLog = null;
        if (context?.conditionId) {
          const result = applyClinicalRules(meals, context.conditionId);
          finalMeals = result.meals;
          finalLog = result.log;
        }

        if (goal === 'muscle-gain') {
          snack.items.push(createItem('q7'));
        }

        set((state) => ({ 
          history: saveHistory(state),
          meals: finalMeals, 
          activeMealId: '1',
          planStatus: 'validated',
          clinicalLog: finalLog
        }));
      },
    }),
    {
      name: 'meal-editor-v3-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
