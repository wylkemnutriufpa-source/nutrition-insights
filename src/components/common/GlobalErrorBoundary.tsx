import React, { Component, ErrorInfo, useEffect, useState } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCcw, X, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { friendlySupabaseError } from '@/lib/supabaseErrorMapper';

interface RuntimeError {
  section: string;
  message: string;
  timestamp: string;
  metadata?: any;
}

/**
 * GlobalErrorBoundary component: Listens for custom 'fj-runtime-error' events
 * and displays a floating notification.
 */
export const GlobalErrorBoundary = () => {
  const [error, setError] = useState<RuntimeError | null>(null);

  useEffect(() => {
    const handleRuntimeError = (event: any) => {
      const errorDetail = event.detail;
      const isSchemaError = 
        errorDetail.message.includes('column') || 
        errorDetail.message.includes('relation') ||
        errorDetail.message.includes('does not exist');

      if (isSchemaError) {
        setError(errorDetail);
      }
    };

    window.addEventListener('fj-runtime-error', handleRuntimeError);
    return () => window.removeEventListener('fj-runtime-error', handleRuntimeError);
  }, []);

  if (!error) return null;

  const friendlyMessage = friendlySupabaseError(error.message);
  
  const getActionSuggestion = (message: string) => {
    if (message.includes("session")) return "Tente fazer login novamente.";
    if (message.includes("network") || message.includes("fetch")) return "Verifique sua conexão com a internet.";
    if (message.includes("column") || message.includes("relation")) return "O sistema está sendo atualizado. Recarregue em alguns instantes.";
    return "Recarregue a página para tentar novamente.";
  };

  return (
    <div className="fixed bottom-4 right-4 z-[200] max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
      <Alert variant="destructive" className="shadow-2xl border-2 bg-slate-900 border-destructive/50 text-white">
        <ShieldAlert className="h-5 w-5 text-destructive" />
        <div className="flex justify-between items-start w-full ml-2">
          <div className="pr-4 space-y-1">
            <AlertTitle className="font-bold text-sm flex items-center gap-2">
              Erro Detectado na Camada: {error.section}
            </AlertTitle>
            <AlertDescription className="text-xs space-y-2">
              <p className="font-medium text-slate-200">{friendlyMessage}</p>
              <div className="p-2 rounded bg-destructive/10 border border-destructive/20">
                <p className="text-[10px] font-bold text-destructive uppercase tracking-tighter mb-1">Ação Sugerida:</p>
                <p className="text-[11px] text-slate-300">{getActionSuggestion(error.message)}</p>
              </div>
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-[10px] bg-white/5 hover:bg-white/10 border-white/10"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCcw className="mr-1 h-3 w-3" /> Atualizar App
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 text-[10px] hover:bg-white/5"
                  onClick={() => setError(null)}
                >
                  Ignorar
                </Button>
              </div>
            </AlertDescription>
          </div>
          <button 
            onClick={() => setError(null)}
            className="text-white/30 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </Alert>
    </div>
  );
};

/**
 * CriticalErrorBoundary: A traditional React Error Boundary to catch render-time crashes
 * and prevent the dreaded "White Screen of Death".
 */
interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class CriticalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // 🛡️ Hardening: Erros de WebSocket / Realtime NUNCA devem derrubar a UI.
    // Ocorre tipicamente em Safari iOS modo privado, navegadores bloqueando
    // cookies de terceiros, ou redes corporativas com WS bloqueado.
    const msg = (error?.message || "").toLowerCase();
    const isNonFatal =
      msg.includes("websocket") ||
      msg.includes("operation is insecure") ||
      msg.includes("realtime") ||
      msg.includes("network request failed") ||
      msg.includes("failed to fetch");

    if (isNonFatal) {
      console.warn("[FitJourney:Crash] Erro não-fatal interceptado (sem crash):", error.message);
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const msg = (error?.message || "").toLowerCase();
    const isNonFatal =
      msg.includes("websocket") ||
      msg.includes("operation is insecure") ||
      msg.includes("realtime");

    if (isNonFatal) {
      console.warn("[FitJourney:Crash] Erro de Realtime/WebSocket ignorado:", error.message);
      return;
    }

    console.error("[FitJourney:Crash] Erro Crítico de Renderização:", error, errorInfo);

    // Auto-reload on ChunkLoadError
    if (/loading.*chunk/i.test(error.message)) {
      console.warn("[FitJourney:Crash] Falha de Chunk detectada, recarregando...");
      // Forcing update here is safe because it's already crashed
      window.location.reload();
    }
  }

  private handleReload = () => {
    // Clear potentially corrupted state and reload
    sessionStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-slate-950 text-slate-50">
          <div className="max-w-xl w-full p-8 rounded-3xl border border-destructive/20 bg-destructive/5 space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                <ShieldAlert className="w-10 h-10 text-destructive" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Interrupção Crítica Detectada</h1>
                <p className="text-slate-400">
                  O motor de renderização encontrou uma falha que impede a exibição desta tela.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Origem do Erro</p>
                <p className="text-sm font-semibold text-slate-200 truncate">Render/Layout Engine</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Ação Sugerida</p>
                <p className="text-sm font-semibold text-blue-400">Limpeza de cache & Reinício</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-black/40 border border-white/5 font-mono">
              <p className="text-[10px] text-slate-500 mb-2 font-bold uppercase tracking-wider">Assinatura Técnica:</p>
              <code className="text-xs text-destructive-foreground break-all leading-relaxed">
                {this.state.error?.name}: {this.state.error?.message || "Erro de memória ou renderização"}
              </code>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={this.handleReload}
                className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 h-12 text-sm font-bold shadow-lg shadow-blue-900/20"
              >
                <RefreshCcw className="w-4 h-4" />
                Recarregar e Limpar
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = "/"}
                className="flex-1 h-12 border-slate-700 hover:bg-slate-800"
              >
                Voltar ao Início
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
