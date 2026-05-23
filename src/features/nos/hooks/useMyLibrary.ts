/**
 * 📚 useMyLibrary — Hook para Minha Biblioteca de Combos
 *
 * Lista combos salvos do nutricionista (nos_meal_combos).
 * Suporte a filtro por tipo e slot.
 * Incrementa use_count ao usar o combo no editor.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { ComboType } from './useComboBuilder';

export interface SavedCombo {
  id: string;
  name: string;
  combo_type: ComboType;
  meal_slot: string | null;
  kcal_total: number;
  protein_total: number;
  carbs_total: number;
  fat_total: number;
  items: any[];
  tags: string[];
  use_count: number;
  created_at: string;
}

export function useMyLibrary(filterType?: ComboType | 'all') {
  const { user } = useAuth();
  const [combos, setCombos] = useState<SavedCombo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCombos = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      let q = supabase
        .from('nos_meal_combos' as any)
        .select('id, name, combo_type, meal_slot, kcal_total, protein_total, carbs_total, fat_total, items, tags, use_count, created_at')
        .eq('nutritionist_id', user.id)
        .eq('is_active', true)
        .order('use_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (filterType && filterType !== 'all') {
        q = q.eq('combo_type', filterType) as any;
      }

      const { data, error } = await q;
      if (error) throw error;
      setCombos((data as unknown as SavedCombo[]) || []);
    } catch (err) {
      console.error('[useMyLibrary] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, filterType]);

  useEffect(() => { fetchCombos(); }, [fetchCombos]);

  const incrementUseCount = useCallback(async (comboId: string) => {
    await supabase
      .from('nos_meal_combos' as any)
      .update({ use_count: supabase.rpc as any } as any)
      .eq('id', comboId);
    // Atualiza localmente sem refetch
    setCombos(prev => prev.map(c =>
      c.id === comboId ? { ...c, use_count: c.use_count + 1 } : c
    ));
  }, []);

  const deleteCombo = useCallback(async (comboId: string) => {
    await supabase
      .from('nos_meal_combos' as any)
      .update({ is_active: false } as any)
      .eq('id', comboId);
    setCombos(prev => prev.filter(c => c.id !== comboId));
  }, []);

  return { combos, loading, refetch: fetchCombos, incrementUseCount, deleteCombo };
}
