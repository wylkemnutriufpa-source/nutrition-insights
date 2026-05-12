/**
 * MODO SIMPLES EMERGENCIAL
 * 
 * Quando ativado:
 * - Bypass de todas as validações clínicas no frontend
 * - Sem auto-correção
 * - Sem bloqueios para salvar/editar/publicar
 * - Frontend apenas reflete o banco
 * 
 * O nutricionista decide. O sistema apenas persiste.
 */

export const SIMPLE_MODE = true;

export function isSimpleMode(): boolean {
  return SIMPLE_MODE;
}
