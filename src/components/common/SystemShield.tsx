import React, { useEffect, useState, createContext, useContext } from "react";
import { ShieldAlert, RefreshCcw, WifiOff, Lock, ServerCrash, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SystemBootState {
  isAuthLoaded: boolean;
  isRouterActive: boolean;
  isProvidersMounted: boolean;
  isHealthy: boolean;
}

const SystemShieldContext = createContext<{
  bootState: SystemBootState;
  reportBootStatus: (key: keyof SystemBootState, value: boolean) => void;
} | undefined>(undefined);

export const useSystemShield = () => {
  const context = useContext(SystemShieldContext);
  if (!context) {
    // This is the recursive check - if the shield itself isn't mounted
    console.error("CRITICAL: useSystemShield used outside SystemShieldProvider");
  }
  return context;
};

export const SystemShieldProvider = ({ children }: { children: React.ReactNode }) => {
  const [bootState, setBootState] = useState<SystemBootState>({
    isAuthLoaded: false,
    isRouterActive: false,
    isProvidersMounted: false,
    isHealthy: true,
  });

  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // Watchdog for system boot (10 seconds)
    const timer = setTimeout(() => {
      if (!bootState.isAuthLoaded || !bootState.isProvidersMounted) {
        setTimedOut(true);
        console.error("SYSTEM SHIELD: Boot timeout detected", bootState);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [bootState]);

  const reportBootStatus = (key: keyof SystemBootState, value: boolean) => {
    setBootState(prev => ({ ...prev, [key]: value }));
  };

  // Mark providers as mounted immediately
  useEffect(() => {
    reportBootStatus("isProvidersMounted", true);
  }, []);

  if (timedOut) {
    return <DiagnosticScreen bootState={bootState} />;
  }

  return (
    <SystemShieldContext.Provider value={{ bootState, reportBootStatus }}>
      {children}
    </SystemShieldContext.Provider>
  );
};

const DiagnosticScreen = ({ bootState }: { bootState: SystemBootState }) => {
  const handleHardRefresh = () => {
    window.location.reload();
  };

  const handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-slate-950 text-slate-50 font-sans">
      <div className="max-w-xl w-full space-y-8 animate-in fade-in duration-700">
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <ShieldAlert className="w-10 h-10 text-destructive animate-pulse" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Falha Crítica de Inicialização</h1>
            <p className="text-slate-400 text-lg">
              O sistema FitJourney não conseguiu carregar todos os módulos de segurança necessários.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatusItem 
            label="Módulo de Autenticação" 
            status={bootState.isAuthLoaded} 
            icon={<Lock className="w-4 h-4" />}
          />
          <StatusItem 
            label="Núcleo de Rotas" 
            status={bootState.isRouterActive} 
            icon={<ServerCrash className="w-4 h-4" />}
          />
          <StatusItem 
            label="Camada de Dados" 
            status={bootState.isProvidersMounted} 
            icon={<AlertCircle className="w-4 h-4" />}
          />
          <StatusItem 
            label="Conectividade" 
            status={window.navigator.onLine} 
            icon={<WifiOff className="w-4 h-4" />}
          />
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="font-semibold text-slate-200">Ações Recomendadas:</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button onClick={handleHardRefresh} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white border-0">
              <RefreshCcw className="w-4 h-4" />
              Recarregar App
            </Button>
            <Button variant="outline" onClick={handleClearCache} className="gap-2 border-slate-700 hover:bg-slate-800">
              Limpar Cache e Sair
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 font-mono opacity-50">
          ERR_BOOT_TIMEOUT_GUARD_V4_SHIELD
        </p>
      </div>
    </div>
  );
};

const StatusItem = ({ label, status, icon }: { label: string, status: boolean, icon: React.ReactNode }) => (
  <div className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
    status ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-destructive/5 border-destructive/20 text-destructive'
  }`}>
    <div className={`p-2 rounded-lg ${status ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-xs font-medium opacity-80 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold">{status ? 'OPERACIONAL' : 'FALHOU / TIMEOUT'}</p>
    </div>
  </div>
);

// Helper for validating hooks outside providers
export function ensureContext<T>(context: T | undefined, hookName: string, providerName: string): T {
  if (context === undefined) {
    const errorMsg = `CRITICAL HOOK ERROR: '${hookName}' must be used within '${providerName}'. System stability compromised.`;
    console.error(errorMsg);
    
    // In production, we don't want to crash the whole app if possible, 
    // but we MUST show a clear error if it's a critical hook.
    const event = new CustomEvent('fj-runtime-error', {
      detail: {
        section: "Hook Validation",
        message: errorMsg,
        timestamp: new Date().toISOString()
      }
    });
    window.dispatchEvent(event);
    
    throw new Error(errorMsg);
  }
  return context;
}
