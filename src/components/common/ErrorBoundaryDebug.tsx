import React, { Component, ErrorInfo, ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { AlertTriangle, ChevronDown, ChevronUp, Copy, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  children: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundaryDebug extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.group(`%c[ErrorBoundaryDebug] Erro detectado em: ${this.props.name || "Global"}`, "color: #ef4444; font-weight: bold;");
    console.error("Erro:", error);
    console.error("Component Stack:", errorInfo.componentStack);
    console.groupEnd();
    
    this.setState({ errorInfo });
  }

  handleCopyError = () => {
    const text = `
Erro: ${this.state.error?.message}
Componente: ${this.props.name || "Global"}
Stack: ${this.state.error?.stack}
Component Stack: ${this.state.errorInfo?.componentStack}
    `.trim();
    
    navigator.clipboard.writeText(text);
    toast.success("Erro copiado para a área de transferência");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 border-2 border-destructive/50 bg-destructive/5 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-destructive rounded-full">
              <AlertTriangle className="w-6 h-6 text-destructive-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-destructive">Título: Erro na página</h2>
              <p className="text-sm text-muted-foreground">
                Ocorreu uma falha inesperada no componente: <span className="font-mono font-bold text-foreground">{this.props.name || "Global"}</span>
              </p>
            </div>
          </div>

          <div className="bg-background/80 backdrop-blur-sm p-4 rounded-lg border border-border mb-4 overflow-hidden">
            <p className="font-semibold text-foreground mb-1">Mensagem do erro:</p>
            <code className="text-sm text-destructive block bg-destructive/10 p-2 rounded border border-destructive/20 whitespace-pre-wrap">
              {this.state.error?.message || "Erro desconhecido"}
            </code>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
              className="gap-2"
            >
              {this.state.showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {this.state.showDetails ? "Ocultar detalhes" : "Ver stack resumido"}
            </Button>
            
            <Button variant="outline" size="sm" onClick={this.handleCopyError} className="gap-2">
              <Copy className="w-4 h-4" /> Copiar Erro
            </Button>

            <Button variant="default" size="sm" onClick={() => window.location.reload()} className="gap-2">
              <RefreshCcw className="w-4 h-4" /> Recarregar Página
            </Button>
          </div>

          {this.state.showDetails && (
            <div className="animate-in zoom-in-95 duration-200">
              <p className="text-xs font-semibold mb-1 opacity-70">Stack Trace:</p>
              <pre className="text-[10px] p-3 bg-muted rounded border border-border overflow-auto max-h-[300px] leading-tight">
                {this.state.error?.stack}
              </pre>
              {this.state.errorInfo?.componentStack && (
                <>
                  <p className="text-xs font-semibold mt-4 mb-1 opacity-70">Component hierarchy:</p>
                  <pre className="text-[10px] p-3 bg-muted rounded border border-border overflow-auto max-h-[200px] leading-tight italic">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
