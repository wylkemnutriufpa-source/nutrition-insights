
import { supabase } from "@/integrations/supabase/client";
import { Meal, MealItem } from "../types";
import { clampScaleFactor, clampItemGrams, clampItemKcal } from "@/lib/macroSafety";

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
  composition?: any; // JSONB da estrutura da refeição
}

export interface ClusterV3 {
  cluster_slug: string;
  cluster_name: string;
  meal_type: string[];
  objective: string;
}

export class LibraryV3Resolver {
  /**
   * Resolve uma estrutura de refeição completa da Biblioteca V3
   */
  static async resolveMealStructure(
    clusterSlug: string, 
    targetKcal: number, 
    context: { goal: string; planId: string; day: string; mealSlot: string }
  ): Promise<Meal | null> {
    console.log(`[LibraryV3Resolver] Resolving structure for cluster: ${clusterSlug} (Target: ${targetKcal}kcal)`);

    // 1. Busca itens candidatos no cluster
    const { data: items, error } = await supabase
      .from('v3_library_items')
      .select(`
        *,
        images:v3_library_images(*)
      `)
      .contains('meal_type', [context.mealSlot.toLowerCase()]) // Filtro estrito por tipo de refeição
      .contains('objective_tags', [context.goal])
      .eq('active', true);

    if (error || !items || items.length === 0) {
      console.warn('[LibraryV3Resolver] No library items found for cluster/context');
      return null;
    }

    // 2. Escolha determinística da refeição baseada no seed (planId + day + slot)
    const seed = `${context.planId}-${context.day}-${context.mealSlot}`;
    const hash = this.generateHash(seed);
    const baseItem = items[hash % items.length];

    // 3. Cálculo do fator de escala dinâmico (Soberano)
    const kcalBase = baseItem.kcal_base || 400; // Fallback seguro
    const rawScale = targetKcal / kcalBase;
    const safeScale = clampScaleFactor(rawScale);

    // 4. Resolução da imagem principal
    const imageUrl = this.resolveDeterministicImage(baseItem, context.planId, context.day, context.mealSlot);

    // 5. Construção dos itens da refeição (Escalados)
    // Se não houver composição explícita, criamos um item único baseado no título
    const composition = baseItem.composition || [{ 
      name: baseItem.title, 
      kcal: baseItem.kcal_base, 
      protein: baseItem.protein_base, 
      carbs: baseItem.carbs_base, 
      fats: baseItem.fats_base,
      base_grams: 100 
    }];

    const scaledItems: MealItem[] = composition.map((comp: any) => {
      const quantity = clampItemGrams(Math.round((comp.base_grams || 100) * safeScale));
      
      return {
        id: baseItem.id,
        instanceId: crypto.randomUUID(),
        name: comp.name,
        kcal: clampItemKcal(Math.round(comp.kcal * safeScale)),
        protein: Math.round(comp.protein * safeScale * 10) / 10,
        carbs: Math.round(comp.carbs * safeScale * 10) / 10,
        fat: Math.round(comp.fats * safeScale * 10) / 10,
        quantity,
        clinical_mass_g: quantity,
        measurementType: 'gram',
        portionValue: 100,
        portionLabel: 'g',
        portionUnitLabel: 'g',
        isVisualLibraryItem: true,
        library_item_slug: baseItem.slug,
        isVisualLibraryParent: comp === composition[0], // O primeiro item costuma ser o principal
        substitutions: []
      } as any;
    });

    // 6. Montagem da Refeição
    return {
      id: crypto.randomUUID(),
      name: baseItem.title,
      items: scaledItems,
      imageUrl: imageUrl || '',
      imageSource: 'auto',
      time: '00:00' // Será preenchido pelo distribuidor
    };
  }

  private static generateHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  static resolveDeterministicImage(item: any, planId: string, day: string, mealSlot: string) {
    if (!item.images || item.images.length === 0) return null;
    const seed = `${planId}-${day}-${mealSlot}`;
    const hash = this.generateHash(seed);
    const index = hash % item.images.length;
    return item.images[index].image_asset;
  }

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

