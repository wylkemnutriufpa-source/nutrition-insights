import { useRegisterSW } from "virtual:pwa-register/react";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shows a non-intrusive banner when a new service worker is waiting.
 * Uses VitePWA's official useRegisterSW hook — no manual polling or brute reloads.
 */
export default function UpdateBanner() {
  const [dismissed, setDismissed] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Check for updates every 60s in production (passive, not brute-force)
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

  if (!needRefresh || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-3 shadow-lg">
        <RefreshCw className="h-5 w-5 text-primary animate-spin" />
        <span className="text-sm font-medium text-foreground">
          Nova versão disponível
        </span>
        <Button
          size="sm"
          onClick={() => updateServiceWorker(true)}
          className="ml-2"
        >
          Atualizar agora
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="ml-1 text-muted-foreground hover:text-foreground text-xs"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
