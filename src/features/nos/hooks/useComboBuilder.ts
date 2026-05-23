/**
 * 🥡 useComboBuilder — Hook de criação de combos/marmitas NOS
 *
 * Gerencia o estado local do combo em construção.
 * Macros calculados em tempo real via calcEngine.
 * Salva em nos_meal_combos com snapshot de itens CONGELADO.
 *
 * Tipos de combo: meal | marmita | snack | combo | supplement_stack
 *
 * INVARIANTE: após save(), os macros são imutáveis.
 * O Editor V3 usa o snapshot congelado para adicionar ao plano.
 */

import { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenantContext';
import { calcMacros } from '../engine/calcEngine';
import { toast } from 'sonner';

export type ComboType = 'meal' | 'marmita' | 'snack' | 'combo' | 'supplement_stack';

export const COMBO_TYPE_LABELS: Record<ComboType, { label: string; emoji: string; color: string }> = {
  meal:              { label: 'Refeição Pronta',  emoji: '🍽️', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  marmita:           { label: 'Marmita',          emoji: '🥡', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  snack:             { label: 'Lanche Rápido',    emoji: '🥪', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  combo:             { label: 'Combinação',       emoji: '🍱', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  supplement_stack:  { label: 'Stack Suplementos',emoji: '💊', color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
};

export const MEAL_SLOT_OPTIONS = [
  { value: 'any',        label: 'Qualquer horário' },
  { value: 'breakfast',  label: 'Café da Manhã' },
  { value: 'lunch',      label: 'Almoço' },
  { value: 'dinner',     label: 'Jantar' },
  { value: 'snack',      label: 'Lanche' },
  { value: 'pre_workout',label: 'Pré-Treino' },
  { value: 'post_workout',label: 'Pós-Treino' },
];

export interface ComboItem {
  id:           string;  // instanceId único no combo
  type:         'food' | 'recipe';
  source_id:    string;  // nos_foods.id ou nos_recipes.id
  name:         string;
  qty_g:        number;
  quantity_display: string;
  kcal_100g:    number;
  protein_100g: number;
  carbs_100g:   number;
  fat_100g:     number;
  // Macros calculados para esta gramagem (congelados)
  kcal:         number;
  protein_g:    number;
  carbs_g:      number;
  fat_g:        number;
  image_url?:   string | null;
}

export interface ComboDraft {
  name:       string;
  combo_type: ComboType;
  meal_slot:  string;
  tags:       string[];
  items:      ComboItem[];
}

const EMPTY_DRAFT: ComboDraft = {
  name:       '',
  combo_type: 'meal',
  meal_slot:  'any',
  tags:       [],
  items:      [],
};

export function useComboBuilder() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [draft, setDraft] = useState<ComboDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  // Macros totais do combo (tempo real)
  const totalMacros = useMemo(() => {
    return draft.items.reduce(
      (acc, item) => ({
        kcal:      Math.round((acc.kcal      + item.kcal) * 10) / 10,
        protein_g: Math.round((acc.protein_g + item.protein_g) * 10) / 10,
        carbs_g:   Math.round((acc.carbs_g   + item.carbs_g) * 10) / 10,
        fat_g:     Math.round((acc.fat_g     + item.fat_g) * 10) / 10,
      }),
      { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );
  }, [draft.items]);

  const updateField = useCallback(<K extends keyof ComboDraft>(key: K, val: ComboDraft[K]) => {
    setDraft(prev => ({ ...prev, [key]: val }));
  }, []);

  const addItem = useCallback((food: {
    id: string; name: string; type?: 'food' | 'recipe';
    kcal_100g: number; protein_100g: number; carbs_100g: number; fat_100g: number;
    portion_g?: number; portion_label?: string; image_url?: string | null;
  }, qty_g?: number) => {
    const portion = qty_g ?? food.portion_g ?? 100;
    const macros = calcMacros(
      { kcal_100g: food.kcal_100g, protein_100g: food.protein_100g,
        carbs_100g: food.carbs_100g, fat_100g: food.fat_100g },
      portion
    );

    const newItem: ComboItem = {
      id:               crypto.randomUUID(),
      type:             food.type ?? 'food',
      source_id:        food.id,
      name:             food.name,
      qty_g:            portion,
      quantity_display: food.portion_label ?? `${portion}g`,
      kcal_100g:        food.kcal_100g,
      protein_100g:     food.protein_100g,
      carbs_100g:       food.carbs_100g,
      fat_100g:         food.fat_100g,
      kcal:             macros.kcal,
      protein_g:        macros.protein_g,
      carbs_g:          macros.carbs_g,
      fat_g:            macros.fat_g,
      image_url:        food.image_url ?? null,
    };

    setDraft(prev => ({ ...prev, items: [...prev.items, newItem] }));
  }, []);

  const updateItemQty = useCallback((itemId: string, newQty: number) => {
    const safeQty = Math.max(1, newQty);
    setDraft(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id !== itemId) return item;
        const macros = calcMacros(
          { kcal_100g: item.kcal_100g, protein_100g: item.protein_100g,
            carbs_100g: item.carbs_100g, fat_100g: item.fat_100g },
          safeQty
        );
        return { ...item, qty_g: safeQty,
          quantity_display: `${safeQty}g`,
          kcal: macros.kcal, protein_g: macros.protein_g,
          carbs_g: macros.carbs_g, fat_g: macros.fat_g };
      }),
    }));
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setDraft(prev => ({ ...prev, items: prev.items.filter(i => i.id !== itemId) }));
  }, []);

  const resetDraft = useCallback(() => setDraft(EMPTY_DRAFT), []);

  /**
   * Salva o combo em nos_meal_combos com snapshot congelado.
   * Retorna o ID do combo salvo ou null em caso de erro.
   */
  const save = useCallback(async (): Promise<string | null> => {
    if (!user?.id) { toast.error('Usuário não autenticado'); return null; }
    if (!draft.name.trim()) { toast.error('Nome do combo é obrigatório'); return null; }
    if (draft.items.length === 0) { toast.error('Adicione pelo menos 1 item'); return null; }

    setSaving(true);
    try {
      // Congela o snapshot de itens com macros calculados
      const frozenItems = draft.items.map(item => ({
        id:               item.id,
        type:             item.type,
        source_id:        item.source_id,
        name:             item.name,
        qty_g:            item.qty_g,
        quantity_display: item.quantity_display,
        kcal_100g:        item.kcal_100g,
        protein_100g:     item.protein_100g,
        carbs_100g:       item.carbs_100g,
        fat_100g:         item.fat_100g,
        // Macros calculados CONGELADOS no momento de salvar
        kcal:      item.kcal,
        protein_g: item.protein_g,
        carbs_g:   item.carbs_g,
        fat_g:     item.fat_g,
        image_url: item.image_url ?? null,
      }));

      const payload: any = {
        nutritionist_id: user.id,
        tenant_id:       tenantId,
        name:            draft.name.trim(),
        combo_type:      draft.combo_type,
        meal_slot:       draft.meal_slot !== 'any' ? draft.meal_slot : null,
        tags:            draft.tags,
        is_active:       true,
        use_count:       0,
        items:           frozenItems,
        // Macros totais CONGELADOS
        kcal_total:    totalMacros.kcal,
        protein_total: totalMacros.protein_g,
        carbs_total:   totalMacros.carbs_g,
        fat_total:     totalMacros.fat_g,
      };

      const { data, error } = await supabase
        .from('nos_meal_combos' as any)
        .insert([payload])
        .select('id')
        .single();

      if (error) throw error;

      toast.success(`${COMBO_TYPE_LABELS[draft.combo_type].emoji} "${draft.name}" salvo na biblioteca!`);
      return (data as any).id;
    } catch (err: any) {
      console.error('[useComboBuilder] Erro ao salvar:', err);
      toast.error(err.message || 'Erro ao salvar combo');
      return null;
    } finally {
      setSaving(false);
    }
  }, [user?.id, tenantId, draft, totalMacros]);

  /**
   * Converte combo para Food[] compatível com Editor V3
   * para adicionar diretamente em uma refeição.
   */
  const comboToFoods = useCallback(() => {
    return draft.items.map(item => ({
      id:           item.source_id,
      name:         item.name,
      kcal:         item.kcal,
      protein:      item.protein_g,
      carbs:        item.carbs_g,
      fat:          item.fat_g,
      kcal_100g:    item.kcal_100g,
      protein_100g: item.protein_100g,
      carb_100g:    item.carbs_100g,
      fat_100g:     item.fat_100g,
      clinical_mass_g:  item.qty_g,
      portionValue:     item.qty_g,
      portionUnitLabel: item.quantity_display,
      quantity:         item.qty_g,
      imageUrl:         item.image_url ?? undefined,
      category:         item.type,
      substitutions:    [],
    }));
  }, [draft.items]);

  return {
    draft, totalMacros,
    updateField, addItem, updateItemQty, removeItem,
    resetDraft, save, saving, comboToFoods,
  };
}
