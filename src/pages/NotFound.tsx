import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, RefreshCw, Loader2, Stethoscope } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { hardResetPwaCaches, logRoute404 } from "@/lib/route404Telemetry";
import NotFoundDiagnosticsModal from "@/components/common/NotFoundDiagnosticsModal";

function getSafeHomePath(pathname: string) {
  if (pathname.startsWith("/~oauth/convite/")) return pathname;
  if (pathname.startsWith("/~oauth/intake/")) return pathname;
  if (pathname.startsWith("/~oauth/cadastro")) return `${pathname}${window.location.search}`;
  if (pathname.startsWith("/convite/")) return pathname;
  if (pathname.startsWith("/intake/")) return pathname;
  if (pathname.startsWith("/cadastro")) return `${pathname}${window.location.search}`;
  return "/";
}

function detectIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome/i.test(ua);
  return isIos && isSafari;
}

export default function NotFound() {
  const location = useLocation();
  const safeHomePath = getSafeHomePath(location.pathname);
  const isIosSafari = useMemo(detectIosSafari, []);
  const [resetting, setResetting] = useState(false);
  const [diagOpen, setDiagOpen] = useState(false);

  useEffect(() => {
    console.error(`[Router] 404 Not Found: ${location.pathname}`);
    logRoute404({ source: "spa-notfound" });
  }, [location.pathname]);

  const handleHardReset = async () => {
    if (resetting) return;
    setResetting(true);
    await hardResetPwaCaches();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl font-display font-bold text-primary">404</span>
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">Rota não encontrada: {location.pathname}</h1>
        <p className="text-muted-foreground mb-6">
          A página que você procura não existe ou foi movida.
          <br />
          <span className="text-xs opacity-50 font-mono">{location.pathname}</span>
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <Link to={safeHomePath}>
            <Button className="gradient-primary gap-2">
              <Home className="w-4 h-4" /> Ir ao Início
            </Button>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-3">
            Caso o problema persista, é provável que seu navegador esteja com uma versão antiga em cache.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setDiagOpen(true)}
              className="gap-2 text-xs"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              Diagnosticar e tentar correção
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleHardReset}
              disabled={resetting}
              className="gap-2 text-xs"
            >
              {resetting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {resetting ? "Limpando..." : "Limpar cache e recarregar"}
            </Button>
          </div>

          {isIosSafari && (
            <div className="mt-4 text-left text-[11px] text-muted-foreground bg-muted/40 rounded-lg p-3 leading-relaxed">
              <p className="font-semibold text-foreground mb-1">No Safari (iPhone), se ainda falhar:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Toque em <strong>aA</strong> na barra de endereço</li>
                <li>Selecione <strong>“Recarregar sem conteúdo”</strong> ou abra em <strong>aba privada</strong></li>
                <li>Se mantiver o erro, abra <strong>Ajustes &gt; Safari &gt; Avançado &gt; Dados de sites</strong> e remova “fitjourney.com.br”</li>
              </ol>
            </div>
          )}
        </div>
      </motion.div>

      <NotFoundDiagnosticsModal
        open={diagOpen}
        onOpenChange={setDiagOpen}
        pathname={location.pathname}
      />
    </div>
  );
}

