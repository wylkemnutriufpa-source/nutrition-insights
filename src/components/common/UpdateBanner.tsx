import { useRegisterSW } from "virtual:pwa-register/react";
import { useState, useCallback, useEffect } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "fj:update-dismissed-at";
const DISMISS_COOLDOWN_MS = 30 * 60 * 1000; // 30 min cooldown after dismiss/update (was 5)
const SW_BOOT_KEY = "fj:sw-boot-ts";
const SW_BOOT_GRACE_MS = 15 * 1000; // ignore controllerchange for 15s after page load (avoids reload loop on iOS)

async function clearRuntimeCaches() {
  const tasks: Promise<unknown>[] = [];

  if ("caches" in window) {
    tasks.push(
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
    );
  }

  const queryClient = (window as any).__REACT_QUERY_CLIENT__;
  if (queryClient?.clear) {
    tasks.push(Promise.resolve(queryClient.clear()));
  }

  await Promise.allSettled(tasks);
}

function forceHardReload() {
  const url = new URL(window.location.href);
  url.searchParams.set("refresh", String(Date.now()));
  window.location.replace(url.toString());
}

function wasDismissedRecently(): boolean {
  try {
    // Use localStorage so dismiss persists across hard reloads (was sessionStorage which gets cleared)
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {}
}

/** Records the time this page instance booted so we can ignore the very first
 * controllerchange (which fires on normal first-load activation, not a real update). */
function markBoot() {
  try {
    sessionStorage.setItem(SW_BOOT_KEY, String(Date.now()));
  } catch {}
}

function isWithinBootGrace(): boolean {
  try {
    const ts = sessionStorage.getItem(SW_BOOT_KEY);
    if (!ts) return true; // no boot timestamp yet → assume booting
    return Date.now() - Number(ts) < SW_BOOT_GRACE_MS;
  } catch {
    return false;
  }
}

/**
 * Shows a non-intrusive banner when a new service worker is waiting.
 * Includes anti-loop protection via sessionStorage cooldown.
 */
export default function UpdateBanner() {
  const [dismissed, setDismissed] = useState(() => wasDismissedRecently());
  const [updating, setUpdating] = useState(false);
  const [fallbackNeedRefresh, setFallbackNeedRefresh] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log("[FJ:SW] Registered:", swUrl);
      if (!registration) return;

      // Check immediately if there's already a waiting worker (missed event)
      if (registration.waiting) {
        console.log("[FJ:SW] Waiting worker already present at mount");
        setFallbackNeedRefresh(true);
      }

      // Mark this page boot so we can ignore the initial controllerchange event
      markBoot();

      // Update check — every 5min (was 30s, too aggressive and contributed to reload loops)
      const intervalId = setInterval(() => {
        registration.update().catch(() => {});
      }, 5 * 60 * 1000);

      // Check on visibility change (tab becomes visible)
      const onVisibility = () => {
        if (document.visibilityState === "visible") {
          registration.update().catch(() => {});
        }
      };
      document.addEventListener("visibilitychange", onVisibility);

      // Listen for new updates manually as a fallback
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("[FJ:SW] New version installed, prompting user");
            setFallbackNeedRefresh(true);
          }
        });
      });

      return () => {
        clearInterval(intervalId);
        document.removeEventListener("visibilitychange", onVisibility);
      };
    },
    onRegisterError(error) {
      console.error("[FJ:SW] Registration error:", error);
    },
  });

  // Listen to controllerchange — but ignore the initial activation that fires
  // shortly after page load (which is normal SW boot, not a real update).
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onControllerChange = () => {
      if (isWithinBootGrace()) {
        console.log("[FJ:SW] Ignoring controllerchange during boot grace period");
        return;
      }
      console.log("[FJ:SW] Controller changed — new version active");
      setFallbackNeedRefresh(true);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const showBanner = needRefresh || fallbackNeedRefresh;

  const handleUpdate = useCallback(async () => {
    if (updating) return;
    setUpdating(true);
    markDismissed(); // prevent loop on reload
    try {
      await updateServiceWorker(true);
      await clearRuntimeCaches();
      setTimeout(() => {
        forceHardReload();
      }, 250);
    } catch (err) {
      console.error("[FJ:SW] Update failed, forcing reload:", err);
      await clearRuntimeCaches();
      forceHardReload();
    }
  }, [updating, updateServiceWorker]);

  const handleDismiss = useCallback(() => {
    markDismissed();
    setDismissed(true);
  }, []);

  if (!showBanner || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-3 shadow-lg">
        {updating ? (
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        ) : (
          <RefreshCw className="h-5 w-5 text-primary animate-spin" />
        )}
        <span className="text-sm font-medium text-foreground">
          {updating ? "Atualizando…" : "Nova versão disponível"}
        </span>
        <Button
          size="sm"
          onClick={handleUpdate}
          disabled={updating}
          className="ml-2"
        >
          {updating ? "Aguarde…" : "Atualizar agora"}
        </Button>
        {!updating && (
          <button
            onClick={handleDismiss}
            className="ml-1 text-muted-foreground hover:text-foreground text-xs"
            aria-label="Fechar"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
