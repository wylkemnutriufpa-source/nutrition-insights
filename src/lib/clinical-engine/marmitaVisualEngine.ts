
import { supabase } from "@/integrations/supabase/client";

export type ProteinType = 'FRANGO' | 'CARNE' | 'PORCO';

const PROTEIN_IMAGE_MAP: Record<ProteinType, string> = {
  'FRANGO': 'db86423f-bf3a-4eb8-b660-1d2f2dc559f6', // Arroz com Frango
  'CARNE': '251548b1-05af-416f-8cfd-967ba4f42d9f', // Arroz com Carne
  'PORCO': 'a015d108-a1ad-4b84-85f0-310626246289', // Filé de Porco
};

const DEFAULT_IMAGE_URL = '/images/marmitas/default.jpg';

/**
 * Classifica uma marmita pelo nome para determinar o tipo de proteína.
 */
export function classifyMarmitaByProtein(name: string): ProteinType {
  const normalized = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  const frangoKeywords = ['frango', 'galinhada'];
  const porcoKeywords = ['pernil', 'suino', 'porco'];
  // Carne é o padrão se não for frango ou porco, mas vamos ser específicos
  const carneKeywords = ['carne', 'patinho', 'bolonhesa', 'vaca', 'estrogonofe'];

  if (frangoKeywords.some(k => normalized.includes(k))) return 'FRANGO';
  if (porcoKeywords.some(k => normalized.includes(k))) return 'PORCO';
  if (carneKeywords.some(k => normalized.includes(k))) return 'CARNE';
  
  return 'FRANGO'; // Default fallback
}

/**
 * Retorna o ID da imagem na biblioteca visual com base no tipo de proteína.
 */
export function getVisualLibraryIdByProtein(protein: ProteinType): string {
  return PROTEIN_IMAGE_MAP[protein];
}

/**
 * Garante que uma receita tenha protein_type e visual_library_item_id.
 */
export async function ensureMarmitaVisualAssociation(recipeId: string, name: string) {
  const protein = classifyMarmitaByProtein(name);
  const visualId = getVisualLibraryIdByProtein(protein);

  const { error } = await supabase
    .from('meal_recipes')
    .update({ 
      protein_type: protein,
      visual_library_item_id: visualId 
    } as any)
    .eq('id', recipeId);

  if (error) {
    console.error('Error associating marmita image:', error);
  }
}
