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

  return (
    <div className="fixed bottom-4 right-4 z-[200] max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
      <Alert variant="destructive" className="shadow-2xl border-2">
        <AlertCircle className="h-4 w-4" />
        <div className="flex justify-between items-start w-full">
          <div className="pr-4">
            <AlertTitle className="font-bold flex items-center gap-2">
              Erro de Sistema Detectado
            </AlertTitle>
            <AlertDescription className="mt-2 text-xs opacity-90">
              <p className="font-semibold mb-1">{friendlyMessage}</p>
              <p className="text-[10px] opacity-70">Seção: {error.section}</p>
              <div className="mt-3 flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-[10px] bg-white/10 hover:bg-white/20 border-white/20"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCcw className="mr-1 h-3 w-3" /> Atualizar App
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 text-[10px] hover:bg-white/10"
                  onClick={() => setError(null)}
                >
                  Ignorar
                </Button>
              </div>
            </AlertDescription>
          </div>
          <button 
            onClick={() => setError(null)}
            className="text-white/50 hover:text-white"
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
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
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
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background">
          <div className="max-w-md w-full p-8 rounded-2xl border border-destructive/20 bg-destructive/5 text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Ocorreu um erro inesperado</h1>
              <p className="text-muted-foreground">
                Tivemos um problema técnico ao carregar esta parte do sistema. 
                Não se preocupe, seus dados estão seguros.
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-black/40 text-left overflow-auto max-h-32">
              <code className="text-[10px] text-destructive-foreground font-mono">
                {this.state.error?.message || "Erro desconhecido"}
              </code>
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                onClick={this.handleReload}
                className="w-full gap-2 gradient-primary shadow-glow"
              >
                <RefreshCcw className="w-4 h-4" />
                Recarregar Sistema
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => window.location.href = "/"}
                className="w-full"
              >
                Ir para o Início
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
