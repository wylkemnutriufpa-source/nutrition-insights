import React from 'react';
import { ArchitectureLock } from '@/lib/sovereign/lock';
import { useSovereignAudit } from '@/hooks/useSovereignAudit';

interface SovereignRendererProps {
  componentName: string;
  data: any;
  children: (data: any) => React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * 🛡️ SOVEREIGN RENDERER
 * 
 * Garante que o componente receba apenas dados soberanos e opere no modo PASSIVO.
 * Se os dados forem inválidos, ele bloqueia a renderização e dispara um alerta crítico.
 */
export const SovereignRenderer: React.FC<SovereignRendererProps> = ({
  componentName,
  data,
  children,
  fallback
}) => {
  const audit = useSovereignAudit(componentName, data);

  try {
    // 1. Validar integridade e modo passivo antes de renderizar
    ArchitectureLock.validatePassiveRender(data, componentName);
    
    // 2. Congelar o snapshot para evitar qualquer mutação "healing" no render
    const safeData = ArchitectureLock.freezeSnapshot(data);

    return <>{children(safeData)}</>;
  } catch (error: any) {
    console.error(`[SOVEREIGN_RENDER_FAILURE] ${componentName}:`, error.message);
    audit.denounce(`FALHA CRÍTICA DE INTEGRIDADE: ${error.message}`, { error });
    
    return (
      fallback || (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive">
          <h3 className="font-bold">Erro de Integridade Arquitetural</h3>
          <p className="text-sm">Este componente foi bloqueado por tentar processar dados não soberanos ou corrompidos.</p>
        </div>
      )
    );
  }
};
