/**
 * safeAccess: Utilitário de defesa sistêmica contra erros de nulabilidade (NaN/Undefined/Null).
 * Garante que o acesso a propriedades profundamente aninhadas nunca dispare um erro fatal de render.
 */
export function safeAccess<T = any>(obj: any, path: string, fallback: T): T {
  if (!obj) return fallback;
  
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return fallback;
    current = current[part];
  }
  
  return (current === null || current === undefined) ? fallback : current;
}
