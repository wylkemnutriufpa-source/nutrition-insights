import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./i18n";
import App from "./App.tsx";
import "./index.css";

const APP_SHELL_VERSION = "2026-03-19-sync-1";

async function syncApplicationShell() {
  if (!("serviceWorker" in navigator)) return;

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
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      void updateSW(true);
    },
    onRegisteredSW(_swUrl, registration) {
      registration?.update();
    },
  });
}

createRoot(document.getElementById("root")!).render(<App />);
