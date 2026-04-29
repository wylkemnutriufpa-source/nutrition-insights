/**
 * FitJourney — Version Sync System
 *
 * Polls /version.json and forces a clean reload when the deployed version
 * differs from the version embedded in the running bundle.
 *
 * UX Safe Rules:
 * - Detects active user (typing, open modals, busy states)
 * - Defer auto-reload if user is active
 * - Passive updates via events/banners
 */

import { BUILD_INFO } from "./buildInfo";

const LOCAL_VERSION =
  typeof __BUILD_VERSION__ !== "undefined"
    ? __BUILD_VERSION__
    : `${BUILD_INFO.hash}-${Date.parse(BUILD_INFO.timestamp) || 0}`;

const POLL_INTERVAL_MS = 60 * 1000; // a cada 1 minuto para maior sensibilidade
const RELOAD_LOCK_KEY = "fj:version-reload-ts";
const RELOAD_LOCK_MS = 30 * 1000; // never reload twice in 30s

let started = false;
let timer: ReturnType<typeof setInterval> | null = null;

interface RemoteVersion {
  version?: string;
  hash?: string;
  timestamp?: string;
}

function isPreviewOrIframe(): boolean {
  try {
    const inIframe = window.self !== window.top;
    const previewHost =
      window.location.hostname.includes("id-preview--") ||
      window.location.hostname.includes("lovableproject.com");
    return inIframe || previewHost;
  } catch {
    return true;
  }
}

async function fetchRemoteVersion(): Promise<RemoteVersion | null> {
  try {
    const url = `/version.json?t=${Date.now()}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    return (await res.json()) as RemoteVersion;
  } catch {
    return null;
  }
}

async function nukeCachesAndSW(): Promise<void> {
  const tasks: Promise<unknown>[] = [];

  if ("caches" in window) {
    tasks.push(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {})
    );
  }

  if ("serviceWorker" in navigator) {
    tasks.push(
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) =>
          Promise.all(
            regs.map((r) =>
              r
                .update()
                .catch(() => {})
                .then(() => {
                  if (r.waiting) {
                    try {
                      r.waiting.postMessage({ type: "SKIP_WAITING" });
                    } catch {}
                  }
                })
            )
          )
        )
        .catch(() => {})
    );
  }

  await Promise.allSettled(tasks);
}

function canReloadNow(): boolean {
  try {
    const last = sessionStorage.getItem(RELOAD_LOCK_KEY);
    if (!last) return true;
    return Date.now() - Number(last) > RELOAD_LOCK_MS;
  } catch {
    return true;
  }
}

function markReload(): void {
  try {
    sessionStorage.setItem(RELOAD_LOCK_KEY, String(Date.now()));
  } catch {}
}

function hardReload(reason: string): void {
  console.info(`[FJ:Version] forcing reload. reason=${reason}`);
  const url = new URL(window.location.href);
  url.searchParams.set("v", String(Date.now()));
  
  // Forçar atualização ignorando cache do navegador se possível
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const registration of registrations) {
        registration.update();
      }
    });
  }
  
  window.location.href = url.toString();
}

export function isUserActive(): boolean {
  // 1. Focused input
  const activeEl = document.activeElement;
  const isTyping = activeEl && (
    activeEl.tagName === 'INPUT' || 
    activeEl.tagName === 'TEXTAREA' || 
    (activeEl as HTMLElement).isContentEditable
  );
  if (isTyping) return true;

  // 2. Busy states (autosave, forms)
  const busyElement = document.querySelector('[data-state="busy"], [data-loading="true"], [data-form-dirty="true"]');
  if (busyElement) return true;

  // 3. Open UI elements (Modals, Sheets, etc)
  const modalOpen = document.querySelector('[role="dialog"], [role="menu"], [data-state="open"]');
  if (modalOpen) return true;

  return false;
}

async function checkOnce(forceReload = false): Promise<void> {
  const remote = await fetchRemoteVersion();
  if (!remote || !remote.version) return;

  const isMatch = remote.version === LOCAL_VERSION;
  
  try {
    (window as any).__FJ_VERSION_MISMATCH__ = !isMatch;
  } catch {}

  if (isMatch) return;

  if (!canReloadNow()) return;

  const active = isUserActive();
  
  if (!forceReload && active) {
    console.info("[FJ:Version] Update available, but user is active. Deferring reload...");
    window.dispatchEvent(new CustomEvent('fj-update-available', { 
      detail: { version: remote.version, local: LOCAL_VERSION } 
    }));
    return;
  }

  // Se o usuário não está digitando/ativo ou foi forçado (clique), atualizamos imediatamente
  console.info("[FJ:Version] Inactive or forced. Purging caches and reloading...");

  markReload();
  await nukeCachesAndSW();
  hardReload(forceReload ? "manual-click" : (active ? "deferred-active" : "auto-idle"));
}

export function forceUpdate(): void {
  void checkOnce(true);
}

export function startVersionSync(): void {
  if (started) return;
  started = true;

  try {
    (window as any).__APP_VERSION__ = LOCAL_VERSION;
    (window as any).__FJ_VERSION_MISMATCH__ = false;
    // Sincronização de versão silenciada
  } catch {}

  if (isPreviewOrIframe()) return;

  setTimeout(() => { void checkOnce(); }, 5_000);

  timer = setInterval(() => { void checkOnce(); }, POLL_INTERVAL_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void checkOnce();
    }
  });

  window.addEventListener("online", () => { void checkOnce(); });
}

export function stopVersionSync(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  started = false;
}

export const APP_VERSION = LOCAL_VERSION;
