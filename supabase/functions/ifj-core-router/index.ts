import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// IFJ CORE ROUTER v4.0 — Hardened Deterministic Orchestrator
// Zero LLM. Role-scoped. IFJ access gated. Action execution.
// ═══════════════════════════════════════════════════════════════

interface IFJIntent {
  intent: string;
  target_entity: string | null;
  target_id: string | null;
  target_name: string | null;
  module: string;
  confidence: number;
  needs_disambiguation: boolean;
  response_mode: string;
}

interface IFJResponse {
  title: string;
  icon: string;
  response_type: string;
  summary: string;
  body_markdown: string;
  actions: Array<{ label: string; route: string; type: string }>;
  meta: { intent: string; confidence: number; data_source: string; engine: string; used_context: boolean };
  sessionContext: Record<string, any>;
}

interface SessionCtx {
  last_patient_id?: string;
  last_patient_name?: string;
  last_student_id?: string;
  last_student_name?: string;
  last_module?: string;
  last_route?: string;
  last_intent?: string;
  last_entity_type?: string;
  last_entity_id?: string;
}

interface PatientRecord {
  id: string;
  full_name: string;
  goal: string | null;
  journey_status: string | null;
  status: string | null;
}

// ── NORMALIZE ──────────────────────────────────────────────────
function normalize(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

// ── SYNONYM MATCHER ────────────────────────────────────────────
const SYNONYM_MAP: Record<string, string[]> = {
  patients_attention: ["atencao", "urgente", "risco", "critico", "dropout", "abandono", "piorou", "caiu"],
  patients_improved: ["melhorou", "evoluiu", "progresso", "avancou", "melhora"],
  patient_detail: ["paciente", "sobre", "como esta", "como vai", "ficha", "perfil", "dados"],
  financial_overview: ["financeiro", "faturamento", "receita", "dinheiro", "pagamento", "cobranc", "caixa", "inadimpl"],
  financial_pending: ["cobranca pendente", "cobrancas pendente", "pagamento atrasado", "inadimplente", "devendo"],
  meal_plan: ["plano alimentar", "dieta", "refeic", "cardapio", "plano nutricional"],
  meal_plan_expiring: ["plano vencendo", "planos vencendo", "dieta vencendo", "plano expira", "renovar plano"],
  anamnesis: ["anamnese", "anamnesis", "historico clinico", "questionario"],
  lab_exams: ["exame", "laboratorio", "hemograma", "resultado", "marcador"],
  lab_pending: ["exame pendente", "resultado pendente", "exame sem revisar"],
  clinical_alerts: ["alerta", "aviso", "notificac"],
  clinical_summary: ["resum", "carteira", "panorama", "visao geral", "overview", "dashboard"],
  checklist_status: ["checklist", "tarefas de hoje", "adesao", "aderencia"],
  hydration: ["agua", "hidratac", "copos"],
  appointments: ["consulta", "agenda", "agendamento", "horario", "atendimento"],
  workout_overview: ["treino", "exercicio", "academia", "musculac", "treinamento"],
  workout_pain: ["dor", "lesao", "desconforto", "incomodo", "machuc"],
  workout_progress: ["progresso treino", "carga", "evolucao treino", "volume"],
  student_detail: ["aluno", "estudante", "meu aluno"],
  journey_status: ["jornada", "estagio", "fase", "etapa"],
  priorities_today: ["prioridade", "resolver hoje", "o que fazer", "pendencia do dia", "agenda ifj", "fila"],
  next_best_action: ["proxima acao", "melhor acao", "o que fazer agora", "sugestao", "recomendac"],
  portfolio_health: ["saude da carteira", "portfolio", "score geral"],
  system_status: ["status sistema", "saude sistema", "diagnostico"],
  navigate: ["abrir", "ir para", "navegar", "mostrar tela", "abra"],
  greeting: ["oi", "ola", "bom dia", "boa tarde", "boa noite", "eai", "salve", "opa", "fala"],
  help: ["ajuda", "como usar", "comandos", "o que voce faz", "tutorial"],
  // ACTION INTENTS — real operations
  action_release_onboarding: ["libere onboarding", "liberar onboarding", "ative onboarding", "ativar onboarding", "libere o onboarding"],
  action_awaiting_onboarding: [
    "aguardando onboarding", "pendente onboarding", "quem precisa ativar onboarding",
    "sem onboarding", "liberacao de onboarding", "liberar onboarding",
    "aguardando liberacao", "pendente de liberacao", "esperando onboarding",
    "quem precisa de onboarding", "quem esta esperando onboarding",
    "quem precisa liberar", "aguardando aprovacao clinica",
    "esperando eu liberar", "esperando liberar",
  ],
  action_awaiting_payment: ["aguardando pagamento", "sem pagamento", "pendente pagamento", "quem nao pagou", "nao pagou"],
  action_no_diet: ["sem dieta", "sem plano alimentar", "quem esta sem dieta", "pacientes sem plano", "sem plano"],
  action_awaiting_approval: ["aguardando aprovacao", "pendente aprovacao", "esperando aprovacao", "pendente de aprovacao"],
  action_set_premium: ["coloque premium", "ative premium", "libere premium", "dar premium", "tornar premium", "premium para"],
  action_enable_ifj: ["libere ifj", "ative ifj", "habilite ifj", "ligar ifj", "liberar ifj", "ativar ifj"],
  action_compound: ["e libere", "e ative", "e coloque", "e habilite"],
};

function matchesIntent(n: string, intentKey: string): boolean {
  return (SYNONYM_MAP[intentKey] || []).some(s => n.includes(s));
}

// ── INTENT DETECTION ───────────────────────────────────────────
function detectIntent(n: string, ctx: SessionCtx): IFJIntent {
  const base: IFJIntent = {
    intent: "unknown", target_entity: null, target_id: null, target_name: null,
    module: "general", confidence: 0, needs_disambiguation: false, response_mode: "text",
  };

  if (/^(oi|ola|bom dia|boa tarde|boa noite|eai|salve|opa|fala|hey)\b/.test(n))
    return { ...base, intent: "greeting", module: "general", confidence: 0.99, response_mode: "greeting" };

  if (matchesIntent(n, "help"))
    return { ...base, intent: "help", module: "general", confidence: 0.95, response_mode: "help" };

  // ACTION INTENTS — execute real operations (MUST be before journey_status to avoid "onboarding" steal)
  // Compound action detection: "coloque premium e libere IFJ para Marisa Lima"
  if (n.match(/(?:coloque|ative|libere|de|dar)\s+premium.*(?:e\s+)?(?:libere|ative|habilite)\s+ifj\s+(?:para|d[aeo]\s+)?(.+)/) ||
      n.match(/(?:libere|ative|habilite)\s+ifj.*(?:e\s+)?(?:coloque|ative|libere|de)\s+premium\s+(?:para|d[aeo]\s+)?(.+)/)) {
    const nameMatch = n.match(/(?:para|d[aeo])\s+([a-z\s]+?)(?:\s*$)/);
    return { ...base, intent: "action_compound_premium_ifj", target_entity: "patient", target_name: nameMatch?.[1] || null, module: "action_engine", confidence: 0.97, response_mode: "action" };
  }

  if (matchesIntent(n, "action_release_onboarding")) {
    const nameMatch = n.match(/(?:libere?|ative?)\s+(?:o\s+)?onboarding\s+(?:d[aeo]\s+)?(.+)/);
    return { ...base, intent: "action_release_onboarding", target_entity: "patient", target_name: nameMatch?.[1] || null, module: "action_engine", confidence: 0.96, response_mode: "action" };
  }

  if (matchesIntent(n, "action_set_premium")) {
    const nameMatch = n.match(/(?:coloque|ative|libere|dar|tornar)\s+premium\s+(?:para\s+|d[aeo]\s+)?(.+)/);
    return { ...base, intent: "action_set_premium", target_entity: "patient", target_name: nameMatch?.[1] || null, module: "action_engine", confidence: 0.95, response_mode: "action" };
  }

  if (matchesIntent(n, "action_enable_ifj")) {
    const nameMatch = n.match(/(?:libere?|ative?|habilite?|ligar?)\s+ifj\s+(?:para\s+|d[aeo]\s+)?(.+)/);
    return { ...base, intent: "action_enable_ifj", target_entity: "patient", target_name: nameMatch?.[1] || null, module: "action_engine", confidence: 0.95, response_mode: "action" };
  }

  if (matchesIntent(n, "action_awaiting_onboarding"))
    return { ...base, intent: "action_awaiting_onboarding", module: "action_engine", confidence: 0.94, response_mode: "list" };

  if (matchesIntent(n, "action_awaiting_payment"))
    return { ...base, intent: "action_awaiting_payment", module: "action_engine", confidence: 0.94, response_mode: "list" };

  if (matchesIntent(n, "action_no_diet"))
    return { ...base, intent: "action_no_diet", module: "action_engine", confidence: 0.94, response_mode: "list" };

  if (matchesIntent(n, "action_awaiting_approval"))
    return { ...base, intent: "action_awaiting_approval", module: "action_engine", confidence: 0.94, response_mode: "list" };

  if (n.includes("resolver hoje") || n.includes("prioridade do dia") || n.includes("o que preciso") || n.includes("pendencia") || n.includes("fila ifj") || n.includes("agenda ifj"))
    return { ...base, intent: "priorities_today", module: "priority_engine", confidence: 0.96, response_mode: "priority_list" };

  if (matchesIntent(n, "next_best_action"))
    return { ...base, intent: "next_best_action", module: "priority_engine", confidence: 0.94, response_mode: "action" };

  if (matchesIntent(n, "patients_attention"))
    return { ...base, intent: "patients_attention", target_entity: "patients", module: "clinical_engine", confidence: 0.95, response_mode: "priority_list" };

  if (matchesIntent(n, "patients_improved"))
    return { ...base, intent: "patients_improved", target_entity: "patients", module: "clinical_engine", confidence: 0.92, response_mode: "list" };

  if (matchesIntent(n, "financial_pending"))
    return { ...base, intent: "financial_pending", module: "financial_engine", confidence: 0.94, response_mode: "list" };

  if (matchesIntent(n, "financial_overview"))
    return { ...base, intent: "financial_overview", module: "financial_engine", confidence: 0.93, response_mode: "overview" };

  if (matchesIntent(n, "lab_pending"))
    return { ...base, intent: "lab_pending", module: "clinical_engine", confidence: 0.92, response_mode: "list" };

  if (matchesIntent(n, "meal_plan_expiring"))
    return { ...base, intent: "meal_plan_expiring", module: "clinical_engine", confidence: 0.93, response_mode: "list" };

  if (matchesIntent(n, "workout_pain"))
    return { ...base, intent: "workout_pain", target_entity: "students", module: "training_engine", confidence: 0.93, response_mode: "list" };

  if (matchesIntent(n, "workout_overview"))
    return { ...base, intent: "workout_overview", module: "training_engine", confidence: 0.90, response_mode: "overview" };

  if (matchesIntent(n, "clinical_alerts"))
    return { ...base, intent: "clinical_alerts", module: "clinical_engine", confidence: 0.93, response_mode: "list" };

  if (matchesIntent(n, "clinical_summary"))
    return { ...base, intent: "clinical_summary", module: "clinical_engine", confidence: 0.92, response_mode: "overview" };

  if (matchesIntent(n, "appointments"))
    return { ...base, intent: "appointments", module: "journey_engine", confidence: 0.91, response_mode: "list" };

  if (matchesIntent(n, "journey_status"))
    return { ...base, intent: "journey_status", module: "journey_engine", confidence: 0.90, response_mode: "overview" };

  if (matchesIntent(n, "anamnesis"))
    return { ...base, intent: "anamnesis", module: "clinical_engine", confidence: 0.91, response_mode: "detail" };

  if (matchesIntent(n, "lab_exams"))
    return { ...base, intent: "lab_exams", module: "clinical_engine", confidence: 0.90, response_mode: "detail" };

  if (matchesIntent(n, "checklist_status"))
    return { ...base, intent: "checklist_status", module: "behavioral_engine", confidence: 0.91, response_mode: "overview" };

  if (matchesIntent(n, "hydration"))
    return { ...base, intent: "hydration", module: "behavioral_engine", confidence: 0.88, response_mode: "detail" };

  if (matchesIntent(n, "navigate"))
    return { ...base, intent: "navigate", module: "navigation", confidence: 0.90, response_mode: "navigate" };

  if (matchesIntent(n, "patient_detail")) {
    const nameMatch = n.match(/(?:paciente|sobre|como esta|como vai|ficha d[aeo]|perfil d[aeo]|dados d[aeo])\s+(.+)/);
    if (nameMatch) {
      const candidateName = nameMatch[1];
      // Guard: if the "name" contains food/nutrition words, it's a nutrition question, not a patient lookup
      const foodWords = /(?:comer|substituir|trocar|lugar|comida|alimento|receita|ingrediente|lanche|saudavel|engorda|emagrec|caloria|proteina|carboidrato|gordura|fibra|vitamina|nutriente|cafe|almoco|janta|dieta|refeic)/;
      if (!foodWords.test(candidateName)) {
        return { ...base, intent: "patient_detail", target_entity: "patient", target_name: candidateName, module: "clinical_engine", confidence: 0.92, response_mode: "detail" };
      }
    } else if (ctx.last_patient_id) {
      return { ...base, intent: "patient_detail", target_entity: "patient", target_id: ctx.last_patient_id, target_name: ctx.last_patient_name || null, module: "clinical_engine", confidence: 0.85, response_mode: "detail" };
    }
  }

  if (matchesIntent(n, "student_detail")) {
    const nameMatch = n.match(/(?:aluno|estudante|meu aluno)\s+(.+)/);
    if (nameMatch)
      return { ...base, intent: "student_detail", target_entity: "student", target_name: nameMatch[1], module: "training_engine", confidence: 0.91, response_mode: "detail" };
  }

  if (matchesIntent(n, "meal_plan") && ctx.last_patient_id)
    return { ...base, intent: "meal_plan", target_entity: "patient", target_id: ctx.last_patient_id, module: "clinical_engine", confidence: 0.88, response_mode: "detail" };

  if (matchesIntent(n, "portfolio_health"))
    return { ...base, intent: "portfolio_health", module: "clinical_engine", confidence: 0.91, response_mode: "overview" };

  // Food substitution intent — deterministic first
  const subPatterns = [
    /(?:substituir?|trocar?|no lugar d[eao]|em vez d[eao]|outra? opcao para|o que (?:posso |pode )?(?:comer|usar|colocar) (?:no lugar|em vez|ao inves))\s*(?:d[eao]\s+)?(.+)/,
    /(?:posso trocar|posso substituir|tem substitut|quero trocar)\s*(?:o\s+|a\s+)?(.+?)(?:\s+por\s+|$)/,
    /(?:nao tenho|acabou|sem)\s+(.+?)(?:,|\s+o que|\s+que|\s+posso|$)/,
    /(?:me de|da|sugira)\s+(?:outra?s?\s+)?(?:opcao|opcoes|alternativa)\s+(?:para|d[eao]|ao)\s+(.+)/,
  ];
  for (const p of subPatterns) {
    const m = n.match(p);
    if (m && m[1]?.trim()) {
      return { ...base, intent: "food_substitution", target_name: m[1].trim(), module: "nutrition_engine", confidence: 0.93, response_mode: "substitution" };
    }
  }

  // Nutrition question (NOT substitution) — will use contextual AI only if enough data
  if (/(?:posso comer|pode comer|faz mal|devo evitar|o que comer|receita|saudavel|engorda|emagrec)/.test(n))
    return { ...base, intent: "nutrition_question", module: "nutrition_engine", confidence: 0.80, response_mode: "nutrition" };

  // Context-aware follow-ups
  if (ctx.last_patient_id) {
    if (n.includes("quando vence") || n.includes("plano del") || n.includes("dieta del"))
      return { ...base, intent: "meal_plan", target_entity: "patient", target_id: ctx.last_patient_id, target_name: ctx.last_patient_name || null, module: "clinical_engine", confidence: 0.87, response_mode: "detail" };
    if (n.includes("como ele esta") || n.includes("como ela esta") || n.includes("status del"))
      return { ...base, intent: "patient_detail", target_entity: "patient", target_id: ctx.last_patient_id, target_name: ctx.last_patient_name || null, module: "clinical_engine", confidence: 0.86, response_mode: "detail" };
  }

  return base;
}

// ── NAME RESOLVER ──────────────────────────────────────────────
function findByName(list: any[], searchName: string, nameField = "full_name"): { found: any | null; ambiguous: any[] } {
  const sn = normalize(searchName);
  const exact = list.filter(p => normalize(p[nameField]) === sn);
  if (exact.length === 1) return { found: exact[0], ambiguous: [] };
  const partial = list.filter(p => normalize(p[nameField]).includes(sn));
  if (partial.length === 1) return { found: partial[0], ambiguous: [] };
  if (partial.length > 1) return { found: null, ambiguous: partial };
  return { found: null, ambiguous: [] };
}

// ═══════════════════════════════════════════════════════════════
// CONNECTORS — Schema-validated data fetchers
// ═══════════════════════════════════════════════════════════════

async function getUserRole(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data || []).map((r: any) => r.role);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("nutritionist")) return "nutritionist";
  if (roles.includes("personal")) return "personal";
  if (roles.includes("patient")) return "patient";
  return "unknown";
}

// ── IFJ ACCESS CHECK ──────────────────────────────────────────
// For patients: check if IFJ is enabled via ifj_patient_permissions
async function checkPatientIFJAccess(supabase: any, patientId: string): Promise<boolean> {
  const { data } = await supabase.from("ifj_patient_permissions")
    .select("meal_plan").eq("patient_id", patientId).maybeSingle();
  // If no record or meal_plan is false, IFJ is disabled
  return data ? data.meal_plan !== false : false;
}

async function getPatients(supabase: any, userId: string, role?: string): Promise<PatientRecord[]> {
  let links: any[] = [];
  if (role === "admin") {
    const { data } = await supabase.from("nutritionist_patients")
      .select("patient_id, status, journey_status, nutritionist_id")
      .eq("status", "active").limit(500);
    links = data || [];
  } else {
    const { data } = await supabase.from("nutritionist_patients")
      .select("patient_id, status, journey_status")
      .eq("nutritionist_id", userId).eq("status", "active").limit(200);
    links = data || [];
  }
  if (!links.length) return [];
  const patientIds = [...new Set(links.map((l: any) => l.patient_id))];
  const { data: profiles } = await supabase.from("profiles")
    .select("user_id, full_name, goal").in("user_id", patientIds);
  return patientIds.map((pid: string) => {
    const profile = (profiles || []).find((p: any) => p.user_id === pid);
    const link = links.find((l: any) => l.patient_id === pid);
    return { id: pid, full_name: profile?.full_name || "Sem nome", goal: profile?.goal || null, journey_status: link?.journey_status, status: link?.status };
  });
}

async function getPortfolioInputs(supabase: any, userId: string, patientIds: string[], today: string, role?: string) {
  const safeIds = patientIds.length ? patientIds : ["00000000-0000-0000-0000-000000000000"];
  const [snapshots, alerts, plans, transactions] = await Promise.all([
    getSnapshots(supabase, safeIds, today),
    getActiveAlerts(supabase, userId, role),
    getMealPlans(supabase, userId, role),
    getFinancialSummary(supabase, userId, role),
  ]);
  return { snapshots, alerts, plans, transactions };
}

async function getPatientOverview(supabase: any, patientId: string, today: string) {
  const [{ data: snap }, { data: alerts }, { data: plan }] = await Promise.all([
    supabase.from("clinical_daily_snapshots")
      .select("adherence_score, dropout_risk_score, risk_level, checklist_completion_rate, days_since_last_checkin, current_weight, weight_trend, momentum_direction")
      .eq("patient_id", patientId).eq("snapshot_date", today).maybeSingle(),
    supabase.from("clinical_alerts")
      .select("id, title, severity").eq("patient_id", patientId).eq("is_active", true).limit(5),
    supabase.from("meal_plans")
      .select("id, title, plan_status, is_active, start_date, end_date")
      .eq("patient_id", patientId).eq("is_active", true).limit(1).maybeSingle(),
  ]);
  return { snapshot: snap, alerts: alerts || [], activePlan: plan };
}

async function getPatientAnamnesis(supabase: any, patientUserId: string) {
  const { data } = await supabase.from("patient_anamnesis")
    .select("id, answers, status, created_at")
    .eq("user_id", patientUserId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data;
}

async function getPatientLabSummary(supabase: any, patientId: string) {
  const { data } = await supabase.from("patient_lab_results")
    .select("id, marker_name, value, unit, reference_min, reference_max, interpretation, collected_at")
    .eq("patient_id", patientId).order("collected_at", { ascending: false }).limit(20);
  return data || [];
}

async function getFinancialSummary(supabase: any, userId: string, role?: string) {
  let query = supabase.from("financial_transactions")
    .select("id, amount, status, type, date, description, category, created_at");
  if (role !== "admin") query = query.eq("nutritionist_id", userId);
  const { data } = await query.limit(500);
  return data || [];
}

async function getActiveAlerts(supabase: any, userId: string, role?: string) {
  let query = supabase.from("clinical_alerts")
    .select("id, patient_id, title, severity, alert_type, created_at");
  if (role !== "admin") query = query.eq("nutritionist_id", userId);
  const { data } = await query.eq("is_active", true).order("created_at", { ascending: false }).limit(50);
  return data || [];
}

async function getSnapshots(supabase: any, patientIds: string[], today: string) {
  if (!patientIds.length) return [];
  const { data } = await supabase.from("clinical_daily_snapshots")
    .select("patient_id, adherence_score, dropout_risk_score, risk_level, checklist_completion_rate, current_weight, weight_trend, momentum_direction, days_since_last_checkin")
    .in("patient_id", patientIds).eq("snapshot_date", today);
  return data || [];
}

async function getMealPlans(supabase: any, userId: string, role?: string) {
  let query = supabase.from("meal_plans")
    .select("id, patient_id, title, plan_status, is_active, start_date, end_date");
  if (role !== "admin") query = query.eq("nutritionist_id", userId);
  const { data } = await query.eq("is_active", true).limit(500);
  return data || [];
}

async function getStudents(supabase: any, personalId: string): Promise<PatientRecord[]> {
  const { data: links } = await supabase.from("patient_professional_links")
    .select("patient_id")
    .eq("professional_id", personalId).eq("professional_role", "personal_trainer").eq("link_status", "active").limit(100);
  if (!links?.length) return [];
  const ids = links.map((l: any) => l.patient_id);
  const { data: profiles } = await supabase.from("profiles")
    .select("user_id, full_name, goal").in("user_id", ids);
  return (profiles || []).map((p: any) => ({ id: p.user_id, full_name: p.full_name, goal: p.goal, journey_status: null, status: "active" }));
}

async function getWorkoutFeedback(supabase: any, studentIds: string[]) {
  if (!studentIds.length) return [];
  const { data } = await supabase.from("workout_session_feedback")
    .select("id, patient_id, pain_reported, pain_location, fatigue_level, session_date, notes")
    .in("patient_id", studentIds).order("session_date", { ascending: false }).limit(30);
  return data || [];
}

// ── SESSION CONTEXT ────────────────────────────────────────────
async function loadSessionContext(supabase: any, userId: string, sessionKey: string): Promise<SessionCtx> {
  const { data } = await supabase.from("ifj_session_context")
    .select("*").eq("user_id", userId).eq("session_key", sessionKey).maybeSingle();
  if (!data) return {};
  return {
    last_patient_id: data.last_patient_id, last_patient_name: data.last_patient_name,
    last_student_id: data.last_student_id, last_student_name: data.last_student_name,
    last_module: data.last_module, last_route: data.last_route, last_intent: data.last_intent,
    last_entity_type: data.last_entity_type, last_entity_id: data.last_entity_id,
  };
}

async function saveSessionContext(supabase: any, userId: string, role: string, sessionKey: string, ctx: SessionCtx, intent: string) {
  await supabase.from("ifj_session_context").upsert({
    user_id: userId, role, session_key: sessionKey,
    last_patient_id: ctx.last_patient_id || null, last_patient_name: ctx.last_patient_name || null,
    last_student_id: ctx.last_student_id || null, last_student_name: ctx.last_student_name || null,
    last_module: ctx.last_module || null, last_route: ctx.last_route || null,
    last_intent: intent, last_entity_type: ctx.last_entity_type || null, last_entity_id: ctx.last_entity_id || null,
    context_json: ctx, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,session_key" });
}

async function logIntent(supabase: any, userId: string, role: string, input: string, normalized: string, intent: IFJIntent, responseType: string, engine: string, responseTimeMs: number, error?: string) {
  await supabase.from("ifj_intent_logs").insert({
    user_id: userId, role, input_text: input, normalized_text: normalized,
    detected_intent: intent.intent, confidence: intent.confidence,
    resolved_entity_type: intent.target_entity, resolved_entity_id: intent.target_id,
    response_type: responseType, engine_used: engine, response_time_ms: responseTimeMs, error_message: error || null,
  });
}

// ═══════════════════════════════════════════════════════════════
// PRIORITY ENGINE
// ═══════════════════════════════════════════════════════════════
interface PriorityItem {
  entity_type: string; entity_id: string; entity_name: string;
  score: number; level: string; reasons: string[]; source_engine: string;
}

function calculatePriorities(patients: PatientRecord[], snapshots: any[], alerts: any[], plans: any[], transactions: any[]): PriorityItem[] {
  const items: PriorityItem[] = [];
  const today = new Date();
  for (const p of patients) {
    let score = 0; const reasons: string[] = [];
    const snap = snapshots.find((s: any) => s.patient_id === p.id);
    const pAlerts = alerts.filter((a: any) => a.patient_id === p.id);
    const pPlan = plans.find((pl: any) => pl.patient_id === p.id);

    if (snap?.risk_level === "critical") { score += 50; reasons.push("Risco clínico crítico"); }
    else if (snap?.risk_level === "high") { score += 35; reasons.push("Risco clínico alto"); }
    if (snap?.adherence_score != null && snap.adherence_score < 40) { score += 25; reasons.push(`Adesão ${snap.adherence_score}%`); }
    else if (snap?.adherence_score != null && snap.adherence_score < 60) { score += 15; reasons.push(`Adesão ${snap.adherence_score}%`); }
    if (snap?.dropout_risk_score != null && snap.dropout_risk_score > 70) { score += 30; reasons.push(`Risco abandono ${snap.dropout_risk_score}%`); }
    if (pAlerts.length > 0) {
      const critAlerts = pAlerts.filter((a: any) => a.severity === "critical");
      if (critAlerts.length) { score += 40; reasons.push(`${critAlerts.length} alerta(s) crítico(s)`); }
      else { score += 15; reasons.push(`${pAlerts.length} alerta(s) ativo(s)`); }
    }
    if (pPlan?.end_date) {
      const daysLeft = Math.ceil((new Date(pPlan.end_date).getTime() - today.getTime()) / 86400000);
      if (daysLeft < 0) { score += 25; reasons.push("Plano vencido"); }
      else if (daysLeft <= 2) { score += 20; reasons.push(`Plano vence em ${daysLeft}d`); }
    }
    if (snap?.checklist_completion_rate != null && snap.checklist_completion_rate < 30) { score += 10; reasons.push("Checklist < 30%"); }
    if (snap?.days_since_last_checkin != null && snap.days_since_last_checkin > 7) { score += 15; reasons.push(`${snap.days_since_last_checkin}d sem check-in`); }

    if (score > 0) {
      const level = score >= 60 ? "critical" : score >= 40 ? "high" : score >= 20 ? "medium" : "low";
      items.push({ entity_type: "patient", entity_id: p.id, entity_name: p.full_name, score, level, reasons, source_engine: "priority" });
    }
  }
  return items.sort((a, b) => b.score - a.score);
}

async function syncPriorityQueue(supabase: any, userId: string, priorities: PriorityItem[]) {
  const now = new Date().toISOString();
  const upsertPromises = priorities.slice(0, 20).map(item =>
    supabase.from("ifj_priority_queue").upsert({
      entity_type: item.entity_type, entity_id: item.entity_id, entity_name: item.entity_name,
      owner_user_id: userId, priority_score: item.score, priority_level: item.level,
      reasons_json: item.reasons, source_engine: "priority", is_resolved: false, updated_at: now,
    }, { onConflict: "owner_user_id,entity_type,entity_id" }).then(() => {})
  );
  await Promise.all(upsertPromises);
  const currentEntityIds = priorities.slice(0, 20).map(p => p.entity_id);
  if (currentEntityIds.length > 0) {
    const { data: existing } = await supabase.from("ifj_priority_queue")
      .select("id, entity_id").eq("owner_user_id", userId).eq("is_resolved", false);
    const toResolve = (existing || []).filter((e: any) => !currentEntityIds.includes(e.entity_id));
    if (toResolve.length > 0) {
      await Promise.all(toResolve.map((e: any) =>
        supabase.from("ifj_priority_queue").update({ is_resolved: true, updated_at: now }).eq("id", e.id).then(() => {})
      ));
    }
  } else {
    await supabase.from("ifj_priority_queue")
      .update({ is_resolved: true, updated_at: now })
      .eq("owner_user_id", userId).eq("is_resolved", false).then(() => {});
  }
}

function fmt(title: string, icon: string, responseType: string, summary: string, markdown: string, actions: any[], intent: IFJIntent, engine: string, ctx: SessionCtx): IFJResponse {
  return {
    title, icon, response_type: responseType, summary, body_markdown: markdown, actions,
    meta: { intent: intent.intent, confidence: intent.confidence, data_source: "deterministic", engine, used_context: !!(ctx.last_patient_id || ctx.last_student_id) },
    sessionContext: ctx,
  };
}

const NAV_MAP: Record<string, { route: string; label: string }> = {
  "control tower": { route: "/control-tower", label: "Control Tower" },
  "pacientes": { route: "/patients", label: "Pacientes" },
  "financeiro": { route: "/financial", label: "Financeiro" },
  "consultas": { route: "/appointments", label: "Consultas" },
  "planos": { route: "/meal-plans", label: "Planos Alimentares" },
  "treinos": { route: "/workouts", label: "Treinos" },
  "automac": { route: "/automation-center", label: "Automações" },
  "relatorios": { route: "/reports", label: "Relatórios" },
  "configurac": { route: "/settings", label: "Configurações" },
  "inteligencia": { route: "/intelligence-settings", label: "Inteligência FitJourney" },
  "dashboard": { route: "/", label: "Dashboard" },
  "workspace": { route: "/clinical-workspace", label: "Workspace Clínico" },
  "protocolos": { route: "/protocols", label: "Protocolos" },
  "programas": { route: "/programs", label: "Programas" },
  "pipeline": { route: "/onboarding-pipeline", label: "Pipeline" },
};

function resolveNavigation(n: string): { route: string; label: string } | null {
  for (const [key, val] of Object.entries(NAV_MAP)) { if (n.includes(key)) return val; }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// ACTION ENGINE — Execute real operations
// ═══════════════════════════════════════════════════════════════
async function runActionEngine(supabaseAdmin: any, supabase: any, intent: IFJIntent, userId: string, ctx: SessionCtx, patients: PatientRecord[], role: string): Promise<IFJResponse> {
  // Only admin and nutritionist can execute actions
  if (role === "patient" || role === "unknown") {
    return fmt("Sem permissão", "🚫", "error", "Pacientes não podem executar ações.", "", [], intent, "action", ctx);
  }

  switch (intent.intent) {
    case "action_release_onboarding": {
      if (!intent.target_name) return fmt("Quem?", "❓", "error", "Diga o nome do paciente.", "Ex: *libere onboarding da Maria*", [], intent, "action", ctx);
      const { found, ambiguous } = findByName(patients, intent.target_name);
      if (ambiguous.length > 0) {
        const md = ambiguous.map((p: any, i: number) => `${i + 1}. **${p.full_name}**`).join("\n");
        return fmt("Qual paciente?", "🔍", "disambiguation", "Múltiplos encontrados", md, [], intent, "action", ctx);
      }
      if (!found) return fmt("Não encontrado", "❌", "error", "Paciente não encontrado.", "", [], intent, "action", ctx);

      // Execute: update journey_status
      const { error } = await supabaseAdmin.from("nutritionist_patients")
        .update({ journey_status: "onboarding_active" })
        .eq("patient_id", found.id).eq("status", "active");

      if (error) {
        return fmt("Erro", "❌", "error", "Erro ao liberar onboarding.", error.message, [], intent, "action", ctx);
      }

      // Send notification
      await supabaseAdmin.from("notifications").insert({
        user_id: found.id,
        title: "Onboarding liberado! 🎉",
        message: "Seu onboarding foi liberado. Comece a preencher suas informações agora!",
        type: "onboarding_released",
        is_read: false,
      }).then(() => {});

      ctx.last_patient_id = found.id;
      ctx.last_patient_name = found.full_name;
      return fmt("✅ Onboarding liberado!", "🚀", "action_completed",
        `Onboarding de ${found.full_name} foi liberado e notificado.`,
        `## ✅ Ação executada\n\n**Paciente:** ${found.full_name}\n**Ação:** Onboarding liberado\n**Notificação:** Enviada ✓\n\nO paciente já pode iniciar o preenchimento.`,
        [{ label: `Abrir ficha`, route: `/patients/${found.id}`, type: "navigate" }],
        intent, "action", ctx);
    }

    case "action_awaiting_onboarding": {
      // Real journey_status values that mean "awaiting onboarding release"
      const PRE_ONBOARDING_STATUSES = [
        "awaiting_consent", "invited", "awaiting_payment",
        "payment_confirmed", "awaiting_onboarding_release",
        "onboarding_active",
      ];
      const awaiting = patients.filter(p => PRE_ONBOARDING_STATUSES.includes(p.journey_status || ""));
      if (!awaiting.length) {
        // Also check for patients with status "active" but no completed onboarding
        const noOnboarding = patients.filter(p => !p.journey_status || p.journey_status === "active");
        // Try to find ones without anamnesis as proxy
        if (noOnboarding.length > 0) {
          return fmt("Status da carteira", "📋", "info",
            `${patients.length} pacientes ativos — todos com journey_status 'active'.`,
            `## Carteira de pacientes\n\nTodos os **${patients.length}** pacientes estão com status **active**.\n\nNenhum está em fila de espera de onboarding no momento.\n\n💡 Para verificar quem precisa de atenção clínica, diga: *"Quem precisa de atenção?"*`,
            [{ label: "Pipeline", route: "/onboarding-pipeline", type: "navigate" }], intent, "action", ctx);
        }
        return fmt("Nenhum pendente", "✅", "info", "Nenhum paciente aguardando onboarding.", "", [], intent, "action", ctx);
      }
      const md = awaiting.map(p => `- **${p.full_name}** — Status: \`${p.journey_status}\`\n  💡 Diga: *"libere onboarding da ${p.full_name.split(" ")[0]}"*`).join("\n");
      return fmt("Aguardando Onboarding", "📋", "list", `${awaiting.length} paciente(s) aguardando`,
        `## Pacientes aguardando onboarding\n\n${md}\n\n💡 Diga: *"libere onboarding da [nome]"* para liberar.`,
        [{ label: "Pipeline", route: "/onboarding-pipeline", type: "navigate" }], intent, "action", ctx);
    }

    case "action_awaiting_payment": {
      const awaiting = patients.filter(p =>
        p.journey_status === "awaiting_payment" || p.journey_status === "pending_payment" || p.journey_status === "invited"
      );
      if (!awaiting.length) return fmt("Nenhum pendente", "✅", "info", "Todos os pacientes com pagamento confirmado.", "", [], intent, "action", ctx);
      const md = awaiting.map(p => `- **${p.full_name}** — Status: \`${p.journey_status}\``).join("\n");
      return fmt("Aguardando Pagamento", "💳", "list", `${awaiting.length} paciente(s)`,
        `## Pacientes aguardando pagamento\n\n${md}`,
        [{ label: "Financeiro", route: "/financial", type: "navigate" }], intent, "action", ctx);
    }

    case "action_no_diet": {
      const planPatientIds = new Set();
      const plans = await getMealPlans(supabase, userId, role);
      plans.forEach((pl: any) => planPatientIds.add(pl.patient_id));
      const noDiet = patients.filter(p => !planPatientIds.has(p.id) && p.journey_status !== "awaiting_payment" && p.journey_status !== "invited");
      if (!noDiet.length) return fmt("Todos com dieta", "✅", "info", "Todos os pacientes possuem plano alimentar.", "", [], intent, "action", ctx);
      const md = noDiet.map(p => `- **${p.full_name}** — Status: \`${p.journey_status || "ativo"}\``).join("\n");
      return fmt("Sem Dieta", "🍽️", "list", `${noDiet.length} paciente(s) sem plano`,
        `## Pacientes sem plano alimentar\n\n${md}`,
        [{ label: "Criar plano", route: "/meal-plans", type: "navigate" }], intent, "action", ctx);
    }

    case "action_awaiting_approval": {
      const awaiting = patients.filter(p =>
        p.journey_status === "draft_ready_for_review" || p.journey_status === "onboarding_completed" || p.journey_status === "awaiting_consent"
      );
      if (!awaiting.length) return fmt("Nenhum pendente", "✅", "info", "Nenhuma aprovação pendente.", "", [], intent, "action", ctx);
      const md = awaiting.map(p => `- **${p.full_name}** — Status: \`${p.journey_status}\`\n  💡 Diga: *"libere onboarding da ${p.full_name.split(" ")[0]}"*`).join("\n");
      return fmt("Aguardando Aprovação", "⏳", "list", `${awaiting.length} pendente(s)`,
        `## Pacientes aguardando aprovação\n\n${md}`,
        [{ label: "Pipeline", route: "/onboarding-pipeline", type: "navigate" }], intent, "action", ctx);
    }

    case "action_set_premium": {
      if (!intent.target_name) return fmt("Quem?", "❓", "error", "Diga o nome do paciente.", "Ex: *coloque premium para Maria*", [], intent, "action", ctx);
      const { found, ambiguous } = findByName(patients, intent.target_name);
      if (ambiguous.length > 0) {
        const md = ambiguous.map((p: any, i: number) => `${i + 1}. **${p.full_name}**`).join("\n");
        return fmt("Qual paciente?", "🔍", "disambiguation", "Múltiplos encontrados", md, [], intent, "action", ctx);
      }
      if (!found) return fmt("Não encontrado", "❌", "error", "Paciente não encontrado.", "", [], intent, "action", ctx);

      // Set premium subscription
      const { error } = await supabaseAdmin.from("user_subscriptions")
        .upsert({ user_id: found.id, plan_type: "premium", is_active: true, updated_at: new Date().toISOString() },
        { onConflict: "user_id" });

      if (error) return fmt("Erro", "❌", "error", "Erro ao ativar premium.", error.message, [], intent, "action", ctx);

      ctx.last_patient_id = found.id;
      ctx.last_patient_name = found.full_name;
      return fmt("✅ Premium ativado!", "👑", "action_completed",
        `${found.full_name} agora é Premium.`,
        `## ✅ Ação executada\n\n**Paciente:** ${found.full_name}\n**Ação:** Plano Premium ativado ✓`,
        [{ label: `Abrir ficha`, route: `/patients/${found.id}`, type: "navigate" }],
        intent, "action", ctx);
    }

    case "action_enable_ifj": {
      if (!intent.target_name) return fmt("Quem?", "❓", "error", "Diga o nome do paciente.", "Ex: *libere IFJ para Maria*", [], intent, "action", ctx);
      const { found, ambiguous } = findByName(patients, intent.target_name);
      if (ambiguous.length > 0) {
        const md = ambiguous.map((p: any, i: number) => `${i + 1}. **${p.full_name}**`).join("\n");
        return fmt("Qual paciente?", "🔍", "disambiguation", "Múltiplos encontrados", md, [], intent, "action", ctx);
      }
      if (!found) return fmt("Não encontrado", "❌", "error", "Paciente não encontrado.", "", [], intent, "action", ctx);

      // Enable IFJ
      const { error } = await supabaseAdmin.from("ifj_patient_permissions")
        .upsert({
          patient_id: found.id, ifj_mode: "standard",
          meal_plan: true, recipes: true, checklist: true, hydration: true,
          progress: true, appointments: true, substitutions: true, messages: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "patient_id" });

      if (error) return fmt("Erro", "❌", "error", "Erro ao ativar IFJ.", error.message, [], intent, "action", ctx);

      ctx.last_patient_id = found.id;
      ctx.last_patient_name = found.full_name;
      return fmt("✅ IFJ ativada!", "🧠", "action_completed",
        `IFJ ativada para ${found.full_name} (modo standard).`,
        `## ✅ Ação executada\n\n**Paciente:** ${found.full_name}\n**Ação:** IFJ habilitada (standard) ✓`,
        [{ label: `Abrir ficha`, route: `/patients/${found.id}`, type: "navigate" }],
        intent, "action", ctx);
    }

    case "action_compound_premium_ifj": {
      if (!intent.target_name) return fmt("Quem?", "❓", "error", "Diga o nome.", "Ex: *coloque premium e libere IFJ para Maria*", [], intent, "action", ctx);
      const { found, ambiguous } = findByName(patients, intent.target_name);
      if (ambiguous.length > 0) {
        const md = ambiguous.map((p: any, i: number) => `${i + 1}. **${p.full_name}**`).join("\n");
        return fmt("Qual paciente?", "🔍", "disambiguation", "Múltiplos encontrados", md, [], intent, "action", ctx);
      }
      if (!found) return fmt("Não encontrado", "❌", "error", "Paciente não encontrado.", "", [], intent, "action", ctx);

      // Execute both: Premium + IFJ
      const [premRes, ifjRes] = await Promise.all([
        supabaseAdmin.from("user_subscriptions").upsert(
          { user_id: found.id, plan_type: "premium", is_active: true, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        ),
        supabaseAdmin.from("ifj_patient_permissions").upsert({
          patient_id: found.id, ifj_mode: "standard",
          meal_plan: true, recipes: true, checklist: true, hydration: true,
          progress: true, appointments: true, substitutions: true, messages: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "patient_id" }),
      ]);

      const errors = [premRes.error, ifjRes.error].filter(Boolean);
      if (errors.length) return fmt("Erro parcial", "⚠️", "error", "Erro em parte da execução.", errors.map(e => e!.message).join(", "), [], intent, "action", ctx);

      ctx.last_patient_id = found.id;
      ctx.last_patient_name = found.full_name;
      return fmt("✅ Premium + IFJ!", "🚀", "action_completed",
        `${found.full_name}: Premium ativado + IFJ liberada.`,
        `## ✅ Ações executadas\n\n**Paciente:** ${found.full_name}\n\n- 👑 Plano Premium ativado ✓\n- 🧠 IFJ habilitada (standard) ✓`,
        [{ label: `Abrir ficha`, route: `/patients/${found.id}`, type: "navigate" }],
        intent, "action", ctx);
    }

    default:
      return fmt("Ação não reconhecida", "❓", "error", "Não entendi a ação.", "Tente: *coloque premium para [nome]*, *libere IFJ para [nome]*, *libere onboarding da [nome]*", [], intent, "action", ctx);
  }
}

// ═══════════════════════════════════════════════════════════════
// FOOD DATABASE — Embedded for deterministic substitutions
// ═══════════════════════════════════════════════════════════════
interface FoodItem { name: string; portion: string; calories: number; protein: number; carbs: number; fat: number; category: string; }

const FOOD_DB: FoodItem[] = [
  { name: "Frango grelhado", portion: "120g", calories: 198, protein: 37, carbs: 0, fat: 4.3, category: "proteina" },
  { name: "Peito de frango cozido", portion: "120g", calories: 192, protein: 36, carbs: 0, fat: 4, category: "proteina" },
  { name: "Patinho grelhado", portion: "120g", calories: 219, protein: 36, carbs: 0, fat: 7.5, category: "proteina" },
  { name: "Carne moída magra", portion: "120g", calories: 230, protein: 30, carbs: 0, fat: 12, category: "proteina" },
  { name: "Alcatra grelhada", portion: "120g", calories: 235, protein: 34, carbs: 0, fat: 10, category: "proteina" },
  { name: "Tilápia grelhada", portion: "120g", calories: 148, protein: 30, carbs: 0, fat: 3, category: "proteina" },
  { name: "Sardinha assada", portion: "100g", calories: 208, protein: 25, carbs: 0, fat: 11, category: "proteina" },
  { name: "Ovo cozido", portion: "1 un (50g)", calories: 72, protein: 6.3, carbs: 0.4, fat: 5, category: "proteina" },
  { name: "Whey Protein", portion: "30g", calories: 120, protein: 24, carbs: 3, fat: 1.5, category: "proteina" },
  { name: "Peito de peru", portion: "4 fatias (60g)", calories: 60, protein: 12, carbs: 1, fat: 0.6, category: "proteina" },
  { name: "Lombo suíno assado", portion: "120g", calories: 228, protein: 33, carbs: 0, fat: 10, category: "proteina" },
  { name: "Camarão cozido", portion: "100g", calories: 99, protein: 21, carbs: 0.2, fat: 1.1, category: "proteina" },
  { name: "Arroz branco", portion: "150g", calories: 195, protein: 4, carbs: 43, fat: 0.4, category: "carboidrato" },
  { name: "Arroz integral", portion: "150g", calories: 165, protein: 4.5, carbs: 35, fat: 1.5, category: "carboidrato" },
  { name: "Feijão carioca", portion: "1 concha", calories: 76, protein: 4.8, carbs: 14, fat: 0.5, category: "carboidrato" },
  { name: "Feijão preto", portion: "1 concha", calories: 77, protein: 4.5, carbs: 14, fat: 0.5, category: "carboidrato" },
  { name: "Batata doce cozida", portion: "150g", calories: 135, protein: 1.5, carbs: 32, fat: 0.1, category: "carboidrato" },
  { name: "Batata inglesa cozida", portion: "150g", calories: 117, protein: 2.7, carbs: 26, fat: 0.1, category: "carboidrato" },
  { name: "Mandioca cozida", portion: "100g", calories: 125, protein: 0.6, carbs: 30, fat: 0.3, category: "carboidrato" },
  { name: "Inhame cozido", portion: "100g", calories: 97, protein: 2, carbs: 23, fat: 0.1, category: "carboidrato" },
  { name: "Macarrão integral", portion: "100g", calories: 124, protein: 5.3, carbs: 24, fat: 1.1, category: "carboidrato" },
  { name: "Pão integral", portion: "2 fatias", calories: 124, protein: 5, carbs: 23, fat: 1.4, category: "carboidrato" },
  { name: "Tapioca", portion: "2 col sopa", calories: 108, protein: 0, carbs: 26, fat: 0, category: "carboidrato" },
  { name: "Cuscuz de milho", portion: "100g", calories: 113, protein: 2.5, carbs: 25, fat: 0.3, category: "carboidrato" },
  { name: "Aveia em flocos", portion: "30g", calories: 117, protein: 4.4, carbs: 20, fat: 2.6, category: "carboidrato" },
  { name: "Lentilha cozida", portion: "100g", calories: 93, protein: 6.3, carbs: 16, fat: 0.5, category: "carboidrato" },
  { name: "Grão de bico cozido", portion: "100g", calories: 130, protein: 7, carbs: 20, fat: 2.5, category: "carboidrato" },
  { name: "Brócolis cozido", portion: "100g", calories: 35, protein: 2.4, carbs: 7, fat: 0.4, category: "verdura" },
  { name: "Couve refogada", portion: "100g", calories: 45, protein: 2.9, carbs: 6.3, fat: 1.3, category: "verdura" },
  { name: "Espinafre cozido", portion: "100g", calories: 23, protein: 2.9, carbs: 3.6, fat: 0.3, category: "verdura" },
  { name: "Abobrinha refogada", portion: "100g", calories: 24, protein: 1.1, carbs: 4.3, fat: 0.3, category: "verdura" },
  { name: "Cenoura crua", portion: "1 un", calories: 34, protein: 0.7, carbs: 8, fat: 0.2, category: "verdura" },
  { name: "Banana prata", portion: "1 un", calories: 89, protein: 1.3, carbs: 23, fat: 0.1, category: "fruta" },
  { name: "Maçã", portion: "1 un", calories: 56, protein: 0.3, carbs: 15, fat: 0.1, category: "fruta" },
  { name: "Mamão papaia", portion: "1/2 un", calories: 46, protein: 0.5, carbs: 12, fat: 0.1, category: "fruta" },
  { name: "Morango", portion: "10 un", calories: 30, protein: 0.6, carbs: 7, fat: 0.2, category: "fruta" },
  { name: "Melancia", portion: "200g", calories: 60, protein: 1.2, carbs: 15, fat: 0.3, category: "fruta" },
  { name: "Manga", portion: "1/2 un", calories: 72, protein: 0.5, carbs: 19, fat: 0.3, category: "fruta" },
  { name: "Abacate", portion: "50g", calories: 80, protein: 1, carbs: 4, fat: 7.5, category: "gordura" },
  { name: "Azeite de oliva", portion: "1 col sopa", calories: 108, protein: 0, carbs: 0, fat: 12, category: "gordura" },
  { name: "Castanha de caju", portion: "15g (5 un)", calories: 86, protein: 2.7, carbs: 4.5, fat: 6.7, category: "gordura" },
  { name: "Amendoim torrado", portion: "20g", calories: 114, protein: 5.2, carbs: 3.6, fat: 9, category: "gordura" },
  { name: "Pasta de amendoim", portion: "15g", calories: 93, protein: 3.8, carbs: 3, fat: 7.8, category: "gordura" },
  { name: "Chia", portion: "15g", calories: 73, protein: 2.5, carbs: 6.3, fat: 4.7, category: "gordura" },
  { name: "Linhaça", portion: "15g", calories: 80, protein: 2.7, carbs: 4.3, fat: 6.3, category: "gordura" },
  { name: "Iogurte natural", portion: "170g", calories: 90, protein: 5, carbs: 7, fat: 5, category: "laticinio" },
  { name: "Queijo cottage", portion: "50g", calories: 49, protein: 6, carbs: 1.7, fat: 2.2, category: "laticinio" },
  { name: "Queijo minas frescal", portion: "30g", calories: 74, protein: 5.2, carbs: 0.7, fat: 5.6, category: "laticinio" },
  { name: "Leite desnatado", portion: "200ml", calories: 68, protein: 6.6, carbs: 10, fat: 0.4, category: "laticinio" },
  { name: "Kefir", portion: "200ml", calories: 64, protein: 4, carbs: 7, fat: 2, category: "laticinio" },
  { name: "Pistache", portion: "20g", calories: 113, protein: 4.1, carbs: 5.6, fat: 9, category: "gordura" },
];

const CATEGORY_LABELS: Record<string, string> = {
  proteina: "🥩 Proteínas", carboidrato: "🌾 Carboidratos", verdura: "🥦 Verduras",
  fruta: "🍎 Frutas", gordura: "🥑 Gorduras", laticinio: "🥛 Laticínios",
};

function findFoodMatch(query: string): FoodItem | null {
  const q = normalize(query);
  // Exact name match
  let match = FOOD_DB.find(f => normalize(f.name) === q);
  if (match) return match;
  // Partial match
  match = FOOD_DB.find(f => normalize(f.name).includes(q) || q.includes(normalize(f.name)));
  if (match) return match;
  // Word match
  const words = q.split(" ").filter(w => w.length > 2);
  for (const w of words) {
    match = FOOD_DB.find(f => normalize(f.name).includes(w));
    if (match) return match;
  }
  return null;
}

function getSubstitutions(food: FoodItem, restrictions: string[], maxItems: number): FoodItem[] {
  const restrictionsNorm = restrictions.map(r => normalize(r));
  return FOOD_DB
    .filter(f => f.category === food.category && f.name !== food.name)
    .filter(f => !restrictionsNorm.some(r => normalize(f.name).includes(r) || r.includes(normalize(f.name))))
    .sort((a, b) => Math.abs(a.calories - food.calories) - Math.abs(b.calories - food.calories))
    .slice(0, maxItems);
}

// ═══════════════════════════════════════════════════════════════
// NUTRITION ENGINE — Deterministic substitutions + contextual AI
// ═══════════════════════════════════════════════════════════════

async function runNutritionEngine(
  supabaseAdmin: any, intent: IFJIntent, userId: string, role: string, ctx: SessionCtx, inputText: string
): Promise<IFJResponse> {
  // 1. Check IFJ permissions for patient
  const targetId = role === "patient" ? userId : (ctx.last_patient_id || null);

  if (role === "patient") {
    const { data: perms } = await supabaseAdmin.from("ifj_patient_permissions")
      .select("ifj_mode, substitutions, meal_plan").eq("patient_id", userId).maybeSingle();

    if (!perms) {
      return fmt("IFJ não ativa", "🔒", "access_denied", "IFJ não está habilitada.", "🔒 Solicite ao seu nutricionista a liberação do IFJ.", [], intent, "nutrition", ctx);
    }

    // Check substitutions permission
    if (intent.intent === "food_substitution" && perms.substitutions === false) {
      return fmt("Substituições desativadas", "🔒", "access_denied",
        "As substituições não estão habilitadas para sua conta.",
        "🔒 **Substituições inteligentes** não estão liberadas no seu perfil.\n\nSolicite ao seu nutricionista para ativar essa funcionalidade.",
        [], intent, "nutrition", ctx);
    }

    // Load patient context
    const [profileRes, anamRes, planRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("full_name, goal").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("patient_anamnesis").select("allergies, dietary_restrictions, dietary_strategy, answers")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from("meal_plans").select("id, title, total_target_calories")
        .eq("patient_id", userId).or("is_active.eq.true,plan_status.eq.published,plan_status.eq.active").limit(1).maybeSingle(),
    ]);

    const profile = profileRes.data;
    const anam = anamRes.data;
    const plan = planRes.data;
    const allergies = [...(anam?.allergies || []), ...(anam?.dietary_restrictions || [])];

    if (intent.intent === "food_substitution") {
      return handleFoodSubstitution(intent, allergies, profile, plan, perms, ctx);
    }

    // nutrition_question — use AI only with full context
    if (!plan && !anam) {
      return fmt("Dados insuficientes", "📋", "info",
        "Não tenho dados suficientes para responder.",
        "📋 Ainda não tenho seus dados completos (anamnese e plano alimentar).\n\n**Consulte seu nutricionista** para orientação personalizada.",
        [], intent, "nutrition", ctx);
    }

    return runContextualAI(intent, inputText, profile, anam, plan, allergies, perms, ctx);
  }

  // Professional asking nutrition question — not allowed via AI
  return fmt("Comando não reconhecido", "❓", "info",
    "Não entendi. Use comandos do sistema.",
    "💡 Tente:\n- *\"Quem precisa de atenção?\"*\n- *\"Sobre [paciente]\"*\n- *\"Libere onboarding da [nome]\"*",
    [], intent, "nutrition", ctx);
}

function handleFoodSubstitution(
  intent: IFJIntent, restrictions: string[], profile: any, plan: any, perms: any, ctx: SessionCtx
): IFJResponse {
  const foodName = intent.target_name || "";
  const match = findFoodMatch(foodName);

  if (!match) {
    return fmt("Alimento não encontrado", "🔍", "info",
      `Não encontrei "${foodName}" na base.`,
      `🔍 Não encontrei **"${foodName}"** na base de alimentos.\n\n**Consulte seu nutricionista** para orientação sobre substituições deste alimento.`,
      [], intent, "nutrition", ctx);
  }

  // Determine max substitutions by ifj_mode
  const mode = perms?.ifj_mode || "standard";
  const maxItems = mode === "basic" ? 2 : mode === "standard" ? 4 : 5;
  const showExplanation = mode !== "basic";
  const showBestPick = mode === "premium";

  const subs = getSubstitutions(match, restrictions, maxItems);

  if (subs.length === 0) {
    return fmt("Sem substituições", "🔍", "info",
      `Sem alternativas para "${match.name}" considerando suas restrições.`,
      `Não encontrei substituições para **${match.name}** que respeitem suas restrições.\n\n**Consulte seu nutricionista.**`,
      [], intent, "nutrition", ctx);
  }

  // Build response
  let md = `## Substituições para ${match.name}\n\n`;
  md += `📊 **${match.name}** — ${match.portion} | ${match.calories}kcal | ${match.protein}g prot\n`;
  md += `📂 Categoria: ${CATEGORY_LABELS[match.category] || match.category}\n\n`;

  if (plan) md += `📋 *Baseado no seu plano: ${plan.title}*\n\n`;

  md += `| Opção | Porção | Calorias | Proteína |\n|---|---|---|---|\n`;
  subs.forEach((s, i) => {
    const best = showBestPick && i === 0 ? " ⭐" : "";
    md += `| **${s.name}**${best} | ${s.portion} | ${s.calories}kcal | ${s.protein}g |\n`;
  });

  if (showExplanation) {
    md += `\n💡 Substituições da mesma categoria (${CATEGORY_LABELS[match.category] || match.category}) com calorias semelhantes.`;
  }

  if (showBestPick && subs.length > 0) {
    md += `\n\n⭐ **Melhor opção:** ${subs[0].name} — mais próximo em perfil nutricional.`;
  }

  if (restrictions.length > 0) {
    md += `\n\n⚠️ *Restrições aplicadas: ${restrictions.join(", ")}*`;
  }

  md += `\n\n---\n*🔬 Dados determinísticos — baseados no seu perfil e plano alimentar.*`;

  // Audit log
  ctx.last_module = "nutrition";

  return fmt(`Substituições: ${match.name}`, "🔄", "substitution",
    `${subs.length} opção(ões) para ${match.name}`, md, [], intent, "nutrition", ctx);
}

async function runContextualAI(
  intent: IFJIntent, inputText: string, profile: any, anam: any, plan: any, allergies: string[], perms: any, ctx: SessionCtx
): Promise<IFJResponse> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return fmt("Consulte seu nutricionista", "📋", "info",
      "Para perguntas nutricionais, consulte seu nutricionista.",
      "📋 **Consulte seu nutricionista** para orientação personalizada sobre esta dúvida.",
      [], intent, "nutrition", ctx);
  }

  const systemPrompt = `Você é o IFJ (Inteligência FitJourney), assistente nutricional integrado ao plano alimentar do paciente.

REGRAS CRÍTICAS (NUNCA QUEBRAR):
1. Você NÃO é um chatbot genérico.
2. Você só pode responder com base nos dados do paciente fornecidos abaixo.
3. Você NÃO pode inventar recomendações fora do contexto.
4. Você NÃO pode sugerir alimentos proibidos, alérgenos ou fora do objetivo.
5. Se não houver dados suficientes, diga: "Consulte seu nutricionista para orientação específica."
6. Seja conciso (estilo WhatsApp), máximo 200 palavras.
7. Use markdown para formatar.

CONTEXTO DO PACIENTE:
- Nome: ${profile?.full_name || "Paciente"}
- Objetivo: ${profile?.goal || "Não informado"}
- Restrições/Alergias: ${allergies.length ? allergies.join(", ") : "Nenhuma registrada"}
- Estratégia dietética: ${anam?.dietary_strategy || "Não informada"}
- Plano alimentar: ${plan ? plan.title + " (" + (plan.total_target_calories || "?") + "kcal)" : "Sem plano ativo"}

REGRAS DE RESPOSTA:
- Priorize alimentos do plano alimentar
- Nunca sugerir fora das restrições
- Contextualizar com o objetivo do paciente
- Se não tiver certeza: "Consulte seu nutricionista"`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: inputText },
        ],
        max_tokens: 600,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        await response.text();
        return fmt("Consulte seu nutricionista", "📋", "info", "Serviço temporariamente indisponível.", "📋 **Consulte seu nutricionista** para orientação personalizada.", [], intent, "nutrition", ctx);
      }
      await response.text();
      return fmt("Consulte seu nutricionista", "📋", "info", "Não foi possível processar.", "📋 **Consulte seu nutricionista** para orientação personalizada.", [], intent, "nutrition", ctx);
    }

    const aiData = await response.json();
    const aiText = aiData.choices?.[0]?.message?.content || "Consulte seu nutricionista para orientação personalizada.";

    return fmt("🧠 Assistente Nutricional", "🍎", "nutrition_response", "Resposta contextualizada",
      `${aiText}\n\n---\n*🔬 Resposta baseada no seu perfil e plano alimentar — consulte seu nutricionista para ajustes.*`,
      [], intent, "nutrition", ctx);
  } catch (e) {
    console.error("Contextual AI error:", e);
    return fmt("Consulte seu nutricionista", "📋", "info", "Erro ao processar.", "📋 **Consulte seu nutricionista** para orientação personalizada.", [], intent, "nutrition", ctx);
  }
}

// ═══════════════════════════════════════════════════════════════
// DOMAIN ENGINES (same as v3 — clinical, behavioral, financial, training, journey)
// ═══════════════════════════════════════════════════════════════

async function runClinicalEngine(supabase: any, intent: IFJIntent, userId: string, ctx: SessionCtx, patients: PatientRecord[], today: string, role?: string): Promise<IFJResponse> {
  const patientIds = patients.map(p => p.id);
  const safeIds = patientIds.length ? patientIds : ["00000000-0000-0000-0000-000000000000"];

  switch (intent.intent) {
    case "patients_attention": {
      const snapshots = await getSnapshots(supabase, safeIds, today);
      const atRisk = snapshots.filter((s: any) => s.risk_level === "high" || s.risk_level === "critical")
        .sort((a: any, b: any) => (b.dropout_risk_score || 0) - (a.dropout_risk_score || 0));
      if (!atRisk.length) return fmt("Nenhum paciente em risco", "✅", "info", "Carteira estável hoje.", "✅ Todos os pacientes estão dentro dos parâmetros normais.", [], intent, "clinical", ctx);
      const md = `| Paciente | Risco | Adesão | Dropout |\n|---|---|---|---|\n` +
        atRisk.map((s: any) => {
          const p = patients.find(x => x.id === s.patient_id);
          return `| **${p?.full_name || "?"}** | ${s.risk_level} | ${s.adherence_score || 0}% | ${s.dropout_risk_score || 0}% |`;
        }).join("\n");
      return fmt("Pacientes que precisam de atenção", "⚠️", "priority_list", `${atRisk.length} paciente(s) em risco hoje.`, md,
        [{ label: "Abrir Control Tower", route: "/control-tower", type: "navigate" }], intent, "clinical", ctx);
    }
    case "patients_improved": {
      const snapshots = await getSnapshots(supabase, safeIds, today);
      const improved = snapshots.filter((s: any) => s.momentum_direction === "up" || (s.adherence_score && s.adherence_score >= 80));
      if (!improved.length) return fmt("Sem destaques hoje", "📊", "info", "Nenhum paciente com melhora expressiva.", "", [], intent, "clinical", ctx);
      const md = improved.map((s: any) => {
        const p = patients.find(x => x.id === s.patient_id);
        return `- **${p?.full_name}** — Adesão: ${s.adherence_score}% | Tendência: ${s.weight_trend || "?"}`;
      }).join("\n");
      return fmt("Pacientes em evolução", "🌟", "list", `${improved.length} paciente(s) com boa evolução.`, md, [], intent, "clinical", ctx);
    }
    case "patient_detail": {
      let patient: PatientRecord | undefined;
      if (intent.target_id) patient = patients.find(p => p.id === intent.target_id);
      else if (intent.target_name) {
        const { found, ambiguous } = findByName(patients, intent.target_name);
        if (ambiguous.length > 0) {
          const md = ambiguous.map((p: any, i: number) => `${i + 1}. **${p.full_name}** (${p.goal || "?"})`).join("\n");
          return fmt("Múltiplos pacientes", "🔍", "disambiguation", `${ambiguous.length} pacientes similares.`, `Encontrei **${ambiguous.length}** pacientes:\n\n${md}\n\nDigite o nome completo.`, [], intent, "clinical", ctx);
        }
        patient = found;
      }
      if (!patient) return fmt("Paciente não encontrado", "❌", "error", "Nenhum paciente com esse nome.", "Verifique a grafia.", [], intent, "clinical", ctx);
      ctx.last_patient_id = patient.id; ctx.last_patient_name = patient.full_name; ctx.last_entity_type = "patient"; ctx.last_entity_id = patient.id;
      const overview = await getPatientOverview(supabase, patient.id, today);
      const s = overview.snapshot;
      const md = `## ${patient.full_name}\n\n| Campo | Valor |\n|---|---|\n` +
        `| Status | ${patient.journey_status || patient.status} |\n| Objetivo | ${patient.goal || "—"} |\n| Peso atual | ${s?.current_weight || "—"} kg |\n` +
        `| Adesão | ${s?.adherence_score ?? "—"}% |\n| Risco | ${s?.risk_level || "—"} |\n| Dropout | ${s?.dropout_risk_score ?? "—"}% |\n` +
        `| Tendência peso | ${s?.weight_trend || "—"} |\n| Alertas ativos | ${overview.alerts.length} |\n| Plano ativo | ${overview.activePlan?.title || "Nenhum"} |` +
        (overview.activePlan?.end_date ? `\n| Plano vence | ${overview.activePlan.end_date} |` : "");
      const actions = [{ label: "Abrir ficha", route: `/patients/${patient.id}`, type: "navigate" }];
      if (overview.activePlan?.id) actions.push({ label: "Ver plano", route: `/meal-plans/${overview.activePlan.id}`, type: "navigate" });
      return fmt(`Ficha: ${patient.full_name}`, "👤", "detail", `Resumo clínico de ${patient.full_name}`, md, actions, intent, "clinical", ctx);
    }
    case "anamnesis": {
      const pid = intent.target_id || ctx.last_patient_id;
      if (!pid) return fmt("Paciente não especificado", "❓", "error", "Diga o nome do paciente.", "", [], intent, "clinical", ctx);
      const anam = await getPatientAnamnesis(supabase, pid);
      if (!anam) return fmt("Sem anamnese", "📋", "info", "Nenhuma anamnese encontrada.", "", [], intent, "clinical", ctx);
      const p = patients.find(x => x.id === pid);
      const answers = anam.answers || {};
      const md = `## Anamnese — ${p?.full_name || "Paciente"}\n\n- **Status**: ${anam.status}\n- **Data**: ${new Date(anam.created_at).toLocaleDateString("pt-BR")}\n- **Respostas**: ${Object.keys(answers).length} campos\n\n` +
        Object.entries(answers).slice(0, 15).map(([k, v]) => `- **${k}**: ${typeof v === "object" ? JSON.stringify(v) : v}`).join("\n");
      return fmt(`Anamnese: ${p?.full_name}`, "📋", "detail", "Dados da anamnese", md, [], intent, "clinical", ctx);
    }
    case "lab_exams": {
      const pid = intent.target_id || ctx.last_patient_id;
      if (!pid) return fmt("Paciente não especificado", "❓", "error", "Diga o nome.", "", [], intent, "clinical", ctx);
      const labs = await getPatientLabSummary(supabase, pid);
      if (!labs.length) return fmt("Sem exames", "🔬", "info", "Nenhum exame registrado.", "", [], intent, "clinical", ctx);
      const p = patients.find(x => x.id === pid);
      const md = `## Exames — ${p?.full_name}\n\n| Marcador | Valor | Ref | Status |\n|---|---|---|---|\n` +
        labs.map((l: any) => {
          const val = parseFloat(l.value); const low = l.reference_min != null ? parseFloat(l.reference_min) : null; const high = l.reference_max != null ? parseFloat(l.reference_max) : null;
          let status = "✅"; if (low != null && val < low) status = "⬇️ Baixo"; if (high != null && val > high) status = "⬆️ Alto";
          return `| ${l.marker_name} | ${l.value} ${l.unit || ""} | ${low || "—"}-${high || "—"} | ${status} |`;
        }).join("\n");
      return fmt(`Exames: ${p?.full_name}`, "🔬", "detail", `${labs.length} marcadores`, md, [], intent, "clinical", ctx);
    }
    case "lab_pending":
      return fmt("Exames pendentes", "🔬", "info", "Em desenvolvimento", "🔬 Consulte por paciente.", [], intent, "clinical", ctx);
    case "meal_plan": {
      const pid = intent.target_id || ctx.last_patient_id;
      if (!pid) return fmt("Paciente não especificado", "❓", "error", "Diga o nome.", "", [], intent, "clinical", ctx);
      const { data: plan } = await supabase.from("meal_plans")
        .select("id, title, plan_status, is_active, start_date, end_date, total_target_calories")
        .eq("patient_id", pid).eq("is_active", true).limit(1).maybeSingle();
      const p = patients.find(x => x.id === pid);
      if (!plan) return fmt("Sem plano ativo", "🍽️", "info", `${p?.full_name} não tem plano ativo.`, "", [{ label: "Criar plano", route: "/meal-plans", type: "navigate" }], intent, "clinical", ctx);
      const daysLeft = plan.end_date ? Math.ceil((new Date(plan.end_date).getTime() - Date.now()) / 86400000) : null;
      const md = `## Plano: ${plan.title}\n\n- Status: ${plan.plan_status}\n- Início: ${plan.start_date || "—"}\n- Fim: ${plan.end_date || "—"}\n- Calorias: ${plan.total_target_calories || "—"} kcal` +
        (daysLeft != null ? `\n- **Vence em ${daysLeft} dia(s)**` : "");
      return fmt(`Plano: ${p?.full_name}`, "🍽️", "detail", `Plano ${plan.title}`, md, [{ label: "Editar plano", route: `/meal-plans/${plan.id}`, type: "navigate" }], intent, "clinical", ctx);
    }
    case "meal_plan_expiring": {
      const allPlans = await getMealPlans(supabase, userId, role);
      const soon = allPlans.filter((pl: any) => { if (!pl.end_date) return false; const d = Math.ceil((new Date(pl.end_date).getTime() - Date.now()) / 86400000); return d <= 5 && d >= -2; });
      if (!soon.length) return fmt("Nenhum plano vencendo", "✅", "info", "Todos os planos válidos.", "", [], intent, "clinical", ctx);
      const md = soon.map((pl: any) => { const p = patients.find(x => x.id === pl.patient_id); const d = Math.ceil((new Date(pl.end_date).getTime() - Date.now()) / 86400000); return `- **${p?.full_name || "?"}** — ${pl.title} — ${d < 0 ? "VENCIDO" : `vence em ${d}d`}`; }).join("\n");
      return fmt("Planos vencendo", "⏰", "list", `${soon.length} plano(s)`, md, [{ label: "Ver planos", route: "/meal-plans", type: "navigate" }], intent, "clinical", ctx);
    }
    case "clinical_alerts": {
      const alerts = await getActiveAlerts(supabase, userId, role);
      if (!alerts.length) return fmt("Sem alertas", "✅", "info", "Nenhum alerta ativo.", "", [], intent, "clinical", ctx);
      const md = `| Paciente | Alerta | Severidade |\n|---|---|---|\n` + alerts.map((a: any) => { const p = patients.find(x => x.id === a.patient_id); return `| ${p?.full_name || "?"} | ${a.title} | ${a.severity} |`; }).join("\n");
      return fmt("Alertas Clínicos", "🔔", "list", `${alerts.length} alerta(s)`, md, [{ label: "Control Tower", route: "/control-tower", type: "navigate" }], intent, "clinical", ctx);
    }
    case "clinical_summary":
    case "portfolio_health": {
      const { snapshots, alerts, plans, transactions } = await getPortfolioInputs(supabase, userId, patientIds, today, role);
      const priorities = calculatePriorities(patients, snapshots, alerts, plans, transactions);
      const critical = priorities.filter(p => p.level === "critical").length;
      const high = priorities.filter(p => p.level === "high").length;
      const avgAdherence = snapshots.length ? Math.round(snapshots.reduce((s: number, x: any) => s + (x.adherence_score || 0), 0) / snapshots.length) : 0;
      const pendingTx = transactions.filter((t: any) => t.status === "pending" || t.status === "pendente");
      const md = `## Panorama da Carteira\n\n| Métrica | Valor |\n|---|---|\n` +
        `| Pacientes ativos | **${patients.length}** |\n| Prioridade crítica | **${critical}** |\n| Prioridade alta | **${high}** |\n` +
        `| Alertas ativos | **${alerts.length}** |\n| Adesão média | **${avgAdherence}%** |\n| Planos ativos | **${plans.length}** |\n| Pendências financeiras | **${pendingTx.length}** |`;
      return fmt("Panorama da Carteira", "📊", "overview", `${patients.length} pacientes, ${critical} críticos`, md,
        [{ label: "Control Tower", route: "/control-tower", type: "navigate" }], intent, "clinical", ctx);
    }
    default:
      return fmt("Intent não mapeada", "❓", "error", "Comando clínico não reconhecido.", "", [], intent, "clinical", ctx);
  }
}

async function runBehavioralEngine(supabase: any, intent: IFJIntent, userId: string, ctx: SessionCtx, patients: PatientRecord[], today: string): Promise<IFJResponse> {
  switch (intent.intent) {
    case "checklist_status": {
      const pid = ctx.last_patient_id;
      if (pid) {
        const { data: tasks } = await supabase.from("checklist_tasks").select("id, title, completed, category").eq("patient_id", pid).eq("date", today);
        const total = (tasks || []).length; const done = (tasks || []).filter((t: any) => t.completed).length;
        const p = patients.find(x => x.id === pid);
        return fmt(`Checklist: ${p?.full_name}`, "✅", "detail", `${done}/${total} tarefas`,
          `**${done}/${total}** tarefas hoje.\n\n` + (tasks || []).map((t: any) => `- ${t.completed ? "✅" : "⬜"} ${t.title}`).join("\n"), [], intent, "behavioral", ctx);
      }
      const patientIds = patients.map(p => p.id);
      const snapshots = await getSnapshots(supabase, patientIds.length ? patientIds : ["00000000-0000-0000-0000-000000000000"], today);
      const lowAdh = snapshots.filter((s: any) => s.checklist_completion_rate != null && s.checklist_completion_rate < 50);
      if (!lowAdh.length) return fmt("Checklists OK", "✅", "info", "Todos com boa adesão.", "", [], intent, "behavioral", ctx);
      const md = lowAdh.map((s: any) => { const p = patients.find(x => x.id === s.patient_id); return `- **${p?.full_name || "?"}** — ${s.checklist_completion_rate}%`; }).join("\n");
      return fmt("Checklist baixo", "📋", "list", `${lowAdh.length} paciente(s) < 50%`, md, [], intent, "behavioral", ctx);
    }
    case "hydration":
      return fmt("Hidratação", "💧", "info", "Consulte checklist do paciente.", "Diga o nome do paciente.", [], intent, "behavioral", ctx);
    default:
      return fmt("Comportamental", "🧠", "error", "Não reconhecido.", "", [], intent, "behavioral", ctx);
  }
}

async function runFinancialEngine(supabase: any, intent: IFJIntent, userId: string, ctx: SessionCtx, patients: PatientRecord[], role?: string): Promise<IFJResponse> {
  const transactions = await getFinancialSummary(supabase, userId, role);
  switch (intent.intent) {
    case "financial_overview": {
      const income = transactions.filter((t: any) => t.type === "income" || t.type === "receita");
      const pending = transactions.filter((t: any) => t.status === "pending" || t.status === "pendente");
      const totalIncome = income.reduce((s: number, t: any) => s + (t.amount || 0), 0);
      const totalPending = pending.reduce((s: number, t: any) => s + (t.amount || 0), 0);
      const md = `## Financeiro\n\n| Métrica | Valor |\n|---|---|\n| Receitas totais | R$ ${totalIncome.toFixed(2)} |\n| Pendente | R$ ${totalPending.toFixed(2)} |\n| Transações | ${transactions.length} |`;
      return fmt("Resumo Financeiro", "💰", "overview", `Receita: R$ ${totalIncome.toFixed(2)} | Pendente: R$ ${totalPending.toFixed(2)}`, md,
        [{ label: "Ir para Financeiro", route: "/financial", type: "navigate" }], intent, "financial", ctx);
    }
    case "financial_pending": {
      const pending = transactions.filter((t: any) => t.status === "pending" || t.status === "pendente");
      if (!pending.length) return fmt("Sem pendências", "✅", "info", "Nenhum pagamento pendente.", "", [], intent, "financial", ctx);
      const md = pending.map((t: any) => `- R$ ${(t.amount || 0).toFixed(2)} — ${t.description || t.category || "?"} — ${t.date || "sem data"}`).join("\n");
      return fmt("Cobranças pendentes", "💳", "list", `${pending.length} pendente(s)`, md,
        [{ label: "Ir para Financeiro", route: "/financial", type: "navigate" }], intent, "financial", ctx);
    }
    default:
      return fmt("Financeiro", "💰", "error", "Não reconhecido.", "", [], intent, "financial", ctx);
  }
}

async function runTrainingEngine(supabase: any, intent: IFJIntent, userId: string, ctx: SessionCtx): Promise<IFJResponse> {
  const students = await getStudents(supabase, userId);
  const studentIds = students.map(s => s.id);
  switch (intent.intent) {
    case "workout_overview":
      return fmt("Visão de Treinos", "🏋️", "overview", `${students.length} aluno(s) ativo(s)`, `Você tem **${students.length}** alunos ativos.`,
        [{ label: "Ver treinos", route: "/workouts", type: "navigate" }], intent, "training", ctx);
    case "workout_pain": {
      const feedback = await getWorkoutFeedback(supabase, studentIds);
      const withPain = feedback.filter((f: any) => f.pain_reported);
      if (!withPain.length) return fmt("Sem dores", "✅", "info", "Nenhum aluno com dor.", "", [], intent, "training", ctx);
      const md = withPain.map((f: any) => { const s = students.find(x => x.id === f.patient_id); return `- **${s?.full_name || "?"}** — ${f.pain_location || "?"} — ${f.session_date}`; }).join("\n");
      return fmt("Alunos com dor", "🤕", "list", `${withPain.length} relato(s)`, md, [], intent, "training", ctx);
    }
    case "student_detail": {
      if (!intent.target_name) return fmt("Aluno não especificado", "❓", "error", "Diga o nome.", "", [], intent, "training", ctx);
      const { found, ambiguous } = findByName(students, intent.target_name);
      if (ambiguous.length > 0) return fmt("Múltiplos alunos", "🔍", "disambiguation", `${ambiguous.length} encontrados`, ambiguous.map((s: any, i: number) => `${i + 1}. **${s.full_name}**`).join("\n"), [], intent, "training", ctx);
      if (!found) return fmt("Aluno não encontrado", "❌", "error", "Não encontrado.", "", [], intent, "training", ctx);
      ctx.last_student_id = found.id; ctx.last_student_name = found.full_name;
      return fmt(`Aluno: ${found.full_name}`, "🏋️", "detail", `Dados de ${found.full_name}`, `## ${found.full_name}\n\n- Objetivo: ${found.goal || "—"}`, [], intent, "training", ctx);
    }
    default:
      return fmt("Treino", "🏋️", "error", "Não reconhecido.", "", [], intent, "training", ctx);
  }
}

async function runJourneyEngine(supabase: any, intent: IFJIntent, userId: string, ctx: SessionCtx, patients: PatientRecord[], today: string, role?: string): Promise<IFJResponse> {
  switch (intent.intent) {
    case "appointments": {
      let query = supabase.from("patient_appointments").select("id, patient_id, appointment_date, appointment_time, status, appointment_type");
      if (role !== "admin") query = query.eq("nutritionist_id", userId);
      const { data: appts } = await query.gte("appointment_date", today).order("appointment_date", { ascending: true }).limit(10);
      if (!appts?.length) return fmt("Sem consultas", "📅", "info", "Nenhuma consulta agendada.", "", [{ label: "Agendar", route: "/appointments", type: "navigate" }], intent, "journey", ctx);
      const md = `| Paciente | Data | Hora | Tipo | Status |\n|---|---|---|---|---|\n` + appts.map((a: any) => { const p = patients.find(x => x.id === a.patient_id); return `| ${p?.full_name || "?"} | ${a.appointment_date} | ${a.appointment_time || "—"} | ${a.appointment_type || "—"} | ${a.status} |`; }).join("\n");
      return fmt("Próximas Consultas", "📅", "list", `${appts.length} consulta(s)`, md, [{ label: "Ver agenda", route: "/appointments", type: "navigate" }], intent, "journey", ctx);
    }
    case "journey_status": {
      const pid = ctx.last_patient_id;
      if (!pid) return fmt("Paciente não especificado", "❓", "error", "Diga o nome.", "", [], intent, "journey", ctx);
      const p = patients.find(x => x.id === pid);
      return fmt(`Jornada: ${p?.full_name}`, "🗺️", "detail", `Status: ${p?.journey_status || p?.status}`,
        `## Jornada — ${p?.full_name}\n\n- Status: **${p?.journey_status || p?.status}**\n- Objetivo: ${p?.goal || "—"}`,
        [{ label: "Ver ficha", route: `/patients/${pid}`, type: "navigate" }], intent, "journey", ctx);
    }
    default:
      return fmt("Jornada", "🗺️", "error", "Não reconhecido.", "", [], intent, "journey", ctx);
  }
}

async function runPriorityEngine(supabase: any, intent: IFJIntent, userId: string, ctx: SessionCtx, patients: PatientRecord[], today: string, role?: string): Promise<IFJResponse> {
  const patientIds = patients.map(p => p.id);
  const { snapshots, alerts, plans, transactions } = await getPortfolioInputs(supabase, userId, patientIds, today, role);
  const priorities = calculatePriorities(patients, snapshots, alerts, plans, transactions);
  await syncPriorityQueue(supabase, userId, priorities);

  if (intent.intent === "next_best_action") {
    const top = priorities[0];
    if (!top) return fmt("Nada urgente", "✅", "action", "Sem ação prioritária.", "Seus pacientes estão estáveis! 🎉", [], intent, "priority", ctx);
    return fmt("Próxima Melhor Ação", "🎯", "action", `Prioridade: ${top.entity_name} (${top.score}pts)`,
      `## 🎯 Ação recomendada\n\n**Paciente:** ${top.entity_name}\n**Score:** ${top.score}/100\n**Nível:** ${top.level}\n\n**Motivos:**\n${top.reasons.map(r => `- ${r}`).join("\n")}`,
      [{ label: `Abrir ${top.entity_name}`, route: `/patients/${top.entity_id}`, type: "navigate" }], intent, "priority", ctx);
  }

  if (!priorities.length) return fmt("Dia tranquilo", "✅", "info", "Nenhuma prioridade.", "Seus pacientes estão estáveis! 🎉", [], intent, "priority", ctx);
  const critical = priorities.filter(p => p.level === "critical");
  const high = priorities.filter(p => p.level === "high");
  const medium = priorities.filter(p => p.level === "medium");
  const expiringPlans = plans.filter((pl: any) => { if (!pl.end_date) return false; const d = Math.ceil((new Date(pl.end_date).getTime() - Date.now()) / 86400000); return d <= 3 && d >= -1; });
  const pendingPayments = transactions.filter((t: any) => t.status === "pending" || t.status === "pendente");

  let md = `## 📋 Prioridades do Dia\n\n| Indicador | Qtd |\n|---|---|\n`;
  md += `| 🔴 Crítico | ${critical.length} |\n| 🟠 Alto | ${high.length} |\n| 🟡 Médio | ${medium.length} |\n| ⏰ Planos vencendo | ${expiringPlans.length} |\n| 💳 Pagamentos pendentes | ${pendingPayments.length} |\n\n`;
  if (critical.length) { md += `### 🔴 Críticos\n\n` + critical.slice(0, 5).map(p => `- **${p.entity_name}** (${p.score}pts) — ${p.reasons.join(", ")}`).join("\n") + "\n\n"; }
  if (high.length) { md += `### 🟠 Alta Prioridade\n\n` + high.slice(0, 5).map(p => `- **${p.entity_name}** (${p.score}pts) — ${p.reasons.join(", ")}`).join("\n") + "\n\n"; }

  return fmt("Prioridades do Dia", "📋", "priority_list", `${critical.length} crítico(s), ${high.length} alto(s), ${medium.length} médio(s)`, md,
    [{ label: "Control Tower", route: "/control-tower", type: "navigate" }], intent, "priority", ctx);
}

// ═══════════════════════════════════════════════════════════════
// MAIN ROUTER v4.0 — Hardened with role scoping + IFJ access gate
// ═══════════════════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User-scoped client (respects RLS)
    const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    // Admin client for action execution (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const inputText = body.input_text || body.question || body.command || "";
    const sessionKey = body.session_key || "default";
    const today = new Date().toISOString().split("T")[0];

    // 1. Get Role (SINGLE SOURCE OF TRUTH: user_roles)
    const role = await getUserRole(supabaseAdmin, user.id);
    const { data: profileData } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
    const userName = profileData?.full_name?.split(" ")[0] || "Profissional";

    // 2. ROLE-BASED ACCESS GATE
    // Patients: check if IFJ is enabled for them
    if (role === "patient") {
      const hasAccess = await checkPatientIFJAccess(supabaseAdmin, user.id);
      if (!hasAccess) {
        return new Response(JSON.stringify({
          title: "IFJ Desativada", icon: "🔒", response_type: "access_denied",
          summary: "A Inteligência FitJourney não está habilitada para sua conta.",
          body_markdown: "🔒 **Acesso negado**\n\nA IFJ não está ativada para seu perfil. Solicite ao seu nutricionista ou profissional a liberação do acesso.",
          actions: [], meta: { intent: "access_denied", confidence: 1, data_source: "system", engine: "access_gate", used_context: false },
          sessionContext: {},
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Unknown role = blocked
    if (role === "unknown") {
      return new Response(JSON.stringify({ error: "Role não identificada. Acesso negado." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Load Session Context
    const ctx = await loadSessionContext(supabase, user.id, sessionKey);

    // 4. Detect Intent
    const n = normalize(inputText);
    const intent = detectIntent(n, ctx);

    // 5. Fetch patients ONCE — SCOPED BY ROLE
    // admin: all patients | nutritionist: own portfolio | personal: own students | patient: only self
    const needsPatients = !["navigation", "general"].includes(intent.module);
    let patients: PatientRecord[] = [];

    if (needsPatients) {
      if (role === "patient") {
        // Patient can only see themselves
        const { data: p } = await supabase.from("profiles").select("user_id, full_name, goal").eq("user_id", user.id).maybeSingle();
        if (p) patients = [{ id: p.user_id, full_name: p.full_name, goal: p.goal, journey_status: null, status: "active" }];
      } else if (role === "personal" && intent.module === "training_engine") {
        // Handled inside training engine
      } else {
        patients = await getPatients(supabaseAdmin, user.id, role);
      }
    }

    let response: IFJResponse;

    // 6. Route to correct engine
    try {
      if (intent.intent === "greeting") {
        const pts = patients.length || (await getPatients(supabaseAdmin, user.id, role)).length;
        const hour = new Date().getHours();
        const period = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
        response = fmt(`${period}, ${userName}!`, "👋", "greeting", `${pts} pacientes ativos.`,
          `${period}, **${userName}**! 👋\n\nVocê tem **${pts}** pacientes ativos.\n\nPergunte:\n- *"O que preciso resolver hoje?"*\n- *"Quem precisa de atenção?"*\n- *"Mostre quem está sem dieta"*\n- *"Quem está aguardando onboarding?"*`,
          [], intent, "general", ctx);
      }
      else if (intent.intent === "help") {
        response = fmt("Comandos IFJ Core", "📚", "help", "Comandos disponíveis",
          `## Comandos disponíveis\n\n` +
          `### 🎯 Prioridades\n- *"O que preciso resolver hoje?"*\n- *"Próxima melhor ação"*\n\n` +
          `### 👥 Pacientes\n- *"Quem precisa de atenção?"*\n- *"Quem melhorou?"*\n- *"Sobre [nome]"*\n\n` +
          `### ⚡ Ações rápidas\n- *"Libere onboarding da [nome]"*\n- *"Quem está aguardando onboarding?"*\n- *"Quem está sem dieta?"*\n- *"Quem não pagou?"*\n- *"Quem está aguardando aprovação?"*\n\n` +
          `### 📋 Clínico\n- *"Planos vencendo"*\n- *"Alertas clínicos"*\n- *"Resumo da carteira"*\n\n` +
          `### 💰 Financeiro\n- *"Resumo financeiro"*\n- *"Cobranças pendentes"*\n\n` +
          `### 🏋️ Treinos\n- *"Alunos com dor"*\n\n` +
          `### 📅 Agenda\n- *"Consultas"*\n\n` +
          `### 🧭 Navegação\n- *"Abrir financeiro"*\n- *"Ir para Control Tower"*`,
          [], intent, "general", ctx);
      }
      else if (intent.intent === "navigate") {
        const nav = resolveNavigation(n);
        response = nav
          ? fmt(`Navegando: ${nav.label}`, "🧭", "navigate", `Abrindo ${nav.label}`, `Abrindo **${nav.label}**...`,
              [{ label: nav.label, route: nav.route, type: "navigate" }], intent, "navigation", ctx)
          : fmt("Destino não encontrado", "❓", "error", "Não encontrei essa tela.", "Tente: *abrir financeiro*, *ir para pacientes*", [], intent, "navigation", ctx);
      }
      else if (intent.module === "action_engine") {
        response = await runActionEngine(supabaseAdmin, supabase, intent, user.id, ctx, patients, role);
      }
      else if (intent.module === "priority_engine") {
        response = await runPriorityEngine(supabaseAdmin, intent, user.id, ctx, patients, today, role);
      }
      else if (intent.module === "clinical_engine") {
        response = await runClinicalEngine(supabaseAdmin, intent, user.id, ctx, patients, today, role);
      }
      else if (intent.module === "behavioral_engine") {
        response = await runBehavioralEngine(supabaseAdmin, intent, user.id, ctx, patients, today);
      }
      else if (intent.module === "financial_engine") {
        response = await runFinancialEngine(supabaseAdmin, intent, user.id, ctx, patients, role);
      }
      else if (intent.module === "training_engine") {
        response = await runTrainingEngine(supabaseAdmin, intent, user.id, ctx);
      }
      else if (intent.module === "journey_engine") {
        response = await runJourneyEngine(supabaseAdmin, intent, user.id, ctx, patients, today, role);
      }
      else if (intent.module === "ai_fallback") {
        response = await runAIFallbackEngine(intent, inputText, ctx, ctx.last_patient_name);
      }
      else {
        // Unknown intent → try AI fallback as last resort
        response = await runAIFallbackEngine(intent, inputText, ctx, ctx.last_patient_name);
      }
    } catch (engineError) {
      console.error("Engine error:", engineError);
      response = fmt("Erro no motor", "❌", "error", "Erro ao processar.", "Ocorreu um erro. Tente novamente.", [], intent, "error", ctx);
    }

    // 7. Save session context
    await saveSessionContext(supabase, user.id, role, sessionKey, ctx, intent.intent);

    // 8. Log intent
    const elapsed = Date.now() - startTime;
    await logIntent(supabaseAdmin, user.id, role, inputText, n, intent, response.response_type, response.meta.engine, elapsed);

    // 9. Audit log
    await supabaseAdmin.from("audit_logs").insert({
      action: "ifj_core_query", resource_type: "ifj_core", resource_id: intent.intent, user_id: user.id,
      metadata: { intent: intent.intent, confidence: intent.confidence, engine: response.meta.engine, response_time_ms: elapsed },
    }).then(() => {});

    return new Response(JSON.stringify(response), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("ifj-core-router error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
