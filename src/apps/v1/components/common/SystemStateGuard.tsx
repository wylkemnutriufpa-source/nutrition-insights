
import React from "react";

/**
 * SystemStateGuard Simplificado
 * O Loader principal agora é gerenciado pelo App.tsx.
 * Este componente apenas renderiza os filhos para manter a compatibilidade da árvore de rotas.
 */
export function SystemStateGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
