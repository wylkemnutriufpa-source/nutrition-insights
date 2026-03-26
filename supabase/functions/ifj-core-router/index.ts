import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// IFJ CORE ROUTER v3.0 — Schema-validated Deterministic Orchestrator
// Zero LLM. Real tables only. Single source of truth: user_roles.
// ═══════════════════════════════════════════════════════════════

// ── TYPES ──────────────────────────────────────────────────────
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

// Patient model assembled from real tables
interface PatientRecord {
  id: string; // user_id from profiles = patient_id in nutritionist_patients
  full_name: string;
  goal: string | null;
  journey_status: string | null;
  status: string | null; // link status
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
  journey_status: ["jornada", "estagio", "fase", "etapa", "onboarding"],
  priorities_today: ["prioridade", "resolver hoje", "o que fazer", "pendencia do dia", "agenda ifj", "fila"],
  next_best_action: ["proxima acao", "melhor acao", "o que fazer agora", "sugestao", "recomendac"],
  portfolio_health: ["saude da carteira", "portfolio", "score geral"],
  system_status: ["status sistema", "saude sistema", "diagnostico"],
  navigate: ["abrir", "ir para", "navegar", "mostrar tela", "abra"],
  greeting: ["oi", "ola", "bom dia", "boa tarde", "boa noite", "eai", "salve", "opa", "fala"],
  help: ["ajuda", "como usar", "comandos", "o que voce faz", "tutorial"],
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
    if (nameMatch)
      return { ...base, intent: "patient_detail", target_entity: "patient", target_name: nameMatch[1], module: "clinical_engine", confidence: 0.92, response_mode: "detail" };
    if (ctx.last_patient_id)
      return { ...base, intent: "patient_detail", target_entity: "patient", target_id: ctx.last_patient_id, target_name: ctx.last_patient_name || null, module: "clinical_engine", confidence: 0.85, response_mode: "detail" };
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
// Real tables: nutritionist_patients + profiles, meal_plans (is_active, plan_status, nutritionist_id),
// patient_anamnesis (user_id), financial_transactions, clinical_daily_snapshots, etc.
// ═══════════════════════════════════════════════════════════════

// Get role from user_roles table (SINGLE SOURCE OF TRUTH — never profiles.role)
async function getUserRole(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase.from("user_roles")
    .select("role").eq("user_id", userId);
  const roles = (data || []).map((r: any) => r.role);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("nutritionist")) return "nutritionist";
  if (roles.includes("personal")) return "personal";
  if (roles.includes("patient")) return "patient";
  return "unknown";
}

// Get patients for a nutritionist via nutritionist_patients + profiles join
async function getPatients(supabase: any, userId: string): Promise<PatientRecord[]> {
  const { data: links } = await supabase.from("nutritionist_patients")
    .select("patient_id, status, journey_status")
    .eq("nutritionist_id", userId).eq("status", "active").limit(200);
  if (!links?.length) return [];

  const patientIds = links.map((l: any) => l.patient_id);
  const { data: profiles } = await supabase.from("profiles")
    .select("user_id, full_name, goal")
    .in("user_id", patientIds);

  return links.map((link: any) => {
    const profile = (profiles || []).find((p: any) => p.user_id === link.patient_id);
    return {
      id: link.patient_id,
      full_name: profile?.full_name || "Sem nome",
      goal: profile?.goal || null,
      journey_status: link.journey_status,
      status: link.status,
    };
  });
}

// Shared portfolio data fetch — used by priority engine AND clinical_summary
async function getPortfolioInputs(supabase: any, userId: string, patientIds: string[], today: string) {
  const safeIds = patientIds.length ? patientIds : ["00000000-0000-0000-0000-000000000000"];
  const [snapshots, alerts, plans, transactions] = await Promise.all([
    getSnapshots(supabase, safeIds, today),
    getActiveAlerts(supabase, userId),
    getMealPlans(supabase, userId),
    getFinancialSummary(supabase, userId),
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
    // meal_plans: use is_active=true (real column)
    supabase.from("meal_plans")
      .select("id, title, plan_status, is_active, start_date, end_date")
      .eq("patient_id", patientId).eq("is_active", true).limit(1).maybeSingle(),
  ]);
  return { snapshot: snap, alerts: alerts || [], activePlan: plan };
}

// patient_anamnesis uses user_id (NOT patient_id)
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

// financial_transactions: nutritionist_id, no patient_id column
async function getFinancialSummary(supabase: any, userId: string) {
  const { data } = await supabase.from("financial_transactions")
    .select("id, amount, status, type, date, description, category, created_at")
    .eq("nutritionist_id", userId);
  return data || [];
}

async function getActiveAlerts(supabase: any, userId: string) {
  const { data } = await supabase.from("clinical_alerts")
    .select("id, patient_id, title, severity, alert_type, created_at")
    .eq("nutritionist_id", userId).eq("is_active", true).order("created_at", { ascending: false }).limit(20);
  return data || [];
}

async function getAppointments(supabase: any, userId: string, today: string) {
  const { data } = await supabase.from("patient_appointments")
    .select("id, patient_id, appointment_date, appointment_time, status, appointment_type")
    .eq("nutritionist_id", userId).gte("appointment_date", today).order("appointment_date", { ascending: true }).limit(10);
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

async function getSnapshots(supabase: any, patientIds: string[], today: string) {
  if (!patientIds.length) return [];
  const { data } = await supabase.from("clinical_daily_snapshots")
    .select("patient_id, adherence_score, dropout_risk_score, risk_level, checklist_completion_rate, current_weight, weight_trend, momentum_direction, days_since_last_checkin")
    .in("patient_id", patientIds).eq("snapshot_date", today);
  return data || [];
}

// meal_plans: nutritionist_id, is_active, plan_status (NOT status, NOT created_by)
async function getMealPlans(supabase: any, userId: string) {
  const { data } = await supabase.from("meal_plans")
    .select("id, patient_id, title, plan_status, is_active, start_date, end_date")
    .eq("nutritionist_id", userId).eq("is_active", true).limit(200);
  return data || [];
}

// ── SESSION CONTEXT ────────────────────────────────────────────
async function loadSessionContext(supabase: any, userId: string, sessionKey: string): Promise<SessionCtx> {
  const { data } = await supabase.from("ifj_session_context")
    .select("*").eq("user_id", userId).eq("session_key", sessionKey).maybeSingle();
  if (!data) return {};
  return {
    last_patient_id: data.last_patient_id,
    last_patient_name: data.last_patient_name,
    last_student_id: data.last_student_id,
    last_student_name: data.last_student_name,
    last_module: data.last_module,
    last_route: data.last_route,
    last_intent: data.last_intent,
    last_entity_type: data.last_entity_type,
    last_entity_id: data.last_entity_id,
  };
}

async function saveSessionContext(supabase: any, userId: string, role: string, sessionKey: string, ctx: SessionCtx, intent: string) {
  await supabase.from("ifj_session_context").upsert({
    user_id: userId,
    role,
    session_key: sessionKey,
    last_patient_id: ctx.last_patient_id || null,
    last_patient_name: ctx.last_patient_name || null,
    last_student_id: ctx.last_student_id || null,
    last_student_name: ctx.last_student_name || null,
    last_module: ctx.last_module || null,
    last_route: ctx.last_route || null,
    last_intent: intent,
    last_entity_type: ctx.last_entity_type || null,
    last_entity_id: ctx.last_entity_id || null,
    context_json: ctx,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,session_key" });
}

// ── AUDIT LOG ──────────────────────────────────────────────────
async function logIntent(supabase: any, userId: string, role: string, input: string, normalized: string, intent: IFJIntent, responseType: string, engine: string, responseTimeMs: number, error?: string) {
  await supabase.from("ifj_intent_logs").insert({
    user_id: userId,
    role,
    input_text: input,
    normalized_text: normalized,
    detected_intent: intent.intent,
    confidence: intent.confidence,
    resolved_entity_type: intent.target_entity,
    resolved_entity_id: intent.target_id,
    response_type: responseType,
    engine_used: engine,
    response_time_ms: responseTimeMs,
    error_message: error || null,
  });
}

// ═══════════════════════════════════════════════════════════════
// PRIORITY ENGINE — Cross-domain scoring with sync
// ═══════════════════════════════════════════════════════════════
interface PriorityItem {
  entity_type: string;
  entity_id: string;
  entity_name: string;
  score: number;
  level: string;
  reasons: string[];
  source_engine: string;
}

function calculatePriorities(patients: PatientRecord[], snapshots: any[], alerts: any[], plans: any[], transactions: any[]): PriorityItem[] {
  const items: PriorityItem[] = [];
  const today = new Date();

  for (const p of patients) {
    let score = 0;
    const reasons: string[] = [];
    const snap = snapshots.find((s: any) => s.patient_id === p.id);
    const pAlerts = alerts.filter((a: any) => a.patient_id === p.id);
    const pPlan = plans.find((pl: any) => pl.patient_id === p.id);
    // financial_transactions has no patient_id, skip per-patient financial scoring here
    // Instead, global financial pending is shown in the summary

    // 1. Clinical risk (+50 critical, +35 high)
    if (snap?.risk_level === "critical") { score += 50; reasons.push("Risco clínico crítico"); }
    else if (snap?.risk_level === "high") { score += 35; reasons.push("Risco clínico alto"); }

    // 2. Adherence (+25 <40%, +15 <60%)
    if (snap?.adherence_score != null && snap.adherence_score < 40) { score += 25; reasons.push(`Adesão ${snap.adherence_score}%`); }
    else if (snap?.adherence_score != null && snap.adherence_score < 60) { score += 15; reasons.push(`Adesão ${snap.adherence_score}%`); }

    // 3. Dropout risk (+30 >70%)
    if (snap?.dropout_risk_score != null && snap.dropout_risk_score > 70) { score += 30; reasons.push(`Risco abandono ${snap.dropout_risk_score}%`); }

    // 4. Active alerts (+40 critical, +15 others)
    if (pAlerts.length > 0) {
      const critAlerts = pAlerts.filter((a: any) => a.severity === "critical");
      if (critAlerts.length) { score += 40; reasons.push(`${critAlerts.length} alerta(s) crítico(s)`); }
      else { score += 15; reasons.push(`${pAlerts.length} alerta(s) ativo(s)`); }
    }

    // 5. Plan expiring (+25 expired, +20 ≤2 days)
    if (pPlan?.end_date) {
      const daysLeft = Math.ceil((new Date(pPlan.end_date).getTime() - today.getTime()) / 86400000);
      if (daysLeft < 0) { score += 25; reasons.push("Plano vencido"); }
      else if (daysLeft <= 2) { score += 20; reasons.push(`Plano vence em ${daysLeft}d`); }
    }

    // 6. Checklist < 30% (+10)
    if (snap?.checklist_completion_rate != null && snap.checklist_completion_rate < 30) {
      score += 10; reasons.push("Checklist < 30%");
    }

    // 7. Days since last checkin (+15 >7d)
    if (snap?.days_since_last_checkin != null && snap.days_since_last_checkin > 7) {
      score += 15; reasons.push(`${snap.days_since_last_checkin}d sem check-in`);
    }

    if (score > 0) {
      const level = score >= 60 ? "critical" : score >= 40 ? "high" : score >= 20 ? "medium" : "low";
      items.push({ entity_type: "patient", entity_id: p.id, entity_name: p.full_name, score, level, reasons, source_engine: "priority" });
    }
  }

  return items.sort((a, b) => b.score - a.score);
}

// Sync priority queue: upsert current, mark removed as resolved
async function syncPriorityQueue(supabase: any, userId: string, priorities: PriorityItem[]) {
  const now = new Date().toISOString();

  // 1. Upsert current priorities (top 20)
  const upsertPromises = priorities.slice(0, 20).map(item =>
    supabase.from("ifj_priority_queue").upsert({
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      entity_name: item.entity_name,
      owner_user_id: userId,
      priority_score: item.score,
      priority_level: item.level,
      reasons_json: item.reasons,
      source_engine: "priority",
      is_resolved: false,
      updated_at: now,
    }, { onConflict: "owner_user_id,entity_type,entity_id" }).then(() => {}).catch?.(() => {})
  );
  await Promise.all(upsertPromises);

  // 2. Mark as resolved any entries NOT in current priorities
  const currentEntityIds = priorities.slice(0, 20).map(p => p.entity_id);
  if (currentEntityIds.length > 0) {
    // Get all unresolved entries for this user
    const { data: existing } = await supabase.from("ifj_priority_queue")
      .select("id, entity_id")
      .eq("owner_user_id", userId).eq("is_resolved", false);
    const toResolve = (existing || []).filter((e: any) => !currentEntityIds.includes(e.entity_id));
    if (toResolve.length > 0) {
      await Promise.all(toResolve.map((e: any) =>
        supabase.from("ifj_priority_queue").update({ is_resolved: true, updated_at: now }).eq("id", e.id).then(() => {})
      ));
    }
  } else {
    // No priorities = resolve all
    await supabase.from("ifj_priority_queue")
      .update({ is_resolved: true, updated_at: now })
      .eq("owner_user_id", userId).eq("is_resolved", false).then(() => {});
  }
}

// ── FORMAT RESPONSE ────────────────────────────────────────────
function fmt(title: string, icon: string, responseType: string, summary: string, markdown: string, actions: any[], intent: IFJIntent, engine: string, ctx: SessionCtx): IFJResponse {
  return {
    title, icon, response_type: responseType, summary, body_markdown: markdown, actions,
    meta: { intent: intent.intent, confidence: intent.confidence, data_source: "deterministic", engine, used_context: !!(ctx.last_patient_id || ctx.last_student_id) },
    sessionContext: ctx,
  };
}

// ── NAVIGATION RESOLVER ───────────────────────────────────────
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
// DOMAIN ENGINES
// ═══════════════════════════════════════════════════════════════

// ── CLINICAL ENGINE ────────────────────────────────────────────
async function runClinicalEngine(supabase: any, intent: IFJIntent, userId: string, ctx: SessionCtx, patients: PatientRecord[], today: string): Promise<IFJResponse> {
  const patientIds = patients.map(p => p.id);
  const safeIds = patientIds.length ? patientIds : ["00000000-0000-0000-0000-000000000000"];

  switch (intent.intent) {
    case "patients_attention": {
      const snapshots = await getSnapshots(supabase, safeIds, today);
      const atRisk = snapshots.filter((s: any) => s.risk_level === "high" || s.risk_level === "critical")
        .sort((a: any, b: any) => (b.dropout_risk_score || 0) - (a.dropout_risk_score || 0));
      if (!atRisk.length)
        return fmt("Nenhum paciente em risco", "✅", "info", "Carteira estável hoje.", "✅ Todos os pacientes estão dentro dos parâmetros normais.", [], intent, "clinical", ctx);
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
      if (intent.target_id) {
        patient = patients.find(p => p.id === intent.target_id);
      } else if (intent.target_name) {
        const { found, ambiguous } = findByName(patients, intent.target_name);
        if (ambiguous.length > 0) {
          const md = ambiguous.map((p: any, i: number) => `${i + 1}. **${p.full_name}** (${p.goal || "?"})`).join("\n");
          return fmt("Múltiplos pacientes encontrados", "🔍", "disambiguation", `${ambiguous.length} pacientes com nome similar.`,
            `Encontrei **${ambiguous.length}** pacientes:\n\n${md}\n\nDigite o nome completo.`, [], intent, "clinical", ctx);
        }
        patient = found;
      }
      if (!patient) return fmt("Paciente não encontrado", "❌", "error", "Nenhum paciente com esse nome.", "Verifique a grafia ou diga outro nome.", [], intent, "clinical", ctx);

      ctx.last_patient_id = patient.id;
      ctx.last_patient_name = patient.full_name;
      ctx.last_entity_type = "patient";
      ctx.last_entity_id = patient.id;

      const overview = await getPatientOverview(supabase, patient.id, today);
      const s = overview.snapshot;
      const md = `## ${patient.full_name}\n\n| Campo | Valor |\n|---|---|\n` +
        `| Status | ${patient.journey_status || patient.status} |\n` +
        `| Objetivo | ${patient.goal || "—"} |\n` +
        `| Peso atual | ${s?.current_weight || "—"} kg |\n` +
        `| Adesão | ${s?.adherence_score ?? "—"}% |\n` +
        `| Risco | ${s?.risk_level || "—"} |\n` +
        `| Dropout | ${s?.dropout_risk_score ?? "—"}% |\n` +
        `| Tendência peso | ${s?.weight_trend || "—"} |\n` +
        `| Alertas ativos | ${overview.alerts.length} |\n` +
        `| Plano ativo | ${overview.activePlan?.title || "Nenhum"} |\n` +
        (overview.activePlan?.end_date ? `| Plano vence | ${overview.activePlan.end_date} |\n` : "");

      const actions = [{ label: "Abrir ficha", route: `/patients/${patient.id}`, type: "navigate" }];
      if (overview.activePlan?.id) actions.push({ label: "Ver plano", route: `/meal-plans/${overview.activePlan.id}`, type: "navigate" });
      return fmt(`Ficha: ${patient.full_name}`, "👤", "detail", `Resumo clínico de ${patient.full_name}`, md, actions, intent, "clinical", ctx);
    }

    case "anamnesis": {
      const pid = intent.target_id || ctx.last_patient_id;
      if (!pid) return fmt("Paciente não especificado", "❓", "error", "Diga o nome do paciente.", "Ex: *anamnese da Sandra*", [], intent, "clinical", ctx);
      // patient_anamnesis uses user_id = patient's user_id
      const anam = await getPatientAnamnesis(supabase, pid);
      if (!anam) return fmt("Sem anamnese", "📋", "info", "Nenhuma anamnese encontrada.", "O paciente ainda não respondeu.", [], intent, "clinical", ctx);
      const p = patients.find(x => x.id === pid);
      // Answers is JSONB, extract key fields
      const answers = anam.answers || {};
      const md = `## Anamnese — ${p?.full_name || "Paciente"}\n\n` +
        `- **Status**: ${anam.status}\n` +
        `- **Data**: ${new Date(anam.created_at).toLocaleDateString("pt-BR")}\n` +
        `- **Respostas registradas**: ${Object.keys(answers).length} campos\n\n` +
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
          const val = parseFloat(l.value);
          const low = l.reference_min != null ? parseFloat(l.reference_min) : null;
          const high = l.reference_max != null ? parseFloat(l.reference_max) : null;
          let status = "✅";
          if (low != null && val < low) status = "⬇️ Baixo";
          if (high != null && val > high) status = "⬆️ Alto";
          return `| ${l.marker_name} | ${l.value} ${l.unit || ""} | ${low || "—"}-${high || "—"} | ${status} |`;
        }).join("\n");
      return fmt(`Exames: ${p?.full_name}`, "🔬", "detail", `${labs.length} marcadores`, md, [], intent, "clinical", ctx);
    }

    case "lab_pending":
      return fmt("Exames pendentes", "🔬", "info", "Em desenvolvimento", "🔬 Consulte os exames por paciente.", [], intent, "clinical", ctx);

    case "meal_plan": {
      const pid = intent.target_id || ctx.last_patient_id;
      if (!pid) return fmt("Paciente não especificado", "❓", "error", "Diga o nome.", "", [], intent, "clinical", ctx);
      // meal_plans: is_active=true, plan_status for details
      const { data: plan } = await supabase.from("meal_plans")
        .select("id, title, plan_status, is_active, start_date, end_date, total_target_calories")
        .eq("patient_id", pid).eq("is_active", true).limit(1).maybeSingle();
      const p = patients.find(x => x.id === pid);
      if (!plan) return fmt("Sem plano ativo", "🍽️", "info", `${p?.full_name} não tem plano ativo.`, "", [{ label: "Criar plano", route: "/meal-plans", type: "navigate" }], intent, "clinical", ctx);
      const daysLeft = plan.end_date ? Math.ceil((new Date(plan.end_date).getTime() - Date.now()) / 86400000) : null;
      const md = `## Plano: ${plan.title}\n\n- Status: ${plan.plan_status}\n- Início: ${plan.start_date || "—"}\n- Fim: ${plan.end_date || "—"}\n- Calorias: ${plan.total_target_calories || "—"} kcal` +
        (daysLeft != null ? `\n- **Vence em ${daysLeft} dia(s)**` : "");
      return fmt(`Plano: ${p?.full_name}`, "🍽️", "detail", `Plano ${plan.title}`, md,
        [{ label: "Editar plano", route: `/meal-plans/${plan.id}`, type: "navigate" }], intent, "clinical", ctx);
    }

    case "meal_plan_expiring": {
      const allPlans = await getMealPlans(supabase, userId);
      const soon = allPlans.filter((pl: any) => {
        if (!pl.end_date) return false;
        const d = Math.ceil((new Date(pl.end_date).getTime() - Date.now()) / 86400000);
        return d <= 5 && d >= -2;
      });
      if (!soon.length) return fmt("Nenhum plano vencendo", "✅", "info", "Todos os planos válidos.", "", [], intent, "clinical", ctx);
      const md = soon.map((pl: any) => {
        const p = patients.find(x => x.id === pl.patient_id);
        const d = Math.ceil((new Date(pl.end_date).getTime() - Date.now()) / 86400000);
        return `- **${p?.full_name || "?"}** — ${pl.title} — ${d < 0 ? "VENCIDO" : `vence em ${d}d`}`;
      }).join("\n");
      return fmt("Planos vencendo", "⏰", "list", `${soon.length} plano(s)`, md, [{ label: "Ver planos", route: "/meal-plans", type: "navigate" }], intent, "clinical", ctx);
    }

    case "clinical_alerts": {
      const alerts = await getActiveAlerts(supabase, userId);
      if (!alerts.length) return fmt("Sem alertas", "✅", "info", "Nenhum alerta ativo.", "", [], intent, "clinical", ctx);
      const md = `| Paciente | Alerta | Severidade |\n|---|---|---|\n` +
        alerts.map((a: any) => {
          const p = patients.find(x => x.id === a.patient_id);
          return `| ${p?.full_name || "?"} | ${a.title} | ${a.severity} |`;
        }).join("\n");
      return fmt("Alertas Clínicos", "🔔", "list", `${alerts.length} alerta(s)`, md, [{ label: "Control Tower", route: "/control-tower", type: "navigate" }], intent, "clinical", ctx);
    }

    case "clinical_summary":
    case "portfolio_health": {
      const { snapshots, alerts, plans, transactions } = await getPortfolioInputs(supabase, userId, patientIds, today);
      const priorities = calculatePriorities(patients, snapshots, alerts, plans, transactions);
      const critical = priorities.filter(p => p.level === "critical").length;
      const high = priorities.filter(p => p.level === "high").length;
      const avgAdherence = snapshots.length ? Math.round(snapshots.reduce((s: number, x: any) => s + (x.adherence_score || 0), 0) / snapshots.length) : 0;
      const pendingTx = transactions.filter((t: any) => t.status === "pending" || t.status === "pendente");
      const md = `## Panorama da Carteira\n\n| Métrica | Valor |\n|---|---|\n` +
        `| Pacientes ativos | **${patients.length}** |\n` +
        `| Prioridade crítica | **${critical}** |\n` +
        `| Prioridade alta | **${high}** |\n` +
        `| Alertas ativos | **${alerts.length}** |\n` +
        `| Adesão média | **${avgAdherence}%** |\n` +
        `| Planos ativos | **${plans.length}** |\n` +
        `| Pendências financeiras | **${pendingTx.length}** |`;
      return fmt("Panorama da Carteira", "📊", "overview", `${patients.length} pacientes, ${critical} críticos`, md,
        [{ label: "Control Tower", route: "/control-tower", type: "navigate" }], intent, "clinical", ctx);
    }

    default:
      return fmt("Intent não mapeada", "❓", "error", "Comando clínico não reconhecido.", "", [], intent, "clinical", ctx);
  }
}

// ── BEHAVIORAL ENGINE ──────────────────────────────────────────
async function runBehavioralEngine(supabase: any, intent: IFJIntent, userId: string, ctx: SessionCtx, patients: PatientRecord[], today: string): Promise<IFJResponse> {
  switch (intent.intent) {
    case "checklist_status": {
      const pid = ctx.last_patient_id;
      if (pid) {
        const { data: tasks } = await supabase.from("checklist_tasks")
          .select("id, title, completed, category").eq("patient_id", pid).eq("date", today);
        const total = (tasks || []).length;
        const done = (tasks || []).filter((t: any) => t.completed).length;
        const p = patients.find(x => x.id === pid);
        return fmt(`Checklist: ${p?.full_name}`, "✅", "detail", `${done}/${total} tarefas`,
          `**${done}/${total}** tarefas hoje.\n\n` + (tasks || []).map((t: any) => `- ${t.completed ? "✅" : "⬜"} ${t.title}`).join("\n"),
          [], intent, "behavioral", ctx);
      }
      const patientIds = patients.map(p => p.id);
      const snapshots = await getSnapshots(supabase, patientIds.length ? patientIds : ["00000000-0000-0000-0000-000000000000"], today);
      const lowAdh = snapshots.filter((s: any) => s.checklist_completion_rate != null && s.checklist_completion_rate < 50);
      if (!lowAdh.length) return fmt("Checklists OK", "✅", "info", "Todos com boa adesão.", "", [], intent, "behavioral", ctx);
      const md = lowAdh.map((s: any) => {
        const p = patients.find(x => x.id === s.patient_id);
        return `- **${p?.full_name || "?"}** — ${s.checklist_completion_rate}%`;
      }).join("\n");
      return fmt("Checklist baixo", "📋", "list", `${lowAdh.length} paciente(s) < 50%`, md, [], intent, "behavioral", ctx);
    }
    case "hydration":
      return fmt("Hidratação", "💧", "info", "Consulte checklist do paciente.", "Diga o nome do paciente.", [], intent, "behavioral", ctx);
    default:
      return fmt("Comportamental", "🧠", "error", "Não reconhecido.", "", [], intent, "behavioral", ctx);
  }
}

// ── FINANCIAL ENGINE ───────────────────────────────────────────
async function runFinancialEngine(supabase: any, intent: IFJIntent, userId: string, ctx: SessionCtx, patients: PatientRecord[]): Promise<IFJResponse> {
  // financial_transactions: id, nutritionist_id, type, description, amount, date, category, status
  const transactions = await getFinancialSummary(supabase, userId);

  switch (intent.intent) {
    case "financial_overview": {
      const income = transactions.filter((t: any) => t.type === "income" || t.type === "receita");
      const pending = transactions.filter((t: any) => t.status === "pending" || t.status === "pendente");
      const totalIncome = income.reduce((s: number, t: any) => s + (t.amount || 0), 0);
      const totalPending = pending.reduce((s: number, t: any) => s + (t.amount || 0), 0);
      const md = `## Financeiro\n\n| Métrica | Valor |\n|---|---|\n` +
        `| Receitas totais | R$ ${totalIncome.toFixed(2)} |\n` +
        `| Pendente | R$ ${totalPending.toFixed(2)} |\n` +
        `| Transações | ${transactions.length} |`;
      return fmt("Resumo Financeiro", "💰", "overview", `Receita: R$ ${totalIncome.toFixed(2)} | Pendente: R$ ${totalPending.toFixed(2)}`, md,
        [{ label: "Ir para Financeiro", route: "/financial", type: "navigate" }], intent, "financial", ctx);
    }
    case "financial_pending": {
      const pending = transactions.filter((t: any) => t.status === "pending" || t.status === "pendente");
      if (!pending.length) return fmt("Sem pendências", "✅", "info", "Nenhum pagamento pendente.", "", [], intent, "financial", ctx);
      const md = pending.map((t: any) => {
        return `- R$ ${(t.amount || 0).toFixed(2)} — ${t.description || t.category || "?"} — ${t.date || "sem data"}`;
      }).join("\n");
      return fmt("Cobranças pendentes", "💳", "list", `${pending.length} pendente(s)`, md,
        [{ label: "Ir para Financeiro", route: "/financial", type: "navigate" }], intent, "financial", ctx);
    }
    default:
      return fmt("Financeiro", "💰", "error", "Não reconhecido.", "", [], intent, "financial", ctx);
  }
}

// ── TRAINING ENGINE ────────────────────────────────────────────
async function runTrainingEngine(supabase: any, intent: IFJIntent, userId: string, ctx: SessionCtx): Promise<IFJResponse> {
  const students = await getStudents(supabase, userId);
  const studentIds = students.map(s => s.id);

  switch (intent.intent) {
    case "workout_overview":
      return fmt("Visão de Treinos", "🏋️", "overview", `${students.length} aluno(s) ativo(s)`,
        `Você tem **${students.length}** alunos ativos.`,
        [{ label: "Ver treinos", route: "/workouts", type: "navigate" }], intent, "training", ctx);
    case "workout_pain": {
      const feedback = await getWorkoutFeedback(supabase, studentIds);
      const withPain = feedback.filter((f: any) => f.pain_reported);
      if (!withPain.length) return fmt("Sem dores", "✅", "info", "Nenhum aluno com dor.", "", [], intent, "training", ctx);
      const md = withPain.map((f: any) => {
        const s = students.find(x => x.id === f.patient_id);
        return `- **${s?.full_name || "?"}** — ${f.pain_location || "?"} — ${f.session_date}`;
      }).join("\n");
      return fmt("Alunos com dor", "🤕", "list", `${withPain.length} relato(s)`, md, [], intent, "training", ctx);
    }
    case "student_detail": {
      if (!intent.target_name) return fmt("Aluno não especificado", "❓", "error", "Diga o nome.", "", [], intent, "training", ctx);
      const { found, ambiguous } = findByName(students, intent.target_name);
      if (ambiguous.length > 0)
        return fmt("Múltiplos alunos", "🔍", "disambiguation", `${ambiguous.length} encontrados`,
          ambiguous.map((s: any, i: number) => `${i + 1}. **${s.full_name}**`).join("\n"), [], intent, "training", ctx);
      if (!found) return fmt("Aluno não encontrado", "❌", "error", "Não encontrado.", "", [], intent, "training", ctx);
      ctx.last_student_id = found.id;
      ctx.last_student_name = found.full_name;
      return fmt(`Aluno: ${found.full_name}`, "🏋️", "detail", `Dados de ${found.full_name}`,
        `## ${found.full_name}\n\n- Objetivo: ${found.goal || "—"}`,
        [], intent, "training", ctx);
    }
    default:
      return fmt("Treino", "🏋️", "error", "Não reconhecido.", "", [], intent, "training", ctx);
  }
}

// ── JOURNEY ENGINE ─────────────────────────────────────────────
async function runJourneyEngine(supabase: any, intent: IFJIntent, userId: string, ctx: SessionCtx, patients: PatientRecord[], today: string): Promise<IFJResponse> {
  switch (intent.intent) {
    case "appointments": {
      const appts = await getAppointments(supabase, userId, today);
      if (!appts.length) return fmt("Sem consultas", "📅", "info", "Nenhuma consulta agendada.",
        "", [{ label: "Agendar", route: "/appointments", type: "navigate" }], intent, "journey", ctx);
      const md = `| Paciente | Data | Hora | Tipo | Status |\n|---|---|---|---|---|\n` +
        appts.map((a: any) => {
          const p = patients.find(x => x.id === a.patient_id);
          return `| ${p?.full_name || "?"} | ${a.appointment_date} | ${a.appointment_time || "—"} | ${a.appointment_type || "—"} | ${a.status} |`;
        }).join("\n");
      return fmt("Próximas Consultas", "📅", "list", `${appts.length} consulta(s)`, md,
        [{ label: "Ver agenda", route: "/appointments", type: "navigate" }], intent, "journey", ctx);
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

// ── PRIORITY ENGINE (God Mode) ─────────────────────────────────
async function runPriorityEngine(supabase: any, intent: IFJIntent, userId: string, ctx: SessionCtx, patients: PatientRecord[], today: string): Promise<IFJResponse> {
  const patientIds = patients.map(p => p.id);
  const { snapshots, alerts, plans, transactions } = await getPortfolioInputs(supabase, userId, patientIds, today);
  const priorities = calculatePriorities(patients, snapshots, alerts, plans, transactions);

  // Sync priority queue (upsert + resolve stale)
  await syncPriorityQueue(supabase, userId, priorities);

  if (intent.intent === "next_best_action") {
    const top = priorities[0];
    if (!top) return fmt("Nada urgente", "✅", "action", "Sem ação prioritária.", "Seus pacientes estão estáveis! 🎉", [], intent, "priority", ctx);
    return fmt("Próxima Melhor Ação", "🎯", "action",
      `Prioridade: ${top.entity_name} (${top.score}pts)`,
      `## 🎯 Ação recomendada\n\n**Paciente:** ${top.entity_name}\n**Score:** ${top.score}/100\n**Nível:** ${top.level}\n\n**Motivos:**\n${top.reasons.map(r => `- ${r}`).join("\n")}`,
      [{ label: `Abrir ${top.entity_name}`, route: `/patients/${top.entity_id}`, type: "navigate" }],
      intent, "priority", ctx);
  }

  // priorities_today
  if (!priorities.length) return fmt("Dia tranquilo", "✅", "info", "Nenhuma prioridade.", "Seus pacientes estão estáveis! 🎉", [], intent, "priority", ctx);

  const critical = priorities.filter(p => p.level === "critical");
  const high = priorities.filter(p => p.level === "high");
  const medium = priorities.filter(p => p.level === "medium");
  const expiringPlans = plans.filter((pl: any) => {
    if (!pl.end_date) return false;
    const d = Math.ceil((new Date(pl.end_date).getTime() - Date.now()) / 86400000);
    return d <= 3 && d >= -1;
  });
  const pendingPayments = transactions.filter((t: any) => t.status === "pending" || t.status === "pendente");

  let md = `## 📋 Prioridades do Dia\n\n| Indicador | Qtd |\n|---|---|\n`;
  md += `| 🔴 Crítico | ${critical.length} |\n`;
  md += `| 🟠 Alto | ${high.length} |\n`;
  md += `| 🟡 Médio | ${medium.length} |\n`;
  md += `| ⏰ Planos vencendo | ${expiringPlans.length} |\n`;
  md += `| 💳 Pagamentos pendentes | ${pendingPayments.length} |\n\n`;

  if (critical.length) {
    md += `### 🔴 Críticos\n\n`;
    md += critical.slice(0, 5).map(p => `- **${p.entity_name}** (${p.score}pts) — ${p.reasons.join(", ")}`).join("\n");
    md += "\n\n";
  }
  if (high.length) {
    md += `### 🟠 Alta Prioridade\n\n`;
    md += high.slice(0, 5).map(p => `- **${p.entity_name}** (${p.score}pts) — ${p.reasons.join(", ")}`).join("\n");
    md += "\n\n";
  }

  return fmt("Prioridades do Dia", "📋", "priority_list",
    `${critical.length} crítico(s), ${high.length} alto(s), ${medium.length} médio(s)`, md,
    [{ label: "Control Tower", route: "/control-tower", type: "navigate" }], intent, "priority", ctx);
}

// ═══════════════════════════════════════════════════════════════
// MAIN ROUTER — Single entry point
// ═══════════════════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const inputText = body.input_text || body.question || body.command || "";
    const sessionKey = body.session_key || "default";
    const today = new Date().toISOString().split("T")[0];

    // 1. Get Role from user_roles (SINGLE SOURCE OF TRUTH)
    const role = await getUserRole(supabase, user.id);
    const { data: profileData } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
    const userName = profileData?.full_name?.split(" ")[0] || "Profissional";

    // 2. Load Session Context
    const ctx = await loadSessionContext(supabase, user.id, sessionKey);

    // 3. Detect Intent
    const n = normalize(inputText);
    const intent = detectIntent(n, ctx);

    // 4. Fetch patients ONCE (shared across engines)
    const needsPatients = !["navigation", "general"].includes(intent.module) && intent.module !== "training_engine";
    const patients = needsPatients ? await getPatients(supabase, user.id) : [];

    let response: IFJResponse;

    // 5. Route to correct engine
    try {
      if (intent.intent === "greeting") {
        const pts = patients.length || (await getPatients(supabase, user.id)).length;
        const hour = new Date().getHours();
        const period = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
        response = fmt(`${period}, ${userName}!`, "👋", "greeting", `${pts} pacientes ativos.`,
          `${period}, **${userName}**! 👋\n\nVocê tem **${pts}** pacientes ativos.\n\nPergunte:\n- *"O que preciso resolver hoje?"*\n- *"Quem precisa de atenção?"*\n- *"Resumo da carteira"*`,
          [], intent, "general", ctx);
      }
      else if (intent.intent === "help") {
        response = fmt("Comandos IFJ Core", "📚", "help", "Comandos disponíveis",
          `## Comandos disponíveis\n\n` +
          `### 🎯 Prioridades\n- *"O que preciso resolver hoje?"*\n- *"Próxima melhor ação"*\n\n` +
          `### 👥 Pacientes\n- *"Quem precisa de atenção?"*\n- *"Quem melhorou?"*\n- *"Sobre [nome]"*\n- *"Anamnese da [nome]"*\n- *"Exames do [nome]"*\n\n` +
          `### 📋 Clínico\n- *"Planos vencendo"*\n- *"Alertas clínicos"*\n- *"Resumo da carteira"*\n\n` +
          `### 💰 Financeiro\n- *"Resumo financeiro"*\n- *"Cobranças pendentes"*\n\n` +
          `### 🏋️ Treinos\n- *"Alunos com dor"*\n- *"Visão de treinos"*\n\n` +
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
      else if (intent.module === "priority_engine") {
        response = await runPriorityEngine(supabase, intent, user.id, ctx, patients, today);
      }
      else if (intent.module === "clinical_engine") {
        response = await runClinicalEngine(supabase, intent, user.id, ctx, patients, today);
      }
      else if (intent.module === "behavioral_engine") {
        response = await runBehavioralEngine(supabase, intent, user.id, ctx, patients, today);
      }
      else if (intent.module === "financial_engine") {
        response = await runFinancialEngine(supabase, intent, user.id, ctx, patients);
      }
      else if (intent.module === "training_engine") {
        response = await runTrainingEngine(supabase, intent, user.id, ctx);
      }
      else if (intent.module === "journey_engine") {
        response = await runJourneyEngine(supabase, intent, user.id, ctx, patients, today);
      }
      else {
        response = fmt("Não entendi", "❓", "error", "Comando não reconhecido.",
          `Não entendi. Tente:\n- *"O que preciso resolver hoje?"*\n- *"Quem precisa de atenção?"*\n- *"Sobre [nome]"*\n- *"Resumo financeiro"*\n- *"Ajuda"*`,
          [], intent, "general", ctx);
      }
    } catch (engineError) {
      console.error("Engine error:", engineError);
      response = fmt("Erro no motor", "❌", "error", "Erro ao processar.", "Ocorreu um erro. Tente novamente.", [], intent, "error", ctx);
    }

    // 6. Save session context
    await saveSessionContext(supabase, user.id, role, sessionKey, ctx, intent.intent);

    // 7. Log intent
    const elapsed = Date.now() - startTime;
    await logIntent(supabase, user.id, role, inputText, n, intent, response.response_type, response.meta.engine, elapsed);

    // 8. Audit log
    await supabase.rpc("log_audit", {
      _action: "ifj_core_query",
      _resource_type: "ifj_core",
      _resource_id: intent.intent,
      _metadata: { intent: intent.intent, confidence: intent.confidence, engine: response.meta.engine, response_time_ms: elapsed },
    }).then(() => {});

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("ifj-core-router error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
