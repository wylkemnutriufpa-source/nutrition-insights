import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * IFJ Command Center — Nutritionist / Admin
 * 100% Deterministic — keyword intent detection + real DB queries
 * 
 * VALIDATED TABLES (2026-03-26):
 * - profiles (user_id, full_name)
 * - patients (id, nutritionist_id, full_name, email, phone, status, journey_status, goal, current_weight, target_weight)
 * - clinical_daily_snapshots (patient_id, snapshot_date, adherence_score, dropout_risk_score, risk_level, weight_trend, checklist_completion_rate)
 * - clinical_alerts (nutritionist_id, patient_id, title, severity, alert_type, is_active)
 * - meal_plans (nutritionist_id, patient_id, title, plan_status, end_date, total_meta_calorias, is_active)
 * - patient_appointments (nutritionist_id, patient_id, appointment_date, appointment_time, appointment_type, status)
 * - patient_checkins (patient_id, weight, mood, created_at)
 * - patient_anamnesis (user_id, health_conditions, allergies, food_preferences, activity_level, sleep_hours, medications, dietary_restrictions)
 * - financial_transactions (nutritionist_id, type, amount, date, status, category, description)
 * - clinical_decisions (nutritionist_id, patient_id, title, urgency, decision_type, status)
 * - nutrition_protocols (nutritionist_id, name, status, protocol_type)
 * - automation_rules (nutritionist_id, name, is_active, trigger_type)
 * - user_roles (user_id, role)
 * - audit_logs (user_id, action, resource_type, resource_id, metadata)
 */

// ── TYPES ──
type Intent =
  | "patients_overview" | "patients_at_risk" | "patients_attention"
  | "patient_detail" | "financial_overview" | "financial_overdue"
  | "appointments_upcoming" | "decisions_pending"
  | "plans_expiring" | "plans_draft" | "alerts_active"
  | "protocols_overview" | "automations_overview"
  | "navigate" | "help" | "greeting" | "unknown";

interface SessionContext {
  lastPatientId?: string;
  lastPatientName?: string;
  lastModule?: string;
  lastRoute?: string;
}

// ── NORMALIZE ──
function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// ── SYNONYM EXPANSION ──
const SYNONYMS: Record<string, string[]> = {
  risco: ["risco", "perigo", "abandono", "dropout", "evasao", "desistencia", "desistir", "abandonar", "saindo"],
  atencao: ["atencao", "urgente", "urgencia", "prioridade", "critico", "critica", "grave", "preocupa", "cuidado", "alarmante"],
  financeiro: ["financeiro", "financeira", "faturamento", "receita", "dinheiro", "ganhei", "ganho", "cobranc", "pagamento", "pagar", "fatura", "caixa", "valor"],
  vencido: ["vencid", "atrasad", "inadimplent", "devendo", "deve", "nao pagou", "calote"],
  consulta: ["consulta", "agenda", "agendamento", "proximo", "proxima", "marcad", "horario"],
  decisao: ["decisao", "decisoes", "pendente", "pendencia", "resolver", "aguardando"],
  plano: ["plano", "dieta", "cardapio", "alimentar"],
  alerta: ["alerta", "alertas", "notificac", "aviso"],
  protocolo: ["protocolo", "protocolos"],
  automacao: ["automac", "automatizac", "regra automatica", "fluxo"],
  carteira: ["carteira", "resum", "panorama", "overview", "visao geral", "geral", "como esta", "status geral"],
  paciente: ["paciente", "pacientes"],
};

function matchesSynonym(text: string, group: string): boolean {
  return (SYNONYMS[group] || []).some(s => text.includes(s));
}

// ── INTENT DETECTION ──
function detectIntent(command: string, ctx: SessionContext): { intent: Intent; patientName?: string; route?: string } {
  const n = normalize(command);

  // Greetings
  if (/^(oi|ola|hey|bom dia|boa tarde|boa noite|e ai|eai|fala|salve|opa)/.test(n)) return { intent: "greeting" };

  // Help
  if (/^(ajuda|help|o que voce|oq vc|como funciona|comandos|menu|opcoes)/.test(n)) return { intent: "help" };

  // Navigation
  const navMap: Record<string, string> = {
    "financeiro": "/financial", "dashboard": "/", "home": "/", "inicio": "/",
    "pacientes": "/patients", "paciente": "/patients",
    "planos": "/meal-plans", "plano alimentar": "/meal-plans", "cardapio": "/meal-plans", "dietas": "/meal-plans",
    "protocolo": "/protocols", "protocolos": "/protocols",
    "agenda": "/appointments", "consulta": "/appointments", "consultas": "/appointments",
    "chat": "/chat", "mensagem": "/chat", "mensagens": "/chat",
    "receita": "/recipes", "receitas": "/recipes",
    "automacao": "/automation", "automatizacao": "/automation", "automacoes": "/automation",
    "relatorio": "/reports", "relatorios": "/reports",
    "ranking": "/ranking",
    "configurac": "/settings", "ajuste": "/settings", "perfil": "/settings",
    "inteligencia": "/intelligence", "ifj": "/intelligence",
    "control tower": "/control-tower", "torre": "/control-tower",
    "diagnostico": "/system-diagnostics",
    "check-in": "/checkin-panel", "checkin": "/checkin-panel",
    "branding": "/branding",
  };
  for (const [key, route] of Object.entries(navMap)) {
    if (n.includes(key) && (n.includes("abr") || n.includes("ir para") || n.includes("ir pro") || n.includes("ir pra") || n.includes("naveg") || n.includes("mostr") || n.includes("acess") || n.includes("leva") || n.includes("vai para") || n.includes("entr"))) {
      return { intent: "navigate", route };
    }
  }

  // Patient detail (search by name) — expanded patterns
  const namePatterns = [
    /(?:paciente|sobre|dados d[aeo]|status d[aeo]|como esta|como vai|informac[oa]o d[aeo]|detalhe[s]? d[aeo]|ficha d[aeo]|perfil d[aeo])\s+(.+)/,
    /(?:me fala|fala|fale) (?:sobre|d[aeo])\s+(.+)/,
    /(?:quero ver|ver|buscar|pesquisar|procurar)\s+(.+)/,
  ];
  for (const pattern of namePatterns) {
    const match = n.match(pattern);
    if (match) return { intent: "patient_detail", patientName: match[1].trim() };
  }

  // Context: "como ele/ela está?" uses last patient
  if ((n === "como esta" || n === "como ele esta" || n === "como ela esta" || n === "detalhes" || n === "mais info") && ctx.lastPatientName) {
    return { intent: "patient_detail", patientName: ctx.lastPatientName };
  }

  // Specific intents via synonyms
  if (matchesSynonym(n, "risco")) return { intent: "patients_at_risk" };
  if (matchesSynonym(n, "atencao")) return { intent: "patients_attention" };
  if (matchesSynonym(n, "vencido")) return { intent: "financial_overdue" };
  if (matchesSynonym(n, "financeiro")) return { intent: "financial_overview" };
  if (matchesSynonym(n, "consulta")) return { intent: "appointments_upcoming" };
  if (matchesSynonym(n, "decisao")) return { intent: "decisions_pending" };
  if ((n.includes("vence") || n.includes("expira")) && matchesSynonym(n, "plano")) return { intent: "plans_expiring" };
  if (n.includes("rascunho") || n.includes("draft")) return { intent: "plans_draft" };
  if (matchesSynonym(n, "alerta")) return { intent: "alerts_active" };
  if (matchesSynonym(n, "protocolo")) return { intent: "protocols_overview" };
  if (matchesSynonym(n, "automacao")) return { intent: "automations_overview" };
  if (matchesSynonym(n, "carteira") || matchesSynonym(n, "paciente")) return { intent: "patients_overview" };

  return { intent: "unknown" };
}

// ── NAME AMBIGUITY HANDLER ──
function findPatientByName(patients: any[], searchName: string): { found: any | null; ambiguous: any[] } {
  const normalized = normalize(searchName);
  const exact = patients.filter((p: any) => normalize(p.full_name) === normalized);
  if (exact.length === 1) return { found: exact[0], ambiguous: [] };

  const partial = patients.filter((p: any) => normalize(p.full_name).includes(normalized));
  if (partial.length === 1) return { found: partial[0], ambiguous: [] };
  if (partial.length > 1) return { found: null, ambiguous: partial };

  // Try first name only
  const firstNameMatch = patients.filter((p: any) => normalize(p.full_name).split(" ")[0] === normalized);
  if (firstNameMatch.length === 1) return { found: firstNameMatch[0], ambiguous: [] };
  if (firstNameMatch.length > 1) return { found: null, ambiguous: firstNameMatch };

  return { found: null, ambiguous: [] };
}

// ── STANDARDIZED RESPONSE FORMAT ──
function formatResponse(title: string, emoji: string, body: string, footer?: string): string {
  let resp = `## ${emoji} ${title}\n\n${body}`;
  if (footer) resp += `\n\n---\n> ${footer}`;
  return resp;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { command, sessionContext } = await req.json();
    const ctx: SessionContext = sessionContext || {};

    // ── RUNTIME PERMISSION VALIDATION ──
    const { data: userRoles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id);
    const actualRoles = (userRoles || []).map((r: any) => r.role);
    const verifiedAdmin = actualRoles.includes("admin");
    const verifiedNutritionist = actualRoles.includes("nutritionist") || verifiedAdmin;

    if (!verifiedNutritionist) {
      return new Response(JSON.stringify({ error: "Permissão negada." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── AUDIT LOG ──
    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id, action: "ifj_command_center_query",
      resource_type: "ifj_command_center", resource_id: verifiedAdmin ? "admin" : "nutritionist",
      metadata: { command: command?.substring(0, 300), role: verifiedAdmin ? "admin" : "nutritionist" },
    });

    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();
    const userName = profile?.full_name?.split(" ")[0] || "Profissional";
    const today = new Date().toISOString().split("T")[0];

    // ── DETECT INTENT ──
    const { intent, patientName, route } = detectIntent(command, ctx);

    let responseText = "";
    let actions: any[] = [];
    let level = "consult";
    const newContext: SessionContext = { ...ctx };

    // Base patient data
    const { data: patients } = await supabase
      .from("patients")
      .select("id, full_name, email, phone, status, journey_status, goal, current_weight, target_weight, created_at")
      .eq("nutritionist_id", user.id).limit(200);

    const activePatients = (patients || []).filter((p: any) => p.status === "active");
    const patientIds = (patients || []).map((p: any) => p.id);
    const safeIds = patientIds.length ? patientIds : ["00000000-0000-0000-0000-000000000000"];

    if (intent === "greeting") {
      const hour = new Date().getHours();
      const period = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
      responseText = formatResponse("Bem-vindo", "👋",
        `${period}, ${userName}!\n\nVocê tem **${activePatients.length} pacientes ativos**. Consulto apenas dados reais do sistema.\n\n💡 Experimente: *"Quem precisa de atenção?"* ou *"Resumo financeiro"*`,
        "Dados 100% reais • Zero IA generativa"
      );
    }

    else if (intent === "help") {
      responseText = formatResponse("Comandos Disponíveis", "🧠",
        `| Comando | O que faz |\n|---------|----------|\n| "Resumo da carteira" | Panorama geral |\n| "Quem precisa de atenção?" | Pacientes em risco |\n| "Resumo financeiro" | Receitas e pendências |\n| "Próximas consultas" | Agenda futura |\n| "Decisões pendentes" | Decisões clínicas |\n| "Planos que vencem" | Planos expirando |\n| "Alertas ativos" | Alertas clínicos |\n| "Sobre [nome]" | Dados de um paciente |\n| "Abra [tela]" | Navegar para tela |`,
        "Todos os dados são consultados em tempo real"
      );
    }

    else if (intent === "navigate" && route) {
      responseText = `Abrindo a tela solicitada...`;
      actions = [{ label: "Ir para a tela", route, type: "navigate" }];
      newContext.lastRoute = route;
      level = "prepare";
    }

    else if (intent === "patients_overview") {
      const inactive = (patients || []).filter((p: any) => p.status !== "active");

      const { data: snapshots } = await supabase
        .from("clinical_daily_snapshots")
        .select("patient_id, adherence_score, dropout_risk_score, risk_level")
        .in("patient_id", safeIds).eq("snapshot_date", today);

      const atRisk = (snapshots || []).filter((s: any) => s.risk_level === "high" || s.risk_level === "critical");
      const avgAdherence = (snapshots || []).length > 0
        ? Math.round((snapshots || []).reduce((s: number, x: any) => s + (x.adherence_score || 0), 0) / snapshots!.length)
        : 0;

      const goalDist = activePatients.reduce((acc: any, p: any) => {
        const g = p.goal || "Não definido";
        acc[g] = (acc[g] || 0) + 1;
        return acc;
      }, {});

      responseText = formatResponse("Panorama da Carteira", "📊",
        `| Indicador | Valor |\n|-----------|-------|\n| Pacientes ativos | **${activePatients.length}** |\n| Inativos | ${inactive.length} |\n| Em risco | ⚠️ **${atRisk.length}** |\n| Adesão média | ${avgAdherence}% |\n\n### Por objetivo:\n${Object.entries(goalDist).map(([g, c]) => `- **${g}**: ${c}`).join("\n") || "- Sem dados"}`
      );
      actions = [{ label: "Ver pacientes", route: "/patients", type: "navigate" }];
      newContext.lastModule = "patients_overview";
    }

    else if (intent === "patients_at_risk") {
      const { data: snapshots } = await supabase
        .from("clinical_daily_snapshots")
        .select("patient_id, adherence_score, dropout_risk_score, risk_level, weight_trend")
        .in("patient_id", safeIds).eq("snapshot_date", today);

      const atRisk = (snapshots || []).filter((s: any) =>
        s.risk_level === "high" || s.risk_level === "critical" || (s.dropout_risk_score && s.dropout_risk_score >= 60)
      );

      if (atRisk.length === 0) {
        responseText = formatResponse("Nenhum Paciente em Risco", "✅",
          "Todos os indicadores estão dentro do normal hoje. Continue monitorando!"
        );
      } else {
        const lines = atRisk.map((s: any) => {
          const p = (patients || []).find((x: any) => x.id === s.patient_id);
          return `| ${p?.full_name || "?"} | ${s.risk_level || "?"} | ${s.dropout_risk_score || 0}% | ${s.adherence_score || 0}% | ${s.weight_trend || "?"} |`;
        });
        responseText = formatResponse(`Pacientes em Risco (${atRisk.length})`, "⚠️",
          `| Paciente | Risco | Dropout | Adesão | Peso |\n|----------|-------|---------|--------|------|\n${lines.join("\n")}`
        );
      }
      actions = [{ label: "Control Tower", route: "/control-tower", type: "navigate" }];
    }

    else if (intent === "patients_attention") {
      const { data: alerts } = await supabase
        .from("clinical_alerts").select("patient_id, title, severity, alert_type")
        .eq("nutritionist_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(20);

      const { data: snapshots } = await supabase
        .from("clinical_daily_snapshots")
        .select("patient_id, adherence_score, dropout_risk_score, risk_level")
        .in("patient_id", safeIds).eq("snapshot_date", today);

      const critical = (snapshots || []).filter((s: any) => s.risk_level === "critical");
      const highRisk = (snapshots || []).filter((s: any) => s.risk_level === "high");
      const lowAdherence = (snapshots || []).filter((s: any) => (s.adherence_score || 100) < 40);

      const priority: any[] = [];
      for (const s of [...critical, ...highRisk, ...lowAdherence]) {
        if (!priority.find((x: any) => x.patient_id === s.patient_id)) {
          const p = (patients || []).find((x: any) => x.id === s.patient_id);
          const pAlerts = (alerts || []).filter((a: any) => a.patient_id === s.patient_id);
          priority.push({ ...s, name: p?.full_name, alertCount: pAlerts.length });
        }
      }

      if (priority.length === 0) {
        responseText = formatResponse("Tudo Tranquilo", "✅",
          "Nenhum paciente precisa de atenção urgente agora."
        );
      } else {
        responseText = formatResponse(`Atenção Necessária (${priority.length})`, "🚨",
          priority.slice(0, 10).map((p: any, i: number) => {
            const emoji = p.risk_level === "critical" ? "🔴" : p.risk_level === "high" ? "🟠" : "🟡";
            return `${i + 1}. ${emoji} **${p.name}** — Risco: ${p.risk_level || "?"} | Adesão: ${p.adherence_score || 0}% | Alertas: ${p.alertCount}`;
          }).join("\n")
        );
      }
      actions = [{ label: "Control Tower", route: "/control-tower", type: "navigate" }];
    }

    else if (intent === "patient_detail" && patientName) {
      const { found, ambiguous } = findPatientByName(patients || [], patientName);

      if (ambiguous.length > 0) {
        responseText = formatResponse("Múltiplos Pacientes Encontrados", "🔍",
          `Encontrei **${ambiguous.length}** pacientes com nome parecido:\n\n` +
          ambiguous.map((p: any, i: number) => `${i + 1}. **${p.full_name}** (${p.status}) — ${p.goal || "sem objetivo"}`).join("\n") +
          `\n\nSeja mais específico com o nome completo.`
        );
      } else if (!found) {
        responseText = formatResponse("Paciente Não Encontrado", "❌",
          `Não encontrei **"${patientName}"** na sua carteira (${(patients || []).length} pacientes).\n\nVerifique o nome e tente novamente.`
        );
      } else {
        newContext.lastPatientId = found.id;
        newContext.lastPatientName = found.full_name;

        const { data: snap } = await supabase.from("clinical_daily_snapshots")
          .select("*").eq("patient_id", found.id).eq("snapshot_date", today).maybeSingle();
        const { data: alertsData } = await supabase.from("clinical_alerts")
          .select("title, severity, alert_type").eq("patient_id", found.id).eq("is_active", true);
        const { data: plans } = await supabase.from("meal_plans")
          .select("title, plan_status, end_date, total_meta_calorias, is_active")
          .eq("patient_id", found.id).order("created_at", { ascending: false }).limit(3);
        const { data: appointments } = await supabase.from("patient_appointments")
          .select("appointment_date, appointment_time, status").eq("patient_id", found.id).gte("appointment_date", today).limit(3);
        const { data: checkins } = await supabase.from("patient_checkins")
          .select("weight, mood, created_at").eq("patient_id", found.id).order("created_at", { ascending: false }).limit(5);
        const { data: anamnesis } = await supabase.from("patient_anamnesis")
          .select("health_conditions, allergies, food_preferences, activity_level, sleep_hours, medications, dietary_restrictions")
          .eq("user_id", found.id).order("created_at", { ascending: false }).limit(1);

        const anamData = (anamnesis as any)?.[0];
        const activePlan = (plans || []).find((p: any) => p.plan_status === "active" || p.plan_status === "published" || p.is_active);

        let body = `### Dados Gerais\n| Campo | Valor |\n|-------|-------|\n| Status | ${found.status} |\n| Jornada | ${found.journey_status || "N/A"} |\n| Objetivo | ${found.goal || "Não definido"} |\n| Peso atual | ${found.current_weight || "?"} kg |\n| Peso meta | ${found.target_weight || "?"} kg |\n| Email | ${found.email || "?"} |\n| Telefone | ${found.phone || "?"} |`;

        if (snap) {
          body += `\n\n### Snapshot de Hoje\n| Indicador | Valor |\n|-----------|-------|\n| Adesão | ${snap.adherence_score || 0}% |\n| Risco dropout | ${snap.dropout_risk_score || 0}% |\n| Nível | ${snap.risk_level || "?"} |\n| Tendência peso | ${snap.weight_trend || "?"} |`;
        }

        if (anamData) {
          const fmt = (arr: any) => Array.isArray(arr) && arr.length > 0 ? arr.join(", ") : "Nenhum(a)";
          body += `\n\n### Anamnese\n| Campo | Valor |\n|-------|-------|\n| Condições | ${fmt(anamData.health_conditions)} |\n| Alergias | ${fmt(anamData.allergies)} |\n| Restrições | ${fmt(anamData.dietary_restrictions)} |\n| Preferências | ${fmt(anamData.food_preferences)} |\n| Atividade | ${anamData.activity_level || "?"} |\n| Sono | ${anamData.sleep_hours || "?"} h |\n| Medicamentos | ${fmt(anamData.medications)} |`;
        }

        if (activePlan) {
          body += `\n\n### Plano Ativo\n- **${activePlan.title}** (${activePlan.total_meta_calorias || "?"} kcal) — expira ${activePlan.end_date || "indefinido"}`;
        }

        if ((alertsData || []).length > 0) {
          body += `\n\n### ⚠️ Alertas Ativos (${alertsData!.length})\n` +
            alertsData!.map((a: any) => `- **[${a.severity}]** ${a.title}`).join("\n");
        }

        if ((checkins || []).length > 0) {
          body += `\n\n### Últimos Check-ins\n` +
            (checkins || []).map((c: any) => `- ${c.created_at?.split("T")[0]} — ${c.weight || "?"}kg, humor: ${c.mood || "?"}`).join("\n");
        }

        responseText = formatResponse(found.full_name, "👤", body);
        actions = [{ label: `Abrir perfil`, route: `/patients/${found.id}`, type: "navigate" }];
      }
    }

    else if (intent === "financial_overview") {
      const { data: transactions } = await supabase.from("financial_transactions")
        .select("amount, status, date, type, category, description")
        .eq("nutritionist_id", user.id).order("date", { ascending: false }).limit(200);

      const income = (transactions || []).filter((t: any) => t.type === "income" || t.type === "receita");
      const expenses = (transactions || []).filter((t: any) => t.type === "expense" || t.type === "despesa");
      const pending = (transactions || []).filter((t: any) => t.status === "pending" || t.status === "pendente");
      const totalIncome = income.reduce((s: number, t: any) => s + (t.amount || 0), 0);
      const totalExpenses = expenses.reduce((s: number, t: any) => s + (t.amount || 0), 0);
      const totalPending = pending.reduce((s: number, t: any) => s + (t.amount || 0), 0);

      responseText = formatResponse("Resumo Financeiro", "💰",
        `| Indicador | Valor |\n|-----------|-------|\n| Receitas | **R$ ${totalIncome.toFixed(2)}** |\n| Despesas | R$ ${totalExpenses.toFixed(2)} |\n| Saldo | R$ ${(totalIncome - totalExpenses).toFixed(2)} |\n| Pendente | ⚠️ R$ ${totalPending.toFixed(2)} (${pending.length} transações) |`
      );
      actions = [{ label: "Abrir Financeiro", route: "/financial", type: "navigate" }];
      newContext.lastModule = "financial";
    }

    else if (intent === "financial_overdue") {
      const { data: transactions } = await supabase.from("financial_transactions")
        .select("amount, status, date, description")
        .eq("nutritionist_id", user.id).eq("status", "pending");

      const overdue = (transactions || []).filter((t: any) => t.date && t.date < today);
      if (overdue.length === 0) {
        responseText = formatResponse("Nenhum Pagamento Vencido", "✅", "Todos os pagamentos estão em dia.");
      } else {
        responseText = formatResponse(`Pagamentos Vencidos (${overdue.length})`, "⚠️",
          overdue.map((t: any) => `- **${t.description || "Transação"}** — R$ ${t.amount?.toFixed(2)} (venceu em ${t.date})`).join("\n")
        );
      }
      actions = [{ label: "Abrir Financeiro", route: "/financial", type: "navigate" }];
    }

    else if (intent === "appointments_upcoming") {
      const { data: appointments } = await supabase.from("patient_appointments")
        .select("patient_id, appointment_date, appointment_time, appointment_type, status")
        .eq("nutritionist_id", user.id).gte("appointment_date", today)
        .order("appointment_date", { ascending: true }).limit(15);

      if (!appointments || appointments.length === 0) {
        responseText = formatResponse("Sem Consultas", "📅", "Nenhuma consulta futura registrada.");
      } else {
        const lines = appointments.map((a: any) => {
          const pat = (patients || []).find((p: any) => p.id === a.patient_id);
          return `| ${a.appointment_date} | ${a.appointment_time || "?"} | ${pat?.full_name || "?"} | ${a.appointment_type || "Consulta"} | ${a.status} |`;
        });
        responseText = formatResponse(`Próximas Consultas (${appointments.length})`, "📅",
          `| Data | Hora | Paciente | Tipo | Status |\n|------|------|----------|------|--------|\n${lines.join("\n")}`
        );
      }
      actions = [{ label: "Abrir Agenda", route: "/appointments", type: "navigate" }];
    }

    else if (intent === "decisions_pending") {
      const { data: decisions } = await supabase.from("clinical_decisions")
        .select("patient_id, title, urgency, decision_type, created_at")
        .eq("nutritionist_id", user.id).eq("status", "pending").limit(20);

      if (!decisions || decisions.length === 0) {
        responseText = formatResponse("Sem Decisões Pendentes", "✅", "Todas as decisões clínicas foram resolvidas.");
      } else {
        const lines = decisions.map((d: any) => {
          const pat = (patients || []).find((p: any) => p.id === d.patient_id);
          const emoji = d.urgency === "high" ? "🔴" : d.urgency === "medium" ? "🟠" : "🟡";
          return `${emoji} **${pat?.full_name || "?"}** — ${d.title} (${d.decision_type})`;
        });
        responseText = formatResponse(`Decisões Pendentes (${decisions.length})`, "🧠", lines.join("\n"));
      }
    }

    else if (intent === "plans_expiring") {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split("T")[0];

      const { data: plans } = await supabase.from("meal_plans")
        .select("patient_id, title, end_date, total_meta_calorias, plan_status")
        .eq("nutritionist_id", user.id).in("plan_status", ["active", "published"])
        .lte("end_date", nextWeekStr).gte("end_date", today);

      if (!plans || plans.length === 0) {
        responseText = formatResponse("Nenhum Plano Vencendo", "✅", "Nenhum plano expira nos próximos 7 dias.");
      } else {
        responseText = formatResponse(`Planos Expirando (${plans.length})`, "⏰",
          plans.map((p: any) => {
            const pat = (patients || []).find((x: any) => x.id === p.patient_id);
            return `- **${pat?.full_name || "?"}** — ${p.title} (${p.total_meta_calorias || "?"} kcal) → expira ${p.end_date}`;
          }).join("\n")
        );
      }
      actions = [{ label: "Ver Planos", route: "/meal-plans", type: "navigate" }];
    }

    else if (intent === "plans_draft") {
      const { data: plans } = await supabase.from("meal_plans")
        .select("patient_id, title, plan_status, created_at")
        .eq("nutritionist_id", user.id).eq("plan_status", "draft").limit(20);

      if (!plans || plans.length === 0) {
        responseText = formatResponse("Sem Rascunhos", "✅", "Nenhum plano em rascunho.");
      } else {
        responseText = formatResponse(`Planos em Rascunho (${plans.length})`, "📝",
          plans.map((p: any) => {
            const pat = (patients || []).find((x: any) => x.id === p.patient_id);
            return `- **${pat?.full_name || "?"}** — ${p.title} (criado ${p.created_at?.split("T")[0]})`;
          }).join("\n")
        );
      }
    }

    else if (intent === "alerts_active") {
      const { data: alerts } = await supabase.from("clinical_alerts")
        .select("patient_id, title, severity, alert_type, created_at")
        .eq("nutritionist_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(20);

      if (!alerts || alerts.length === 0) {
        responseText = formatResponse("Sem Alertas", "✅", "Nenhum alerta clínico ativo.");
      } else {
        responseText = formatResponse(`Alertas Ativos (${alerts.length})`, "🔔",
          alerts.map((a: any) => {
            const pat = (patients || []).find((p: any) => p.id === a.patient_id);
            const emoji = a.severity === "critical" ? "🔴" : a.severity === "high" ? "🟠" : "🟡";
            return `- ${emoji} **${pat?.full_name || "?"}** — ${a.title} (${a.alert_type})`;
          }).join("\n")
        );
      }
    }

    else if (intent === "protocols_overview") {
      const { data: protocols } = await supabase.from("nutrition_protocols")
        .select("id, name, status, protocol_type").eq("nutritionist_id", user.id).limit(30);

      const active = (protocols || []).filter((p: any) => p.status === "active");
      responseText = formatResponse("Protocolos", "📋",
        `| Total | Ativos |\n|-------|--------|\n| ${(protocols || []).length} | ${active.length} |\n\n` +
        (active.length > 0 ? active.map((p: any) => `- **${p.name}** (${p.protocol_type || "geral"})`).join("\n") : "Nenhum protocolo ativo.")
      );
      actions = [{ label: "Ver Protocolos", route: "/protocols", type: "navigate" }];
    }

    else if (intent === "automations_overview") {
      const { data: automations } = await supabase.from("automation_rules")
        .select("name, is_active, trigger_type").eq("nutritionist_id", user.id);

      const active = (automations || []).filter((a: any) => a.is_active);
      responseText = formatResponse("Automações", "⚡",
        `| Total | Ativas |\n|-------|--------|\n| ${(automations || []).length} | ${active.length} |\n\n` +
        (active.length > 0 ? active.map((a: any) => `- ✅ **${a.name}** (trigger: ${a.trigger_type})`).join("\n") : "Nenhuma automação ativa.")
      );
      actions = [{ label: "Ver Automações", route: "/automation", type: "navigate" }];
    }

    else {
      responseText = formatResponse("Comando Não Reconhecido", "❓",
        `Não entendi **"${command}"**.\n\nTente:\n- *"Resumo da carteira"*\n- *"Quem precisa de atenção?"*\n- *"Resumo financeiro"*\n- *"Sobre [nome]"*\n- *"Abra [tela]"*\n\nDigite **"ajuda"** para todos os comandos.`
      );
    }

    return new Response(JSON.stringify({
      response: responseText,
      actions,
      level,
      intent,
      sessionContext: newContext,
      dataSource: "deterministic",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ifj-command-center error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
