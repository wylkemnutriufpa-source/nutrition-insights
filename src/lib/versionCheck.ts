/**
 * FitJourney — Version Sync System
 *
 * Polls /version.json and forces a clean reload when the deployed version
 * differs from the version embedded in the running bundle.
 *
 * Goals:
 *  - ZERO manual cache clearing
 *  - ZERO update delay (auto-refresh within POLL_INTERVAL_MS of deploy)
 *  - User always on the correct version
 */

import { BUILD_INFO } from "./buildInfo";

const LOCAL_VERSION =
  typeof __BUILD_VERSION__ !== "undefined"
    ? __BUILD_VERSION__
    : `${BUILD_INFO.hash}-${Date.parse(BUILD_INFO.timestamp) || 0}`;

const POLL_INTERVAL_MS = 2 * 60 * 1000; // every 2 minutes
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
              // Try to update first; if a new SW is waiting, activate it.
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

function hardReload(): void {
  const url = new URL(window.location.href);
  url.searchParams.set("v", String(Date.now()));
  window.location.replace(url.toString());
}

async function checkOnce(): Promise<void> {
  const remote = await fetchRemoteVersion();
  if (!remote || !remote.version) {
    console.info("[FJ:Version] check skipped — no remote version available");
    return;
  }

  const isMatch = remote.version === LOCAL_VERSION;
  console.info(
    `[FJ:Version] local=${LOCAL_VERSION} remote=${remote.version} action=${
      isMatch ? "ok" : "reload"
    }`
  );

  if (isMatch) return;
  if (!canReloadNow()) {
    console.warn("[FJ:Version] reload throttled — waiting for cooldown");
    return;
  }

  markReload();
  await nukeCachesAndSW();
  hardReload();
}

/**
 * Start the version sync loop. Safe to call multiple times.
 * Skips automatically inside Lovable preview / iframe environments.
 */
export function startVersionSync(): void {
  if (started) return;
  started = true;

  // Expose current version for debugging / E2E
  try {
    (window as any).__APP_VERSION__ = LOCAL_VERSION;
  } catch {}

  if (isPreviewOrIframe()) {
    console.info("[FJ:Version] preview/iframe detected — version sync disabled");
    return;
  }

  // Initial check after a short delay so the app can boot first
  setTimeout(() => {
    void checkOnce();
  }, 5_000);

  // Periodic check
  timer = setInterval(() => {
    void checkOnce();
  }, POLL_INTERVAL_MS);

  // Re-check when the tab becomes visible again
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void checkOnce();
    }
  });

  // Re-check when network comes back
  window.addEventListener("online", () => {
    void checkOnce();
  });
}

export function stopVersionSync(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  started = false;
}

export const APP_VERSION = LOCAL_VERSION;
