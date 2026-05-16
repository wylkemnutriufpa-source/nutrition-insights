
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Meal, MealItem, Food } from '../types/types';
import { calculateItemMacros, scaleItemToTarget } from '@/lib/nutricore_v2/helpers';

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
}

export const useEditorState = create<EditorState>()(
  persist(
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
      resetEditor: () => set({ meals: [], patientId: null }),

      updateFoodQuantity: (mealId, itemInstanceId, newQuantity) => {
        const { meals } = get();
        const updatedMeals = meals.map(meal => {
          if (meal.id !== mealId) return meal;

          const updatedItems = meal.items.map(item => {
            if (item.instanceId !== itemInstanceId) return item;

            const oldQty = item.clinical_mass_g || item.quantity || 100;
            const safeNewQty = Math.round(newQuantity);
            
            // Adjust substitutions proportionally but with rounding to avoid decimals
            const updatedSubs = (item.substitutions || []).map(sub => {
              const subOldQty = sub.clinical_mass_g || sub.quantity || 100;
              const ratio = oldQty > 0 ? (safeNewQty / oldQty) : 1;
              const subNewQty = Math.round(subOldQty * ratio);
              const subMacros = calculateItemMacros(sub, subNewQty);
              return { 
                ...sub, 
                quantity: subNewQty, 
                clinical_mass_g: subNewQty,
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
          
          const quantity = Math.round(food.clinical_mass_g || food.quantity || food.portionValue || 100);
          const macros = calculateItemMacros(food, quantity);
          
          const newItem: MealItem = {
            ...food,
            instanceId: crypto.randomUUID(),
            quantity,
            clinical_mass_g: quantity,
            substitutions: food.substitutions || food.ingredients || [],
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
            
            const updatedSubs = (item.substitutions || []).map(sub => {
              const subOldQty = sub.clinical_mass_g || sub.quantity || 100;
              const ratio = oldQty > 0 ? (newQuantity / oldQty) : 1;
              const subNewQty = Math.round(subOldQty * ratio);
              const subMacros = calculateItemMacros(sub, subNewQty);
              return { 
                ...sub, 
                quantity: subNewQty, 
                clinical_mass_g: subNewQty,
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

            // SOBERANIA V3: If the substitute has a born-ready quantity, use it
            const substituteQuantity = Math.round(food.clinical_mass_g || food.quantity || 
                                     scaleItemToTarget(food, item.kcal || 100, 'kcal'));
            
            const subMacros = calculateItemMacros(food, substituteQuantity);

            const newSub = {
              ...food,
              name: food.name,
              quantity: substituteQuantity,
              clinical_mass_g: substituteQuantity,
              ...subMacros
            };

            return {
              ...item,
              substitutions: [...(item.substitutions || []), newSub]
            };
          });

          return { ...meal, items: updatedItems };
        });
        set({ meals: updatedMeals });
      }
    }),

    { 
      name: 'fitjourney-editor-v3-sovereign-v4', 
      version: 4, 
      storage: createJSONStorage(() => localStorage) 
    }
  )
);
