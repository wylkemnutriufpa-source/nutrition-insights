import { AlertTriangle, LogOut, MessageCircle, Info, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { logAudit, getSessionCorrelationId } from "@/lib/auditLog";
import { SupportModal } from "./SupportModal";
import { useTenant } from "@/lib/tenantContext";

export function HardFailLinkage() {
  const { signOut, user, refreshProfile } = useAuth();
  const { tenantId } = useTenant();
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const correlationId = getSessionCorrelationId();

  const hasPendingContext = localStorage.getItem("fitjourney_invite_code") || localStorage.getItem("fitjourney_nutri_id");

  useEffect(() => {
    // Critical audit log for linkage failure
    logAudit(
      "LINKAGE_FAIL",
      "auth",
      user?.id,
      { 
        reason: tenantId ? "inconsistent_linkage" : "missing_tenant",
        path: window.location.pathname,
        isOrphan: true,
        hasPendingContext: !!hasPendingContext
      },
      "error",
      correlationId
    );
    
    console.error(`[FJ:CRITICAL] Access blocked: Linkage failure. ID: ${correlationId}`);
  }, [user?.id, tenantId, correlationId, hasPendingContext]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      toast.info("Tentando sincronizar seu perfil...");
      await refreshProfile();
      // If the profile was healed by a background trigger or another tab, 
      // refreshing it might be enough to satisfy the check.
      // We also force a slight delay to allow RootRouter to catch up if it's still running.
      await new Promise(resolve => setTimeout(resolve, 1500));
      window.location.reload();
    } catch (error) {
      toast.error("Ainda não conseguimos sincronizar. Fale com seu profissional.");
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-background/98 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="max-w-md w-full space-y-8 bg-card border shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] p-10 rounded-[2.5rem] relative overflow-hidden text-center">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-destructive/50" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-destructive/5 blur-[100px] rounded-full" />
        
        <div className="relative">
          <div className="mx-auto w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center mb-8 rotate-3 transition-transform hover:rotate-0 duration-500">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-3xl font-black tracking-tight text-foreground">
              {hasPendingContext ? "Vínculo em processamento" : "Erro ao vincular conta"}
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              {hasPendingContext 
                ? "Estamos finalizando a conexão com seu profissional. Se demorar, tente o botão de sincronizar abaixo."
                : "Detectamos uma inconsistência no seu perfil (Órfão). Por segurança, o acesso foi bloqueado até que você seja vinculado a um profissional."}
            </p>
          </div>

          <div className="mt-8 p-6 bg-muted/30 rounded-3xl border border-border/50 text-left space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
              <Info className="w-4 h-4" />
              Próximos passos
            </div>
            <ul className="space-y-3 text-sm text-foreground/80 font-medium">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-xl bg-background border flex items-center justify-center text-[10px] font-bold shadow-sm">1</span>
                <span>Tente o botão <strong>Sincronizar Perfil</strong> abaixo.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-xl bg-background border flex items-center justify-center text-[10px] font-bold shadow-sm">2</span>
                <span>Se persistir, clique no link de convite enviado pelo seu nutricionista novamente.</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3">
            <Button 
              className="h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-3 shadow-lg shadow-primary/20"
              onClick={handleRetry}
              disabled={isRetrying}
            >
              <RefreshCw className={`h-5 w-5 ${isRetrying ? "animate-spin" : ""}`} />
              {isRetrying ? "Sincronizando..." : "Sincronizar Perfil"}
            </Button>

            <Button 
              variant="outline"
              className="h-12 rounded-2xl font-bold gap-3"
              onClick={() => setIsSupportOpen(true)}
            >
              <MessageCircle className="h-5 w-5" />
              Suporte Técnico
            </Button>
            
            <Button 
              variant="ghost" 
              className="h-12 rounded-2xl text-muted-foreground font-semibold gap-2 hover:bg-muted/50 transition-all"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">ID do Erro (Correlation)</span>
            <div className="flex items-center gap-2">
              <code className="text-[11px] font-mono text-foreground/60 bg-muted px-3 py-1 rounded-lg border">
                {correlationId}
              </code>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(correlationId);
                  toast.success("ID copiado!");
                }}
                className="p-1.5 hover:bg-muted rounded-md text-muted-foreground transition-colors"
                title="Copiar ID"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <SupportModal 
        isOpen={isSupportOpen} 
        onClose={() => setIsSupportOpen(false)} 
        context="Erro de Vínculo Crítico"
        errorId={correlationId}
      />
    </div>
  );
}
