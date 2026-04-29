import React, { lazy, ComponentType } from "react";
import { toast } from "sonner";

/**
 * Enhanced React.lazy that catches loading errors (like ChunkLoadError)
 * and provides better debugging information.
 */
export function lazyDebug<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  componentName: string
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const result = await factory();
      return result;
    } catch (error: any) {
      console.error(`[LazyDebug] Falha ao carregar componente: ${componentName}`, error);
      
      const isChunkError = /loading.*chunk/i.test(error.message) || /failed.*fetch/i.test(error.message);
      
      const message = isChunkError 
        ? `Erro ao carregar módulo (lazy loading falhou): ${componentName}. O arquivo pode estar faltando no servidor.`
        : `Erro ao importar componente: ${componentName}. Verifique a sintaxe ou dependências.`;

      // Exibe erro na UI se possível (o ErrorBoundary pegará o throw abaixo)
      toast.error(message, {
        duration: 10000,
      });

      // Lançamos o erro para que o ErrorBoundary mais próximo capture e mostre a UI de erro
      throw new Error(message);
    }
  });
}
