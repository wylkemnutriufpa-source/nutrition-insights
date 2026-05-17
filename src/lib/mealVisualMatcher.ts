import { supabase } from "@/integrations/supabase/client";

/**
 * Utility to match food titles with the real meal visual library.
 */
export async function getRealImageUrl(title: string): Promise<string | null> {
  if (!title) return null;

  const normalizedTitle = title.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  // Try to find a match in the library
  const { data } = await supabase
    .from("meal_visual_library" as any)
    .select("image_url, name, display_name")
    .or(`name.ilike.%${normalizedTitle}%,display_name.ilike.%${normalizedTitle}%`)
    .eq("is_active", true)
    .not("image_url", "is", null)
    .limit(1)
    .maybeSingle();

  return (data as any)?.image_url || null;
}

export const KNOWN_VISUAL_MAPPINGS: Record<string, string> = {
  "carne-assada-de-panela": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-assada-de-panela/carne-assada-de-panela.jpg",
  "frango-grelhado": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg",
  "bife-de-alcatra": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/bife-acebolado.jpg", // mapping to available
  "pao-frances": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-frances.jpg",
  "feijao-carioca": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/feijao-carioca.jpg",
  "arroz-branco": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-feijao-frango.png",
  "tapioca-com-queijo": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/tapioca-com-queijo.jpg",
  "banana-prata": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-canela.jpg",
};

export function getHardcodedImageUrl(title: string): string | null {
  const normalized = title.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '-');
  
  for (const [key, url] of Object.entries(KNOWN_VISUAL_MAPPINGS)) {
    if (normalized.includes(key)) return url;
  }
  return null;
}
