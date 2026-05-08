import { FoodItem, Meal, MacroType } from '../types';
import { MARMITAS, BREAKFAST_ITEMS, SNACK_OPTIONS } from '../data/database';

export class MealBuilder {
  static createMarmitaMeal(type: 'lunch' | 'dinner', targetCalories: number): Meal {
    // Pick a random marmita for now, or the best match
    const marmita = MARMITAS[Math.floor(Math.random() * MARMITAS.length)];
    
    // Add extra protein/carb if target is much higher, but rules say marmitas are fixas.
    // However, if the target is high, we might add a side.
    // For now, let's keep it simple as requested: 19 marmitas fixas.
    
    return {
      id: Math.random().toString(36).substr(2, 9),
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
    // Default combination: Pão + Ovos + Fruta
    const pão = BREAKFAST_ITEMS.find(i => i.id === 'p1')!;
    const ovos = BREAKFAST_ITEMS.find(i => i.id === 'o1')!;
    const fruta = BREAKFAST_ITEMS.find(i => i.id === 'b1')!;

    // Basic calculation for quantities based on targetCalories
    // This is where the "Motor" precision comes in.
    
    return {
      id: Math.random().toString(36).substr(2, 9),
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
    const option = SNACK_OPTIONS[0]; // Iogurte + Fruta
    const items = option.items.map(id => BREAKFAST_ITEMS.find(i => i.id === id)!);
    
    const calories = items.reduce((acc, i) => acc + i.calories, 0);
    const protein = items.reduce((acc, i) => acc + i.protein, 0);
    const carbs = items.reduce((acc, i) => acc + i.carbs, 0);
    const fat = items.reduce((acc, i) => acc + i.fat, 0);

    return {
      id: Math.random().toString(36).substr(2, 9),
      name: option.name,
      type,
      items: option.items.map(id => ({ foodId: id, quantity: 1 })),
      totalMacros: { calories, protein, carbs, fat }
    };
  }
}
