import { createRoot } from "react-dom/client";
import "./i18n";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundaryDebug } from "@/components/common/ErrorBoundaryDebug";
import { stampBuildIdentity } from "./lib/buildInfo";

// Boot determinístico
const VERSION = "2.5.0-deterministic";
if (import.meta.env.DEV) {
  console.log("%c[FitJourney:Boot] Inicializando sistema determinístico...", "color: #10b981; font-weight: bold; font-size: 12px;", {
    version: VERSION
  });
}

// Estampa hash/timestamp do build em <html>, window.__BUILD_INFO__ e console.
stampBuildIdentity();

/**
 * Global Error Handler: Garante que erros não sejam silenciados.
 * O sistema deve falhar rápido e de forma visível.
 */
window.addEventListener("error", (e) => {
  console.error("[FitJourney:FailFast] Erro Crítico não tratado:", e.error);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("[FitJourney:FailFast] Promise Rejection não tratada:", e.reason);
});

const root = document.getElementById("root");

if (root) {
  const reactRoot = createRoot(root);
  reactRoot.render(
    <ErrorBoundaryDebug name="Root">
      <App />
    </ErrorBoundaryDebug>
  );

}
