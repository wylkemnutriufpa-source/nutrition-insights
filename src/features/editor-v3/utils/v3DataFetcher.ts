
import { supabase } from "@/integrations/supabase/client";
import { Food, MealTemplate, V3DietTemplate } from "../types/types";
import { DietTemplateService } from "../services/dietTemplateService";

export const searchV3LibraryItems = async (
  query: string,
  category?: string,
  mealSlot?: string
): Promise<any[]> => {
  let queryBuilder = supabase
    .from("v3_library_items")
    .select("*, images:v3_library_images(*)")
    .eq("active", true);

  if (category && category !== 'all') {
    queryBuilder = queryBuilder.eq("category", category);
  }

  if (mealSlot) {
    queryBuilder = queryBuilder.contains("tipo_refeicao", [mealSlot]);
  }

  if (query && query.length >= 2) {
    queryBuilder = queryBuilder.or(`title.ilike.%${query}%,slug.ilike.%${query}%`);
  }

  const { data, error } = await queryBuilder.limit(50);

  if (error) {
    console.error("Error searching V3 Library:", error);
    return [];
  }

  const items = (data || []).map(item => ({
    ...item,
    name: item.title || item.name, // Ensure 'name' is present (mapping 'title' from DB)
    kcal: item.kcal_base || item.kcal_100g || item.kcal || 0,
    protein: item.protein_base || item.protein_100g || item.protein || 0,
    carbs: item.carbs_base || item.carb_100g || item.carbs || 0,
    fat: item.fats_base || item.fat_100g || item.fat || 0
  }));
  
  // For each item, if it has a substitution_group, fetch others in that group
  const itemsWithEquivalents = await Promise.all(items.map(async (item) => {
    if (item.substitutions_group) {
      const { data: subs } = await supabase
        .from("v3_library_items")
        .select("*")
        .eq("substitutions_group", item.substitutions_group)
        .neq("id", item.id)
        .eq("active", true)
        .limit(10);
      
      const mappedSubs = (subs || []).map(s => ({
        ...s,
        name: s.title || s.name
      }));
      
      return { ...item, ingredients: mappedSubs }; 
    }
    return item;
  }));

  return itemsWithEquivalents;
};


export const getV3Templates = async (): Promise<V3DietTemplate[]> => {
  return await DietTemplateService.listTemplates();
};
