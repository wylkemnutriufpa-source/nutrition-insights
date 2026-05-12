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
 */

export async function loadMarmitas(): Promise<Marmita[]> {
  const { data, error } = await supabase
    .from('nutritionist_meal_templates' as any)
    .select('*')
    .ilike('name', '%Marmita%')
    .eq('is_global', true)
    .not('imageUrl', 'is', null);

  if (error) {
    console.error("Error loading marmitas:", error);
    return [];
  }

  const items = (data || []) as any[];

  return items.map(item => ({
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
  const { data, error } = await supabase
    .from('nutritionist_meal_templates' as any)
    .select('*')
    .eq('id', newMarmitaId)
    .single();

  if (error || !data) return null;

  const item = data as any;

  return {
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

  const remainingCalories = Math.max(0, targetCalories - marmitaCalories);
  const nonMarmitaMeals = adjustedMeals.filter((m: any) => !m.isMarmita);
  
  if (nonMarmitaMeals.length > 0) {
    const totalOriginalNonMarmitaKcal = nonMarmitaMeals.reduce((acc: number, m: any) => acc + (m.calories || 0), 0) || 1;
    
    for (const meal of nonMarmitaMeals) {
      const proportion = (meal.calories || (totalOriginalNonMarmitaKcal / nonMarmitaMeals.length)) / totalOriginalNonMarmitaKcal;
      const targetMealKcal = remainingCalories * proportion;
      const currentMealKcal = meal.calories || 1;
      const ratio = targetMealKcal / currentMealKcal;
      
      meal.items = (meal.items || []).map((item: any) => ({
        ...item,
        gramas: Math.round((item.gramas || 100) * ratio)
      }));
      
      meal.calories = targetMealKcal;
    }
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

export function addAdjustmentFruit(meal: any, fruit: any): void {
  if (!meal.items) meal.items = [];
  meal.items.push({
    nome: fruit.name || "Fruta de ajuste",
    gramas: fruit.grams || 100,
    isAdjustment: true
  });
  meal.calories = (meal.calories || 0) + (fruit.kcal || 80);
}
