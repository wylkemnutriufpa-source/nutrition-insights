
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
    queryBuilder = queryBuilder.contains("meal_type", [mealSlot]);
  }

  if (query && query.length >= 2) {
    queryBuilder = queryBuilder.or(`title.ilike.%${query}%,slug.ilike.%${query}%`);
  }

  const { data, error } = await queryBuilder.limit(50);

  if (error) {
    console.error("Error searching V3 Library:", error);
    return [];
  }

  return data || [];
};

export const getV3Templates = async (): Promise<V3DietTemplate[]> => {
  return await DietTemplateService.listTemplates();
};
