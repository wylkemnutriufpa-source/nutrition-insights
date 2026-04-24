/**
 * FitJourney — Scoped Cache Cleaner
 *
 * Limpa SELETIVAMENTE entradas de cache (CacheStorage + React Query)
 * relacionadas a uma rota/feature específica, sem derrubar o resto da
 * sessão (auth, settings, dashboards já carregados).
 *
 * Útil quando o usuário vê dado/texto antigo em UMA tela específica
 * (ex.: /diet-templates) e precisa "soft refresh" daquele escopo.
 */

export interface ScopedClearResult {
  cacheEntriesRemoved: number;
  queriesInvalidated: number;
  matchedPatterns: string[];
}

/**
 * Pattern -> regexes que casam URLs/queryKeys daquele escopo.
 * Cada entrada testa contra:
 *   - URLs do CacheStorage (workbox / runtime cache)
 *   - JSON.stringify(queryKey) do React Query
 */
export const CACHE_SCOPES = {
  "diet-templates": [
    /\/diet-templates/i,
    /diet[_-]?templates/i,
    /nutritionist_meal_templates/i,
    /meal[_-]?templates/i,
    /\["templates?"/i,
    /\["diet[-_]?templates?"/i,
  ],
} as const;

export type CacheScopeKey = keyof typeof CACHE_SCOPES;

async function clearCacheStorageMatching(patterns: RegExp[]): Promise<number> {
  if (typeof caches === "undefined") return 0;
  let removed = 0;
  const cacheNames = await caches.keys();
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const requests = await cache.keys();
    for (const req of requests) {
      if (patterns.some((p) => p.test(req.url))) {
        const ok = await cache.delete(req);
        if (ok) removed++;
      }
    }
  }
  return removed;
}

function invalidateQueriesMatching(patterns: RegExp[]): number {
  const qc: any = (window as any).__REACT_QUERY_CLIENT__;
  if (!qc?.getQueryCache) return 0;
  let invalidated = 0;
  const queries = qc.getQueryCache().getAll?.() ?? [];
  for (const q of queries) {
    let key = "";
    try {
      key = JSON.stringify(q.queryKey);
    } catch {
      continue;
    }
    if (patterns.some((p) => p.test(key))) {
      try {
        qc.invalidateQueries({ queryKey: q.queryKey, refetchType: "active" });
        qc.removeQueries({ queryKey: q.queryKey });
        invalidated++;
      } catch {}
    }
  }
  return invalidated;
}

export async function clearScopedCaches(scope: CacheScopeKey): Promise<ScopedClearResult> {
  const patterns = [...CACHE_SCOPES[scope]];
  const [cacheEntriesRemoved, queriesInvalidated] = await Promise.all([
    clearCacheStorageMatching(patterns),
    Promise.resolve(invalidateQueriesMatching(patterns)),
  ]);
  return {
    cacheEntriesRemoved,
    queriesInvalidated,
    matchedPatterns: patterns.map((p) => p.toString()),
  };
}

/**
 * Recarrega APENAS a rota indicada (ou a atual), preservando histórico
 * e sem trocar de origem. Acrescenta ?refresh=ts para furar caches HTTP.
 */
export function reloadScopedRoute(routePath?: string) {
  const url = new URL(window.location.href);
  if (routePath) url.pathname = routePath;
  url.searchParams.set("refresh", String(Date.now()));
  window.location.replace(url.toString());
}
