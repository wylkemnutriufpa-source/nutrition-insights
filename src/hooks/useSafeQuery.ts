/**
 * FitJourney — useSafeQuery: Query com autocorreção
 * 
 * Wrapper sobre useQuery que:
 * 1. Nunca propaga exceções para o componente
 * 2. Aplica sanitização automática nos dados
 * 3. Retorna fallback seguro quando dados são null/undefined
 * 4. Loga erros automaticamente no monitoring
 */
import { useQuery, UseQueryOptions, UseQueryResult, QueryKey } from "@tanstack/react-query";
import { logWarn } from "@/lib/monitoring";

interface SafeQueryOptions<TData, TFallback> {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  fallbackData: TFallback;
  /** Transforma/sanitiza dados depois de recebidos */
  sanitize?: (data: TData) => TData;
  section?: string;
  enabled?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
}

export function useSafeQuery<TData, TFallback extends TData>({
  queryKey,
  queryFn,
  fallbackData,
  sanitize,
  section = "unknown",
  enabled = true,
  staleTime,
  refetchOnWindowFocus,
}: SafeQueryOptions<TData, TFallback>): UseQueryResult<TData> & { safeData: TData } {
  const result = useQuery<TData>({
    queryKey,
    queryFn: async () => {
      try {
        const data = await queryFn();
        return sanitize ? sanitize(data) : data;
      } catch (err) {
        logWarn(`useSafeQuery:${section}`, err instanceof Error ? err.message : String(err));
        return fallbackData;
      }
    },
    enabled,
    staleTime,
    refetchOnWindowFocus,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  } as UseQueryOptions<TData>);

  // ALWAYS return safe data — even during loading/error
  const safeData = result.data ?? fallbackData;

  return { ...result, safeData };
}
