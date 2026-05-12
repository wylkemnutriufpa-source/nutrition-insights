/**
 * FitJourney — useSafeQuery: Query Determinística
 * 
 * Wrapper sobre useQuery que garante previsibilidade.
 * Sem silenciar erros reais, permitindo falha rápida (Fail Fast).
 */
import { useQuery, UseQueryOptions, UseQueryResult, QueryKey } from "@tanstack/react-query";

interface SafeQueryOptions<TData, TFallback> {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  fallbackData?: TFallback;
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
      // O erro agora é propagado para o TanStack Query, que decidirá
      // se tenta novamente (baseado no CoreProviders) ou falha.
      const data = await queryFn();
      return sanitize ? sanitize(data) : data;
    },
    enabled,
    staleTime,
    refetchOnWindowFocus,
    // Retries controlados centralmente no CoreProviders
  } as UseQueryOptions<TData>);

  // safeData agora retorna o fallback apenas se os dados forem nulos, 
  // mas o estado de erro do result ainda estará presente.
  const safeData = result.data ?? fallbackData as TData;

  return { ...result, safeData };
}
