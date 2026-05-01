import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Meal, Food, MealItem, MealTemplate, AuditLogEntry } from './types';
import { generatePlanWithEngine, generateMealWithEngine, refinePlanWithScore } from './engine';
import { calculateNutritionalScore, validatePlanClinically, type PlanMetadata } from './utils/nutritionalEvaluator';
import { NutritionalScore, ValidationIssue } from './nutritionalScoreTypes';
import { toast } from 'sonner';

interface EditorState {
  meals: Meal[];
  auditLog: AuditLogEntry[];
  patientId: string | null;
  planStatus: 'draft' | 'saving' | 'saved';
  nutritionalScore: NutritionalScore | null;
  validationIssues: ValidationIssue[];
  goalMetadata: PlanMetadata;

  setPatientId: (id: string) => void;
  setGoalMetadata: (metadata: any) => void;
  recalculateScore: () => void;
  refinePlan: (availableFoods: Food[]) => void;
  addMealWithHeader: (name: string, time: string) => void;
  hydrateMeals: (meals: Meal[], auditLog?: AuditLogEntry[]) => void;
  addMeal: () => void;
  duplicateMeal: (mealId: string) => void;
  reorderMeal: (mealId: string, direction: 'up' | 'down') => void;
  removeMeal: (mealId: string) => void;
  updateMealHeader: (mealId: string, name: string, time: string, description?: string, imageUrl?: string, imageSource?: 'auto' | 'manual' | 'fallback') => void;
  updateMealImage: (mealId: string, imageUrl: string, imageSource: 'auto' | 'manual' | 'fallback') => void;
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
      auditLog: [],
      patientId: null,
      planStatus: 'draft',
      nutritionalScore: null,
      validationIssues: [],
      goalMetadata: {},

      setPatientId: (id) => set({ patientId: id }),
      
      setGoalMetadata: (metadata) => {
        set({ goalMetadata: metadata });
        get().recalculateScore();
      },

      recalculateScore: () => {
        const { meals, goalMetadata } = get();
        const nutritionalScore = calculateNutritionalScore(meals, goalMetadata);
        const validationIssues = validatePlanClinically(meals, goalMetadata);
        set({ nutritionalScore, validationIssues });
      },

      refinePlan: (availableFoods) => {
        const { meals, goalMetadata, validationIssues } = get();
        if (validationIssues.length === 0) {
          toast.info("O plano já parece estar bem balanceado.");
          return;
        }
        
        const refinedMeals = refinePlanWithScore(meals, goalMetadata, validationIssues, availableFoods);
        set({ meals: refinedMeals, planStatus: 'draft' });
        get().recalculateScore();
        toast.success("Plano refinado com base no diagnóstico clínico!");
      },

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
        get().recalculateScore();
        toast.success(`Refeição "${name}" adicionada!`);
      },

      hydrateMeals: (meals, auditLog = []) => {
        set({ meals, auditLog, planStatus: 'saved' });
        get().recalculateScore();
      },

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
        get().recalculateScore();
        toast.success('Refeição adicionada!');
      },

      duplicateMeal: (mealId) => {
        const state = get();
        const mealToDuplicate = state.meals.find(m => m.id === mealId);
        if (!mealToDuplicate) return;

        const newMeal: Meal = {
          ...mealToDuplicate,
          id: Math.random().toString(36).substring(2, 9),
          items: mealToDuplicate.items.map(item => ({
            ...item,
            instanceId: makeInstanceId()
          }))
        };

        const mealIndex = state.meals.findIndex(m => m.id === mealId);
        const newMeals = [...state.meals];
        newMeals.splice(mealIndex + 1, 0, newMeal);

        set({ meals: newMeals, planStatus: 'draft' });
        get().recalculateScore();
        toast.success(`Refeição "${mealToDuplicate.name}" duplicada!`);
      },

      reorderMeal: (mealId, direction) => {
        const state = get();
        const mealIndex = state.meals.findIndex(m => m.id === mealId);
        if (mealIndex === -1) return;

        const newIndex = direction === 'up' ? mealIndex - 1 : mealIndex + 1;
        if (newIndex < 0 || newIndex >= state.meals.length) return;

        const newMeals = [...state.meals];
        const [removed] = newMeals.splice(mealIndex, 1);
        newMeals.splice(newIndex, 0, removed);

        set({ meals: newMeals, planStatus: 'draft' });
        get().recalculateScore();
      },

      removeMeal: (mealId) => {
        const meal = get().meals.find(m => m.id === mealId);
        if (meal && meal.items.some(item => item.locked)) {
          toast.error('Não é possível remover refeição com itens bloqueados.');
          return;
        }

        set((state) => ({
          meals: state.meals.filter((m) => m.id !== mealId),
          planStatus: 'draft',
        }));
        get().recalculateScore();
        toast.success('Refeição removida');
      },

      updateMealHeader: (mealId, name, time, description, imageUrl, imageSource) => {
        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId ? { 
              ...m, 
              name, 
              time, 
              description: description !== undefined ? description : m.description,
              imageUrl: imageUrl !== undefined ? imageUrl : m.imageUrl,
              imageSource: imageSource !== undefined ? imageSource : m.imageSource
            } : m
          ),
          planStatus: 'draft',
        }));
        get().recalculateScore();
      },

      updateMealImage: (mealId, imageUrl, imageSource) => {
        set((state) => {
          const meal = state.meals.find(m => m.id === mealId);
          if (!meal) return state;

          const newAuditEntry: AuditLogEntry = {
            type: "image_change",
            mealId,
            from: meal.imageUrl || 'none',
            to: imageUrl,
            source: imageSource,
            created_at: new Date().toISOString()
          };

          return {
            meals: state.meals.map((m) =>
              m.id === mealId ? { ...m, imageUrl, imageSource } : m
            ),
            auditLog: [...state.auditLog, newAuditEntry],
            planStatus: 'draft',
          };
        });
        get().recalculateScore();
      },

      addMarmitaToMeal: async (mealId, marmita) => {
        let calculatedMacros = { kcal: marmita.kcal, protein: marmita.protein, carbs: marmita.carbs, fat: marmita.fat };
        
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
        get().recalculateScore();
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
        get().recalculateScore();
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
        get().recalculateScore();
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
        get().recalculateScore();
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
        get().recalculateScore();
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
        get().recalculateScore();
      },

      generatePlan: (goal, baseCalories, availableFoods, replaceExisting = false) => {
        let currentMeals = get().meals;
        
        if (replaceExisting) {
          currentMeals = initialMeals.map(m => ({ ...m, items: [] }));
        }

        const newMeals = generatePlanWithEngine(currentMeals, goal, baseCalories, availableFoods);
        set({ meals: newMeals, planStatus: 'draft' });
        get().recalculateScore();
        toast.success(`Plano estruturado para ${goal} com ${baseCalories}kcal`);
      },

      generateMeal: (mealId, goal, availableFoods, baseCalories = 2000) => {
        const meals = get().meals;
        const meal = meals.find(m => m.id === mealId);
        if (!meal) return;

        const newItems = generateMealWithEngine(meal, goal, baseCalories, availableFoods);
        set((state) => ({
          meals: state.meals.map(m => 
            m.id === mealId ? { ...m, items: newItems } : m
          ),
          planStatus: 'draft'
        }));
        get().recalculateScore();
        toast.success(`Refeição "${meal.name}" otimizada!`);
      },

      savePlan: async () => {
        set({ planStatus: 'saving' });
        await new Promise((resolve) => setTimeout(resolve, 1000));
        set({ planStatus: 'saved' });
        toast.success('Plano salvo com sucesso!');
      },

      resetEditor: () => {
        set({ meals: initialMeals, planStatus: 'draft', nutritionalScore: null, validationIssues: [] });
      },
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
