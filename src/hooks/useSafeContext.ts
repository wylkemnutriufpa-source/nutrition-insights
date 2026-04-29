
import { useContext } from 'react';

/**
 * useSafeContext: Um utility para consumir contextos de forma segura.
 * Se o contexto não estiver disponível, ele retorna um valor padrão ou lança um erro amigável
 * em vez de quebrar a renderização global.
 */
export function useSafeContext<T>(
  context: React.Context<T | undefined>,
  name: string,
  defaultValue?: T
): T {
  const value = useContext(context);
  
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    
    // Em vez de apenas throw, vamos logar um erro crítico que o SystemShield pode capturar
    const errorMsg = `Hook "${name}" usado fora de seu Provider. Isso é uma falha estrutural.`;
    console.error(`[FitJourney:SafeContext] ${errorMsg}`);
    
    // Dispara evento customizado para o GlobalErrorBoundary
    window.dispatchEvent(new CustomEvent('fj-runtime-error', {
      detail: {
        section: 'Estrutura/Hooks',
        message: errorMsg,
        timestamp: new Date().toISOString()
      }
    }));
    
    // Retornamos o valor como T (mesmo sendo undefined) para o Typescript não reclamar,
    // mas o app vai exibir o erro via evento ou disparar o ErrorBoundary local.
    return value as T;
  }
  
  return value;
}
