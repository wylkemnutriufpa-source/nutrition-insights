/**
 * FitJourney — Build Status Panel (dev + opt-in prod)
 *
 * Mostra:
 *  - build hash + timestamp
 *  - estado do Service Worker
 *  - últimas chamadas a edge functions
 *  - resultado da validação de chunk hash (toggle on/off, inclusive em dev)
 *  - botão de "Limpar cache & recarregar"
 *  - botão de "Limpar só /diet-templates"
 *  - botão "Exportar JSON" (bug report) com BUILD_INFO + swState +
 *    chunkValidation + últimas inspeções do TextSourceInspector
 */
import { useEffect, useMemo, useState } from "react";
import { BUILD_INFO } from "@/lib/buildInfo";
import { clearRuntimeCaches, forceHardReload } from "@/lib/pwaUpdate";
import {
  installDynamicChunkObservers,
  validateChunkHashes,
  type ChunkValidationResult,
} from "@/lib/chunkHashValidator";
import {
  clearScopedCaches,
  reloadScopedRoute,
} from "@/lib/scopedCacheCleaner";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FolderSync,
  Hash,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";

type EdgeCallEntry = {
  fn: string;
  status: number;
  ms: number;
  ts: number;
};

type SwState =
  | "unsupported"
  | "none"
  | "installing"
  | "waiting"
  | "active"
  | "error";

const LS_VISIBLE = "fj:debug:build-status";
const LS_COLLAPSED = "fj:debug:build-status:collapsed";
const LS_CHUNK_CHECK = "fj:debug:chunk-check-enabled";
const MAX_CALLS = 8;

function shouldShowPanel(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (import.meta.env.DEV) return true;
    if (localStorage.getItem(LS_VISIBLE) === "1") return true;
    const url = new URL(window.location.href);
    if (url.searchParams.get("debug") === "build") {
      localStorage.setItem(LS_VISIBLE, "1");
      return true;
    }
  } catch {}
  return false;
}

function readChunkCheckPref(): boolean {
  try {
    const v = localStorage.getItem(LS_CHUNK_CHECK);
    if (v === "0") return false;
    return true; // default ON
  } catch {
    return true;
  }
}

export default function BuildStatusPanel() {
  const [visible, setVisible] = useState(() => shouldShowPanel());
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(LS_COLLAPSED) === "1";
    } catch {
      return false;
    }
  });
  const [swState, setSwState] = useState<SwState>("none");
  const [calls, setCalls] = useState<EdgeCallEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [chunkValidation, setChunkValidation] = useState<ChunkValidationResult | null>(null);
  const [scopedFeedback, setScopedFeedback] = useState<string | null>(null);
  const [chunkCheckEnabled, setChunkCheckEnabled] = useState<boolean>(() =>
    readChunkCheckPref(),
  );
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // ─── Observa chunks dinâmicos (lazy/dynamic import) desde já. ──
  useEffect(() => {
    installDynamicChunkObservers();
  }, []);

  // ─── Chunk hash validation (toggle on/off em runtime) ──────────
  useEffect(() => {
    if (!chunkCheckEnabled) {
      setChunkValidation(null);
      return;
    }

    const run = (delay: number) =>
      window.setTimeout(() => {
        const result = validateChunkHashes({ includeDynamic: true });
        setChunkValidation(result);
        if (result.status === "mismatch") {
          // eslint-disable-next-line no-console
          console.warn(
            `[FJ:build] CHUNK MISMATCH — ${result.message}`,
            { expected: result.expectedHash, loaded: result.loadedHashes },
          );
        }
      }, delay);

    // Primeira pintura + reavaliação após render dinâmico
    const t1 = run(500);
    const t2 = run(2500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [chunkCheckEnabled]);

  // ─── Service worker state ──────────────────────────────────
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      setSwState("unsupported");
      return;
    }
    let cancelled = false;

    const refresh = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (cancelled) return;
        if (!reg) return setSwState("none");
        if (reg.installing) return setSwState("installing");
        if (reg.waiting) return setSwState("waiting");
        if (reg.active) return setSwState("active");
        setSwState("none");
      } catch {
        setSwState("error");
      }
    };

    refresh();
    const handler = () => refresh();
    navigator.serviceWorker.addEventListener("controllerchange", handler);
    const interval = window.setInterval(refresh, 5000);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", handler);
      window.clearInterval(interval);
    };
  }, []);

  // ─── Edge function call interception (lightweight) ─────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const origFetch = window.fetch.bind(window);

    const wrapped: typeof fetch = async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url;

      const isEdge = /\/functions\/v1\/([^/?]+)/.exec(url);
      if (!isEdge) return origFetch(input, init);

      const fnName = isEdge[1];
      const start = performance.now();
      try {
        const res = await origFetch(input, init);
        const ms = Math.round(performance.now() - start);
        setCalls((prev) =>
          [{ fn: fnName, status: res.status, ms, ts: Date.now() }, ...prev].slice(
            0,
            MAX_CALLS,
          ),
        );
        return res;
      } catch (err) {
        const ms = Math.round(performance.now() - start);
        setCalls((prev) =>
          [{ fn: fnName, status: 0, ms, ts: Date.now() }, ...prev].slice(0, MAX_CALLS),
        );
        throw err;
      }
    };

    (window as any).__origFetch = origFetch;
    window.fetch = wrapped as typeof fetch;
    return () => {
      window.fetch = origFetch;
    };
  }, []);

  const swBadge = useMemo(() => {
    const map: Record<SwState, { label: string; cls: string }> = {
      unsupported: { label: "SW: n/d", cls: "bg-muted text-muted-foreground" },
      none: { label: "SW: nenhum", cls: "bg-muted text-muted-foreground" },
      installing: { label: "SW: instalando", cls: "bg-amber-500/20 text-amber-200" },
      waiting: { label: "SW: aguardando", cls: "bg-amber-500/20 text-amber-200" },
      active: { label: "SW: ativo", cls: "bg-emerald-500/20 text-emerald-200" },
      error: { label: "SW: erro", cls: "bg-destructive/20 text-destructive" },
    };
    return map[swState];
  }, [swState]);

  if (!visible) return null;

  const handleHardRefresh = async () => {
    setBusy(true);
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      await clearRuntimeCaches();
      forceHardReload();
    } finally {
      setBusy(false);
    }
  };

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(LS_COLLAPSED, next ? "1" : "0");
    } catch {}
  };

  const handleClose = () => {
    setVisible(false);
    try {
      localStorage.removeItem(LS_VISIBLE);
    } catch {}
  };

  const toggleChunkCheck = () => {
    const next = !chunkCheckEnabled;
    setChunkCheckEnabled(next);
    try {
      localStorage.setItem(LS_CHUNK_CHECK, next ? "1" : "0");
    } catch {}
  };

  const handleExportReport = async () => {
    setBusy(true);
    try {
      const validation = chunkCheckEnabled
        ? validateChunkHashes({ includeDynamic: true })
        : { status: "disabled", note: "chunk check desativado pelo usuário" };

      const inspectorHistory =
        (window as any).__FJ_TEXT_INSPECTOR_HISTORY__ ?? [];

      const report = {
        generatedAt: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          dpr: window.devicePixelRatio,
        },
        build: BUILD_INFO,
        serviceWorker: { state: swState },
        chunkValidation: validation,
        edgeCallsRecent: calls,
        textInspectorHistory: inspectorHistory,
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fj-bugreport-${BUILD_INFO.shortHash}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportFeedback("Relatório baixado");
      window.setTimeout(() => setExportFeedback(null), 3000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="build-status-panel"
      className="fixed bottom-3 left-3 z-[170] w-[260px] rounded-lg border border-border bg-background/95 p-3 text-xs shadow-2xl backdrop-blur-sm"
      style={{ pointerEvents: "auto" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <Hash className="h-3.5 w-3.5" />
          <span data-testid="build-hash">{BUILD_INFO.shortHash}</span>
          <span className={`ml-1 rounded px-1.5 py-0.5 text-[10px] ${swBadge.cls}`}>
            {swBadge.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleCollapse}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={collapsed ? "Expandir" : "Recolher"}
          >
            {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={handleClose}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Server className="h-3 w-3" />
              <span>{BUILD_INFO.mode}</span>
              <span>·</span>
              <span title={BUILD_INFO.timestamp}>
                {new Date(BUILD_INFO.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Toggle de validação de chunk */}
          <div className="mt-2 flex items-center justify-between rounded border border-border/50 bg-muted/30 px-2 py-1">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {chunkCheckEnabled ? (
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
              ) : (
                <ShieldAlert className="h-3 w-3 text-muted-foreground" />
              )}
              <span>Validação de chunk hash</span>
            </div>
            <button
              data-testid="build-status-toggle-chunk-check"
              onClick={toggleChunkCheck}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                chunkCheckEnabled
                  ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {chunkCheckEnabled ? "ON" : "OFF"}
            </button>
          </div>

          <div className="mt-2 max-h-32 overflow-y-auto rounded border border-border/50 bg-muted/40">
            <div className="flex items-center gap-1 border-b border-border/50 px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              <Activity className="h-3 w-3" /> Edge Functions ({calls.length})
            </div>
            {calls.length === 0 && (
              <div className="px-2 py-2 text-center text-[10px] text-muted-foreground">
                Sem chamadas registradas
              </div>
            )}
            {calls.map((c, i) => (
              <div
                key={`${c.ts}-${i}`}
                className="flex items-center justify-between px-2 py-1 text-[10px] font-mono"
              >
                <span className="truncate" title={c.fn}>
                  {c.fn}
                </span>
                <span
                  className={
                    c.status >= 200 && c.status < 300
                      ? "text-emerald-400"
                      : c.status === 0
                        ? "text-destructive"
                        : "text-amber-400"
                  }
                >
                  {c.status || "ERR"} · {c.ms}ms
                </span>
              </div>
            ))}
          </div>

          {chunkValidation && chunkValidation.status === "mismatch" && (
            <div
              data-testid="build-status-mismatch-alert"
              className="mt-2 flex items-start gap-1.5 rounded border border-destructive/40 bg-destructive/10 p-2 text-[10px] text-destructive"
            >
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <div>
                <div className="font-semibold">CDN/SW servindo build antigo</div>
                <div className="opacity-80">
                  Esperado: {chunkValidation.expectedHash} · Carregados:{" "}
                  {chunkValidation.loadedHashes.slice(0, 2).join(", ") || "—"}
                </div>
              </div>
            </div>
          )}
          {chunkValidation && chunkValidation.status === "ok" && (
            <div
              data-testid="build-status-chunks-ok"
              className="mt-2 text-[10px] text-emerald-400"
            >
              ✓ chunks ({chunkValidation.hashedAssetCount}) batem com o build
            </div>
          )}
          {chunkValidation && chunkValidation.status === "dev" && (
            <div
              data-testid="build-status-chunks-dev"
              className="mt-2 text-[10px] text-muted-foreground"
            >
              ℹ︎ modo dev — assets sem hash, validação informativa
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleHardRefresh}
            disabled={busy}
            data-testid="build-status-hard-refresh"
            className="mt-2 h-7 w-full text-[11px]"
          >
            {busy ? (
              <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-1 h-3 w-3" />
            )}
            Limpar cache e recarregar
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              setBusy(true);
              try {
                const result = await clearScopedCaches("diet-templates");
                setScopedFeedback(
                  `${result.cacheEntriesRemoved} cache · ${result.queriesInvalidated} queries`,
                );
                window.setTimeout(() => reloadScopedRoute("/diet-templates"), 350);
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            data-testid="build-status-scoped-clear-templates"
            className="mt-1 h-7 w-full text-[11px]"
          >
            <FolderSync className="mr-1 h-3 w-3" />
            Limpar só /diet-templates
          </Button>
          {scopedFeedback && (
            <div className="mt-1 text-center text-[10px] text-muted-foreground">
              {scopedFeedback}
            </div>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={handleExportReport}
            disabled={busy}
            data-testid="build-status-export-report"
            className="mt-1 h-7 w-full text-[11px]"
          >
            <Download className="mr-1 h-3 w-3" />
            Exportar relatório (JSON)
          </Button>
          {exportFeedback && (
            <div className="mt-1 text-center text-[10px] text-emerald-400">
              {exportFeedback}
            </div>
          )}
        </>
      )}
    </div>
  );
}
