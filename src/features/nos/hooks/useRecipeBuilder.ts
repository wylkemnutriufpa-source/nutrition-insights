/**
 * 🍳 useRecipeBuilder — Hook de criação/edição de receitas NOS
 *
 * Gerencia o estado local da receita em construção.
 * Macros calculados em tempo real via calcEngine (ZERO runtime no Patient App).
 * Salva em nos_recipes com snapshot de ingredientes CONGELADO.
 *
 * INVARIANTE: após save(), a receita é imutável.
 * Para editar → cria nova versão (version + 1, previous_version_id aponta para anterior).
 */

import { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenantContext';
import { calcMacros, calcRecipePerPortion, type NOSFoodBase } from '../engine/calcEngine';
import { toast } from 'sonner';

export interface RecipeIngredient {
  food_id: string;
  food_name: string;
  source: string;
  qty_g: number;
  kcal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  fiber_100g?: number;
  // Macros calculados para esta gramagem (congelados no snapshot)
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
}

export interface RecipeDraft {
  name: string;
  description: string;
  yield_g: number;
  portion_g: number;
  portion_label: string;
  instructions: string;
  prep_time_min: number;
  cook_time_min: number;
  tags: string[];
  is_public: boolean;
  ingredients: RecipeIngredient[];
}

const EMPTY_DRAFT: RecipeDraft = {
  name: '',
  description: '',
  yield_g: 100,
  portion_g: 100,
  portion_label: '',
  instructions: '',
  prep_time_min: 0,
  cook_time_min: 0,
  tags: [],
  is_public: false,
  ingredients: [],
};

export function useRecipeBuilder(existingRecipeId?: string) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [draft, setDraft] = useState<RecipeDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [existingVersion, setExistingVersion] = useState<number>(1);

  // Macros por porção calculados em tempo real via calcEngine (puro, sem Supabase)
  const portionMacros = useMemo(() => {
    return calcRecipePerPortion(
      draft.ingredients.map(ing => ({
        food_id: ing.food_id,
        food_name: ing.food_name,
        source: ing.source,
        qty_g: ing.qty_g,
        kcal_100g: ing.kcal_100g,
        protein_100g: ing.protein_100g,
        carbs_100g: ing.carbs_100g,
        fat_100g: ing.fat_100g,
        fiber_100g: ing.fiber_100g ?? 0,
        sodium_100g: 0,
      })),
      draft.yield_g,
      draft.portion_g
    );
  }, [draft.ingredients, draft.yield_g, draft.portion_g]);

  // Macros totais (rendimento completo)
  const totalMacros = useMemo(() => {
    return draft.ingredients.reduce(
      (acc, ing) => ({
        kcal:      acc.kcal      + ing.kcal,
        protein_g: acc.protein_g + ing.protein_g,
        carbs_g:   acc.carbs_g   + ing.carbs_g,
        fat_g:     acc.fat_g     + ing.fat_g,
        fiber_g:   acc.fiber_g   + (ing.fiber_g ?? 0),
        sodium_mg: acc.sodium_mg,
      }),
      { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sodium_mg: 0 }
    );
  }, [draft.ingredients]);

  const updateField = useCallback(<K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  }, []);

  const addIngredient = useCallback((food: {
    id: string; name: string; source: string;
    kcal_100g: number; protein_100g: number; carbs_100g: number;
    fat_100g: number; fiber_100g?: number; portion_g?: number;
  }, qty_g: number) => {
    const safeQty = Math.max(1, qty_g);
    const macros = calcMacros(
      { kcal_100g: food.kcal_100g, protein_100g: food.protein_100g,
        carbs_100g: food.carbs_100g, fat_100g: food.fat_100g,
        fiber_100g: food.fiber_100g ?? 0 },
      safeQty
    );

    const ingredient: RecipeIngredient = {
      food_id:     food.id,
      food_name:   food.name,
      source:      food.source,
      qty_g:       safeQty,
      kcal_100g:   food.kcal_100g,
      protein_100g: food.protein_100g,
      carbs_100g:  food.carbs_100g,
      fat_100g:    food.fat_100g,
      fiber_100g:  food.fiber_100g ?? 0,
      kcal:        macros.kcal,
      protein_g:   macros.protein_g,
      carbs_g:     macros.carbs_g,
      fat_g:       macros.fat_g,
      fiber_g:     macros.fiber_g,
    };

    setDraft(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, ingredient],
      // Atualiza yield_g automaticamente para soma dos ingredientes
      yield_g: prev.ingredients.reduce((s, i) => s + i.qty_g, 0) + safeQty,
    }));
  }, []);

  const updateIngredientQty = useCallback((foodId: string, newQty: number) => {
    setDraft(prev => {
      const safeQty = Math.max(1, newQty);
      const updated = prev.ingredients.map(ing => {
        if (ing.food_id !== foodId) return ing;
        const macros = calcMacros(
          { kcal_100g: ing.kcal_100g, protein_100g: ing.protein_100g,
            carbs_100g: ing.carbs_100g, fat_100g: ing.fat_100g,
            fiber_100g: ing.fiber_100g ?? 0 },
          safeQty
        );
        return { ...ing, qty_g: safeQty, kcal: macros.kcal,
          protein_g: macros.protein_g, carbs_g: macros.carbs_g,
          fat_g: macros.fat_g, fiber_g: macros.fiber_g };
      });
      return {
        ...prev,
        ingredients: updated,
        yield_g: updated.reduce((s, i) => s + i.qty_g, 0),
      };
    });
  }, []);

  const removeIngredient = useCallback((foodId: string) => {
    setDraft(prev => {
      const filtered = prev.ingredients.filter(i => i.food_id !== foodId);
      return { ...prev, ingredients: filtered,
        yield_g: filtered.reduce((s, i) => s + i.qty_g, 0) || 100 };
    });
  }, []);

  const resetDraft = useCallback(() => setDraft(EMPTY_DRAFT), []);

  const loadForEdit = useCallback(async (recipeId: string) => {
    const { data, error } = await supabase
      .from('nos_recipes' as any)
      .select('*')
      .eq('id', recipeId)
      .maybeSingle();
    if (error || !data) { toast.error('Receita não encontrada'); return; }
    const r = data as any;
    setDraft({
      name: r.name, description: r.description || '',
      yield_g: r.yield_g, portion_g: r.portion_g,
      portion_label: r.portion_label || '', instructions: r.instructions || '',
      prep_time_min: r.prep_time_min || 0, cook_time_min: r.cook_time_min || 0,
      tags: r.tags || [], is_public: r.is_public || false,
      ingredients: r.ingredients || [],
    });
    setExistingVersion(r.version || 1);
  }, []);

  /**
   * Salva a receita.
   * - Novo: insere com version=1
   * - Edição: insere nova versão (version+1) com previous_version_id
   * - NUNCA sobrescreve versão existente (imutabilidade do snapshot)
   */
  const save = useCallback(async (options?: { asNewVersion?: boolean; previousId?: string }): Promise<string | null> => {
    if (!user?.id) { toast.error('Usuário não autenticado'); return null; }
    if (!draft.name.trim()) { toast.error('Nome da receita é obrigatório'); return null; }
    if (draft.ingredients.length === 0) { toast.error('Adicione pelo menos 1 ingrediente'); return null; }

    setSaving(true);
    try {
      // Congelar snapshot de ingredientes com macros calculados
      const frozenIngredients = draft.ingredients.map(ing => ({
        food_id: ing.food_id,
        food_name: ing.food_name,
        source: ing.source,
        qty_g: ing.qty_g,
        kcal_100g: ing.kcal_100g,
        protein_100g: ing.protein_100g,
        carbs_100g: ing.carbs_100g,
        fat_100g: ing.fat_100g,
        fiber_100g: ing.fiber_100g ?? 0,
        // Macros calculados no momento de salvar (CONGELADOS)
        kcal: ing.kcal,
        protein_g: ing.protein_g,
        carbs_g: ing.carbs_g,
        fat_g: ing.fat_g,
      }));

      const newVersion = options?.asNewVersion ? existingVersion + 1 : 1;

      const payload: any = {
        nutritionist_id:  user.id,
        tenant_id:        tenantId,
        name:             draft.name.trim(),
        description:      draft.description || null,
        version:          newVersion,
        previous_version_id: options?.previousId ?? null,
        yield_g:          draft.yield_g,
        portion_g:        draft.portion_g,
        portion_label:    draft.portion_label || `${draft.portion_g}g`,
        instructions:     draft.instructions || null,
        prep_time_min:    draft.prep_time_min || null,
        cook_time_min:    draft.cook_time_min || null,
        tags:             draft.tags,
        is_public:        draft.is_public,
        is_active:        true,
        // Macros por porção pré-calculados e CONGELADOS no snapshot
        kcal_portion:    Math.round(portionMacros.kcal * 10) / 10,
        protein_portion: Math.round(portionMacros.protein_g * 10) / 10,
        carbs_portion:   Math.round(portionMacros.carbs_g * 10) / 10,
        fat_portion:     Math.round(portionMacros.fat_g * 10) / 10,
        fiber_portion:   Math.round(portionMacros.fiber_g * 10) / 10,
        ingredients:     frozenIngredients,
      };

      const { data, error } = await supabase
        .from('nos_recipes' as any)
        .insert([payload])
        .select('id')
        .single();

      if (error) throw error;

      toast.success(options?.asNewVersion
        ? `Nova versão salva (v${newVersion})`
        : 'Receita salva com sucesso!');

      return (data as any).id;
    } catch (err: any) {
      console.error('[useRecipeBuilder] Erro ao salvar:', err);
      toast.error(err.message || 'Erro ao salvar receita');
      return null;
    } finally {
      setSaving(false);
    }
  }, [user?.id, tenantId, draft, portionMacros, existingVersion]);

  return {
    draft, portionMacros, totalMacros,
    updateField, addIngredient, updateIngredientQty, removeIngredient,
    resetDraft, loadForEdit, save, saving,
  };
}
