import { FoodItem, Meal } from '../types';
import { MARMITAS, BREAKFAST_ITEMS, SNACK_OPTIONS } from '../data/database';

export class MealBuilder {
  static createMarmitaMeal(type: 'lunch' | 'dinner', targetCalories: number): Meal {
    const marmita = MARMITAS[Math.floor(Math.random() * MARMITAS.length)];
    
    return {
      id: Math.random().toString(36).substring(2, 11),
      name: marmita.name,
      type,
      items: [{ foodId: marmita.id, quantity: 1 }],
      totalMacros: {
        calories: marmita.calories,
        protein: marmita.protein,
        carbs: marmita.carbs,
        fat: marmita.fat,
      }
    };
  }

  static createBreakfast(targetCalories: number): Meal {
    const pão = BREAKFAST_ITEMS.find(i => i.id === 'p1')!;
    const ovos = BREAKFAST_ITEMS.find(i => i.id === 'o1')!;
    const fruta = BREAKFAST_ITEMS.find(i => i.id === 'b1')!;

    return {
      id: Math.random().toString(36).substring(2, 11),
      name: 'Café da Manhã Balanceado',
      type: 'breakfast',
      items: [
        { foodId: pão.id, quantity: 50 },
        { foodId: ovos.id, quantity: 100 },
        { foodId: fruta.id, quantity: 90 },
      ],
      totalMacros: {
        calories: pão.calories + ovos.calories + fruta.calories,
        protein: pão.protein + ovos.protein + fruta.protein,
        carbs: pão.carbs + ovos.carbs + fruta.carbs,
        fat: pão.fat + ovos.fat + fruta.fat,
      }
    };
  }

  static createSnack(type: 'snack1' | 'snack2', targetCalories: number): Meal {
    const option = SNACK_OPTIONS[0]; 
    const items = option.items.map(id => BREAKFAST_ITEMS.find(i => i.id === id)!);
    
    const calories = items.reduce((acc, i) => acc + i.calories, 0);
    const protein = items.reduce((acc, i) => acc + i.protein, 0);
    const carbs = items.reduce((acc, i) => acc + i.carbs, 0);
    const fat = items.reduce((acc, i) => acc + i.fat, 0);

    return {
      id: Math.random().toString(36).substring(2, 11),
      name: option.name,
      type,
      items: option.items.map(id => ({ foodId: id, quantity: 1 })),
      totalMacros: { calories, protein, carbs, fat }
    };
  }
}
