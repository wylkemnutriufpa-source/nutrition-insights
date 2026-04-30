import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X, Sparkles, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function PWAUpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("[PWA] Service Worker registrado com sucesso");
      // Check for updates every hour
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("[PWA] Erro ao registrar Service Worker:", error);
    },
  });

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (needRefresh) {
      setVisible(true);
      // No longer using toast.info to avoid redundancy with the banner
      console.log("[PWA] Nova versão detectada, exibindo banner de atualização.");
    }
  }, [needRefresh]);

  if (!visible || !needRefresh) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] w-full max-w-md px-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className={cn(
        "relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-black/90 p-5 shadow-[0_0_50px_-12px_rgba(16,185,129,0.5)] backdrop-blur-xl",
        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-emerald-500/10 before:to-transparent"
      )}>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Sparkles className="w-12 h-12 text-emerald-500" />
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>

          <div className="flex-1 space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Upgrade de Sistema Disponível
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                Elite V3
              </span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Uma nova versão otimizada do FitJourney está pronta. Atualize agora para garantir a melhor performance e estabilidade.
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
            Atualizar e Recarregar
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
