/**
 * 🛡️ HOOK SOBERANO ÚNICO — FitJourney 2.0
 *
 * Este é o ÚNICO hook que componentes Patient devem usar para consumir snapshot.
 *
 * REGRAS:
 * ❌ Componentes NÃO chamam supabase diretamente
 * ❌ Componentes NÃO normalizam dados
 * ❌ Componentes NÃO calculam macros
 * ✅ Componentes consomem `meals` (já em SovereignMealItem)
 *
 * IMPORTANTE:
 * - Imagens vêm do snapshot. Sem busca dinâmica.
 * - Macros vêm do snapshot. Sem recálculo.
 * - Se houver `integrityWarnings`, mostrar badge para nutri (não para paciente).
 */

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  extractMealsFromSnapshot,
  filterItemsByDay,
  groupItemsByMeal,
} from './extractMealsFromSnapshot';
import type {
  SovereignMealItem,
  SovereignExtractionResult,
} from './SovereignMealItem';

export interface UseSovereignPlanResult {
  loading: boolean;
  error: string | null;
  /** Plano cru (apenas metadados) */
  plan: {
    id: string;
    title: string;
    start_date: string;
    targets?: {
      kcal: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
    };
  } | null;
  /** TODOS os itens do snapshot, prontos para render */
  allItems: SovereignMealItem[];
  /** Itens filtrados pelo dia ativo */
  itemsForDay: SovereignMealItem[];
  /** Itens agrupados por refeição (do dia ativo) */
  mealGroups: Map<
    string,
    { meal: SovereignMealItem['meal']; items: SovereignMealItem[] }
  >;
  /** Avisos de integridade para nutri/admin */
  integrityWarnings: SovereignExtractionResult['integrityWarnings'];
  /** True se snapshot é V3 válido. False = republicar plano */
  isValidV3: boolean;
  /** Recarrega dados do banco */
  refetch: () => Promise<void>;
}

/**
 * Hook soberano: lê o plano do banco e retorna SovereignMealItem prontos para render.
 *
 * @param planId ID do meal_plan no banco
 * @param dayOfWeek Dia ativo (0=Domingo, 1=Segunda, ..., 6=Sábado)
 */
export function useSovereignPlan(
  planId: string | null | undefined,
  dayOfWeek: number,
): UseSovereignPlanResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<UseSovereignPlanResult['plan']>(null);
  const [extractionResult, setExtractionResult] =
    useState<SovereignExtractionResult>({
      items: [],
      integrityWarnings: [],
      isValidV3: false,
    });

  const fetchData = async () => {
    if (!planId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: planData, error: queryError } = await supabase
        .from('meal_plans')
        .select('id, title, start_date, snapshot')
        .eq('id', planId)
        .maybeSingle();

      if (queryError) throw queryError;
      if (!planData) {
        setPlan(null);
        setExtractionResult({ items: [], integrityWarnings: [], isValidV3: false });
        return;
      }

      const snapshot = (planData as any).snapshot;

      // Metadados do plano (do próprio snapshot, sem reinterpretação)
      setPlan({
        id: planData.id,
        title: planData.title || 'Plano Alimentar',
        start_date: planData.start_date,
        targets: snapshot?.targets,
      });

      // Extração soberana
      const result = extractMealsFromSnapshot(snapshot);
      setExtractionResult(result);

      // Log forense para nutri
      if (result.integrityWarnings.length > 0) {
        console.warn(
          '[SovereignPlan] Integridade do snapshot incompleta:',
          result.integrityWarnings,
        );
      }
    } catch (err: any) {
      console.error('[SovereignPlan] Erro:', err);
      setError(err.message || 'Erro ao carregar plano');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const itemsForDay = useMemo(
    () => filterItemsByDay(extractionResult.items, dayOfWeek),
    [extractionResult.items, dayOfWeek],
  );

  const mealGroups = useMemo(
    () => groupItemsByMeal(itemsForDay),
    [itemsForDay],
  );

  return {
    loading,
    error,
    plan,
    allItems: extractionResult.items,
    itemsForDay,
    mealGroups,
    integrityWarnings: extractionResult.integrityWarnings,
    isValidV3: extractionResult.isValidV3,
    refetch: fetchData,
  };
}
