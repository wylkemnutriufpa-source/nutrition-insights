import React, { useEffect, useRef } from "react";
import { 
  X, 
  MessageCircle, 
  Mail, 
  Copy, 
  Check, 
  LifeBuoy,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { getSessionCorrelationId } from "@/lib/auditLog";

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: string;
  errorId?: string;
}

export function SupportModal({ isOpen, onClose, context, errorId }: SupportModalProps) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [copied, setCopied] = React.useState(false);
  const correlationId = errorId || getSessionCorrelationId();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("ID copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const supportMessage = encodeURIComponent(
    `Olá, preciso de suporte no FitJourney.\n\n` +
    `ID do Erro: ${correlationId}\n` +
    `ID do Usuário: ${user?.id || "N/A"}\n` +
    `Contexto: ${context || "Suporte Geral"}`
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] bg-card border shadow-2xl rounded-[2rem] overflow-hidden p-0 gap-0">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-primary to-blue-500" />
        
        <DialogHeader className="p-8 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 rotate-3">
            <LifeBuoy className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">Central de Suporte</DialogTitle>
          <DialogDescription className="text-muted-foreground mt-2 leading-relaxed">
            Estamos aqui para ajudar. Se você encontrou um erro, informe o ID abaixo para que possamos resolver mais rápido.
          </DialogDescription>
        </DialogHeader>

        <div className="px-8 pb-8 space-y-6">
          {/* Debug Info Card */}
          <div className="bg-muted/50 rounded-2xl border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Identificador da Sessão</span>
              <button 
                onClick={() => copyToClipboard(correlationId)}
                className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-primary/80 transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "COPIADO" : "COPIAR ID"}
              </button>
            </div>
            
            <div className="font-mono text-sm bg-background border rounded-xl p-3 text-foreground break-all">
              {correlationId}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Usuário</p>
                <p className="text-[11px] font-medium truncate">{user?.email || "Visitante"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Tenant</p>
                <p className="text-[11px] font-medium truncate">{tenantId || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Contact Methods */}
          <div className="grid grid-cols-1 gap-3">
            <Button 
              className="h-14 rounded-2xl bg-[#25D366] hover:bg-[#1fb858] text-white font-bold gap-3 shadow-lg shadow-emerald-500/20 group"
              onClick={() => window.open(`https://wa.me/5500000000000?text=${supportMessage}`, "_blank")}
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp Suporte
              <ExternalLink className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
            </Button>

            <Button 
              variant="outline"
              className="h-14 rounded-2xl border-border bg-background hover:bg-muted font-bold gap-3 group"
              onClick={() => window.location.href = `mailto:suporte@fitjourney.com.br?subject=Suporte FitJourney - ${correlationId}&body=Detalhes do erro: ${correlationId}`}
            >
              <Mail className="w-5 h-5 text-muted-foreground" />
              E-mail Suporte
              <ExternalLink className="w-4 h-4 ml-auto opacity-30 group-hover:opacity-100 transition-opacity" />
            </Button>
          </div>
        </div>

        <div className="bg-muted/30 p-4 border-t text-center">
          <p className="text-[10px] text-muted-foreground font-medium">
            FitJourney Clinical Engine • v4.8 • Production Ready
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
