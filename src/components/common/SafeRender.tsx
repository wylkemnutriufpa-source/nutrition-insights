
import React, { ReactNode } from "react";
import { StabilityZone } from "./StabilityZone";
import { ShieldAlert } from "lucide-react";
import { logError } from "@/lib/monitoring";

interface SafeRenderProps {
  children: ReactNode;
  data: any[];
  name: string;
  fallback?: ReactNode;
}

/**
 * SafeRender: Valida dados obrigatórios antes de renderizar.
 * Se dados forem inválidos/vazios, exibe erro controlado em vez de crashar.
 */
export function SafeRender({ children, data, name, fallback }: SafeRenderProps) {
  const isDataValid = data.every(item => item !== undefined && item !== null);

  if (!isDataValid) {
    logError("data_error", name, `Dados inválidos ou ausentes para renderização de ${name}`, { data });
    // ... keep existing code
    
    if (fallback) return <>{fallback}</>;

    return (
      <div className="p-8 border border-amber-500/20 bg-amber-500/5 rounded-xl text-center space-y-4 m-4">
        <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
        <div>
          <h3 className="text-lg font-bold text-white">Dados Incompletos</h3>
          <p className="text-zinc-400 text-sm max-w-sm mx-auto">
            Não foi possível carregar as informações necessárias para renderizar "{name}".
          </p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="text-xs font-semibold text-amber-500 hover:underline"
        >
          Recarregar dados
        </button>
      </div>
    );
  }

  return (
    <StabilityZone name={name}>
      {children}
    </StabilityZone>
  );
}
