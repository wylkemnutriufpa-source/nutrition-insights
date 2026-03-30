import { useRegisterSW } from "virtual:pwa-register/react";
import { useState, useCallback } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shows a non-intrusive banner when a new service worker is waiting.
 * Forces a hard reload after activating the new SW to guarantee the update.
 */
export default function UpdateBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("[FJ:SW] Registration error:", error);
    },
  });

  const handleUpdate = useCallback(async () => {
    if (updating) return;
    setUpdating(true);
    try {
      await updateServiceWorker(true);
      // Give the SW a moment to activate, then force reload
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      console.error("[FJ:SW] Update failed, forcing reload:", err);
      window.location.reload();
    }
  }, [updating, updateServiceWorker]);

  if (!needRefresh || dismissed) return null;

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
            onClick={() => setDismissed(true)}
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
