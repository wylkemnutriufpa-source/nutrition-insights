
import { supabase } from "@/integrations/supabase/client";

export type ProteinType = 'FRANGO' | 'CARNE' | 'PORCO';

const PROTEIN_IMAGE_MAP: Record<ProteinType, string> = {
  'FRANGO': 'db86423f-bf3a-4eb8-b660-1d2f2dc559f6', // Arroz com Frango
  'CARNE': '251548b1-05af-416f-8cfd-967ba4f42d9f', // Arroz com Carne
  'PORCO': 'a015d108-a1ad-4b84-85f0-310626246289', // Filé de Porco
};

const DEFAULT_IMAGE_URL = 'https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=800&auto=format&fit=crop'; // High quality fallback

/**
 * Classifica uma marmita pelo nome para determinar o tipo de proteína com SHIELDING.
 */
export function classifyMarmitaByProtein(name: string): ProteinType {
  if (!name) return 'FRANGO';
  
  const normalized = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  const frangoKeywords = ['frango', 'galinhada', 'franguinho', 'peito'];
  const porcoKeywords = ['pernil', 'suino', 'porco', 'lombo', 'bacon'];
  const carneKeywords = ['carne', 'patinho', 'bolonhesa', 'vaca', 'estrogonofe', 'moida', 'hamburguer'];

  if (frangoKeywords.some(k => normalized.includes(k))) return 'FRANGO';
  if (porcoKeywords.some(k => normalized.includes(k))) return 'PORCO';
  if (carneKeywords.some(k => normalized.includes(k))) return 'CARNE';
  
  return 'FRANGO'; // Default fallback (Never NULL)
}

/**
 * Retorna o ID da imagem na biblioteca visual com base no tipo de proteína.
 */
export function getVisualLibraryIdByProtein(protein: ProteinType): string {
  return PROTEIN_IMAGE_MAP[protein] || PROTEIN_IMAGE_MAP['FRANGO'];
}

/**
 * Garante que uma receita tenha protein_type e visual_library_item_id (SHIELDING).
 */
export async function ensureMarmitaVisualAssociation(recipeId: string, name: string) {
  if (!recipeId) return;

  const protein = classifyMarmitaByProtein(name);
  const visualId = getVisualLibraryIdByProtein(protein);

  const { error } = await supabase
    .from('meal_recipes')
    .update({ 
      protein_type: protein,
      visual_library_item_id: visualId 
    })
    .eq('id', recipeId);

  if (error) {
    console.error('SHIELDING ERROR: Failed to associate marmita image:', error);
  }
}

/**
 * Validação de integridade visual para marmitas (SHIELDING).
 */
export function validateMarmitaVisualIntegrity(marmita: { image_url?: string | null, protein_type?: string | null }): boolean {
  if (!marmita.image_url || marmita.image_url.length < 5) return false;
  if (!marmita.protein_type) return false;
  return true;
}

