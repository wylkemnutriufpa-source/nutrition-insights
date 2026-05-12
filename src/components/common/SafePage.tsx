/**
 * FitJourney — SafePage: Camada de Proteção por Página
 * 
 * Envolve cada rota com:
 * 1. ErrorBoundary dedicado (isola falhas)
 * 2. Suspense fallback (carregamento visível)
 * 3. Falha explícita via UI (Fail Fast)
 */
import { Component, ErrorInfo, ReactNode, Suspense } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ========== Loading Fallback ==========
function PageLoadingFallback() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full max-w-md" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64 mt-4" />
    </div>
  );
}

// ========== Error Recovery UI ==========
interface RecoveryProps {
  error: Error;
  pageName: string;
  onRetry: () => void;
}

function PageErrorRecovery({ error, pageName, onRetry }: RecoveryProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-black/5 rounded-3xl border border-dashed border-red-500/20">
      <div className="rounded-full bg-red-500/10 p-5 mb-5">
        <AlertTriangle className="h-10 w-10 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">
        Falha de Renderização em {pageName}
      </h2>
      <p className="text-sm text-muted-foreground mb-1 max-w-lg">
        O sistema detectou um erro crítico e interrompeu o carregamento para evitar comportamentos inconsistentes.
      </p>
      <div className="bg-red-500/5 p-4 rounded-xl mb-6 max-w-lg w-full">
        <p className="text-xs text-red-400 font-mono break-all text-left">
          {error.name}: {error.message}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="destructive" onClick={onRetry} className="gap-2 px-6">
          <RefreshCw className="h-4 w-4" />
          Tentar Forçar Render
        </Button>
        <Button
          variant="outline"
          onClick={() => window.location.assign("/")}
          className="gap-2"
        >
          <Home className="h-4 w-4" />
          Ir ao Início
        </Button>
      </div>
    </div>
  );
}

// ========== SafePage Boundary ==========
interface SafePageProps {
  children: ReactNode;
  pageName: string;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

interface SafePageState {
  hasError: boolean;
  error: Error | null;
}

export class SafePage extends Component<SafePageProps, SafePageState> {
  constructor(props: SafePageProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<SafePageState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[FailFast:SafePage] Erro em ${this.props.pageName}:`, error, errorInfo);
    // Sem auto-recovery (reload automático). A falha é exposta ao usuário.
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <PageErrorRecovery
          error={this.state.error}
          pageName={this.props.pageName}
          onRetry={this.handleRetry}
        />
      );
    }

    return (
      <Suspense fallback={this.props.loadingFallback || <PageLoadingFallback />}>
        {this.props.children}
      </Suspense>
    );
  }
}

export default SafePage;
