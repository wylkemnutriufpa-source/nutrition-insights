import { FoodItem, Meal } from '../types';
import { MARMITAS, BREAKFAST_ITEMS, SNACK_OPTIONS } from '../data/database';

export class MealBuilder {
  static getFood(id: string): FoodItem {
    const all = [...MARMITAS, ...BREAKFAST_ITEMS];
    const food = all.find(f => f.id === id);
    if (!food) throw new Error(`Food not found: ${id}`);
    return food;
  }

  static calculateMacros(items: { foodId: string; quantity: number }[]) {
    return items.reduce((acc, item) => {
      const food = this.getFood(item.foodId);
      // Se for marmita (category), a quantidade é unitária (vezes o macro total da marmita)
      // Se for item comum, a quantidade é em gramas (food macros são por servingSize)
      const factor = food.category === 'marmita' ? item.quantity : item.quantity / food.servingSize;
      
      return {
        calories: acc.calories + (food.calories * factor),
        protein: acc.protein + (food.protein * factor),
        carbs: acc.carbs + (food.carbs * factor),
        fat: acc.fat + (food.fat * factor),
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }

  static createFromTemplateMeal(mealData: Omit<Meal, 'id'>): Meal {
    return {
      ...mealData,
      id: Math.random().toString(36).substring(2, 11),
      totalMacros: this.calculateMacros(mealData.items)
    };
  }

  static createMarmitaMeal(type: 'lunch' | 'dinner', targetCalories: number): Meal {
    const marmita = MARMITAS[Math.floor(Math.random() * MARMITAS.length)];
    return this.createFromTemplateMeal({
      name: marmita.name,
      type,
      items: [{ foodId: marmita.id, quantity: 1 }],
      totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 }
    });
  }

  static createBreakfast(targetCalories: number): Meal {
    return this.createFromTemplateMeal({
      name: 'Café da Manhã Balanceado',
      type: 'breakfast',
      items: [
        { foodId: 'p1', quantity: 50 },
        { foodId: 'o1', quantity: 100 },
        { foodId: 'b1', quantity: 90 },
      ],
      totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 }
    });
  }

  static createSnack(type: 'snack1' | 'snack2', targetCalories: number): Meal {
    const option = SNACK_OPTIONS[0]; 
    return this.createFromTemplateMeal({
      name: option.name,
      type,
      items: option.items.map(id => ({ foodId: id, quantity: 1 })),
      totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 }
    });
  }
}
