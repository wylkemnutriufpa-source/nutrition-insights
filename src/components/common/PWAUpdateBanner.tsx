import { Button } from "@/components/ui/button";
import { RefreshCw, X, Sparkles, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Dynamic import wrapper — virtual:pwa-register/react only exists in production builds
function usePWARegister() {
  const [state, setState] = useState<{
    needRefresh: boolean;
    updateServiceWorker: (reload?: boolean) => Promise<void>;
  }>({
    needRefresh: false,
    updateServiceWorker: async () => {},
  });

  useEffect(() => {
    if (!import.meta.env.PROD) return;

    // @ts-ignore — virtual module only available in production
    import("virtual:pwa-register/react")
      .then(({ useRegisterSW }) => {
        // We can't call hooks dynamically; instead poll the SW directly.
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.getRegistration().then((reg) => {
            if (!reg) return;
            reg.addEventListener("updatefound", () => {
              const sw = reg.installing;
              if (!sw) return;
              sw.addEventListener("statechange", () => {
                if (sw.state === "installed" && navigator.serviceWorker.controller) {
                  setState({
                    needRefresh: true,
                    updateServiceWorker: async (reload) => {
                      sw.postMessage({ type: "SKIP_WAITING" });
                      if (reload) window.location.reload();
                    },
                  });
                }
              });
            });
            // Check for updates every hour
            setInterval(() => reg.update(), 60 * 60 * 1000);
          });
        }
      })
      .catch((err) => {
        console.warn("[PWA] Service Worker registration unavailable:", err);
      });
  }, []);

  return state;
}

export function PWAUpdateBanner() {
  const { needRefresh, updateServiceWorker } = usePWARegister();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (needRefresh) setVisible(true);
  }, [needRefresh]);

  if (!visible || !needRefresh) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] w-full max-w-md px-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className={cn(
        "relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-black/90 p-5 shadow-[0_0_50px_-12px_rgba(16,185,129,0.5)] backdrop-blur-xl",
        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-emerald-500/10 before:to-transparent"
      )}>
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Sparkles className="w-12 h-12 text-emerald-500" />
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>

          <div className="flex-1 space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Atualização Disponível
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                Nova Versão
              </span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Uma nova versão do FitJourney foi publicada. Atualize quando quiser para receber as melhorias.
            </p>
          </div>

          <button
            onClick={() => setVisible(false)}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => updateServiceWorker(true)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-black font-bold h-9 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.02]"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            Atualizar Agora
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisible(false)}
            className="px-4 text-[11px] text-slate-500 hover:text-slate-300 hover:bg-white/5 h-9"
          >
            Depois
          </Button>
        </div>
      </div>
    </div>
  );
}
