export interface MealVisualItem {
  id: string;
  slug: string;
  name: string;
  display_name: string;
  category: string;
  subcategory: string | null;
  image_url: string | null;
  image_path: string | null;
  gallery_images: string[];
  short_description: string | null;
  base_recipe: string | null;
  default_portion: string | null;
  default_calories: number | null;
  default_protein: number | null;
  default_carbs: number | null;
  default_fat: number | null;
  tags: string[];
  search_terms: string[];
  is_active: boolean;
  sort_order: number;
  tenant_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MealVisualAlias {
  id: string;
  library_item_id: string;
  alias: string;
  normalized_alias: string;
  created_at: string;
}

export const MEAL_VISUAL_CATEGORIES: Record<string, { label: string; emoji: string }> = {
  cafe_da_manha: { label: "Café da Manhã", emoji: "☕" },
  lanche: { label: "Lanche", emoji: "🍎" },
  almoco: { label: "Almoço", emoji: "🍽️" },
  jantar: { label: "Jantar", emoji: "🌙" },
  ceia: { label: "Ceia", emoji: "🫖" },
};
