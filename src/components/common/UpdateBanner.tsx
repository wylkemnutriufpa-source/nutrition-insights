import { useRegisterSW } from "virtual:pwa-register/react";
import { useState, useCallback, useEffect, useMemo } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  clearRuntimeCaches,
  forceHardReload,
  getServiceWorkerVersionToken,
  isIosStandalone,
  isWithinBootGrace,
  markBoot,
  markDismissed,
  wasDismissedRecently,
} from "@/lib/pwaUpdate";

/**
 * Shows a non-intrusive banner when a new service worker is waiting.
 * Includes anti-loop protection via sessionStorage cooldown.
 */
export default function UpdateBanner() {
  const [waitingVersion, setWaitingVersion] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [fallbackNeedRefresh, setFallbackNeedRefresh] = useState(false);
  const isiOSPwa = useMemo(() => isIosStandalone(), []);

  useEffect(() => {
    setDismissed(wasDismissedRecently(waitingVersion));
  }, [waitingVersion]);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log("[FJ:SW] Registered:", swUrl);
      if (!registration) return;

      const applyWaitingVersion = (worker?: ServiceWorker | null) => {
        const nextVersion = getServiceWorkerVersionToken(worker, swUrl);
        setWaitingVersion(nextVersion);
        setDismissed(wasDismissedRecently(nextVersion));
      };

      // Check immediately if there's already a waiting worker (missed event)
      if (registration.waiting) {
        console.log("[FJ:SW] Waiting worker already present at mount");
        applyWaitingVersion(registration.waiting);
        setFallbackNeedRefresh(true);
      }

      // Mark this page boot so we can ignore the initial controllerchange event
      markBoot();

      // Update check — every 5min (was 30s, too aggressive and contributed to reload loops)
      const intervalId = setInterval(() => {
        registration.update().catch(() => {});
      }, 1 * 60 * 1000); // Check every 1 minute for faster updates

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
            applyWaitingVersion(registration.waiting ?? newWorker);
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
    markDismissed(waitingVersion); // prevent loop on reload, but scoped to this version
    try {
      await updateServiceWorker(true);

      if (isiOSPwa) {
        setFallbackNeedRefresh(false);
        setUpdating(false);
        return;
      }

      await clearRuntimeCaches();
      setTimeout(() => {
        forceHardReload();
      }, 250);
    } catch (err) {
      console.error("[FJ:SW] Update failed, forcing reload:", err);
      await clearRuntimeCaches();
      forceHardReload();
    }
  }, [isiOSPwa, updateServiceWorker, updating, waitingVersion]);

  const handleDismiss = useCallback(() => {
    markDismissed(waitingVersion);
    setDismissed(true);
  }, [waitingVersion]);

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
          {updating ? "Atualizando…" : isiOSPwa ? "Nova versão pronta para reabrir" : "Nova versão disponível"}
        </span>
        <Button
          size="sm"
          onClick={handleUpdate}
          disabled={updating}
          className="ml-2"
        >
          {updating ? "Aguarde…" : isiOSPwa ? "Reabrir app" : "Atualizar agora"}
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
