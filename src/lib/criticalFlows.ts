/**
 * FitJourney — Critical Flows Registry (BLOCO 1)
 * 
 * Inventário oficial de fluxos que NÃO PODEM QUEBRAR.
 * Cada fluxo documenta páginas, tabelas, edge functions, status e ação principal.
 * 
 * Este mapa é a fonte da verdade para:
 * - Smoke tests
 * - Impact checks
 * - Regression guards
 * - Self-healing routing
 */

export interface CriticalFlow {
  id: string;
  name: string;
  description: string;
  severity: "critical" | "high" | "medium";
  pages: string[];
  tables: string[];
  edgeFunctions: string[];
  expectedStatuses?: string[];
  userAction: string;
  expectedResult: string;
  rpcFunctions?: string[];
  /** Related flows that depend on this one */
  dependsOn?: string[];
}

export const CRITICAL_FLOWS: CriticalFlow[] = [
  // ========== AUTENTICAÇÃO ==========
  {
    id: "auth_login",
    name: "Login",
    description: "Autenticação de profissional ou paciente",
    severity: "critical",
    pages: ["/auth"],
    tables: ["profiles", "user_roles"],
    edgeFunctions: ["check-subscription"],
    userAction: "Inserir email/senha e clicar em Entrar",
    expectedResult: "Redirecionar para dashboard correto conforme role",
  },
  {
    id: "auth_register",
    name: "Cadastro de Profissional",
    description: "Registro de novo nutricionista/personal",
    severity: "critical",
    pages: ["/auth"],
    tables: ["profiles", "user_roles"],
    edgeFunctions: [],
    userAction: "Preencher formulário e criar conta",
    expectedResult: "Conta criada, email de verificação enviado",
  },

  // ========== PACIENTE → PROFISSIONAL ==========
  {
    id: "patient_register",
    name: "Cadastro de Paciente",
    description: "Paciente se cadastra e vincula a um profissional",
    severity: "critical",
    pages: ["/cadastro"],
    tables: ["profiles", "user_roles", "nutritionist_patients", "patient_lifecycle_state"],
    edgeFunctions: [],
    rpcFunctions: ["search_professionals"],
    expectedStatuses: ["lead_created", "awaiting_payment"],
    userAction: "Paciente preenche dados e seleciona profissional",
    expectedResult: "Conta criada, vínculo com profissional estabelecido, lifecycle state = lead_created",
  },
  {
    id: "patient_notification",
    name: "Notificação de Novo Paciente",
    description: "Profissional é notificado de novo paciente",
    severity: "high",
    pages: ["/notifications", "/patients"],
    tables: ["notifications", "nutritionist_patients"],
    edgeFunctions: [],
    userAction: "Paciente se cadastra",
    expectedResult: "Notificação aparece no sino do profissional",
    dependsOn: ["patient_register"],
  },

  // ========== ONBOARDING ==========
  {
    id: "onboarding_release",
    name: "Liberação de Onboarding",
    description: "Profissional libera onboarding para paciente",
    severity: "critical",
    pages: ["/patients", "/patients/:patientId"],
    tables: ["patient_lifecycle_state", "nutritionist_patients"],
    edgeFunctions: [],
    expectedStatuses: ["awaiting_onboarding_release", "onboarding_active"],
    userAction: "Profissional clica em liberar onboarding",
    expectedResult: "lifecycle muda para onboarding_active, paciente acessa onboarding",
    dependsOn: ["patient_register"],
  },
  {
    id: "onboarding_flow",
    name: "Onboarding Inteligente",
    description: "Paciente completa onboarding com continuidade por etapa",
    severity: "critical",
    pages: ["/onboarding"],
    tables: ["patient_anamnesis", "patient_lifecycle_state", "checklist_tasks"],
    edgeFunctions: [],
    expectedStatuses: ["onboarding_active", "onboarding_completed"],
    userAction: "Paciente completa etapas do onboarding",
    expectedResult: "Progresso salvo, continua da etapa pendente ao voltar",
    dependsOn: ["onboarding_release"],
  },

  // ========== ANAMNESE ==========
  {
    id: "anamnesis",
    name: "Anamnese",
    description: "Coleta de dados clínicos do paciente",
    severity: "critical",
    pages: ["/anamnesis"],
    tables: ["patient_anamnesis"],
    edgeFunctions: [],
    userAction: "Paciente/profissional preenche anamnese",
    expectedResult: "Dados salvos, blocos adaptativos disparados",
  },
  {
    id: "anamnesis_adaptive_blocks",
    name: "Blocos Adaptativos da Anamnese",
    description: "Blocos condicionais baseados em respostas",
    severity: "high",
    pages: ["/anamnesis"],
    tables: ["patient_anamnesis", "anamnese_trigger_map"],
    edgeFunctions: [],
    userAction: "Paciente responde perguntas gatilho",
    expectedResult: "Blocos adicionais aparecem condicionalmente",
    dependsOn: ["anamnesis"],
  },

  // ========== FLAGS E AUTOMAÇÃO CLÍNICA ==========
  {
    id: "clinical_flags",
    name: "Geração de Flags Clínicas",
    description: "Motor gera flags a partir da anamnese",
    severity: "high",
    pages: ["/patients/:patientId"],
    tables: ["patient_clinical_flags", "clinical_flags_catalog", "anamnese_trigger_map"],
    edgeFunctions: ["process-anamnesis-flags"],
    userAction: "Anamnese completada",
    expectedResult: "Flags geradas e visíveis no perfil do paciente",
    dependsOn: ["anamnesis"],
  },
  {
    id: "behavioral_tasks",
    name: "Geração de Tarefas Comportamentais",
    description: "Tarefas automáticas baseadas em flags clínicas",
    severity: "high",
    pages: ["/patients/:patientId", "/checklist"],
    tables: ["patient_behavioral_tasks", "patient_clinical_flags", "clinical_behavior_rules"],
    edgeFunctions: ["generate-behavioral-tasks"],
    userAction: "Flags geradas após anamnese",
    expectedResult: "Tarefas aparecem no checklist do paciente",
    dependsOn: ["clinical_flags"],
  },
  {
    id: "clinical_messages",
    name: "Geração de Mensagens Clínicas",
    description: "Mensagens automáticas baseadas em flags",
    severity: "high",
    pages: ["/patients/:patientId"],
    tables: ["patient_clinical_messages", "clinical_message_templates", "clinical_behavior_rules"],
    edgeFunctions: ["generate-behavioral-tasks"],
    userAction: "Flags geradas após anamnese",
    expectedResult: "Mensagens criadas para o paciente",
    dependsOn: ["clinical_flags"],
  },

  // ========== DASHBOARD PACIENTE ==========
  {
    id: "patient_dashboard",
    name: "Dashboard do Paciente",
    description: "Tela principal do paciente com dados consolidados",
    severity: "critical",
    pages: ["/dashboard"],
    tables: ["profiles", "checklist_tasks", "patient_lifecycle_state", "meal_plans"],
    edgeFunctions: [],
    userAction: "Paciente faz login",
    expectedResult: "Dashboard carrega com widgets e dados corretos",
  },
  {
    id: "daily_focus",
    name: "Home Inteligente / Daily Focus",
    description: "Widget Seu Foco Agora com prioridades do dia",
    severity: "high",
    pages: ["/dashboard"],
    tables: ["patient_behavioral_tasks", "checklist_tasks", "patient_clinical_messages"],
    edgeFunctions: [],
    userAction: "Paciente acessa dashboard",
    expectedResult: "Top 5 itens prioritários aparecem",
    dependsOn: ["patient_dashboard"],
  },
  {
    id: "checklist",
    name: "Checklist Diário",
    description: "Tarefas diárias do paciente",
    severity: "high",
    pages: ["/checklist"],
    tables: ["checklist_tasks", "patient_protocols"],
    edgeFunctions: [],
    userAction: "Paciente marca tarefa como concluída",
    expectedResult: "Tarefa marcada, progresso atualizado",
  },

  // ========== PLANOS ALIMENTARES ==========
  {
    id: "meal_plan_editor",
    name: "Editor de Plano V2",
    description: "Criação/edição de plano alimentar",
    severity: "critical",
    pages: ["/meal-plans/:id", "/editor-v2"],
    tables: ["meal_plans", "meal_plan_days", "meal_plan_meals", "meal_plan_foods"],
    edgeFunctions: [],
    userAction: "Profissional edita plano alimentar",
    expectedResult: "Plano salva corretamente com refeições e alimentos",
  },
  {
    id: "meal_plan_publish",
    name: "Publicação de Plano",
    description: "Profissional publica plano para paciente",
    severity: "critical",
    pages: ["/meal-plans/:id"],
    tables: ["meal_plans"],
    expectedStatuses: ["published"],
    edgeFunctions: [],
    userAction: "Profissional clica em publicar",
    expectedResult: "Plano visível para o paciente",
    dependsOn: ["meal_plan_editor"],
  },
  {
    id: "meal_plan_patient_view",
    name: "Visualização do Plano pelo Paciente",
    description: "Paciente visualiza plano publicado",
    severity: "critical",
    pages: ["/meals"],
    tables: ["meal_plans", "meal_plan_days", "meal_plan_meals", "meal_plan_foods"],
    edgeFunctions: [],
    userAction: "Paciente acessa aba de alimentação",
    expectedResult: "Plano aparece com refeições organizadas",
    dependsOn: ["meal_plan_publish"],
  },
  {
    id: "assisted_generator",
    name: "Gerador Assistido de Planos",
    description: "IA gera plano alimentar baseado em dados do paciente",
    severity: "high",
    pages: ["/editor-v2"],
    tables: ["meal_plans", "meal_plan_days", "meal_plan_meals", "meal_plan_foods"],
    edgeFunctions: ["generate-meal-plan"],
    userAction: "Profissional usa gerador assistido",
    expectedResult: "Plano gerado com macros equilibrados",
  },

  // ========== RECEITAS ==========
  {
    id: "recipes",
    name: "Receitas / Modal de Receitas",
    description: "Visualização e modal premium de receitas",
    severity: "high",
    pages: ["/recipes"],
    tables: ["recipes"],
    edgeFunctions: [],
    userAction: "Usuário clica em receita",
    expectedResult: "Modal abre com ingredientes e instruções formatados",
  },

  // ========== NOTIFICAÇÕES ==========
  {
    id: "smart_notifications",
    name: "Notificações Inteligentes Clicáveis",
    description: "Sistema de notificações com deep links",
    severity: "high",
    pages: ["/notifications"],
    tables: ["notifications"],
    edgeFunctions: [],
    userAction: "Usuário clica em notificação",
    expectedResult: "Redireciona para a página/recurso correto",
  },

  // ========== WHATSAPP ==========
  {
    id: "whatsapp_integration",
    name: "Integração WhatsApp",
    description: "Conexão e envio de mensagens via Z-API",
    severity: "high",
    pages: ["/settings/whatsapp"],
    tables: ["whatsapp_connections"],
    edgeFunctions: ["whatsapp-validate", "whatsapp-send"],
    userAction: "Profissional configura credenciais e testa envio",
    expectedResult: "Conexão validada, mensagem de teste enviada",
  },

  // ========== DASHBOARD PROFISSIONAL ==========
  {
    id: "professional_dashboard",
    name: "Dashboard Profissional",
    description: "Painel principal do nutricionista",
    severity: "critical",
    pages: ["/dashboard"],
    tables: ["profiles", "nutritionist_patients", "patient_lifecycle_state"],
    edgeFunctions: ["check-subscription"],
    userAction: "Profissional faz login",
    expectedResult: "Dashboard carrega com métricas e fila de pacientes",
  },

  // ========== ANALYTICS ==========
  {
    id: "clinical_analytics",
    name: "Analytics Clínico",
    description: "Métricas e análises clínicas do profissional",
    severity: "medium",
    pages: ["/clinical-intelligence", "/analytics"],
    tables: [
      "clinical_daily_snapshots", "clinic_portfolio_state",
      "clinic_clinical_evolution_metrics", "clinical_alerts",
    ],
    edgeFunctions: ["run-clinical-pipeline"],
    userAction: "Profissional acessa painel de analytics",
    expectedResult: "Gráficos e métricas carregam corretamente",
  },
];

// ========== Lookup helpers ==========

/** Get a flow by ID */
export function getFlow(id: string): CriticalFlow | undefined {
  return CRITICAL_FLOWS.find((f) => f.id === id);
}

/** Get all flows that touch a specific page/route */
export function getFlowsByPage(route: string): CriticalFlow[] {
  return CRITICAL_FLOWS.filter((f) =>
    f.pages.some((p) => {
      // Handle dynamic params
      const pattern = p.replace(/:[^/]+/g, "[^/]+");
      return new RegExp(`^${pattern}$`).test(route) || p === route;
    })
  );
}

/** Get all flows that touch a specific table */
export function getFlowsByTable(table: string): CriticalFlow[] {
  return CRITICAL_FLOWS.filter((f) => f.tables.includes(table));
}

/** Get all flows that use a specific edge function */
export function getFlowsByEdgeFunction(fn: string): CriticalFlow[] {
  return CRITICAL_FLOWS.filter((f) => f.edgeFunctions.includes(fn));
}

/** Get all critical/high severity flows */
export function getCriticalFlows(): CriticalFlow[] {
  return CRITICAL_FLOWS.filter((f) => f.severity === "critical" || f.severity === "high");
}

/** Get dependent flows (flows that depend on a given flow) */
export function getDependentFlows(flowId: string): CriticalFlow[] {
  return CRITICAL_FLOWS.filter((f) => f.dependsOn?.includes(flowId));
}

/** Impact analysis: given a set of tables/pages/functions, return all affected flows */
export function analyzeImpact(changes: {
  tables?: string[];
  pages?: string[];
  edgeFunctions?: string[];
}): { flow: CriticalFlow; impactReason: string }[] {
  const results: { flow: CriticalFlow; impactReason: string }[] = [];

  for (const flow of CRITICAL_FLOWS) {
    const reasons: string[] = [];

    if (changes.tables) {
      const affectedTables = changes.tables.filter((t) => flow.tables.includes(t));
      if (affectedTables.length) reasons.push(`tabelas: ${affectedTables.join(", ")}`);
    }

    if (changes.pages) {
      const affectedPages = changes.pages.filter((p) =>
        flow.pages.some((fp) => fp === p || fp.startsWith(p.split("/").slice(0, 2).join("/")))
      );
      if (affectedPages.length) reasons.push(`páginas: ${affectedPages.join(", ")}`);
    }

    if (changes.edgeFunctions) {
      const affectedFns = changes.edgeFunctions.filter((f) => flow.edgeFunctions.includes(f));
      if (affectedFns.length) reasons.push(`edge functions: ${affectedFns.join(", ")}`);
    }

    if (reasons.length) {
      results.push({ flow, impactReason: reasons.join("; ") });
    }
  }

  return results;
}
