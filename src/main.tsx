import { createRoot } from "react-dom/client";
import "./i18n";
import App from "./App.tsx";
import "./index.css";

/**
 * Cache-busting: uses build timestamp so every deploy invalidates old SW caches.
 */
const APP_SHELL_VERSION = `build-${typeof __BUILD_TIMESTAMP__ !== "undefined" ? __BUILD_TIMESTAMP__ : Date.now().toString(36)}`;

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

/**
 * Aggressive SW lifecycle management:
 * 1. Preview/iframe: always nuke SW — never cache in dev
 * 2. Production: version-check → nuke stale caches → force SW update
 * 3. Poll for updates every 60s so patients get changes within 1 minute
 */
async function syncApplicationShell() {
  if (!("serviceWorker" in navigator)) return;

  // Preview or iframe: NEVER use service workers
  if (isPreviewHost() || isInIframe()) {
    await nukeAllCachesAndWorkers();
    return;
  }

  // Production: invalidate caches when build version changes
  const cachedVersion = localStorage.getItem("fj_app_shell_version");
  if (cachedVersion !== APP_SHELL_VERSION) {
    console.log("[FJ:SW] Build version changed, purging caches...", { old: cachedVersion, new: APP_SHELL_VERSION });
    await nukeAllCachesAndWorkers();
    localStorage.setItem("fj_app_shell_version", APP_SHELL_VERSION);
    if (cachedVersion !== null) {
      window.location.reload();
      return;
    }
  }

  // Force all existing SWs to check for updates immediately
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((r) => r.update()));

  // Poll for SW updates every 60 seconds (instead of waiting for next navigation)
  setInterval(async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.update()));
    } catch {
      // Silently ignore — network might be offline
    }
  }, 60 * 1000);
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  void syncApplicationShell();

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (isPreviewHost() || isInIframe()) return;
    if (refreshing) return;
    refreshing = true;
    console.log("[FJ:SW] New service worker activated, reloading...");
    window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
