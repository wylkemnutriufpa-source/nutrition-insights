/**
 * 🔍 useNOSFoodSearch — Hook de busca soberana de alimentos
 *
 * SUBSTITUI: FoodAutocomplete (legado com FOOD_DATABASE estático)
 * FONTE: nos_foods via RPC nos_search_foods (full-text + source_priority)
 *
 * Prioridade de retorno: TACO → USDA → custom → brand → supplement
 * Debounce: 300ms para não sobrecarregar banco
 *
 * USADO SOMENTE no Editor V3 (camada de autoria).
 * NUNCA importar no Patient App.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NOSFoodResult {
  id: string;
  name: string;
  source: string;
  source_priority: number;
  kcal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  fiber_100g: number;
  portion_g: number;
  portion_label: string | null;
  image_url: string | null;
  category: string | null;
  verified: boolean;
  canonical_food_id: string | null;
}

interface UseNOSFoodSearchResult {
  results: NOSFoodResult[];
  loading: boolean;
  error: string | null;
  search: (query: string) => void;
  clear: () => void;
}

export function useNOSFoodSearch(limit = 20): UseNOSFoodSearchResult {
  const [results, setResults] = useState<NOSFoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback((query: string) => {
    // Cancelar debounce anterior
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (!query || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    debounceRef.current = setTimeout(async () => {
      // Cancelar request anterior se ainda estiver rodando
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      try {
        const { data, error: rpcError } = await supabase.rpc(
          'nos_search_foods' as any,
          { p_query: query.trim(), p_limit: limit }
        );

        if (rpcError) throw rpcError;

        setResults((data as NOSFoodResult[]) || []);
      } catch (err: any) {
        // Ignora erros de abort (requisição cancelada intencionalmente)
        if (err?.message !== 'AbortError') {
          console.error('[useNOSFoodSearch] Erro na busca:', err);
          setError('Erro ao buscar alimentos');
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [limit]);

  const clear = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setResults([]);
    setLoading(false);
    setError(null);
  }, []);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { results, loading, error, search, clear };
}

/**
 * Hook auxiliar para buscar um alimento específico por ID
 */
export function useNOSFoodById(foodId: string | null) {
  const [food, setFood] = useState<NOSFoodResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!foodId) { setFood(null); return; }

    setLoading(true);
    supabase
      .from('nos_foods' as any)
      .select('id, name, source, source_priority, kcal_100g, protein_100g, carbs_100g, fat_100g, fiber_100g, portion_g, portion_label, image_url, category, verified, canonical_food_id')
      .eq('id', foodId)
      .maybeSingle()
      .then(({ data }) => {
        setFood(data as unknown as NOSFoodResult | null);
        setLoading(false);
      });
  }, [foodId]);

  return { food, loading };
}
