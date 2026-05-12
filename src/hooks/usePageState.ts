
import { useState, useCallback, useMemo } from "react";

export type PageStatus = "loading" | "ready" | "error";

interface PageStateOptions<T> {
  initialStatus?: PageStatus;
  onRetry?: () => Promise<T> | void;
}

/**
 * usePageState: Gancho para gerenciar estados explícitos de página (loading, ready, error).
 * Proíbe renderização sem estado definido.
 * Utiliza useMemo para garantir estabilidade referencial e evitar loops em efeitos.
 */
export function usePageState<T = any>(options: PageStateOptions<T> = {}) {
  const [status, setStatus] = useState<PageStatus>(options.initialStatus || "loading");
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const setReady = useCallback((newData?: T) => {
    if (newData !== undefined) setData(newData);
    setStatus("ready");
    setError(null);
  }, []);

  const setPageError = useCallback((err: any) => {
    console.error("[usePageState] Erro na página:", err);
    setError(err instanceof Error ? err : new Error(String(err)));
    setStatus("error");
  }, []);

  const setLoading = useCallback(() => {
    setStatus("loading");
  }, []);

  const handleRetry = useCallback(async () => {
    if (options.onRetry) {
      setLoading();
      try {
        await options.onRetry();
      } catch (err) {
        setPageError(err);
      }
    } else {
      window.location.reload();
    }
  }, [options.onRetry, setPageError, setLoading]);

  // Estabilização referencial obrigatória para evitar loops em Dependency Arrays
  return useMemo(() => ({
    status,
    error,
    data,
    setReady,
    setPageError,
    setLoading,
    handleRetry,
    isLoading: status === "loading",
    isReady: status === "ready",
    isError: status === "error"
  }), [status, error, data, setReady, setPageError, setLoading, handleRetry]);
}

