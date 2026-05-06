import { supabase } from "@/integrations/supabase/client";

export interface ImageResult {
  url: string;
  source: 'exact' | 'similar' | 'fallback' | 'none';
}

export interface ImageRequest {
  food_name: string;
  category: 'proteina' | 'carboidrato' | 'gordura' | 'fruta' | 'legume' | 'outro';
}

const CATEGORY_FALLBACKS: Record<string, string> = {
  proteina: '/placeholders/protein-fallback.jpg',
  carboidrato: '/placeholders/carb-fallback.jpg',
  fruta: '/placeholders/fruit-fallback.jpg',
  legume: '/placeholders/vegetable-fallback.jpg',
  gordura: '/placeholders/fat-fallback.jpg',
  outro: '/placeholder.svg'
};

const norm = (t: string) =>
  (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/**
 * Phase 6 — Image Resolver (V3, ISOLATED)
 * 
 * Ensures every food suggested by the engine has a visual representation.
 */

export async function getFoodImage(foodName: string, category?: string): Promise<ImageResult> {
  const normalizedSearch = norm(foodName);
  
  // 1. Exact or very similar match in meal_visual_library
  const { data, error } = await supabase
    .from('meal_visual_library' as any)
    .select('image_url, name, display_name')
    .eq('is_active', true);

  if (!error && data) {
    const items = data as any[];
    
    // Exact match
    const exact = items.find(i => norm(i.display_name || i.name) === normalizedSearch);
    if (exact?.image_url) {
      return { url: exact.image_url, source: 'exact' };
    }

    // Similar match (contains)
    const similar = items.find(i => normalizedSearch.includes(norm(i.display_name || i.name)) || norm(i.display_name || i.name).includes(normalizedSearch));
    if (similar?.image_url) {
      return { url: similar.image_url, source: 'similar' };
    }
  }

  // 2. Fallback by category if allowed
  // Rules specify that Protein and Carbs ALWAYS need exact images, but we provide fallbacks for safer UI.
  const fallbackUrl = category ? CATEGORY_FALLBACKS[category.toLowerCase()] : CATEGORY_FALLBACKS.outro;
  
  return { 
    url: fallbackUrl || CATEGORY_FALLBACKS.outro, 
    source: fallbackUrl ? 'fallback' : 'none' 
  };
}

export function getCategoryFallbackImage(category: string): string {
  return CATEGORY_FALLBACKS[category.toLowerCase()] || CATEGORY_FALLBACKS.outro;
}

/**
 * Filters a list of foods, returning only those that have a valid image in the bank.
 * Used BEFORE plan generation to ensure visual integrity.
 */
export async function filterFoodsWithImages<T extends { name: string; id: string; imageUrl?: string }>(
  foods: T[],
  imageBank: Array<{ food_name: string; food_id?: string; image_url: string }>
): Promise<T[]> {
  const bankNames = new Set(imageBank.map(i => norm(i.food_name)));
  const bankIds = new Set(imageBank.map(i => i.food_id).filter(Boolean));

  return foods.filter(food => {
    if (food.imageUrl) return true;
    if (bankIds.has(food.id)) return true;
    if (bankNames.has(norm(food.name))) return true;
    return false;
  });
}

/**
 * Validates if a meal item has a valid image.
 */
export function validateMealImage(mealItem: { name: string; imageUrl?: string }): boolean {
  return !!mealItem.imageUrl && mealItem.imageUrl !== CATEGORY_FALLBACKS.outro;
}
