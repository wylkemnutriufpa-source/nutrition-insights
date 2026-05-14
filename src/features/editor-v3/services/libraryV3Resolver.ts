
import { supabase } from "@/integrations/supabase/client";

export interface LibraryV3Item {
  id: string;
  slug: string;
  title: string;
  meal_type: string[];
  category: string;
  objective_tags: string[];
  kcal_base: number;
  protein_base: number;
  carbs_base: number;
  fats_base: number;
  portion_mode: 'standard' | 'free';
  substitutions_group: string;
}

export interface ClusterV3 {
  cluster_slug: string;
  cluster_name: string;
  meal_type: string[];
  objective: string;
}

export class LibraryV3Resolver {
  /**
   * Escolhe refeições prontas baseadas no cluster e contexto
   */
  static async resolveMealItems(clusterSlug: string, context: any) {
    console.log(`[LibraryV3Resolver] Resolving cluster: ${clusterSlug}`);
    
    // Busca itens do cluster (via tags ou categoria vinculada ao cluster)
    const { data: items, error } = await supabase
      .from('v3_library_items')
      .select(`
        *,
        images:v3_library_images(*)
      `)
      .contains('objective_tags', [context.goal])
      .eq('active', true);

    if (error) {
      console.error('[LibraryV3Resolver] Error fetching library items:', error);
      return [];
    }

    return items;
  }

  /**
   * Resolve a imagem determinística baseada no hash do plano/dia/refeição
   */
  static resolveDeterministicImage(item: any, planId: string, day: string, mealSlot: string) {
    if (!item.images || item.images.length === 0) return null;
    if (item.images.length === 1) return item.images[0].image_asset;

    // Seed determinístico: string concatenada
    const seed = `${planId}-${day}-${mealSlot}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    const index = Math.abs(hash) % item.images.length;
    return item.images[index].image_asset;
  }

  /**
   * Busca substituições soberanas para um item
   */
  static async getSovereignSubstitutions(itemSlug: string) {
    const { data, error } = await supabase
      .from('v3_substitutions')
      .select(`
        target:v3_library_items!v3_substitutions_target_slug_fkey(*)
      `)
      .eq('source_slug', itemSlug)
      .eq('active', true)
      .order('score', { ascending: false });

    if (error) {
      console.error('[LibraryV3Resolver] Error fetching substitutions:', error);
      return [];
    }

    return data.map(s => s.target);
  }
}
