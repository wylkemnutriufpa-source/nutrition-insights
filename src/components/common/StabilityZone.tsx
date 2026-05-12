
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw, Home, ShieldAlert, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { logError } from "@/lib/monitoring";

interface Props {
  children: ReactNode;
  name: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * StabilityZone: Um Error Boundary especializado para isolar zonas críticas do app.
 * Garante que se uma zona (Dashboard, Editor, Onboarding) falhar, o resto continue funcional.
 */
export class StabilityZone extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log estruturado para produção (Observabilidade)
    logError(
      "render_error",
      this.props.name,
      error.message,
      { componentStack: errorInfo.componentStack },
      error.stack
    );

    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoBack = () => {
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 m-4 border-2 border-destructive/30 bg-destructive/5 rounded-2xl animate-in fade-in duration-500">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">Zona Instável: {this.props.name}</h2>
              <p className="text-zinc-400 text-sm">
                Ocorreu uma falha isolada nesta seção. O restante do sistema continua operacional e seguro.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Button 
                onClick={this.handleRetry}
                className="w-full bg-white text-black hover:bg-zinc-200 gap-2 h-11"
              >
                <RefreshCcw className="w-4 h-4" /> Tentar Novamente
              </Button>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={this.handleGoBack}
                  className="border-zinc-800 text-zinc-300 hover:bg-zinc-900 gap-2"
                >
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = "/"}
                  className="border-zinc-800 text-zinc-300 hover:bg-zinc-900 gap-2"
                >
                  <Home className="w-4 h-4" /> Início
                </Button>
              </div>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 p-4 bg-black/40 rounded-lg border border-white/5 text-left text-[10px] font-mono text-zinc-500 overflow-auto max-h-40">
                <p className="text-destructive font-bold mb-1">DETALHES TÉCNICOS:</p>
                <p>{this.state.error?.message}</p>
                <pre className="mt-2 opacity-50">{this.state.errorInfo?.componentStack}</pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
