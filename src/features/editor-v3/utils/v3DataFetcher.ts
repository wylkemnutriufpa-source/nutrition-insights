
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

  // If no specific query but mealSlot provided, suggest items for that slot
  if (!query && mealSlot) {
    const normSlot = mealSlot.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const categoryMap: Record<string, string[]> = {
      "cafe": ["Café da Manhã"],
      "almoco": ["Almoço", "Jantar"],
      "jantar": ["Jantar", "Almoço"],
      "lanche": ["Lanche da Manhã", "Lanche da Tarde", "Pós-Treino", "Pré-Treino"],
      "ceia": ["Ceia", "Lanche da Tarde"]
    };

    let slotsToSearch: string[] = [];
    if (normSlot.includes("cafe")) slotsToSearch = categoryMap.cafe;
    else if (normSlot.includes("almoco")) slotsToSearch = categoryMap.almoco;
    else if (normSlot.includes("jantar")) slotsToSearch = categoryMap.jantar;
    else if (normSlot.includes("lanche")) slotsToSearch = categoryMap.lanche;
    else if (normSlot.includes("ceia")) slotsToSearch = categoryMap.ceia;
    else slotsToSearch = [mealSlot];

    queryBuilder = queryBuilder.overlaps("tipo_refeicao", slotsToSearch);
  }

  if (query && query.length >= 2) {
    queryBuilder = queryBuilder.or(`title.ilike.%${query}%,slug.ilike.%${query}%`);
  }

  const { data, error } = await queryBuilder.limit(50);

  if (error) {
    console.error("Error searching V3 Library:", error);
    return [];
  }

  const items = (data || []).map((item: any) => ({
    ...item,
    name: item.title || item.name || "Alimento", 
    kcal: item.kcal_base || item.kcal_100g || item.kcal || 0,
    protein: item.protein_base || item.protein_100g || item.protein || 0,
    carbs: item.carbs_base || item.carb_100g || item.carbs || 0,
    fat: item.fats_base || item.fat_100g || item.fat || 0
  }));
  
  // Parallel fetch for substitutes if items have groups
  const itemsWithEquivalents = await Promise.all(items.map(async (item: any) => {
    if (item.substitutions_group) {
      const { data: subs } = await supabase
        .from("v3_library_items")
        .select("*")
        .eq("substitutions_group", item.substitutions_group)
        .neq("id", item.id)
        .eq("active", true)
        .limit(12); // Fetch more substitutes
      
      const mappedSubs = (subs || []).map((s: any) => ({
        ...s,
        name: s.title || s.name || "Substituto",
        // Ensure substitutes are scaled correctly later
        kcal: s.kcal_base || s.kcal_100g || s.kcal || 0
      }));
      
      return { ...item, substitutions: mappedSubs }; 
    }
    return { ...item, substitutions: [] };
  }));

  return itemsWithEquivalents;
};


export const getV3Templates = async (): Promise<V3DietTemplate[]> => {
  return await DietTemplateService.listTemplates();
};
