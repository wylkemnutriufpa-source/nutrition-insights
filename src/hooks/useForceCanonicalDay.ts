import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "fj_editor_force_canonical_day";
const QUERY_PARAM = "canonical";

function readInitial(): boolean {
  if (typeof window === "undefined") return true; // default = canônico

  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get(QUERY_PARAM);
    if (fromUrl === "1" || fromUrl === "true") return true;
    if (fromUrl === "0" || fromUrl === "false") return false;

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "false") return false;
    if (stored === "true") return true;
  } catch {
    /* ignore */
  }
  return true;
}

/**
 * Hook que persiste a escolha do profissional entre:
 * - `true`  → forçar slot canônico (day=0), mesmo que esteja vazio
 * - `false` → permitir fallback para o primeiro dia legado com itens
 *
 * Estado é sincronizado com `?canonical=1|0` na URL e com localStorage,
 * para que recargas e links compartilhados preservem a visão.
 */
export function useForceCanonicalDay(): [boolean, (value: boolean) => void] {
  const [forceCanonical, setForceCanonical] = useState<boolean>(readInitial);

  const update = useCallback((value: boolean) => {
    setForceCanonical(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
      const url = new URL(window.location.href);
      url.searchParams.set(QUERY_PARAM, value ? "1" : "0");
      window.history.replaceState({}, "", url.toString());
    } catch {
      /* ignore persistence errors */
    }
  }, []);

  // Sincroniza se outra aba alterar o valor
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setForceCanonical(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return [forceCanonical, update];
}
