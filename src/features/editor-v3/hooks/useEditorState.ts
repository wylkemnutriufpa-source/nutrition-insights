
import { create } from 'zustand';
import { Meal, MealItem, Food } from '../types/types';
import { calculateItemMacros, scaleItemToTarget, adjustSubstitutionsProportionally } from '@/lib/nutricore_v2/helpers';
import { normalizeMeals } from '../utils/normalization';

const MAX_QUANTITY = 5000;
const MIN_QUANTITY = 1;

/**
 * 🛡️ SOBERANIA V3: Calcula o quantity_display preservando a unidade original.
 */
export function preservedQuantityDisplay(item: any, oldMassG: number, newMassG: number): string {
  const original = String(item.quantity_display || (item as any).qty || `${newMassG}g`);
  
  const unitMatch = original.match(/^([\d.,]+)\s*(unidade|unidades|fatia|fatias|colher|colheres|copo|copos|xicara|x[íi]cara|xicaras|x[íi]caras)\b/i);
  
  if (unitMatch && oldMassG > 0) {
    const oldUnits = parseFloat(unitMatch[1].replace(',', '.'));
    const unitName = unitMatch[2];
    const ratio = newMassG / oldMassG;
    const newUnits = oldUnits * ratio;
    
    const rounded = Math.round(newUnits * 2) / 2;
    const formatted = rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1).replace('.', ',');
    
    return `${formatted} ${unitName}`;
  }
  
  if (/\b(ml|l|litro)\b/i.test(original)) {
    return `${newMassG}ml`;
  }
  
  return `${newMassG}g`;
}

interface EditorState {
  meals: Meal[];
  patientId: string | null;
  clinicalMode: boolean;
  viewMode: string;
  nutritionalScore: number | null;
  validationIssues: any[];
  goalMetadata: any;
  patientContext: any;
  
  setMeals: (meals: Meal[]) => void;
  setPatientId: (id: string) => void;
  hydrateMeals: (meals: Meal[]) => void;
  resetEditor: () => void;
  
  updateFoodQuantity: (mealId: string, itemInstanceId: string, newQuantity: number) => void;
  updateFoodQuantityGlobal: (itemInstanceId: string, newQuantity: number) => void;
  removeFood: (mealId: string, itemInstanceId: string) => void;
  addFoodToMeal: (mealId: string, food: Food) => void;
  addMeal: (name: string, time?: string) => void;
  removeMeal: (mealId: string) => void;
  updateMealHeader: (mealId: string, updates: Partial<Meal>) => void;
  updateMealItemMacros: (mealId: string, itemInstanceId: string, targetValue: number, macroType: 'kcal' | 'protein' | 'carbs' | 'fat') => void;
  addSubstitutionToItem: (mealId: string, itemInstanceId: string, food: Food) => void;
  updateMealItemName: (mealId: string, itemInstanceId: string, name: string) => void;
  removeSubstitutionFromItem: (mealId: string, itemInstanceId: string, subIndex: number) => void;
  updateSubstitutionQuantity: (mealId: string, itemInstanceId: string, subIndex: number, newQuantity: number) => void;
}

export const useEditorState = create<EditorState>()((set, get) => ({
  meals: [],
  patientId: null,
  clinicalMode: true,
  viewMode: 'daily',
  nutritionalScore: null,
  validationIssues: [],
  goalMetadata: {},
  patientContext: null,

  setMeals: (meals) => set({ meals: normalizeMeals(meals) }),
  setPatientId: (id) => set({ patientId: id }),
  hydrateMeals: (meals) => set({ meals: normalizeMeals(meals) }),
  resetEditor: () => set({ meals: [], patientId: null, nutritionalScore: null, validationIssues: [] }),

  updateFoodQuantity: (mealId, itemInstanceId, newQuantity) => {
    const { meals } = get();
    const updatedMeals = meals.map(meal => {
      if (meal.id !== mealId) return meal;

      const updatedItems = meal.items.map(item => {
        if (item.instanceId !== itemInstanceId) return item;

        const oldQty = item.clinical_mass_g || item.quantity || 100;
        // 🛡️ Defense in Depth: Limitar quantidade entre MIN e MAX
        const safeNewQty = Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.round(newQuantity)));

        const subsWithOriginalQty = (item.substitutions || []).map((sub: any) => ({
          ...sub,
          _originalMassG: sub.clinical_mass_g || sub.portionValue || oldQty,
        }));

        const updatedSubs = adjustSubstitutionsProportionally(
          subsWithOriginalQty as any,
          oldQty,
          safeNewQty
        ).map((sub: any) => {
          const subOriginalMassG = sub._originalMassG || oldQty;
          return {
            ...sub,
            _originalMassG: undefined,
            quantity_display: preservedQuantityDisplay(sub, subOriginalMassG, sub.clinical_mass_g),
          };
        });

        const newMacros = calculateItemMacros(item, safeNewQty);

        return {
          ...item,
          quantity: safeNewQty,
          clinical_mass_g: safeNewQty,
          quantity_display: preservedQuantityDisplay(item, oldQty, safeNewQty),
          substitutions: updatedSubs,
          ...newMacros
        };
      });

      return { ...meal, items: updatedItems };
    });

    set({ meals: updatedMeals });
  },

  updateFoodQuantityGlobal: (itemInstanceId, newQuantity) => {
    const { meals } = get();
    let targetFoodId: string | null = null;
    let targetFoodName: string | null = null;

    for (const meal of meals) {
      const item = meal.items.find(i => i.instanceId === itemInstanceId);
      if (item) {
        targetFoodId = (item as any).id || (item as any).food_id;
        targetFoodName = item.name;
        break;
      }
    }

    if (!targetFoodId && !targetFoodName) return;

    const updatedMeals = meals.map(meal => {
      const updatedItems = meal.items.map(item => {
        const itemFoodId = (item as any).id || (item as any).food_id;
        const isMatch = (targetFoodId && itemFoodId === targetFoodId) || 
                       (targetFoodName && item.name === targetFoodName);

        if (!isMatch) return item;

        const oldQty = item.clinical_mass_g || item.quantity || 100;
        // 🛡️ Defense in Depth: Limitar quantidade entre MIN e MAX
        const safeNewQty = Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.round(newQuantity)));

        const subsWithOriginalQtyG = (item.substitutions || []).map((sub: any) => ({
          ...sub,
          _originalMassG: sub.clinical_mass_g || sub.portionValue || oldQty,
        }));

        const updatedSubs = adjustSubstitutionsProportionally(
          subsWithOriginalQtyG as any,
          oldQty,
          safeNewQty
        ).map((sub: any) => {
          const origMass = sub._originalMassG || oldQty;
          return {
            ...sub,
            _originalMassG: undefined,
            quantity_display: preservedQuantityDisplay(sub, origMass, sub.clinical_mass_g),
          };
        });

        const newMacros = calculateItemMacros(item, safeNewQty);

        return {
          ...item,
          quantity: safeNewQty,
          clinical_mass_g: safeNewQty,
          quantity_display: preservedQuantityDisplay(item, oldQty, safeNewQty),
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
      
      const quantity = Math.max(1, Math.round(food.clinical_mass_g || food.quantity || food.portionValue || 100));
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
        const newQuantity = Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.round(scaleItemToTarget(item, targetValue, macroType))));

        const updatedSubs = adjustSubstitutionsProportionally(
          (item.substitutions || []) as any,
          oldQty,
          newQuantity
        ).map((sub: any) => ({
          ...sub,
          quantity_display: preservedQuantityDisplay(sub, oldQty, sub.clinical_mass_g),
        }));

        const newMacros = calculateItemMacros(item, newQuantity);

        return {
          ...item,
          quantity: newQuantity,
          clinical_mass_g: newQuantity,
          quantity_display: preservedQuantityDisplay(item, oldQty, newQuantity),
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

        const primaryKcal = item.kcal || 0;
        const primaryQuantity = item.clinical_mass_g || item.quantity || 100;
        
        let subKcalPer100g = food.kcal_100g || 0;
        if (!subKcalPer100g && food.kcal) {
          const foodQuantity = food.clinical_mass_g || food.quantity || food.portionValue || 100;
          subKcalPer100g = (food.kcal / foodQuantity) * 100;
        }

        let substituteQuantity: number;
        if (primaryKcal > 0 && subKcalPer100g > 0) {
          substituteQuantity = Math.max(1, Math.round((primaryKcal / subKcalPer100g) * 100));
        } else {
          substituteQuantity = primaryQuantity;
        }

        substituteQuantity = Math.min(MAX_QUANTITY, Math.max(1, Math.round(substituteQuantity)));

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
  },

  updateSubstitutionQuantity: (mealId, itemInstanceId, subIndex, newQuantity) => {
    const { meals } = get();
    const updatedMeals = meals.map(meal => {
      if (meal.id !== mealId) return meal;
      return {
        ...meal,
        items: meal.items.map(item => {
          if (item.instanceId !== itemInstanceId || !item.substitutions) return item;
          
          const newSubs = [...item.substitutions];
          const sub = newSubs[subIndex];
          if (!sub) return item;

          const safeNewQty = Math.min(MAX_QUANTITY, Math.max(1, Math.round(newQuantity)));
          const oldQty = sub.clinical_mass_g || sub.quantity || sub.portionValue || 100;
          
          const newMacros = calculateItemMacros(sub, safeNewQty);
          
          newSubs[subIndex] = {
            ...sub,
            quantity: safeNewQty,
            clinical_mass_g: safeNewQty,
            quantity_display: preservedQuantityDisplay(sub, oldQty, safeNewQty),
            ...newMacros
          };

          return { ...item, substitutions: newSubs };
        })
      };
    });
    set({ meals: updatedMeals });
  }
}));
