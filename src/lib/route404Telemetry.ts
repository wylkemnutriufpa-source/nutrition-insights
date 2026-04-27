import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "fj:404-session";

function getSessionId() {
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return null;
  }
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

async function hasServiceWorker(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator)) return false;
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.length > 0;
  } catch {
    return false;
  }
}

export async function logRoute404(extra: Record<string, unknown> = {}) {
  try {
    const swActive = await hasServiceWorker();
    const buildHash = (window as any).__BUILD_INFO__?.hash || null;
    await supabase.functions.invoke("log-route-404", {
      body: {
        pathname: window.location.pathname,
        full_url: window.location.href,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        is_standalone: detectStandalone(),
        has_service_worker: swActive,
        build_hash: buildHash,
        session_id: getSessionId(),
        metadata: extra,
      },
    });
  } catch (err) {
    // Telemetry must never block UX
    console.warn("[404Telemetry] failed:", (err as any)?.message || err);
  }
}

/**
 * Hard reset for stuck iOS Safari / PWA: unregister every service worker,
 * delete every cache and hard-reload from the network.
 */
export async function hardResetPwaCaches() {
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
    } catch {}
  } catch (err) {
    console.warn("[hardResetPwaCaches] partial failure:", err);
  }

  // Force-bypass the SW on the next request and reload to "/".
  const url = new URL(window.location.origin);
  url.searchParams.set("fj_reset", String(Date.now()));
  window.location.replace(url.toString());
}