import { createRoot } from "react-dom/client";
import "./i18n";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundaryDebug } from "@/components/common/ErrorBoundaryDebug";
import { stampBuildIdentity } from "./lib/buildInfo";
import { startVersionSync } from "./lib/versionCheck";

// Boot silent
const VERSION = "2.4.3-pwa-stable";
if (import.meta.env.DEV) {
  console.log("%c[FitJourney:Boot] Iniciando sistema...", "color: #10b981; font-weight: bold; font-size: 12px;", {
    version: VERSION
  });
}

// Estampa hash/timestamp do build em <html>, window.__BUILD_INFO__ e console.
stampBuildIdentity();

// Verificação imediata de versão para evitar boot com bundle desatualizado
if (!isPreviewHost() && !isInIframe()) {
  fetch("/version.json?t=" + Date.now())
    .then(r => r.json())
    .then(remote => {
      const localVersion = (window as any).__BUILD_VERSION__;
      if (remote && remote.version && localVersion && remote.version !== localVersion) {
        console.warn("[FitJourney:Stability] Bundle Desatualizado Detectado no Boot. Forçando atualização...");
        if ("caches" in window) caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.getRegistrations().then(regs => {
            regs.forEach(r => r.unregister());
            window.location.reload();
          });
        } else {
          window.location.reload();
        }
      }
    })
    .catch(() => { /* silent */ });
}

/**
 * Global Stability Guard: Captura erros críticos de carregamento (ChunkLoadError)
 * e re-renders infinitos (React #310) antes mesmo do React montar.
 */
const handleGlobalStabilityError = (error: any) => {
  const errorMsg = error?.message || String(error);
  const isChunkError = /loading.*chunk/i.test(errorMsg) || /failed.*fetch/i.test(errorMsg);
  const isInfiniteLoop = errorMsg.includes("Minified React error #310") || errorMsg.includes("Too many re-renders");

  console.error("[FitJourney:Stability] Erro Crítico Detectado:", {
    msg: errorMsg,
    isChunkError,
    isInfiniteLoop,
    timestamp: Date.now()
  });

  if (isChunkError) {
    // Se falhou carregar um pedaço do JS, a única solução é recarregar do servidor.
    // Usamos sessionStorage para evitar loops de recarregamento infinito.
    const lastReload = sessionStorage.getItem("fj:chunk-reload-ts");
    const now = Date.now();
    if (!lastReload || now - Number(lastReload) > 30000) {
      sessionStorage.setItem("fj:chunk-reload-ts", String(now));
      console.warn("[FitJourney:Stability] ChunkMismatch detectado. Forçando reload...");
      window.location.reload();
    }
  }

  if (isInfiniteLoop) {
    // Se detectamos loop de re-render, limpamos o cache de estado e recarregamos.
    console.warn("[FitJourney:Stability] InfiniteLoop detectado. Limpando sessão...");
    sessionStorage.clear();
    window.location.href = "/";
  }
};

window.addEventListener("error", (e) => handleGlobalStabilityError(e.error));
window.addEventListener("unhandledrejection", (e) => handleGlobalStabilityError(e.reason));

/**
 * Preview / iframe detection — used to prevent SW registration in dev.
 */
function isPreviewHost() {
  return (
    window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com")
  );
}

function isInIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * In preview/iframe contexts: unregister any stale service workers and clear caches.
 * In production: do nothing — VitePWA handles everything via autoUpdate + useRegisterSW.
 */
if (isPreviewHost() || isInIframe()) {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  }
} else {
  // Em produção, se o Service Worker estiver travado, skipWaiting + clients.claim
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    });
    
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.log("[FitJourney:SW] Novo Service Worker assumiu o controle. Recarregando...");
      window.location.reload();
    });
  }

  // Em produção, se detectamos inconsistência grave, limpamos tudo
  if (window.location.search.includes("clear_cache=1")) {
    if ("caches" in window) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
    }
    // Também limpa o storage para garantir limpeza total
    localStorage.clear();
    sessionStorage.clear();
    const url = new URL(window.location.href);
    url.searchParams.delete("clear_cache");
    window.location.replace(url.toString());
  }
}

/**
 * Anti-cache rescue path: handles /~oauth/ bypass.
 */
(function rescueFromStaleServiceWorker() {
  try {
    const path = window.location.pathname;
    if (!path.startsWith("/~oauth/")) return;

    sessionStorage.setItem("fj:rescue-boot", String(Date.now()));

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister().catch(() => {}));
      }).catch(() => {});
    }
    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k).catch(() => {}))).catch(() => {});
    }
  } catch {
    // best-effort
  }
})();

const root = document.getElementById("root");

if (root) {
  const reactRoot = createRoot(root);
  reactRoot.render(
    <ErrorBoundaryDebug name="Root">
      <App />
    </ErrorBoundaryDebug>
  );

  // Sinaliza ao index.html que o app montou com sucesso
  setTimeout(() => {
    if (typeof (window as any).__FJ_MARK_READY__ === "function") {
      (window as any).__FJ_MARK_READY__();
    }
  }, 100);
}

// Start the version sync loop AFTER the app mounts.
startVersionSync();
