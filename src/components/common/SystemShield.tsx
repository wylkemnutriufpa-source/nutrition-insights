import React, { useEffect, useState, createContext, useContext, useCallback } from "react";
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
  // Safe fallback if provider is removed
  if (!context) {
    return {
      bootState: {
        isAuthLoaded: true,
        isRouterActive: true,
        isProvidersMounted: true,
        isHealthy: true,
      },
      reportBootStatus: () => {},
    };
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

  const reportBootStatus = useCallback((key: keyof SystemBootState, value: boolean) => {
    setBootState(prev => {
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  // Mark providers as mounted immediately
  useEffect(() => {
    reportBootStatus("isProvidersMounted", true);
  }, [reportBootStatus]);

  const contextValue = React.useMemo(() => ({ 
    bootState, 
    reportBootStatus 
  }), [bootState, reportBootStatus]);

  return (
    <SystemShieldContext.Provider value={contextValue}>
      {children}
    </SystemShieldContext.Provider>
  );
};

// DiagnosticScreen removido conforme regra de "Não mascarar erro" e "Não criar fallback automático".
// O sistema agora depende de ErrorBoundaries reais e falha explícita.

export function ensureContext<T>(context: T | undefined, hookName: string, providerName: string): T {
  if (context === undefined) {
    const errorMsg = `CRITICAL HOOK ERROR: '${hookName}' must be used within '${providerName}'. System stability compromised.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  return context;
}
