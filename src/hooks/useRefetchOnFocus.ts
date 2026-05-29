/**
 * useRefetchOnFocus — DESATIVADO.
 *
 * Causava storm de invalidações em cascata combinado com listeners duplicados
 * em usePatientLifecycleState e com refetchInterval de várias queries, gerando:
 *   - refresh "sozinho" da página
 *   - lentidão ao trocar de aba/janela
 *   - re-render que derrubava o usuário para o dashboard
 *
 * Atualizações continuam chegando via Supabase Realtime (postgres_changes) e
 * via o `refetchInterval` próprio de cada query crítica (notificações, health).
 *
 * Mantido como no-op para preservar imports existentes.
 */
export function useRefetchOnFocus() {
  // intencionalmente vazio — ver bloco acima
}
