
import { Meal, MealItem, Food } from '../types';
import { isProtein, isCarb, isVegetable, isFat, calculateItemMacros, getFoodCategory } from '@/lib/nutricore_v2/helpers';
import { BASE_FOODS } from '@/lib/nutricore_v2/food-database';

export interface PlanAdjustmentParams {
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  removeCarbsIntensity: 'total' | 'parcial' | 'none';
  removeCarbsMeals: string[]; // ['Almoço', 'Jantar']
  removeBeansOption: 'total' | 'almoco' | 'jantar' | 'none';
}

export const adjustPlan = (meals: Meal[], params: PlanAdjustmentParams): Meal[] => {
  let newMeals = JSON.parse(JSON.stringify(meals)) as Meal[];

  // 1. Adjust Protein
  newMeals = scaleMacronutrient(newMeals, 'proteína', params.proteinTarget);

  // 2. Adjust Carbs (Baseline adjustment first)
  newMeals = scaleMacronutrient(newMeals, 'carboidrato', params.carbTarget);

  // 3. Adjust Fat
  newMeals = scaleMacronutrient(newMeals, 'gordura', params.fatTarget);

  // 4. Remove Beans
  if (params.removeBeansOption !== 'none') {
    newMeals = newMeals.map(meal => {
      const mealName = meal.name.toLowerCase();
      const shouldRemove = 
        params.removeBeansOption === 'total' || 
        (params.removeBeansOption === 'almoco' && mealName.includes('almoço')) ||
        (params.removeBeansOption === 'jantar' && mealName.includes('jantar'));

      if (shouldRemove) {
        return {
          ...meal,
          items: meal.items.filter(item => !item.name.toLowerCase().includes('feijão'))
        };
      }
      return meal;
    });
  }

  // 5. Remove Carbs Intensity
  if (params.removeCarbsIntensity !== 'none') {
    newMeals = newMeals.map(meal => {
      const isTargetMeal = params.removeCarbsMeals.includes(meal.name);
      if (!isTargetMeal) return meal;

      if (params.removeCarbsIntensity === 'total') {
        const removedCarbs = meal.items.filter(item => isCarb(item.name));
        const remainingItems = meal.items.filter(item => !isCarb(item.name));
        
        // If we removed carbs, we need to add substitutes to maintain calories roughly
        if (removedCarbs.length > 0) {
          const caloriesToReplace = removedCarbs.reduce((acc, item) => acc + (item.kcal || 0), 0);
          
          // Let's add standard substitutes: Brocolis (vegetable) and Azeite (fat)
          const veggieId = "14"; // Brócolis Cozido
          const fatId = "9"; // Azeite de Oliva
          
          const veggieFood = BASE_FOODS.find(f => f.id === veggieId);
          const fatFood = BASE_FOODS.find(f => f.id === fatId);
          
          const newItems = [...remainingItems];
          
          if (veggieFood) {
            // Add 150g of broccoli as standard volume replacement
            const quantity = 150;
            const macros = {
              kcal: Math.round((veggieFood.kcal_100g * quantity / 100)),
              protein: Math.round((veggieFood.protein_100g * quantity / 100)),
              carbs: Math.round((veggieFood.carb_100g * quantity / 100)),
              fat: Math.round((veggieFood.fat_100g * quantity / 100))
            };
            
            newItems.push({
              id: veggieFood.id,
              instanceId: Math.random().toString(36).substring(2, 10),
              name: veggieFood.name,
              kcal: macros.kcal,
              calories: macros.kcal,
              protein: macros.protein,
              carbs: macros.carbs,
              fat: macros.fat,
              quantity: quantity,
              measurementType: 'gram',
              portionValue: 100,
              portionLabel: '100g',
              portionUnitLabel: 'g',
              substitutions: []
            } as any);
          }
          
          if (fatFood) {
            // Replace remaining calories with fat (approx)
            const remainingKcal = caloriesToReplace - 50; // assuming brocolis took ~50kcal
            if (remainingKcal > 0) {
              const fatQuantity = Math.round((remainingKcal / fatFood.kcal_100g) * 100);
              const macros = {
                kcal: Math.round((fatFood.kcal_100g * fatQuantity / 100)),
                protein: Math.round((fatFood.protein_100g * fatQuantity / 100)),
                carbs: Math.round((fatFood.carb_100g * fatQuantity / 100)),
                fat: Math.round((fatFood.fat_100g * fatQuantity / 100))
              };
              
              newItems.push({
                id: fatFood.id,
                instanceId: Math.random().toString(36).substring(2, 10),
                name: fatFood.name,
                kcal: macros.kcal,
                calories: macros.kcal,
                protein: macros.protein,
                carbs: macros.carbs,
                fat: macros.fat,
                quantity: fatQuantity,
                measurementType: 'spoon',
                portionValue: 13,
                portionLabel: 'colher de sopa (13ml)',
                portionUnitLabel: 'colher',
                substitutions: []
              } as any);
            }
          }

          return {
            ...meal,
            items: newItems
          };
        }
      } else if (params.removeCarbsIntensity === 'parcial') {
        return {
          ...meal,
          items: meal.items.map(item => {
            if (isCarb(item.name)) {
              const newQuantity = Math.round(item.quantity * 0.5);
              const macros = calculateItemMacros(item, newQuantity);
              return {
                ...item,
                ...macros,
                quantity: newQuantity
              };
            }
            return item;
          })
        };
      }
      return meal;
    });
  }

  return newMeals;
};

const scaleMacronutrient = (meals: Meal[], category: string, targetTotal: number): Meal[] => {
  const currentTotal = meals.reduce((acc, meal) => {
    return acc + meal.items.reduce((mAcc, item) => {
      if (getFoodCategory(item) === category) {
        const macros = calculateItemMacros(item, item.quantity);
        return mAcc + (category === 'proteína' ? macros.protein : category === 'carboidrato' ? macros.carbs : macros.fat);
      }
      return mAcc;
    }, 0);
  }, 0);

  if (currentTotal === 0 || Math.abs(currentTotal - targetTotal) < 1) return meals;

  const scale = targetTotal / currentTotal;

  return meals.map(meal => ({
    ...meal,
    items: meal.items.map(item => {
      if (getFoodCategory(item) === category) {
        const newQuantity = Math.round(item.quantity * scale);
        const macros = calculateItemMacros(item, newQuantity);
        return {
          ...item,
          ...macros,
          quantity: newQuantity
        };
      }
      return item;
    })
  }));
};
