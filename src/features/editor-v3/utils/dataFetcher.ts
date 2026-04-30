import { supabase } from "@/integrations/supabase/client";
import { Food } from "../types";
import { MealTemplate } from "../constants";

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
