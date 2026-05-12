/**
 * FitJourney — Text Source Inspector (dev only)
 *
 * Quando ativado, ALT+CLICK em qualquer elemento mostra:
 *  - tag e classes
 *  - componente React mais próximo (via React DevTools fiber)
 *  - data-testid mais próximo
 *  - texto exibido vs texto presente em window.__REACT_QUERY_CLIENT__ (cache)
 *  - origem provável (DOM estático / componente / cache de query)
 *
 * Ativação:
 *  - localStorage["fj:debug:text-inspector"] = "1"
 *  - ?debug=text-inspector
 *
 * Objetivo: rastrear rapidamente de onde vem um texto antigo na tela.
 */
import { useEffect, useState } from "react";
import { X } from "lucide-react";

const LS_KEY = "fj:debug:text-inspector";

interface CacheMatch {
  queryKey: string;
  dataUpdatedAt: number | null;
  dataUpdatedAtIso: string | null;
  ageSeconds: number | null;
  status: string | null;
  isStale: boolean | null;
  observers: number | null;
}

interface InspectionResult {
  tag: string;
  text: string;
  testId: string | null;
  componentName: string | null;
  classes: string;
  source: "static" | "react-state" | "query-cache" | "unknown";
  cacheMatches: CacheMatch[];
}

function shouldEnable(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (localStorage.getItem(LS_KEY) === "1") return true;
    const url = new URL(window.location.href);
    if (url.searchParams.get("debug") === "text-inspector") {
      localStorage.setItem(LS_KEY, "1");
      return true;
    }
  } catch {}
  return false;
}

function findReactComponentName(el: Element): string | null {
  // React fibers are attached as __reactFiber$xxxx
  const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
  if (!key) return null;
  let fiber: any = (el as any)[key];
  // Walk up to find a named component
  while (fiber) {
    const type = fiber.type;
    if (typeof type === "function") {
      return type.displayName || type.name || "Anonymous";
    }
    if (typeof type === "object" && type?.displayName) return type.displayName;
    fiber = fiber.return;
  }
  return null;
}

function findTestId(el: Element): string | null {
  let node: Element | null = el;
  while (node) {
    const id = node.getAttribute?.("data-testid");
    if (id) return id;
    node = node.parentElement;
  }
  return null;
}

function searchQueryCache(text: string): CacheMatch[] {
  try {
    const qc: any = (window as any).__REACT_QUERY_CLIENT__;
    if (!qc?.getQueryCache) return [];
    const cache = qc.getQueryCache();
    const queries = cache.getAll?.() || [];
    const matches: CacheMatch[] = [];
    const needle = text.trim().toLowerCase();
    if (needle.length < 3) return [];
    const now = Date.now();
    for (const q of queries) {
      try {
        const data = q.state?.data;
        const json = JSON.stringify(data ?? "");
        if (json.toLowerCase().includes(needle)) {
          const dataUpdatedAt: number | null = q.state?.dataUpdatedAt ?? null;
          matches.push({
            queryKey: JSON.stringify(q.queryKey),
            dataUpdatedAt,
            dataUpdatedAtIso: dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null,
            ageSeconds: dataUpdatedAt ? Math.round((now - dataUpdatedAt) / 1000) : null,
            status: q.state?.status ?? null,
            isStale: typeof q.isStale === "function" ? q.isStale() : null,
            observers:
              typeof q.getObserversCount === "function"
                ? q.getObserversCount()
                : null,
          });
          if (matches.length >= 3) break;
        }
      } catch {}
    }
    return matches;
  } catch {
    return [];
  }
}

function inspectElement(el: Element): InspectionResult {
  const text = (el.textContent || "").slice(0, 140);
  const testId = findTestId(el);
  const componentName = findReactComponentName(el);
  const cacheMatches = searchQueryCache(text);

  let source: InspectionResult["source"] = "unknown";
  if (cacheMatches.length > 0) source = "query-cache";
  else if (componentName) source = "react-state";
  else source = "static";

  return {
    tag: el.tagName.toLowerCase(),
    text,
    testId,
    componentName,
    classes: el.className?.toString?.() ?? "",
    source,
    cacheMatches,
  };
}

export default function TextSourceInspector() {
  const [enabled, setEnabled] = useState(() => shouldEnable());
  const [result, setResult] = useState<InspectionResult | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: MouseEvent) => {
      if (!e.altKey) return;
      const target = e.target as Element | null;
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      const r = inspectElement(target);
      setResult(r);
      // Persist em window para que BuildStatusPanel possa anexar no bug report
      try {
        const w = window as any;
        const list: any[] = Array.isArray(w.__FJ_TEXT_INSPECTOR_HISTORY__)
          ? w.__FJ_TEXT_INSPECTOR_HISTORY__
          : [];
        list.unshift({ at: new Date().toISOString(), ...r });
        w.__FJ_TEXT_INSPECTOR_HISTORY__ = list.slice(0, 20);
      } catch {}
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [enabled]);

  if (!enabled) return null;

  const disable = () => {
    setEnabled(false);
    setResult(null);
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
  };

  return (
    <>
      <div
        data-testid="text-inspector-toggle"
        className="fixed top-3 left-3 z-[170] rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-200 shadow"
      >
        🔍 Text Inspector ativo · ALT+click
        <button
          onClick={disable}
          className="ml-2 rounded px-1 text-amber-100 hover:bg-amber-500/20"
          aria-label="Desativar"
        >
          ✕
        </button>
      </div>

      {result && (
        <div
          data-testid="text-inspector-result"
          className="fixed bottom-3 right-3 z-[170] w-[320px] rounded-lg border border-border bg-background/95 p-3 text-xs shadow-2xl backdrop-blur-sm"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-foreground">Origem do texto</span>
            <button
              onClick={() => setResult(null)}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            <Row label="Texto" value={`"${result.text}"`} />
            <Row label="Tag" value={result.tag} />
            <Row label="Componente" value={result.componentName ?? "—"} />
            <Row label="data-testid" value={result.testId ?? "—"} />
            <Row
              label="Origem"
              value={
                <span
                  className={
                    result.source === "query-cache"
                      ? "text-amber-400"
                      : result.source === "react-state"
                        ? "text-emerald-400"
                        : "text-muted-foreground"
                  }
                >
                  {result.source === "query-cache"
                    ? "cache (React Query)"
                    : result.source === "react-state"
                      ? "componente"
                      : result.source === "static"
                        ? "DOM estático"
                        : "desconhecida"}
                </span>
              }
            />
            {result.cacheMatches.length > 0 && (
              <div className="mt-1 space-y-1 rounded border border-amber-500/30 bg-amber-500/10 p-1.5">
                <div className="text-[10px] uppercase text-amber-200">
                  Encontrado no cache:
                </div>
                {result.cacheMatches.map((m, i) => (
                  <div
                    key={i}
                    className="rounded bg-background/40 p-1 text-[10px] text-amber-100"
                  >
                    <div className="truncate font-mono" title={m.queryKey}>
                      {m.queryKey}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-amber-200/90">
                      {m.dataUpdatedAtIso && (
                        <span title={m.dataUpdatedAtIso}>
                          atualizado:{" "}
                          {new Date(m.dataUpdatedAt!).toLocaleTimeString()}
                        </span>
                      )}
                      {m.ageSeconds !== null && (
                        <span>idade: {m.ageSeconds}s</span>
                      )}
                      {m.status && <span>status: {m.status}</span>}
                      {m.isStale !== null && (
                        <span>{m.isStale ? "stale" : "fresh"}</span>
                      )}
                      {m.observers !== null && (
                        <span>obs: {m.observers}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase text-muted-foreground">{label}:</span>
      <span className="truncate text-foreground">{value}</span>
    </div>
  );
}
