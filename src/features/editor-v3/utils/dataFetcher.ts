import { supabase } from "@/integrations/supabase/client";
import { Food, MealTemplate } from "../types";

export const searchFoods = async (query: string): Promise<Food[]> => {
  if (!query || query.length < 2) return [];

  const { data, error } = await supabase
    .from("food_database")
    .select("*")
    .ilike("name", `%${query}%`)
    .limit(20);

  if (error) {
    console.error("Error searching foods:", error);
    return [];
  }

  return (data || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    kcal: f.calories,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    portionValue: 1, // Base value for gram/ml
    portionUnitLabel: f.serving_size?.includes("g") ? "g" : (f.serving_size?.includes("ml") ? "ml" : "unidade"),
    portionUnit: f.serving_size?.includes("g") ? "g" : (f.serving_size?.includes("ml") ? "ml" : "unidade"),
    portionLabel: f.serving_size || "100g",
    measurementType: f.serving_size?.includes("g") ? "gram" : (f.serving_size?.includes("ml") ? "ml" : "unit"),
    imageUrl: undefined
  }));
};

export const searchMarmitas = async (nutritionistId: string | null): Promise<Food[]> => {
  if (!nutritionistId) return [];

  const { data, error } = await supabase
    .from("meal_recipes")
    .select("*")
    .eq("nutritionist_id", nutritionistId)
    .eq("is_active", true);

  if (error) {
    console.error("Error searching marmitas:", error);
    return [];
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    kcal: r.fixed_calories || 0,
    calories: r.fixed_calories || 0,
    protein: r.fixed_protein || 0,
    carbs: r.fixed_carbs || 0,
    fat: r.fixed_fat || 0,
    portionValue: 1,
    portionUnitLabel: "marmita",
    portionUnit: "marmita",
    portionLabel: "1 marmita",
    measurementType: "unit",
    isMarmita: true,
    locked: false, // Permite editar marmitas agora
    imageUrl: r.image_url || undefined,
    ingredients: r.foods_json || [],
    instructions: r.instructions || ""
  }));
};

export const searchTemplates = async (): Promise<MealTemplate[]> => {
  const { data, error } = await supabase
    .from("nutritionist_meal_templates")
    .select("*")
    .order("name")
    .limit(20);

  if (error) {
    console.error("Error searching templates:", error);
    return [];
  }

  return (data || []).map((t: any) => {
    const foods = Array.isArray(t.foods_structure) ? t.foods_structure : [];
    
    return {
      id: t.id,
      name: t.name,
      description: t.goal_tags ? t.goal_tags.join(", ") : (t.meal_type || ""),
      items: foods.map((f: any) => ({
        id: Math.random().toString(36).substring(2, 9),
        name: f.name,
        kcal: f.kcal || 0,
        calories: f.kcal || 0,
        protein: f.protein || 0,
        carbs: f.carbs || 0,
        fat: f.fat || 0,
        portionValue: 1,
        portionUnitLabel: f.portion?.includes("g") ? "g" : (f.portion?.includes("ml") ? "ml" : "unidade"),
        portionUnit: f.portion?.includes("g") ? "g" : (f.portion?.includes("ml") ? "ml" : "unidade"),
        portionLabel: f.portion || "100g",
        measurementType: f.portion?.includes("g") ? "gram" : (f.portion?.includes("ml") ? "ml" : "unit")
      }))
    };
  });
};
export const getFoodMacrosByName = async (names: string[]): Promise<Record<string, { kcal: number, protein: number, carbs: number, fat: number }>> => {
  if (!names.length) return {};
  
  const { data, error } = await supabase
    .from("food_database")
    .select("name, calories, protein, carbs, fat")
    .in("name", names);

  if (error) {
    console.error("Error fetching food macros:", error);
    return {};
  }

  const result: Record<string, any> = {};
  data?.forEach(f => {
    result[f.name.toLowerCase()] = {
      kcal: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat
    };
  });
  return result;
};

export const getCompatibleFoods = async (category: 'protein' | 'carb' | 'fruit' | 'any', currentName: string): Promise<Food[]> => {
  let query = supabase.from("food_database").select("*");
  
  if (category === 'protein') {
    query = query.or('name.ilike.%frango%,name.ilike.%carne%,name.ilike.%peixe%,name.ilike.%ovo%,name.ilike.%whey%,name.ilike.%patinho%,name.ilike.%queijo%');
  } else if (category === 'carb') {
    query = query.or('name.ilike.%arroz%,name.ilike.%batata%,name.ilike.%macarrão%,name.ilike.%feijão%,name.ilike.%pão%,name.ilike.%aveia%,name.ilike.%tapioca%');
  } else if (category === 'fruit') {
    query = query.or('name.ilike.%banana%,name.ilike.%maçã%,name.ilike.%uva%,name.ilike.%laranja%,name.ilike.%mamão%,name.ilike.%abacaxi%');
  }

  const { data, error } = await query.neq('name', currentName).limit(15);

  if (error) {
    console.error("Error fetching compatible foods:", error);
    return [];
  }

  return (data || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    kcal: f.calories,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    portionValue: 1,
    portionUnitLabel: f.serving_size?.includes("g") ? "g" : (f.serving_size?.includes("ml") ? "ml" : "unidade"),
    portionUnit: f.serving_size?.includes("g") ? "g" : (f.serving_size?.includes("ml") ? "ml" : "unidade"),
    portionLabel: f.serving_size || "100g",
    measurementType: f.serving_size?.includes("g") ? "gram" : (f.serving_size?.includes("ml") ? "ml" : "unit"),
  }));
};

export const getBaseFoods = async (): Promise<Food[]> => {
  const commonKeywords = [
    'Arroz', 'Feijão', 'Frango', 'Ovo', 'Pão', 'Banana', 'Maçã', 
    'Batata', 'Macarrão', 'Carne', 'Peixe', 'Patinho', 'Whey', 
    'Iogurte', 'Queijo', 'Aveia', 'Tapioca', 'Alface', 'Tomate', 
    'Brócolis', 'Cenoura', 'Azeite', 'Castanha', 'Amendoim'
  ];
  
  const { data, error } = await supabase
    .from("food_database")
    .select("*")
    .or(commonKeywords.map(k => `name.ilike.%${k}%`).join(','))
    .limit(100);

  if (error) {
    console.error("Error fetching base foods:", error);
    return [];
  }

  return (data || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    kcal: f.calories,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    portionValue: 1,
    portionUnitLabel: f.serving_size?.includes("g") ? "g" : (f.serving_size?.includes("ml") ? "ml" : "unidade"),
    portionUnit: f.serving_size?.includes("g") ? "g" : (f.serving_size?.includes("ml") ? "ml" : "unidade"),
    portionLabel: f.serving_size || "100g",
    measurementType: f.serving_size?.includes("g") ? "gram" : (f.serving_size?.includes("ml") ? "ml" : "unit"),
  }));
};