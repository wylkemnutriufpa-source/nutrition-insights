/**
 * FitJourney — Chunk Hash Validator
 *
 * Detecta se o navegador está executando assets de um build ANTERIOR ao
 * declarado em __BUILD_INFO__.
 *
 * v2: agora também monitora chunks injetados em runtime (dynamic import)
 *     via MutationObserver + PerformanceObserver, e pode reavaliar a
 *     validação após o primeiro render.
 */
import { BUILD_INFO } from "@/lib/buildInfo";

export type ChunkValidationStatus = "ok" | "mismatch" | "dev" | "unknown";

export interface ChunkValidationResult {
  status: ChunkValidationStatus;
  expectedHash: string;
  loadedHashes: string[];
  hashedAssetCount: number;
  message: string;
  /** URLs completas dos assets analisados (útil em bug reports). */
  loadedUrls?: string[];
  /** Inclui assets carregados dinamicamente após primeiro render. */
  includesDynamic?: boolean;
}

const HASHED_RE = /\/assets\/[^/?#]+-([a-z0-9]{6,})\.(?:js|css|mjs)/i;

/** Conjunto global de URLs já capturadas (estático + dinâmico). */
const dynamicUrls = new Set<string>();
let dynamicObserverInstalled = false;

function collectStaticAssetUrls(): string[] {
  const urls: string[] = [];
  document.querySelectorAll<HTMLScriptElement>("script[src]").forEach((s) => {
    if (s.src) urls.push(s.src);
  });
  document.querySelectorAll<HTMLLinkElement>("link[href]").forEach((l) => {
    if (l.href && (l.rel === "stylesheet" || l.rel === "modulepreload")) {
      urls.push(l.href);
    }
  });
  return urls;
}

/**
 * Instala observadores que capturam chunks adicionados em runtime
 * (dynamic import emite <script> + <link rel=modulepreload>, e o navegador
 * registra entradas em PerformanceObserver "resource").
 *
 * Idempotente: pode ser chamada várias vezes.
 */
export function installDynamicChunkObservers(): void {
  if (typeof window === "undefined" || dynamicObserverInstalled) return;
  dynamicObserverInstalled = true;

  // 1) MutationObserver — captura <script>/<link> injetados pelo loader do Vite.
  try {
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return;
          if (n.tagName === "SCRIPT" && (n as HTMLScriptElement).src) {
            dynamicUrls.add((n as HTMLScriptElement).src);
          }
          if (n.tagName === "LINK") {
            const link = n as HTMLLinkElement;
            if (link.href && (link.rel === "stylesheet" || link.rel === "modulepreload")) {
              dynamicUrls.add(link.href);
            }
          }
        });
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch {}

  // 2) PerformanceObserver — captura QUALQUER recurso carregado, mesmo que
  //    o elemento DOM já tenha sido removido (ex.: prefetch concluído).
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const url = (entry as PerformanceResourceTiming).name;
        if (HASHED_RE.test(url)) dynamicUrls.add(url);
      }
    });
    po.observe({ type: "resource", buffered: true });
  } catch {}
}

export function validateChunkHashes(opts?: { includeDynamic?: boolean }): ChunkValidationResult {
  if (typeof document === "undefined") {
    return {
      status: "unknown",
      expectedHash: BUILD_INFO.shortHash,
      loadedHashes: [],
      hashedAssetCount: 0,
      message: "DOM indisponível",
    };
  }

  if (BUILD_INFO.mode !== "production") {
    return {
      status: "dev",
      expectedHash: BUILD_INFO.shortHash,
      loadedHashes: [],
      hashedAssetCount: 0,
      message: "Modo dev (assets sem hash)",
    };
  }

  const includeDynamic = opts?.includeDynamic ?? true;
  const urls = [
    ...collectStaticAssetUrls(),
    ...(includeDynamic ? Array.from(dynamicUrls) : []),
  ];

  const seen = new Set<string>();
  const loadedHashes: string[] = [];
  for (const url of urls) {
    const m = HASHED_RE.exec(url);
    if (m && m[1] && !seen.has(m[1])) {
      seen.add(m[1]);
      loadedHashes.push(m[1]);
    }
  }

  if (loadedHashes.length === 0) {
    return {
      status: "unknown",
      expectedHash: BUILD_INFO.shortHash,
      loadedHashes: [],
      hashedAssetCount: 0,
      message: "Nenhum asset hash detectado",
      loadedUrls: urls,
      includesDynamic: includeDynamic,
    };
  }

  const expected = BUILD_INFO.shortHash.toLowerCase();
  const matchesExpected = loadedHashes.some((h) =>
    h.toLowerCase().includes(expected),
  );

  if (matchesExpected) {
    return {
      status: "ok",
      expectedHash: BUILD_INFO.shortHash,
      loadedHashes,
      hashedAssetCount: loadedHashes.length,
      message: `OK (${loadedHashes.length} assets${includeDynamic ? ", inclui dinâmicos" : ""})`,
      loadedUrls: urls,
      includesDynamic: includeDynamic,
    };
  }

  return {
    status: "mismatch",
    expectedHash: BUILD_INFO.shortHash,
    loadedHashes,
    hashedAssetCount: loadedHashes.length,
    message: `Hash do build (${BUILD_INFO.shortHash}) não encontrado em nenhum chunk carregado`,
    loadedUrls: urls,
    includesDynamic: includeDynamic,
  };
}
