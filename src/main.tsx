import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { CoreProviders } from "./providers/CoreProviders";

// Hard Clear no Boot: Se a URL contiver ?clear, limpa tudo e recomeça
if (window.location.search.includes('clear')) {
  console.log("[HARD CLEAR] Limpando estados locais...");
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = window.location.origin + '/auth';
}

// Auto-recover from stale dynamic-import chunks after a deploy
// (browser/SW caches an old index.js that points to chunk hashes that no longer exist)
const RELOAD_KEY = "fj_chunk_reload_attempt";
const handleChunkLoadError = (msg: string) => {
  const isChunkError =
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk \d+ failed/i.test(msg);
  if (!isChunkError) return;
  const lastAttempt = Number(sessionStorage.getItem(RELOAD_KEY) || "0");
  if (Date.now() - lastAttempt < 10_000) return; // avoid reload loop
  sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  console.warn("[FJ] Stale chunk detected — clearing caches and reloading…");
  const doReload = () => { (window as Window).location.reload(); };
  if ("caches" in window) {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).finally(doReload);
  } else {
    doReload();
  }
};

window.addEventListener("error", (e) => handleChunkLoadError(e.message || ""));
window.addEventListener("unhandledrejection", (e) => {
  const reason: any = e.reason;
  handleChunkLoadError(reason?.message || String(reason || ""));
});

const rootElement = document.getElementById("root");
if (rootElement) {
  const reactRoot = createRoot(rootElement);
  reactRoot.render(
    <CoreProviders>
      <App />
    </CoreProviders>
  );
}
