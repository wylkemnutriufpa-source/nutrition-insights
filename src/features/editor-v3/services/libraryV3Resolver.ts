
import { supabase } from "@/integrations/supabase/client";
import { Meal, MealItem, TemplateStyleContract } from "../types";
import { clampScaleFactor, clampItemGrams, clampItemKcal } from "@/lib/macroSafety";
import {
  isFoodAllowedInSlot,
  isFreePortionFood,
  FREE_PORTION_MAX_GRAMS,
} from "@/lib/mealTypeIntegrity";
import { getFoodGroup } from "@/lib/substitutionGroups";
import { calculateHumanMealScore } from "@/lib/clinicalHumanEngine";
import { getStyleContract } from "@/lib/templateStyles";

export interface LibraryV3Item {
  id: string;
  slug: string;
  title: string;
  meal_type: string[];
  category: string;
  cluster_slug?: string; // NOVO
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
    context: { goal: string; planId: string; day: string; mealSlot: string; integrityThreshold?: number }
  ): Promise<Meal | null> {
    console.log(`[LibraryV3Resolver] Resolving structure for cluster: ${clusterSlug} (Target: ${targetKcal}kcal)`);

    const threshold = context.integrityThreshold || 1.5; // Limite padrão de expansão de porção

    // 1. Busca itens candidatos no cluster
    const slotToType: Record<string, string> = {
      'cafe_da_manha': 'breakfast',
      'lanche_da_manha': 'snack',
      'almoço': 'lunch',
      'lanche_da_tarde': 'snack',
      'jantar': 'dinner',
      'ceia': 'supper',
      'evening_snack': 'supper'
    };

    const libMealType = slotToType[context.mealSlot.toLowerCase()] || context.mealSlot.toLowerCase();

    const query = supabase
      .from('v3_library_items')
      .select(`
        *,
        images:v3_library_images(*)
      `)
      .eq('active', true);

    if (clusterSlug) {
      query.eq('cluster_slug', clusterSlug);
    } else {
      query.contains('meal_type', [libMealType]);
      query.contains('objective_tags', [context.goal]);
    }

    const { data: items, error } = await query as { data: LibraryV3Item[] | null, error: any };

    if (error || !items || items.length === 0) {
      console.warn('[LibraryV3Resolver] No library items found for cluster/context');
      return null;
    }

    // 2. Filtro de Integridade Clínica (Scaling Humano)
    // Filtramos itens onde o scaling factor estaria dentro do threshold
    let candidates = items.filter(item => {
      const scale = targetKcal / (item.kcal_base || 400);
      return scale >= 0.5 && scale <= threshold;
    });

    // Se nenhum item servir, pegamos o que tiver o kcal_base mais próximo
    if (candidates.length === 0) {
      console.info('[LibraryV3Resolver] No item within threshold. Picking closest kcal_base.');
      candidates = [...items].sort((a, b) => 
        Math.abs(targetKcal - (a.kcal_base || 400)) - Math.abs(targetKcal - (b.kcal_base || 400))
      ).slice(0, 3);
    }

    // 3. Escolha determinística da refeição
    const seed = `${context.planId}-${context.day}-${context.mealSlot}`;
    const hash = this.generateHash(seed);
    const baseItem = candidates[hash % candidates.length];

    // 4. Cálculo do fator de escala dinâmico (Soberano)
    const kcalBase = baseItem.kcal_base || 400;
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

    const scaledItems: MealItem[] = composition
      .map((comp: any) => {
        const compName = String(comp.name || "");
        // 🛡️ MEAL_TYPE_GUARD: bloqueia item proibido para o slot (telemetria + descarta).
        if (
          !isFoodAllowedInSlot(compName, getFoodGroup(compName), context.mealSlot, {
            source: "libraryV3Resolver.scaledItems",
            correlationId: context.planId,
          })
        ) {
          return null;
        }

        // 🛡️ FREE_PORTION_GUARD: vegetais não escalam — porção fixa, sem inflar.
        const isFree = isFreePortionFood(compName, getFoodGroup(compName));
        const baseGrams = comp.base_grams || 100;
        const rawQty = isFree
          ? Math.min(baseGrams, FREE_PORTION_MAX_GRAMS)
          : Math.round(baseGrams * safeScale);
        const quantity = clampItemGrams(rawQty);
        const macroScale = isFree ? quantity / (baseGrams || 100) : safeScale;

        const instanceId = crypto.randomUUID();
        return {
          id: baseItem.id,
          instanceId: instanceId,
          blockId: instanceId, // 🛡️ SOBERANIA: Cada componente é seu próprio bloco primário
          substitution_group_id: instanceId,
          name: comp.name,
          kcal: clampItemKcal(Math.round(comp.kcal * macroScale)),
          protein: Math.round(comp.protein * macroScale * 10) / 10,
          carbs: Math.round(comp.carbs * macroScale * 10) / 10,
          fat: Math.round(comp.fats * macroScale * 10) / 10,
          quantity,
          clinical_mass_g: quantity,
          measurementType: 'gram',
          portionValue: 100,
          portionLabel: 'g',
          portionUnitLabel: 'g',
          is_primary: true, // 🛡️ REFEIÇÃO GERADA É SEMPRE PRIMÁRIA INICIALMENTE
          isVisualLibraryItem: true,
          portionMode: isFree ? 'free' : baseItem.portion_mode,
          library_item_slug: baseItem.slug,
          isVisualLibraryParent: comp === composition[0], 
          substitutions: []
        } as any;
      })
      .filter(Boolean) as MealItem[];

    // 🛡️ HUMAN_SCORE_GUARD: Rejeita refeições que não parecem humanas.
    const humanResult = calculateHumanMealScore({ items: scaledItems }, context.mealSlot);
    
    // Log de Telemetria Clínica (Rejeições)
    if (humanResult.status === 'absurd') {
      console.warn(`[LibraryV3Resolver] REJECTED ABSURD MEAL: ${baseItem.title}`, humanResult.reasons);
      
      await (supabase.from('clinical_telemetry') as any).insert({
        event_type: 'meal_rejected',
        meal_slot: context.mealSlot,
        content: { title: baseItem.title, items: scaledItems },
        reasons: humanResult.reasons,
        human_score: humanResult.score
      });

      return null;
    }

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

