import { createRoot } from "react-dom/client";
import "./i18n";
import App from "./App.tsx";
import "./index.css";
import { stampBuildIdentity } from "./lib/buildInfo";

// Diagnóstico de inicialização para depuração de ambiente (Preview vs Prod)
console.log("[FitJourney:Boot] Iniciando sistema...", {
  hostname: window.location.hostname,
  origin: window.location.origin,
  timestamp: new Date().toISOString(),
  env: import.meta.env.MODE,
  isDev: import.meta.env.DEV
});

// Estampa hash/timestamp do build em <html>, window.__BUILD_INFO__ e console.
// Crítico para confirmar que a versão publicada é a que está rodando.
stampBuildIdentity();


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
  if ("caches" in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
}

/**
 * Anti-cache rescue path: when a stale Service Worker (very common on iOS Safari)
 * intercepts navigation and returns an old shell, we expose `/~oauth/<canonical>`
 * shortcuts that:
 *   1) bypass `navigateFallback` via `navigateFallbackDenylist` in vite.config.ts
 *   2) on boot, force-unregister any existing SW and clear caches
 *   3) rewrite the URL back to the canonical path (e.g. /convite/CODE)
 *
 * This guarantees that a patient who clicks an invitation link from a phone
 * that has the old PWA cached will land on the fresh build.
 */
(function rescueFromStaleServiceWorker() {
  try {
    const path = window.location.pathname;
    if (!path.startsWith("/~oauth/")) return;

    // Tag this rescue boot so the React app can react if needed.
    sessionStorage.setItem("fj:rescue-boot", String(Date.now()));

    // Force-clear stale SW + caches synchronously-as-possible.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister().catch(() => {}));
      }).catch(() => {});
    }
    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k).catch(() => {}))).catch(() => {});
    }
    // The CanonicalPublicRedirect route in App.tsx will rewrite the URL back to
    // its canonical form once React mounts, preserving the original query/hash.
  } catch {
    // best-effort
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
