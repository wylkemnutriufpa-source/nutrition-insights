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
  // --- TEMPLATES / IMAGENS REAIS DO BANCO ---
  "carne-assada-de-panela": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/carne-assada-de-panela/carne-assada-de-panela.jpg",
  "frango-grelhado": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg",
  "bife-de-alcatra": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/bife-acebolado.jpg",
  "bife-acebolado": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/bife-acebolado.jpg",
  "pao-frances": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-frances.jpg",
  "feijao-carioca": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/feijao-carioca.jpg",
  "arroz-branco": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-feijao-frango.png",
  "arroz-com-frango": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-com-frango.png",
  "tapioca-com-queijo": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/tapioca-com-queijo.jpg",
  "banana-prata": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-canela.jpg",
  "cuscuz-nordestino": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/cuscuz-com-ovo-2.jpg",
  "cuscuz-com-ovo": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/cuscuz-com-ovo.jpg",
  "batata-doce": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-com-batata-doce/frango-com-batata-doce.jpg",
  "peito-de-frango": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg",
  "ovo-mexido": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/ovos-mexidos.jpg",
  "ovo-cozido": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/ovos-cozidos.jpg",
  "omelete": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/omelete.jpg",
  "crepioca": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/crepioca/crepioca.jpg",
  "pao-de-queijo": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-de-queijo.jpg",
  "fruta": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/fruta.jpg",
  "banana": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-canela.jpg",
  "maca": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/maca/maca.jpg",
  "mamao": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/mamao/mamao.jpg",
  "iogurte": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-natural/iogurte-natural.jpg",
  "iogurte-natural": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-natural/iogurte-natural.jpg",
  "acem": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/acem/acem.jpg",
  "lombo-suino": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/lombo-suino/lombo-suino.jpg",
  "abacate": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/abacate.jpg",
  "abacaxi": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/abacaxi/abacaxi.jpg",
  "gelatina": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/gelatina.jpg",
  "caseina": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/caseina.jpg",
  "castanhas": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/castanhas.jpg",
  "torrada-integral": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/torrada-integral%2Ftorrada-integral.jpg",
  "sanduiche-natural": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/sanduiche-natural%2Fsanduiche-natural.jpg",
  "sopa-de-legumes": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/sopa-de-legumes%2Fsopa-de-legumes.jpg",
  "agua-de-coco": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/agua-de-coco.jpg",
  "farofa-de-ovo": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/farofa-de-ovo-com-cafe%2Ffarofa-de-ovo-com-cafe.jpg",
  "mandioca": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/mandioca-cozida.jpg",
  "macarrao": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/macarrao-integral.jpg",
  "queijo-branco": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/queijo-minas.jpg",
};

export function getHardcodedImageUrl(title: string): string | null {
  if (!title) return null;
  const normalized = title.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '-');
  
  // Try exact match first
  if (KNOWN_VISUAL_MAPPINGS[normalized]) return KNOWN_VISUAL_MAPPINGS[normalized];

  // Try partial match
  for (const [key, url] of Object.entries(KNOWN_VISUAL_MAPPINGS)) {
    if (normalized.includes(key) || key.includes(normalized)) return url;
  }
  return null;
}
