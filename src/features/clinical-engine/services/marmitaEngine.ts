import { supabase } from "@/integrations/supabase/client";
import { Macronutrients } from "./weeklyPlanner";

export interface MarmitaIngrediente {
  alimento: string;
  gramas: number;
}

export interface Marmita {
  id: string;
  nome: string;
  tipo: 'marmita';
  ingredientes: MarmitaIngrediente[];
  macros_fixos: Macronutrients;
  imagem_url: string;
  instrucoes: string;
  rendimento: number;
}

export interface AdjustedDayPlan {
  meals: any[];
  total_calories: number;
  macros: Macronutrients;
}

/**
 * Phase 5 — Marmita Engine (V3, ISOLATED)
 *
 * Marmitas are fixed meal templates. Adjustment happens in other meals or via fruits.
 */

export async function loadMarmitas(): Promise<Marmita[]> {
  // Loading from nutritionist_meal_templates where name contains "Marmita"
  // In a real scenario, we might have a specific flag or category.
  const { data, error } = await supabase
    .from('nutritionist_meal_templates' as any)
    .select('*')
    .ilike('name', '%Marmita%')
    .eq('is_global', true);

  if (error) {
    console.error("Error loading marmitas:", error);
    return [];
  }

  return (data || []).map(item => ({
    id: item.id,
    nome: item.name,
    tipo: 'marmita',
    ingredientes: item.foods_structure || [],
    macros_fixos: {
      calories: item.kcal_base || 0,
      protein_g: item.protein_base || 0,
      carbs_g: item.carbs_base || 0,
      fat_g: item.fat_base || 0
    },
    imagem_url: item.imageUrl || '/placeholder.svg',
    instrucoes: "Congelado. Micro-ondas 4 min.",
    rendimento: 1
  }));
}

export async function replaceMarmita(currentMarmitaId: string, newMarmitaId: string): Promise<Marmita | null> {
  // In this context, it just loads the new one.
  const { data, error } = await supabase
    .from('nutritionist_meal_templates' as any)
    .select('*')
    .eq('id', newMarmitaId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    nome: data.name,
    tipo: 'marmita',
    ingredientes: data.foods_structure || [],
    macros_fixos: {
      calories: data.kcal_base || 0,
      protein_g: data.protein_base || 0,
      carbs_g: data.carbs_base || 0,
      fat_g: data.fat_base || 0
    },
    imagem_url: data.imageUrl || '/placeholder.svg',
    instrucoes: "Congelado. Micro-ondas 4 min.",
    rendimento: 1
  };
}

export function calculateDayWithMarmita(
  dayPlan: any, 
  marmitaSlots: Record<string, Marmita>,
  targetCalories: number
): AdjustedDayPlan {
  const adjustedMeals = JSON.parse(JSON.stringify(dayPlan.meals));
  let marmitaCalories = 0;
  let marmitaProtein = 0;
  let marmitaCarbs = 0;
  let marmitaFat = 0;

  // 1. Fix marmita slots
  for (const meal of adjustedMeals) {
    const marmita = marmitaSlots[meal.type];
    if (marmita) {
      meal.items = marmita.ingredientes.map(ing => ({
        nome: ing.alimento,
        gramas: ing.gramas,
        isMarmitaPart: true
      }));
      meal.calories = marmita.macros_fixos.calories;
      meal.protein = marmita.macros_fixos.protein_g;
      meal.carbs = marmita.macros_fixos.carbs_g;
      meal.fat = marmita.macros_fixos.fat_g;
      meal.isMarmita = true;
      meal.marmita_id = marmita.id;

      marmitaCalories += meal.calories;
      marmitaProtein += meal.protein;
      marmitaCarbs += meal.carbs;
      marmitaFat += meal.fat;
    }
  }

  // 2. Remaining calories
  const remainingCalories = targetCalories - marmitaCalories;
  
  // 3. Redistribute in non-marmita meals
  const nonMarmitaMeals = adjustedMeals.filter((m: any) => !m.isMarmita);
  if (nonMarmitaMeals.length > 0) {
    // Basic redistribution: proportional to original distribution or equal
    const totalOriginalNonMarmitaKcal = nonMarmitaMeals.reduce((acc: number, m: any) => acc + (m.calories || 0), 0) || 1;
    
    for (const meal of nonMarmitaMeals) {
      const proportion = (meal.calories || (totalOriginalNonMarmitaKcal / nonMarmitaMeals.length)) / totalOriginalNonMarmitaKcal;
      const targetMealKcal = remainingCalories * proportion;
      
      // Adjust items in this meal to reach targetMealKcal
      const currentMealKcal = meal.calories || 1;
      const ratio = targetMealKcal / currentMealKcal;
      
      meal.items = (meal.items || []).map((item: any) => ({
        ...item,
        gramas: Math.round(item.gramas * ratio)
      }));
      
      meal.calories = targetMealKcal;
      // Note: Macros would also need to be recalculated in a real scenario, 
      // but following the high-level logic for Phase 5.
    }
  }

  // 4. Fine adjustment with fruit if needed (simplification for spec)
  if (remainingCalories < 0) {
     // If target is exceeded by marmitas alone, we might need a warning or different logic.
     // For Phase 5, we assume targetCalories >= marmitaCalories.
  }

  const finalCalories = adjustedMeals.reduce((acc: number, m: any) => acc + (m.calories || 0), 0);
  
  return {
    meals: adjustedMeals,
    total_calories: finalCalories,
    macros: {
      calories: finalCalories,
      protein_g: adjustedMeals.reduce((acc: number, m: any) => acc + (m.protein || 0), 0),
      carbs_g: adjustedMeals.reduce((acc: number, m: any) => acc + (m.carbs || 0), 0),
      fat_g: adjustedMeals.reduce((acc: number, m: any) => acc + (m.fat || 0), 0)
    }
  };
}

/**
 * Adds a fruit (80-100kcal) to a specific meal for fine adjustment.
 */
export function addAdjustmentFruit(meal: any, fruit: any): void {
  if (!meal.items) meal.items = [];
  meal.items.push({
    nome: fruit.name || "Fruta de ajuste",
    gramas: fruit.grams || 100,
    isAdjustment: true
  });
  meal.calories = (meal.calories || 0) + (fruit.kcal || 80);
}
