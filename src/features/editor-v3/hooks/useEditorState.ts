
import { create } from 'zustand';
// persist removed to avoid race conditions with server drafts
import { Meal, MealItem, Food } from '../types/types';
import { calculateItemMacros, scaleItemToTarget } from '@/lib/nutricore_v2/helpers';
import { SovereignTelemetry } from '../utils/FakeUtils';

interface EditorState {
  meals: Meal[];
  patientId: string | null;
  clinicalMode: boolean;
  viewMode: string;
  nutritionalScore: number | null;
  validationIssues: any[];
  goalMetadata: any;
  patientContext: any;
  
  // Actions
  setMeals: (meals: Meal[]) => void;
  setPatientId: (id: string) => void;
  hydrateMeals: (meals: Meal[]) => void;
  resetEditor: () => void;
  
  // Real-time Editing Actions
  updateFoodQuantity: (mealId: string, itemInstanceId: string, newQuantity: number) => void;
  removeFood: (mealId: string, itemInstanceId: string) => void;
  addFoodToMeal: (mealId: string, food: Food) => void;
  addMeal: (name: string, time?: string) => void;
  removeMeal: (mealId: string) => void;
  updateMealHeader: (mealId: string, updates: Partial<Meal>) => void;
  updateMealItemMacros: (mealId: string, itemInstanceId: string, targetValue: number, macroType: 'kcal' | 'protein' | 'carbs' | 'fat') => void;
  addSubstitutionToItem: (mealId: string, itemInstanceId: string, food: Food) => void;
  updateMealItemName: (mealId: string, itemInstanceId: string, name: string) => void;
  removeSubstitutionFromItem: (mealId: string, itemInstanceId: string, subIndex: number) => void;
}

export const useEditorState = create<EditorState>()(
    (set, get) => ({
      meals: [],
      patientId: null,
      clinicalMode: true,
      viewMode: 'daily',
      nutritionalScore: null,
      validationIssues: [],
      goalMetadata: {},
      patientContext: null,

      setMeals: (meals) => set({ meals }),
      setPatientId: (id) => set({ patientId: id }),
      hydrateMeals: (meals) => set({ meals }),
      resetEditor: () => set({ meals: [], patientId: null, nutritionalScore: null, validationIssues: [] }),

      updateFoodQuantity: (mealId, itemInstanceId, newQuantity) => {
        const { meals } = get();
        const updatedMeals = meals.map(meal => {
          if (meal.id !== mealId) return meal;

          const updatedItems = meal.items.map(item => {
            if (item.instanceId !== itemInstanceId) return item;

            const oldQty = item.clinical_mass_g || item.quantity || 100;
            const safeNewQty = Math.round(newQuantity);
            
            // SOBERANIA V3: Substitutos são IMUTÁVEIS. Não escalamos automaticamente.
            // O nutricionista define a gramagem de cada substituto manualmente ou via template.
            const updatedSubs = (item.substitutions || []).map(sub => {
              const subQty = sub.clinical_mass_g || sub.quantity || 100;
              const subMacros = calculateItemMacros(sub, subQty);
              return { 
                ...sub, 
                quantity: subQty, 
                clinical_mass_g: subQty,
                ...subMacros
              };
            });
            
            const newMacros = calculateItemMacros(item, safeNewQty);

            return {
              ...item,
              quantity: safeNewQty,
              clinical_mass_g: safeNewQty,
              substitutions: updatedSubs,
              ...newMacros
            };
          });

          return { ...meal, items: updatedItems };
        });

        set({ meals: updatedMeals });
      },

      removeFood: (mealId, itemInstanceId) => {
        const { meals } = get();
        const updatedMeals = meals.map(meal => {
          if (meal.id !== mealId) return meal;
          return {
            ...meal,
            items: meal.items.filter(item => item.instanceId !== itemInstanceId)
          };
        });
        set({ meals: updatedMeals });
      },

      addFoodToMeal: (mealId, food) => {
        const { meals } = get();
        const updatedMeals = meals.map(meal => {
          if (meal.id !== mealId) return meal;
          
          let quantity = Math.round(food.clinical_mass_g || food.quantity || food.portionValue || 100);
          // 🛡️ SANITIZAÇÃO V3: Evitar o bug do "1g" vindo de templates malformados
          if (quantity <= 1 && (food.kcal > 10 || (food as any).kcal_100g > 10)) {
            quantity = 100;
          }
          const macros = calculateItemMacros(food, quantity);
          
          const newItem: MealItem = {
            ...food,
            instanceId: crypto.randomUUID(),
            quantity,
            clinical_mass_g: quantity,
            substitutions: food.substitutions || [],
            imageUrl: food.imageUrl || (food as any).image_url || null,
            ...macros
          };

          return {
            ...meal,
            items: [...meal.items, newItem]
          };
        });
        set({ meals: updatedMeals });
      },

      addMeal: (name, time = "08:00") => {
        const { meals } = get();
        const newMeal: Meal = {
          id: crypto.randomUUID(),
          name,
          time,
          items: []
        };
        set({ meals: [...meals, newMeal] });
      },

      removeMeal: (mealId) => {
        const { meals } = get();
        set({ meals: meals.filter(m => m.id !== mealId) });
      },

      updateMealHeader: (mealId, updates) => {
        const { meals } = get();
        set({
          meals: meals.map(m => m.id === mealId ? { ...m, ...updates } : m)
        });
      },

      updateMealItemMacros: (mealId, itemInstanceId, targetValue, macroType) => {
        const { meals } = get();
        const updatedMeals = meals.map(meal => {
          if (meal.id !== mealId) return meal;

          const updatedItems = meal.items.map(item => {
            if (item.instanceId !== itemInstanceId) return item;

            const newQuantity = Math.round(scaleItemToTarget(item, targetValue, macroType));
            const oldQty = item.clinical_mass_g || item.quantity || 100;
            
            // SOBERANIA V3: Substitutos são IMUTÁVEIS.
            const updatedSubs = (item.substitutions || []).map(sub => {
              const subQty = sub.clinical_mass_g || sub.quantity || 100;
              const subMacros = calculateItemMacros(sub, subQty);
              return { 
                ...sub, 
                quantity: subQty, 
                clinical_mass_g: subQty,
                ...subMacros
              };
            });

            const newMacros = calculateItemMacros(item, newQuantity);

            return {
              ...item,
              quantity: newQuantity,
              clinical_mass_g: newQuantity,
              substitutions: updatedSubs,
              ...newMacros
            };
          });

          return { ...meal, items: updatedItems };
        });

        set({ meals: updatedMeals });
      },

      addSubstitutionToItem: (mealId, itemInstanceId, food) => {
        const { meals } = get();
        const updatedMeals = meals.map(meal => {
          if (meal.id !== mealId) return meal;

          const updatedItems = meal.items.map(item => {
            if (item.instanceId !== itemInstanceId) return item;

            // SOBERANIA V3: Se o substituto já tem uma gramagem clínica, usamos ela. 
            // Caso contrário, usamos a gramagem padrão do alimento (100g ou porção).
            let substituteQuantity = Math.round(food.clinical_mass_g || food.quantity || food.portionValue || 100);
            
            // 🛡️ SANITIZAÇÃO V3: Evitar o bug do "1g" em substitutos
            if (substituteQuantity <= 1 && (food.kcal > 10 || (food as any).kcal_100g > 10)) {
              substituteQuantity = 100;
            }
            
            const subMacros = calculateItemMacros(food, substituteQuantity);

            const groupId = item.substitution_group_id || crypto.randomUUID();
            const newSub = {
              ...food,
              instanceId: crypto.randomUUID(),
              quantity: substituteQuantity,
              clinical_mass_g: substituteQuantity,
              substitution_group_id: groupId,
              is_primary: false,
              imageUrl: food.imageUrl || (food as any).image_url || null,
              ...subMacros
            };

            return {
              ...item,
              substitution_group_id: groupId,
              substitutions: [...(item.substitutions || []), newSub]
            };
          });

          return { ...meal, items: updatedItems };
        });
        set({ meals: updatedMeals });
      },

      updateMealItemName: (mealId, itemInstanceId, name) => {
        const { meals } = get();
        const updatedMeals = meals.map(meal => {
          if (meal.id !== mealId) return meal;
          return {
            ...meal,
            items: meal.items.map(item => 
              item.instanceId === itemInstanceId ? { ...item, name } : item
            )
          };
        });
        set({ meals: updatedMeals });
      },

      removeSubstitutionFromItem: (mealId, itemInstanceId, subIndex) => {
        const { meals } = get();
        const updatedMeals = meals.map(meal => {
          if (meal.id !== mealId) return meal;
          return {
            ...meal,
            items: meal.items.map(item => {
              if (item.instanceId !== itemInstanceId) return item;
              const newSubs = [...(item.substitutions || [])];
              newSubs.splice(subIndex, 1);
              return { ...item, substitutions: newSubs };
            })
          };
        });
        set({ meals: updatedMeals });
      }
    }),

    { 
      name: 'fitjourney-editor-v3-sovereign-v5', 
      version: 5, 
      storage: createJSONStorage(() => localStorage) 
    }
  )
);
