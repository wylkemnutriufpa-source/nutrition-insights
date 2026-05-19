import type { TablesInsert } from "@/integrations/supabase/types";

export type MealType = "breakfast" | "morning_snack" | "lunch" | "afternoon_snack" | "dinner" | "evening_snack";

export interface DraggedVisualLibraryItem {
  source: "visual_library";
  id: string;
  title?: string | null;
  name?: string | null;
  image_url?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  portion?: string | null;
}

export function parseDraggedVisualLibraryData(raw: string | null): DraggedVisualLibraryItem | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<DraggedVisualLibraryItem>;
    if (parsed.source !== "visual_library" || !parsed.id) return null;

    return {
      source: "visual_library",
      id: parsed.id,
      title: parsed.title ?? null,
      name: parsed.name ?? null,
      image_url: parsed.image_url ?? null,
      calories: parsed.calories ?? null,
      protein: parsed.protein ?? null,
      carbs: parsed.carbs ?? null,
      fat: parsed.fat ?? null,
      portion: parsed.portion ?? null,
    };
  } catch {
    return null;
  }
}

export function buildVisualLibraryMealInsert({
  planId,
  day,
  mealType,
  item,
}: {
  planId: string;
  day: number;
  mealType: MealType;
  item: DraggedVisualLibraryItem;
}): TablesInsert<"meal_plan_items"> {
  return {
    meal_plan_id: planId,
    title: item.title || item.name || "Sem título",
    description: item.portion || null,
    tipo_refeicao: mealType,
    day_of_week: day,
    meta_calorias: item.calories ?? null,
    meta_proteinas: item.protein ?? null,
    meta_carboidratos: item.carbs ?? null,
    meta_gorduras: item.fat ?? null,
    visual_library_item_id: item.id,
    image_url: item.image_url || null,
  };
}