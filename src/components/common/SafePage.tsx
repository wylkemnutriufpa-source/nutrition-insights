/**
 * FitJourney — SafePage: Camada de autocorreção por página
 * 
 * Envolve TODA página com:
 * 1. ErrorBoundary dedicado (isola crash de outras páginas)
 * 2. Suspense fallback (carregamento seguro)
 * 3. Recovery automático (botão de retry)
 * 4. Logging de erros para diagnóstico
 * 
 * USO: Envolva cada rota com <SafePage> ao invés de render direto.
 */
import { Component, ErrorInfo, ReactNode, Suspense } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logError } from "@/lib/monitoring";
import { captureError } from "@/lib/observability/errorLogger";
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
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
      <div className="rounded-full bg-destructive/10 p-5 mb-5">
        <AlertTriangle className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">
        Página temporariamente indisponível
      </h2>
      <p className="text-sm text-muted-foreground mb-1 max-w-lg">
        Ocorreu um erro em <strong>{pageName}</strong>. O restante do sistema continua funcionando normalmente.
      </p>
      <p className="text-xs text-muted-foreground/60 mb-6 font-mono max-w-lg truncate">
        {error.message}
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
        <Button
          variant="ghost"
          onClick={() => window.location.assign("/")}
          className="gap-2"
        >
          <Home className="h-4 w-4" />
          Ir ao Dashboard
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
  retryCount: number;
}

export class SafePage extends Component<SafePageProps, SafePageState> {
  constructor(props: SafePageProps) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<SafePageState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError(`SafePage:${this.props.pageName}`, error.message, {
      stack: error.stack?.slice(0, 500),
      componentStack: errorInfo.componentStack?.slice(0, 500),
      retryCount: this.state.retryCount,
    });
    captureError(`SafePage:${this.props.pageName}`, error, { severity: "critical", recovered: true });

    // ── AUTO-RECOVERY: Stale chunk after deploy ──
    // "Failed to fetch dynamically imported module" happens when the browser has
    // an old JS chunk hash cached that no longer exists on the server. The fix
    // is a hard reload — but we only do it ONCE per session to avoid loops.
    const msg = (error?.message || "").toLowerCase();
    const isStaleChunkError =
      msg.includes("failed to fetch dynamically imported module") ||
      msg.includes("importing a module script failed") ||
      msg.includes("error loading dynamically imported module") ||
      (error?.name === "ChunkLoadError");

    if (isStaleChunkError) {
      const RELOAD_KEY = "__fj_chunk_reload_attempted__";
      const alreadyTried = sessionStorage.getItem(RELOAD_KEY);
      if (!alreadyTried) {
        sessionStorage.setItem(RELOAD_KEY, "1");
        console.warn("[SafePage] Stale chunk detected — forcing reload to fetch latest build.");
        // Small delay so error is logged before reload
        setTimeout(() => window.location.reload(), 300);
      }
    }
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
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
