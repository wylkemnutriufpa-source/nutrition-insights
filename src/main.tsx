import { createRoot } from "react-dom/client";
import "./i18n";
import App from "./App.tsx";
import "./index.css";

const APP_SHELL_VERSION = "2026-03-19-sync-1";

function isPreviewHost() {
  return window.location.hostname.includes("id-preview--");
}

async function disablePreviewServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ("caches" in window) {
    const cacheKeys = await window.caches.keys();
    await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
  }
}

async function syncApplicationShell() {
  if (!("serviceWorker" in navigator)) return;

  if (isPreviewHost()) {
    await disablePreviewServiceWorker();
    return;
  }

  const cachedVersion = window.localStorage.getItem("fj_app_shell_version");
  if (cachedVersion !== APP_SHELL_VERSION && "caches" in window) {
    const cacheKeys = await window.caches.keys();
    await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
    window.localStorage.setItem("fj_app_shell_version", APP_SHELL_VERSION);
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.update()));
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

