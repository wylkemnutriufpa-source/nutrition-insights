
import React, { Component, ErrorInfo } from 'react';
import { AlertCircle, RefreshCcw, Layout, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
  name: string;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * SectionalErrorBoundary: Protege seções específicas da aplicação (ex: Sidebar, Dashboard, Editor)
 * para que uma falha em um componente não derrube a página inteira.
 */
export class SectionalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[FitJourney:SectionCrash] Erro na seção "${this.props.name}":`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="p-6 rounded-2xl border border-destructive/20 bg-destructive/5 flex flex-col items-center justify-center text-center space-y-4 m-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-200">Falha na Seção: {this.props.name}</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Esta parte do sistema encontrou um erro, mas o restante continua operacional.
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={this.handleReset}
              className="h-8 text-[11px] gap-2"
            >
              <RefreshCcw className="w-3 h-3" /> Tentar Novamente
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => window.location.reload()}
              className="h-8 text-[11px]"
            >
              Recarregar App
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-2 bg-black/40 rounded border border-white/5 text-[10px] font-mono text-left max-w-full overflow-hidden">
              {this.state.error?.message}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
