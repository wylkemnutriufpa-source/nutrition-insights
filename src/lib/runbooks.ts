/**
 * FitJourney — Operational Runbooks
 * 
 * Documentação operacional para diagnóstico e recuperação de falhas.
 * Determinístico. Sem IA. Só procedimento.
 */

export interface Runbook {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium";
  symptoms: string[];
  diagnosis: string[];
  immediateAction: string[];
  definitiveAction: string[];
  preventiveMeasures: string[];
}

export const RUNBOOKS: Runbook[] = [
  {
    id: "system_down",
    title: "Falha Geral do Sistema",
    severity: "critical",
    symptoms: [
      "Tela branca ou erro 500",
      "Múltiplos usuários reportando indisponibilidade",
      "Dashboard não carrega",
    ],
    diagnosis: [
      "Verificar System Health Live (/system-health-live)",
      "Checar console do navegador por erros JavaScript",
      "Verificar status das Edge Functions no painel",
      "Checar se o banco está respondendo (testar query simples)",
    ],
    immediateAction: [
      "Notificar equipe via canal de emergência",
      "Verificar se houve deploy recente — considerar rollback",
      "Checar se é problema de DNS/CDN ou backend",
      "Ativar kill switch se necessário (desativar features não-críticas)",
    ],
    definitiveAction: [
      "Identificar root cause nos logs",
      "Corrigir e testar em ambiente isolado",
      "Deploy com smoke test obrigatório",
      "Monitorar por 30min após correção",
    ],
    preventiveMeasures: [
      "Rodar smoke tests antes de todo deploy",
      "Manter ErrorBoundaries em todas as rotas",
      "Ter feature flags para desativar módulos instáveis",
    ],
  },
  {
    id: "realtime_failure",
    title: "Falha de Realtime",
    severity: "high",
    symptoms: [
      "Dados não atualizam sem refresh manual",
      "Badge de 'novos' não aparece",
      "Chat não recebe mensagens em tempo real",
      "Realtime Debug Center mostra 0 eventos",
    ],
    diagnosis: [
      "Abrir Realtime Debug Center (/system-diagnostics/realtime)",
      "Verificar se canal está subscrito (status: SUBSCRIBED)",
      "Checar se tabela está na publicação supabase_realtime",
      "Verificar RLS — realtime precisa que SELECT funcione",
    ],
    immediateAction: [
      "Orientar usuários a dar refresh (solução paliativa)",
      "Verificar se limites de conexão do Supabase foram atingidos",
      "Re-subscrever canais críticos manualmente",
    ],
    definitiveAction: [
      "Confirmar que todas as tabelas críticas estão na publicação",
      "Verificar e corrigir políticas RLS que bloqueiam SELECT",
      "Revisar hooks de realtime (usePatientRealtime, useNutritionistRealtime)",
    ],
    preventiveMeasures: [
      "Monitorar latência de realtime no Debug Center",
      "Auto-refetch on focus como fallback",
      "Invalidação forçada em ações críticas",
    ],
  },
  {
    id: "storage_failure",
    title: "Falha de Storage / Upload",
    severity: "high",
    symptoms: [
      "Upload de imagem falha",
      "Imagens não carregam (broken image)",
      "Signed URL expirada",
      "Erro 403 ao acessar arquivo",
    ],
    diagnosis: [
      "Verificar se bucket existe e está configurado",
      "Checar RLS do bucket — upload precisa de INSERT em storage.objects",
      "Verificar se signed URL está sendo gerada corretamente",
      "Checar se path do arquivo está correto (não URL completa)",
    ],
    immediateAction: [
      "Verificar se é problema de permissão (RLS) ou de quota",
      "Regenerar signed URL para arquivos afetados",
      "Verificar se campo no banco está salvando path (não URL completa)",
    ],
    definitiveAction: [
      "Corrigir RLS policies se necessário",
      "Migrar campos que ainda salvam URL completa para path",
      "Implementar retry automático no upload",
    ],
    preventiveMeasures: [
      "Sempre salvar storage path, nunca URL completa",
      "Usar StorageImage component para renderizar com signed URL",
      "Renovar signed URLs antes de expirar em sessões longas",
    ],
  },
  {
    id: "deploy_broken",
    title: "Deploy com Erro",
    severity: "critical",
    symptoms: [
      "Build falha",
      "App não carrega após deploy",
      "Funcionalidade que funcionava parou",
      "Erros de TypeScript em produção",
    ],
    diagnosis: [
      "Checar logs de build",
      "Verificar se houve mudança de schema sem migration",
      "Rodar testes locais (npm run test)",
      "Comparar diff do último commit",
    ],
    immediateAction: [
      "Rollback para versão anterior se possível",
      "Identificar arquivo/componente que causou o erro",
      "Desativar feature via feature flag se for módulo isolado",
    ],
    definitiveAction: [
      "Corrigir o código e rodar testes completos",
      "Garantir que migrations foram aplicadas",
      "Deploy gradual com monitoramento",
    ],
    preventiveMeasures: [
      "Nunca fazer deploy sem rodar testes",
      "Usar feature flags para novas funcionalidades",
      "Manter ErrorBoundaries em todas as rotas críticas",
    ],
  },
  {
    id: "edge_function_error",
    title: "Erro em Edge Functions",
    severity: "high",
    symptoms: [
      "Funcionalidade do backend não responde",
      "Timeout em operações",
      "Erro 500 ao chamar função",
      "Rate limit inesperado",
    ],
    diagnosis: [
      "Checar logs da função no painel",
      "Verificar se secrets estão configurados",
      "Testar função isoladamente com curl",
      "Verificar rate limit — pode ser bloqueio legítimo",
    ],
    immediateAction: [
      "Verificar se é problema de secret/env var ausente",
      "Checar se é timeout (aumentar se necessário)",
      "Verificar se rate limit está bloqueando usuários legítimos",
    ],
    definitiveAction: [
      "Corrigir lógica da função",
      "Adicionar validação de input adequada",
      "Ajustar thresholds de rate limit se necessário",
    ],
    preventiveMeasures: [
      "Logging estruturado em todas as edge functions",
      "Rate limit consistente em funções críticas",
      "Validação de input com Zod",
    ],
  },
  {
    id: "payment_failure",
    title: "Falha de Pagamento",
    severity: "critical",
    symptoms: [
      "Paciente pagou mas status não atualizou",
      "Onboarding não liberou após pagamento",
      "Webhook do Stripe não chegou",
    ],
    diagnosis: [
      "Verificar logs do stripe-webhook edge function",
      "Checar se evento chegou na tabela de pagamentos",
      "Verificar lifecycle do paciente",
      "Confirmar que RPC de transição foi chamada",
    ],
    immediateAction: [
      "Atualizar status manualmente via admin",
      "Verificar e reprocessar webhook se necessário",
      "Liberar onboarding manualmente para o paciente",
    ],
    definitiveAction: [
      "Garantir idempotência no webhook handler",
      "Adicionar retry automático na transição de lifecycle",
      "Implementar reconciliação periódica pagamento vs status",
    ],
    preventiveMeasures: [
      "Monitorar taxa de sucesso de webhooks",
      "Alerta quando pagamento não transiciona lifecycle em 5min",
      "Logs detalhados em cada etapa do fluxo",
    ],
  },
];

/** Buscar runbook por ID */
export function getRunbook(id: string): Runbook | undefined {
  return RUNBOOKS.find((r) => r.id === id);
}

/** Buscar runbooks por severidade */
export function getRunbooksBySeverity(severity: Runbook["severity"]): Runbook[] {
  return RUNBOOKS.filter((r) => r.severity === severity);
}
