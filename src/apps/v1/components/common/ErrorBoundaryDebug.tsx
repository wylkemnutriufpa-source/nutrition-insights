import React, { Component, ErrorInfo, ReactNode } from "react";

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
      console.log(`[ErrorBoundaryDebug] Renderizando tela de erro para: ${this.props.name || "Global"}`);
      
      return (
        <div className="p-6 m-4 border-2 border-destructive bg-destructive/10 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500 overflow-auto max-w-[95vw] mx-auto my-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-destructive rounded-full shrink-0">
              <AlertTriangle className="w-8 h-8 text-destructive-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-destructive">CRASH DETECTADO: {this.props.name || "App"}</h2>
              <p className="text-sm text-muted-foreground font-medium">
                Um componente quebrou e impediu a renderização normal.
              </p>
            </div>
          </div>

          <div className="bg-black/80 text-white p-4 rounded-lg mb-6 font-mono text-xs overflow-auto border border-white/10">
            <p className="text-red-400 font-bold mb-2 underline">MENSAGEM DE ERRO:</p>
            <p className="mb-4">{this.state.error?.message}</p>
            
            <p className="text-red-400 font-bold mb-2 underline">STACK TRACE:</p>
            <pre className="whitespace-pre-wrap mb-4 opacity-80 leading-relaxed">
              {this.state.error?.stack}
            </pre>

            <p className="text-red-400 font-bold mb-2 underline">COMPONENT STACK:</p>
            <pre className="whitespace-pre-wrap opacity-60 leading-relaxed">
              {this.state.errorInfo?.componentStack}
            </pre>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="default" size="lg" onClick={() => window.location.reload()} className="gap-2 bg-destructive hover:bg-destructive/90 text-white">
              <RefreshCcw className="w-5 h-5" /> RECARREGAR APP
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              onClick={this.handleCopyError}
              className="gap-2 border-destructive text-destructive hover:bg-destructive/10"
            >
              <Copy className="w-5 h-5" /> COPIAR LOG DE ERRO
            </Button>

            <Button 
              variant="ghost" 
              size="lg" 
              onClick={() => window.location.assign("/")}
              className="gap-2"
            >
              IR PARA HOME
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-destructive/20 text-[10px] text-muted-foreground">
            ID do Erro: {Math.random().toString(36).substr(2, 9).toUpperCase()} | 
            Timestamp: {new Date().toISOString()} | 
            Navegador: {navigator.userAgent}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
