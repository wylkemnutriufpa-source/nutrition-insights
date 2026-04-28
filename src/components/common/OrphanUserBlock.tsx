import { AlertTriangle, LogOut, MessageCircle, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { logAudit } from "@/lib/auditLog";

export function OrphanUserBlock() {
  const { signOut, user } = useAuth();
  const [correlationId] = useState(() => `err_${Math.random().toString(36).substring(2, 11)}`);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.id) {
      logAudit("hard_fail_linkage", "auth", user.id, { 
        correlationId,
        status: "blocked",
        reason: "is_orphan" 
      });
      console.error(`[FJ:CRITICAL] Linkage failure for user ${user.id}. CorrelationID: ${correlationId}`);
    }
  }, [user?.id, correlationId]);

  const copyId = () => {
    navigator.clipboard.writeText(correlationId);
    setCopied(true);
    toast.success("ID copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-md flex items-center justify-center p-6 text-center animate-in fade-in duration-300">
      <div className="max-w-md space-y-6 bg-card border shadow-2xl p-8 rounded-[2rem] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-destructive" />
        
        <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center rotate-3">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Erro ao vincular sua conta ao profissional
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Detectamos que sua conta não possui um vínculo ativo. 
            Isso bloqueia o acesso às funcionalidades personalizadas para garantir sua segurança.
          </p>
        </div>

        <div className="bg-muted/50 p-5 rounded-2xl text-left text-sm space-y-3 border border-border/50">
          <p className="font-bold text-xs uppercase tracking-widest text-muted-foreground">O que fazer agora?</p>
          <ul className="space-y-2 text-foreground/80">
            <li className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-background flex items-center justify-center text-[10px] font-bold border">1</span>
              <span>Solicite um novo link de convite ao seu profissional.</span>
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-background flex items-center justify-center text-[10px] font-bold border">2</span>
              <span>Certifique-se de completar o cadastro usando o link recebido.</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-4 py-2 bg-background border rounded-xl text-[10px] font-mono text-muted-foreground">
            <span>ID do erro: {correlationId}</span>
            <button onClick={copyId} className="hover:text-foreground transition-colors">
              {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="gap-2 h-12 rounded-xl border-border"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
            
            <Button 
              className="gap-2 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
              onClick={() => window.open(`https://wa.me/5500000000000?text=Olá, tive um erro de vínculo no FitJourney. ID: ${correlationId}`, '_blank')}
            >
              <MessageCircle className="h-4 w-4" />
              Suporte
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
