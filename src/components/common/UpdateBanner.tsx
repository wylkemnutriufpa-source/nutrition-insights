import { useRegisterSW } from "virtual:pwa-register/react";
import { useState, useCallback, useEffect, useMemo } from "react";
import { RefreshCw, Loader2, Rocket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
      }, 30 * 1000); // Check every 30 seconds for near real-time updates

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
    <Dialog open={showBanner && !dismissed} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-md border-primary/20 bg-card/95 backdrop-blur-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Rocket className="w-6 h-6 text-primary animate-bounce" />
          </div>
          <DialogTitle className="text-center font-display text-xl">Nova Versão Disponível! 🚀</DialogTitle>
          <DialogDescription className="text-center pt-2">
            {isiOSPwa 
              ? "Uma atualização importante está pronta. Para aplicar as melhorias, o app precisa ser reiniciado."
              : "Melhoramos sua experiência! Atualize agora para acessar os novos recursos e correções de segurança."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground flex items-start gap-2">
            <RefreshCw className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p>Seus dados salvos não serão perdidos. O cache será atualizado para garantir o melhor desempenho.</p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={async () => {
              await clearRuntimeCaches();
              toast.success("Cache limpo! Recarregando...");
              setTimeout(() => forceHardReload(), 800);
            }}
            disabled={updating}
            className="w-full sm:w-auto text-muted-foreground"
          >
            Limpar Cache
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={updating}
            className="w-full sm:w-auto gradient-primary shadow-glow gap-2"
          >
            {updating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {updating ? "Atualizando..." : isiOSPwa ? "Reiniciar App" : "Atualizar Agora"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
