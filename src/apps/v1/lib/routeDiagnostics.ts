/**
 * Diagnostics utilities for the NotFound page.
 *
 * Collects everything we need to know to explain why the user landed on a
 * 404 (was the URL part of an /~oauth/ flow? Is there a stale SW? Are there
 * cached responses?) and exposes a single "auto-fix" routine that wipes
 * SW + caches and reloads the canonical version of the URL.
 */

export interface RouteDiagnostics {
  pathname: string;
  isOauthBypass: boolean;
  hasServiceWorker: boolean;
  serviceWorkerScopes: string[];
  cacheNames: string[];
  isStandalone: boolean;
  isIosSafari: boolean;
  buildHash: string | null;
  collectedAt: string;
}

function detectStandalone(): boolean {
  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true
    );
  } catch {
    return false;
  }
}

function detectIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome/i.test(ua);
  return isIos && isSafari;
}

export async function collectRouteDiagnostics(): Promise<RouteDiagnostics> {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const isOauthBypass = pathname.startsWith("/~oauth/");

  let hasServiceWorker = false;
  let serviceWorkerScopes: string[] = [];
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      hasServiceWorker = regs.length > 0;
      serviceWorkerScopes = regs.map((r) => r.scope || "(unknown)");
    }
  } catch {
    /* noop */
  }

  let cacheNames: string[] = [];
  try {
    if ("caches" in window) {
      cacheNames = await caches.keys();
    }
  } catch {
    /* noop */
  }

  return {
    pathname,
    isOauthBypass,
    hasServiceWorker,
    serviceWorkerScopes,
    cacheNames,
    isStandalone: detectStandalone(),
    isIosSafari: detectIosSafari(),
    buildHash: (window as any).__BUILD_INFO__?.hash ?? null,
    collectedAt: new Date().toISOString(),
  };
}

/**
 * Best-effort one-click "fix it" for stuck PWA / SW state.
 * Unregisters every SW, deletes every cache and navigates to the
 * canonical version of the current URL (stripping the /~oauth/ prefix).
 */
export async function attemptAutoFix(pathname: string): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
    }
    try {
      localStorage.removeItem("fj:update-dismissed-at");
      localStorage.removeItem("fj:update-dismissed-version");
    } catch {
      /* noop */
    }
  } catch (err) {
    console.warn("[attemptAutoFix] partial failure:", err);
  }

  // Strip the anti-cache prefix so the user actually reaches the real route.
  const canonicalPath = pathname.startsWith("/~oauth/")
    ? pathname.replace(/^\/~oauth/, "")
    : pathname;
  const url = new URL(window.location.origin + canonicalPath + window.location.search);
  url.searchParams.set("fj_reset", String(Date.now()));
  window.location.replace(url.toString());
}
