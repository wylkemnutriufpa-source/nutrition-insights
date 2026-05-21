
import { create } from 'zustand';
import { Meal, MealItem, Food } from '../types/types';
import { calculateItemMacros, scaleItemToTarget, adjustSubstitutionsProportionally } from '@/lib/nutricore_v2/helpers';

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

/**
 * 🛡️ SOBERANIA V3: Editor State Store
 * Persistência local (localStorage) removida para evitar conflitos com rascunhos do servidor.
 * A soberania agora reside no Draft System (v3_drafts).
 */
export const useEditorState = create<EditorState>()((set, get) => ({
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
        const safeNewQty = Math.max(1, Math.round(newQuantity));

        // Escala substituições proporcionalmente ao item principal
        const updatedSubs = adjustSubstitutionsProportionally(
          (item.substitutions || []) as any,
          oldQty,
          safeNewQty
        );

        const newMacros = calculateItemMacros(item, safeNewQty);

        return {
          ...item,
          quantity: safeNewQty,
          clinical_mass_g: safeNewQty,
          quantity_display: `${safeNewQty}g`,
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

        const oldQty = item.clinical_mass_g || item.quantity || 100;
        const newQuantity = Math.max(1, Math.round(scaleItemToTarget(item, targetValue, macroType)));

        // Escala substituições proporcionalmente ao item principal
        const updatedSubs = adjustSubstitutionsProportionally(
          (item.substitutions || []) as any,
          oldQty,
          newQuantity
        );

        const newMacros = calculateItemMacros(item, newQuantity);

        return {
          ...item,
          quantity: newQuantity,
          clinical_mass_g: newQuantity,
          quantity_display: `${newQuantity}g`,
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

        // Calcula gramagem equivalente em kcal ao item principal
        // Ex: frango 150g = 250kcal → batata-doce precisa de Xg para 250kcal
        const primaryKcal = item.kcal || 0;
        const primaryQuantity = item.clinical_mass_g || item.quantity || 100;
        
        // Garante que temos kcal por 100g do substituto
        let subKcalPer100g = food.kcal_100g || 0;
        if (!subKcalPer100g && food.kcal) {
          // Se temos kcal total, calcula por 100g baseado na quantidade atual
          const foodQuantity = food.clinical_mass_g || food.quantity || food.portionValue || 100;
          subKcalPer100g = (food.kcal / foodQuantity) * 100;
        }

        let substituteQuantity: number;
        if (primaryKcal > 0 && subKcalPer100g > 0) {
          // Gramagem para equivalência calórica: (kcal_item_principal / kcal_por_100g_substituto) * 100
          substituteQuantity = Math.max(10, Math.round((primaryKcal / subKcalPer100g) * 100));
        } else {
          // Fallback: mesma gramagem do item principal
          substituteQuantity = Math.max(10, Math.round(
            food.clinical_mass_g || food.quantity || food.portionValue || primaryQuantity || 100
          ));
        }

        // Garante gramagem mínima realista (nunca menos que 10g)
        if (substituteQuantity < 10 && (food.kcal || food.kcal_100g || 0) > 0) {
          substituteQuantity = 100; // Fallback seguro
        }

        const subMacros = calculateItemMacros(food, substituteQuantity);

        const groupId = item.substitution_group_id || crypto.randomUUID();
        const newSub = {
          ...food,
          instanceId: crypto.randomUUID(),
          quantity: substituteQuantity,
          clinical_mass_g: substituteQuantity,
          quantity_display: `${substituteQuantity}g`,
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
}));
