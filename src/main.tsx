import { createRoot } from "react-dom/client";
import "./i18n";
import App from "./App.tsx";
import "./index.css";

/**
 * Cache-busting: uses build timestamp so every deploy invalidates old SW caches.
 * This prevents the app from "reverting" to a stale cached version.
 */
const APP_SHELL_VERSION = `build-${__BUILD_TIMESTAMP__}`;

function isPreviewHost() {
  return window.location.hostname.includes("id-preview--");
}

async function nukeAllCachesAndWorkers() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
  }
  if ("caches" in window) {
    const keys = await window.caches.keys();
    await Promise.all(keys.map((k) => window.caches.delete(k)));
  }
}

async function syncApplicationShell() {
  if (!("serviceWorker" in navigator)) return;

  // Preview environments: NEVER use service workers — always nuke them
  if (isPreviewHost()) {
    await nukeAllCachesAndWorkers();
    return;
  }

  // Production: invalidate caches when build version changes
  const cachedVersion = localStorage.getItem("fj_app_shell_version");
  if (cachedVersion !== APP_SHELL_VERSION) {
    await nukeAllCachesAndWorkers();
    localStorage.setItem("fj_app_shell_version", APP_SHELL_VERSION);
    // Force a clean reload after purging stale caches
    if (cachedVersion !== null) {
      window.location.reload();
      return;
    }
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((r) => r.update()));
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  void syncApplicationShell();

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (isPreviewHost()) return;
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(<App />);

