import { useRegisterSW } from "virtual:pwa-register/react";
import { useState, useCallback, useEffect } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "fj:update-dismissed-at";
const DISMISS_COOLDOWN_MS = 5 * 60 * 1000; // 5 min cooldown after dismiss/update

function wasDismissedRecently(): boolean {
  try {
    const ts = sessionStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    sessionStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {}
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

      // Aggressive update check — every 30s instead of 5min
      const intervalId = setInterval(() => {
        registration.update().catch(() => {});
      }, 30 * 1000);

      // Check on window focus (user returns to tab)
      const onFocus = () => {
        registration.update().catch(() => {});
      };
      window.addEventListener("focus", onFocus);

      // Check on visibility change (tab becomes visible)
      const onVisibility = () => {
        if (document.visibilityState === "visible") {
          registration.update().catch(() => {});
        }
      };
      document.addEventListener("visibilitychange", onVisibility);

      // Check on network reconnection
      const onOnline = () => {
        registration.update().catch(() => {});
      };
      window.addEventListener("online", onOnline);

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

      // Cleanup on unmount (best effort — banner stays mounted normally)
      return () => {
        clearInterval(intervalId);
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("online", onOnline);
      };
    },
    onRegisterError(error) {
      console.error("[FJ:SW] Registration error:", error);
    },
  });

  // Also listen to controllerchange — fires when a new SW takes control
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onControllerChange = () => {
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
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      console.error("[FJ:SW] Update failed, forcing reload:", err);
      window.location.reload();
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
