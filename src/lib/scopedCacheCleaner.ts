/**
 * FitJourney — Scoped Cache Cleaner
 *
 * Limpa SELETIVAMENTE entradas de cache (CacheStorage + React Query)
 * relacionadas a uma rota/feature específica, sem derrubar o resto da
 * sessão (auth, settings, dashboards já carregados).
 *
 * v2: agora também invalida queries com queryKey OBJETO contendo campos
 *     como nutritionist_id / patient_id / range de datas / tenant_id —
 *     SEM derrubar queries de outras rotas que apenas mencionem o tenant.
 *
 *     Ex.: ["meal_templates", { nutritionist_id, range_days: 7 }]
 *          ["nutritionist_meal_templates", { tenant_id, from, to }]
 */

export interface ScopedClearResult {
  cacheEntriesRemoved: number;
  queriesInvalidated: number;
  matchedPatterns: string[];
  matchedQueryKeys: string[];
}

/**
 * Pattern -> regexes que casam URLs/queryKeys daquele escopo.
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

/**
 * Identificadores "âncora" do escopo. Uma queryKey só é considerada
 * pertencente ao escopo se conter ao menos um destes nomes — evita
 * invalidar queries de OUTRAS rotas que casualmente carreguem o mesmo
 * tenant_id ou range de datas.
 */
const SCOPE_ANCHORS: Record<CacheScopeKey, RegExp[]> = {
  "diet-templates": [
    /templates?/i,
    /diet[_-]?templates?/i,
    /nutritionist_meal_templates/i,
    /meal[_-]?templates/i,
  ],
};

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

/** Stringificação tolerante a Date/undefined/funções. */
function safeStringifyKey(key: unknown): string {
  try {
    return JSON.stringify(key, (_k, v) => {
      if (v instanceof Date) return v.toISOString();
      if (typeof v === "function") return "[fn]";
      return v;
    });
  } catch {
    try {
      return String(key);
    } catch {
      return "";
    }
  }
}

/**
 * Decide se uma queryKey pertence ao escopo:
 *   1) Casa pelo menos uma "âncora" do escopo (nome da feature),
 *   2) E casa pelo menos um dos patterns gerais.
 *
 * Isso impede que uma query de OUTRA rota (ex.: /patients) seja
 * invalidada só porque carrega o mesmo tenant_id ou janela de 7 dias.
 */
function queryKeyMatchesScope(
  keyStr: string,
  patterns: RegExp[],
  anchors: RegExp[],
): boolean {
  if (!anchors.some((a) => a.test(keyStr))) return false;
  return patterns.some((p) => p.test(keyStr));
}

function invalidateQueriesMatching(
  patterns: RegExp[],
  anchors: RegExp[],
): { count: number; keys: string[] } {
  const qc: any = (window as any).__REACT_QUERY_CLIENT__;
  if (!qc?.getQueryCache) return { count: 0, keys: [] };
  let invalidated = 0;
  const matched: string[] = [];
  const queries = qc.getQueryCache().getAll?.() ?? [];
  for (const q of queries) {
    const keyStr = safeStringifyKey(q.queryKey);
    if (!keyStr) continue;
    if (queryKeyMatchesScope(keyStr, patterns, anchors)) {
      try {
        qc.invalidateQueries({ queryKey: q.queryKey, refetchType: "active" });
        qc.removeQueries({ queryKey: q.queryKey });
        invalidated++;
        if (matched.length < 20) matched.push(keyStr);
      } catch {}
    }
  }
  return { count: invalidated, keys: matched };
}

export async function clearScopedCaches(scope: CacheScopeKey): Promise<ScopedClearResult> {
  const patterns = [...CACHE_SCOPES[scope]];
  const anchors = SCOPE_ANCHORS[scope];
  const [cacheEntriesRemoved, queryResult] = await Promise.all([
    clearCacheStorageMatching(patterns),
    Promise.resolve(invalidateQueriesMatching(patterns, anchors)),
  ]);
  return {
    cacheEntriesRemoved,
    queriesInvalidated: queryResult.count,
    matchedPatterns: patterns.map((p) => p.toString()),
    matchedQueryKeys: queryResult.keys,
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
