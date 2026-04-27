import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wand2, ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react";
import { attemptAutoFix, collectRouteDiagnostics, type RouteDiagnostics } from "@/lib/routeDiagnostics";

interface NotFoundDiagnosticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
}

export default function NotFoundDiagnosticsModal({
  open,
  onOpenChange,
  pathname,
}: NotFoundDiagnosticsModalProps) {
  const [diagnostics, setDiagnostics] = useState<RouteDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    collectRouteDiagnostics()
      .then((d) => {
        if (!cancelled) setDiagnostics(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleAutoFix = async () => {
    if (fixing) return;
    setFixing(true);
    await attemptAutoFix(pathname);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            Diagnóstico da página
          </DialogTitle>
          <DialogDescription>
            Antes de tentar de novo, veja o que o app detectou sobre esta navegação.
          </DialogDescription>
        </DialogHeader>

        {loading || !diagnostics ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 text-sm"
            >
              <DiagRow
                label="Rota acessada"
                value={diagnostics.pathname}
                mono
              />

              <DiagRow
                label="Veio de /~oauth/* (anti-cache)"
                value={diagnostics.isOauthBypass ? "Sim" : "Não"}
                tone={diagnostics.isOauthBypass ? "warn" : "ok"}
                hint={
                  diagnostics.isOauthBypass
                    ? "Este é um link blindado contra cache. Se chegou aqui, o service worker antigo provavelmente interceptou a navegação."
                    : undefined
                }
              />

              <DiagRow
                label="Service worker ativo"
                value={diagnostics.hasServiceWorker ? `Sim (${diagnostics.serviceWorkerScopes.length})` : "Não"}
                tone={diagnostics.hasServiceWorker ? "warn" : "ok"}
              />

              {diagnostics.serviceWorkerScopes.length > 0 && (
                <div className="rounded-md bg-muted/40 px-3 py-2 text-[11px] font-mono leading-relaxed text-muted-foreground">
                  {diagnostics.serviceWorkerScopes.map((s) => (
                    <div key={s}>{s}</div>
                  ))}
                </div>
              )}

              <DiagRow
                label="Caches armazenados"
                value={String(diagnostics.cacheNames.length)}
                tone={diagnostics.cacheNames.length > 0 ? "warn" : "ok"}
              />

              {diagnostics.cacheNames.length > 0 && (
                <div className="rounded-md bg-muted/40 px-3 py-2 text-[11px] font-mono leading-relaxed text-muted-foreground max-h-24 overflow-y-auto">
                  {diagnostics.cacheNames.map((c) => (
                    <div key={c}>{c}</div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {diagnostics.isIosSafari && <Badge variant="outline">iOS Safari</Badge>}
                {diagnostics.isStandalone && <Badge variant="outline">PWA instalado</Badge>}
                {diagnostics.buildHash && (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    build {diagnostics.buildHash.slice(0, 7)}
                  </Badge>
                )}
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground leading-relaxed">
                Vamos limpar service worker, caches e tentar abrir a versão correta da página automaticamente.
                Se mesmo assim falhar, você ainda pode usar o passo a passo do Safari.
              </div>

              <Button
                onClick={handleAutoFix}
                disabled={fixing}
                className="w-full gap-2"
              >
                {fixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {fixing ? "Aplicando correção..." : "Tentar correção automática"}
              </Button>
            </motion.div>
          </AnimatePresence>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DiagRow({
  label,
  value,
  mono,
  tone,
  hint,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "ok" | "warn";
  hint?: string;
}) {
  const Icon = tone === "warn" ? AlertCircle : CheckCircle2;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">{label}</span>
        <span className={`flex items-center gap-1.5 ${mono ? "font-mono text-xs" : "text-sm font-medium"}`}>
          {tone && (
            <Icon
              className={`w-3.5 h-3.5 ${tone === "warn" ? "text-amber-500" : "text-emerald-500"}`}
            />
          )}
          {value}
        </span>
      </div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground/80">{hint}</p>}
    </div>
  );
}
