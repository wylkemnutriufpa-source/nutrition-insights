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

createRoot(document.getElementById("root")!).render(<App />);
