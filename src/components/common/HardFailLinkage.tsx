import { AlertTriangle, LogOut, MessageCircle, Info, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { logAudit, getSessionCorrelationId } from "@/lib/auditLog";
import { SupportModal } from "./SupportModal";
import { useTenant } from "@/lib/tenantContext";

export function HardFailLinkage() {
  const { signOut, user } = useAuth();
  const { tenantId } = useTenant();
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const correlationId = getSessionCorrelationId();

  useEffect(() => {
    // Critical audit log for linkage failure
    logAudit(
      "LINKAGE_FAIL",
      "auth",
      user?.id,
      { 
        reason: tenantId ? "inconsistent_linkage" : "missing_tenant",
        path: window.location.pathname,
        isOrphan: true
      },
      "error",
      correlationId
    );
    
    console.error(`[FJ:CRITICAL] Access blocked: Linkage failure. ID: ${correlationId}`);
  }, [user?.id, tenantId, correlationId]);

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
              Erro ao vincular sua conta ao profissional
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              Detectamos uma inconsistência crítica no seu perfil. Por segurança, o acesso foi temporariamente bloqueado para evitar corrupção de dados.
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
                <span>Fale com seu nutricionista para validar seu cadastro.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-xl bg-background border flex items-center justify-center text-[10px] font-bold shadow-sm">2</span>
                <span>Informe o ID do erro abaixo ao suporte se persistir.</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3">
            <Button 
              className="h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-3 shadow-lg shadow-primary/20"
              onClick={() => setIsSupportOpen(true)}
            >
              <MessageCircle className="h-5 h-5" />
              Falar com suporte
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
            <code className="text-[11px] font-mono text-foreground/60 bg-muted px-3 py-1 rounded-lg border">
              {correlationId}
            </code>
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
