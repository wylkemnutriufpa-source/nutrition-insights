import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── INTENT DETECTION (deterministic keyword matching) ──
type Intent =
  | "patients_overview" | "patients_at_risk" | "patients_attention"
  | "patient_detail" | "financial_overview" | "financial_overdue"
  | "appointments_upcoming" | "decisions_pending"
  | "plans_expiring" | "plans_draft" | "alerts_active"
  | "protocols_overview" | "automations_overview"
  | "navigate" | "help" | "greeting" | "unknown";

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function detectIntent(command: string): { intent: Intent; patientName?: string; route?: string } {
  const n = normalize(command);

  // Greetings
  if (/^(oi|ola|hey|bom dia|boa tarde|boa noite|e ai|eai)/.test(n)) return { intent: "greeting" };

  // Help
  if (/^(ajuda|help|o que voce|oq vc|como funciona|comandos)/.test(n)) return { intent: "help" };

  // Navigation
  const navMap: Record<string, string> = {
    "financeiro": "/financial", "dashboard": "/", "pacientes": "/patients",
    "planos": "/meal-plans", "plano alimentar": "/meal-plans", "protocolo": "/protocols",
    "agenda": "/appointments", "consulta": "/appointments", "chat": "/chat",
    "receita": "/recipes", "automacao": "/automation", "automatizacao": "/automation",
    "relatorio": "/reports", "ranking": "/ranking", "configurac": "/settings",
    "inteligencia": "/intelligence", "control tower": "/control-tower",
    "diagnostico": "/system-diagnostics", "check-in": "/checkin-panel",
    "branding": "/branding",
  };
  for (const [key, route] of Object.entries(navMap)) {
    if (n.includes(key) && (n.includes("abr") || n.includes("ir para") || n.includes("naveg") || n.includes("mostr") || n.includes("acess"))) {
      return { intent: "navigate", route };
    }
  }

  // Patient detail (search by name)
  const nameMatch = n.match(/(?:paciente|sobre|dados d[aeo]|status d[aeo]|como esta|como vai|informac[oa]o d[aeo])\s+(.+)/);
  if (nameMatch) return { intent: "patient_detail", patientName: nameMatch[1].trim() };

  // Specific intents
  if (n.includes("risco") || n.includes("abandono") || n.includes("dropout")) return { intent: "patients_at_risk" };
  if (n.includes("atencao") || n.includes("urgente") || n.includes("prioridade") || n.includes("critico")) return { intent: "patients_attention" };
  if (n.includes("financeiro") || n.includes("faturamento") || n.includes("receita") || n.includes("dinheiro") || n.includes("ganhei")) return { intent: "financial_overview" };
  if (n.includes("vencid") || n.includes("atrasad") || n.includes("inadimplent")) return { intent: "financial_overdue" };
  if (n.includes("consulta") || n.includes("agenda") || n.includes("agendamento") || n.includes("proximo")) return { intent: "appointments_upcoming" };
  if (n.includes("decisao") || n.includes("decisoes") || n.includes("pendente") && n.includes("clinic")) return { intent: "decisions_pending" };
  if (n.includes("vence") || n.includes("expira") || n.includes("plano") && n.includes("semana")) return { intent: "plans_expiring" };
  if (n.includes("rascunho") || n.includes("draft")) return { intent: "plans_draft" };
  if (n.includes("alerta")) return { intent: "alerts_active" };
  if (n.includes("protocolo")) return { intent: "protocols_overview" };
  if (n.includes("automac")) return { intent: "automations_overview" };
  if (n.includes("carteira") || n.includes("resum") || n.includes("panorama") || n.includes("overview") || n.includes("visao geral")) return { intent: "patients_overview" };
  if (n.includes("paciente")) return { intent: "patients_overview" };

  return { intent: "unknown" };
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

    const { command } = await req.json();

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
    const { intent, patientName, route } = detectIntent(command);

    // ── FETCH DATA BASED ON INTENT ──
    let responseText = "";
    let actions: any[] = [];
    let level = "consult";

    // Base patient data (always needed)
    const { data: patients } = await supabase
      .from("patients")
      .select("id, full_name, email, phone, status, journey_status, goal, current_weight, target_weight, created_at")
      .eq("nutritionist_id", user.id).limit(200);

    const patientIds = (patients || []).map((p: any) => p.id);
    const safeIds = patientIds.length ? patientIds : ["00000000-0000-0000-0000-000000000000"];

    if (intent === "greeting") {
      const hour = new Date().getHours();
      const period = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
      const active = (patients || []).filter((p: any) => p.status === "active").length;
      responseText = `${period}, ${userName}! 👋\n\nVocê tem **${active} pacientes ativos**. Me pergunte qualquer coisa sobre sua carteira — uso apenas dados reais do sistema.\n\n💡 Experimente: *"Quem precisa de atenção?"* ou *"Como está meu financeiro?"*`;
      level = "consult";
    }

    else if (intent === "help") {
      responseText = `## 🧠 Comandos disponíveis\n\nEu sou 100% determinística — consulto apenas **dados reais** do sistema.\n\n| Comando | O que faz |\n|---------|----------|\n| "Resuma minha carteira" | Panorama geral dos pacientes |\n| "Quem precisa de atenção?" | Pacientes em risco ou com alertas |\n| "Como está meu financeiro?" | Receita, pendentes e vencidos |\n| "Próximas consultas" | Agenda da semana |\n| "Decisões pendentes" | Decisões clínicas aguardando |\n| "Planos que vencem" | Planos expirando em 7 dias |\n| "Alertas ativos" | Alertas clínicos ativos |\n| "Sobre [nome]" | Dados completos de um paciente |\n| "Abra [tela]" | Navegar para qualquer tela |\n\n> Todos os dados são consultados em tempo real no banco de dados.`;
      level = "consult";
    }

    else if (intent === "navigate" && route) {
      responseText = `Abrindo a tela solicitada...`;
      actions = [{ label: "Ir para a tela", route, type: "navigate" }];
      level = "prepare";
    }

    else if (intent === "patients_overview") {
      const active = (patients || []).filter((p: any) => p.status === "active");
      const inactive = (patients || []).filter((p: any) => p.status !== "active");

      const { data: snapshots } = await supabase
        .from("clinical_daily_snapshots")
        .select("patient_id, adherence_score, dropout_risk_score, risk_level")
        .in("patient_id", safeIds).eq("snapshot_date", today);

      const atRisk = (snapshots || []).filter((s: any) => s.risk_level === "high" || s.risk_level === "critical");
      const avgAdherence = (snapshots || []).length > 0
        ? Math.round((snapshots || []).reduce((s: number, x: any) => s + (x.adherence_score || 0), 0) / snapshots!.length)
        : 0;

      responseText = `## 📊 Panorama da Carteira\n\n| Indicador | Valor |\n|-----------|-------|\n| Pacientes ativos | **${active.length}** |\n| Pacientes inativos | ${inactive.length} |\n| Em risco (alto/crítico) | ⚠️ **${atRisk.length}** |\n| Adesão média hoje | ${avgAdherence}% |\n\n### Distribuição por objetivo:\n${Object.entries(active.reduce((acc: any, p: any) => { acc[p.goal || "Não definido"] = (acc[p.goal || "Não definido"] || 0) + 1; return acc; }, {})).map(([goal, count]) => `- **${goal}**: ${count}`).join("\n") || "- Sem dados"}`;
      actions = [{ label: "Ver todos os pacientes", route: "/patients", type: "navigate" }];
      level = "consult";
    }

    else if (intent === "patients_at_risk") {
      const { data: snapshots } = await supabase
        .from("clinical_daily_snapshots")
        .select("patient_id, adherence_score, dropout_risk_score, risk_level, weight_trend")
        .in("patient_id", safeIds).eq("snapshot_date", today);

      const atRisk = (snapshots || []).filter((s: any) => s.risk_level === "high" || s.risk_level === "critical" || (s.dropout_risk_score && s.dropout_risk_score >= 60));

      if (atRisk.length === 0) {
        responseText = `## ✅ Nenhum paciente em risco\n\nTodos os seus pacientes estão com indicadores dentro do normal hoje. Continue monitorando!`;
      } else {
        const lines = atRisk.map((s: any) => {
          const p = (patients || []).find((x: any) => x.id === s.patient_id);
          return `| ${p?.full_name || "?"} | ${s.risk_level || "?"} | ${s.dropout_risk_score || 0}% | ${s.adherence_score || 0}% | ${s.weight_trend || "?"} |`;
        });
        responseText = `## ⚠️ Pacientes em Risco (${atRisk.length})\n\n| Paciente | Risco | Dropout | Adesão | Peso |\n|----------|-------|---------|--------|------|\n${lines.join("\n")}`;
      }
      actions = [{ label: "Control Tower", route: "/control-tower", type: "navigate" }];
      level = "consult";
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
        responseText = `## ✅ Tudo tranquilo!\n\nNenhum paciente precisa de atenção urgente agora. Sua carteira está estável.`;
      } else {
        responseText = `## 🚨 Pacientes que precisam de atenção (${priority.length})\n\n` +
          priority.slice(0, 10).map((p: any, i: number) => {
            const emoji = p.risk_level === "critical" ? "🔴" : p.risk_level === "high" ? "🟠" : "🟡";
            return `${i + 1}. ${emoji} **${p.name}** — Risco: ${p.risk_level || "?"} | Adesão: ${p.adherence_score || 0}% | Alertas: ${p.alertCount}`;
          }).join("\n");
      }
      actions = [{ label: "Control Tower", route: "/control-tower", type: "navigate" }];
      level = "consult";
    }

    else if (intent === "patient_detail" && patientName) {
      const normalized = normalize(patientName);
      const found = (patients || []).find((p: any) => normalize(p.full_name).includes(normalized));

      if (!found) {
        responseText = `## ❌ Paciente não encontrado\n\nNão encontrei nenhum paciente com o nome **"${patientName}"** na sua carteira.\n\nVocê tem ${(patients || []).length} pacientes. Verifique o nome e tente novamente.`;
      } else {
        const { data: snap } = await supabase.from("clinical_daily_snapshots")
          .select("*").eq("patient_id", found.id).eq("snapshot_date", today).maybeSingle();
        const { data: alerts } = await supabase.from("clinical_alerts")
          .select("title, severity, alert_type").eq("patient_id", found.id).eq("is_active", true);
        const { data: plans } = await supabase.from("nutrition_plans")
          .select("plan_name, status, end_date, total_calories").eq("patient_id", found.id).order("created_at", { ascending: false }).limit(3);
        const { data: appointments } = await supabase.from("patient_appointments")
          .select("appointment_date, appointment_time, status").eq("patient_id", found.id).gte("appointment_date", today).limit(3);
        const { data: checkins } = await supabase.from("patient_checkins")
          .select("weight, mood, created_at").eq("patient_id", found.id).order("created_at", { ascending: false }).limit(5);
        const { data: anamnesis } = await supabase.from("patient_anamnesis")
          .select("health_conditions, allergies, food_preferences, activity_level, sleep_hours, medications, dietary_restrictions")
          .eq("user_id", found.id).order("created_at", { ascending: false }).limit(1);

        const anamData = (anamnesis as any)?.[0];
        const activePlan = (plans || []).find((p: any) => p.status === "active" || p.status === "published");

        responseText = `## 👤 ${found.full_name}\n\n### Dados Gerais\n| Campo | Valor |\n|-------|-------|\n| Status | ${found.status} |\n| Jornada | ${found.journey_status || "N/A"} |\n| Objetivo | ${found.goal || "Não definido"} |\n| Peso atual | ${found.current_weight || "?"} kg |\n| Peso meta | ${found.target_weight || "?"} kg |\n| Email | ${found.email || "?"} |\n| Telefone | ${found.phone || "?"} |`;

        if (snap) {
          responseText += `\n\n### Snapshot de Hoje\n| Indicador | Valor |\n|-----------|-------|\n| Adesão | ${snap.adherence_score || 0}% |\n| Risco dropout | ${snap.dropout_risk_score || 0}% |\n| Nível de risco | ${snap.risk_level || "?"} |\n| Tendência peso | ${snap.weight_trend || "?"} |`;
        }

        if (anamData) {
          responseText += `\n\n### Anamnese\n| Campo | Valor |\n|-------|-------|\n| Condições | ${JSON.stringify(anamData.health_conditions || []).replace(/[\[\]"]/g, "") || "Nenhuma"} |\n| Alergias | ${JSON.stringify(anamData.allergies || []).replace(/[\[\]"]/g, "") || "Nenhuma"} |\n| Restrições | ${JSON.stringify(anamData.dietary_restrictions || []).replace(/[\[\]"]/g, "") || "Nenhuma"} |\n| Preferências | ${JSON.stringify(anamData.food_preferences || []).replace(/[\[\]"]/g, "") || "N/A"} |\n| Atividade | ${anamData.activity_level || "?"} |\n| Sono | ${anamData.sleep_hours || "?"} h |\n| Medicamentos | ${JSON.stringify(anamData.medications || []).replace(/[\[\]"]/g, "") || "Nenhum"} |`;
        }

        if (activePlan) {
          responseText += `\n\n### Plano Ativo\n- **${activePlan.plan_name}** (${activePlan.total_calories || "?"} kcal) — expira ${activePlan.end_date || "indefinido"}`;
        }

        if ((alerts || []).length > 0) {
          responseText += `\n\n### ⚠️ Alertas Ativos (${alerts!.length})\n` +
            alerts!.map((a: any) => `- **[${a.severity}]** ${a.title}`).join("\n");
        }

        if ((checkins || []).length > 0) {
          responseText += `\n\n### Últimos Check-ins\n` +
            (checkins || []).map((c: any) => `- ${c.created_at?.split("T")[0]} — ${c.weight || "?"}kg, humor: ${c.mood || "?"}`).join("\n");
        }

        actions = [{ label: `Abrir perfil de ${found.full_name.split(" ")[0]}`, route: `/patients/${found.id}`, type: "navigate" }];
      }
      level = "consult";
    }

    else if (intent === "financial_overview") {
      const { data: payments } = await supabase.from("patient_payments")
        .select("amount, status, payment_date, due_date, patient_id")
        .eq("nutritionist_id", user.id).order("created_at", { ascending: false }).limit(100);

      const paid = (payments || []).filter((p: any) => p.status === "paid");
      const pending = (payments || []).filter((p: any) => p.status === "pending");
      const overdue = pending.filter((p: any) => p.due_date && p.due_date < today);
      const totalPaid = paid.reduce((s: number, p: any) => s + (p.amount || 0), 0);
      const totalPending = pending.reduce((s: number, p: any) => s + (p.amount || 0), 0);
      const totalOverdue = overdue.reduce((s: number, p: any) => s + (p.amount || 0), 0);

      responseText = `## 💰 Resumo Financeiro\n\n| Indicador | Valor |\n|-----------|-------|\n| Total recebido | **R$ ${totalPaid.toFixed(2)}** |\n| Pendente | R$ ${totalPending.toFixed(2)} |\n| Vencido | ⚠️ R$ ${totalOverdue.toFixed(2)} (${overdue.length} pagamentos) |`;

      if (overdue.length > 0) {
        responseText += `\n\n### Pagamentos vencidos:\n` + overdue.slice(0, 5).map((p: any) => {
          const pat = (patients || []).find((x: any) => x.id === p.patient_id);
          return `- **${pat?.full_name || "?"}** — R$ ${p.amount?.toFixed(2)} (venceu ${p.due_date})`;
        }).join("\n");
      }
      actions = [{ label: "Abrir Financeiro", route: "/financial", type: "navigate" }];
      level = "consult";
    }

    else if (intent === "financial_overdue") {
      const { data: payments } = await supabase.from("patient_payments")
        .select("amount, status, due_date, patient_id")
        .eq("nutritionist_id", user.id).eq("status", "pending");

      const overdue = (payments || []).filter((p: any) => p.due_date && p.due_date < today);
      if (overdue.length === 0) {
        responseText = `## ✅ Nenhum pagamento vencido!\n\nTodos os pagamentos estão em dia.`;
      } else {
        responseText = `## ⚠️ Pagamentos Vencidos (${overdue.length})\n\n` + overdue.map((p: any) => {
          const pat = (patients || []).find((x: any) => x.id === p.patient_id);
          return `- **${pat?.full_name || "?"}** — R$ ${p.amount?.toFixed(2)} (venceu em ${p.due_date})`;
        }).join("\n");
      }
      actions = [{ label: "Abrir Financeiro", route: "/financial", type: "navigate" }];
      level = "consult";
    }

    else if (intent === "appointments_upcoming") {
      const { data: appointments } = await supabase.from("patient_appointments")
        .select("patient_id, appointment_date, appointment_time, appointment_type, status")
        .eq("nutritionist_id", user.id).gte("appointment_date", today)
        .order("appointment_date", { ascending: true }).limit(15);

      if (!appointments || appointments.length === 0) {
        responseText = `## 📅 Nenhuma consulta agendada\n\nVocê não tem consultas futuras registradas no sistema.`;
      } else {
        const lines = appointments.map((a: any) => {
          const pat = (patients || []).find((p: any) => p.id === a.patient_id);
          return `| ${a.appointment_date} | ${a.appointment_time || "?"} | ${pat?.full_name || "?"} | ${a.appointment_type || "Consulta"} | ${a.status} |`;
        });
        responseText = `## 📅 Próximas Consultas (${appointments.length})\n\n| Data | Hora | Paciente | Tipo | Status |\n|------|------|----------|------|--------|\n${lines.join("\n")}`;
      }
      actions = [{ label: "Abrir Agenda", route: "/appointments", type: "navigate" }];
      level = "consult";
    }

    else if (intent === "decisions_pending") {
      const { data: decisions } = await supabase.from("clinical_decisions")
        .select("patient_id, title, urgency, decision_type, created_at")
        .eq("nutritionist_id", user.id).eq("status", "pending").limit(20);

      if (!decisions || decisions.length === 0) {
        responseText = `## ✅ Sem decisões pendentes\n\nTodas as decisões clínicas foram resolvidas.`;
      } else {
        const lines = decisions.map((d: any) => {
          const pat = (patients || []).find((p: any) => p.id === d.patient_id);
          const emoji = d.urgency === "high" ? "🔴" : d.urgency === "medium" ? "🟠" : "🟡";
          return `${emoji} **${pat?.full_name || "?"}** — ${d.title} (${d.decision_type})`;
        });
        responseText = `## 🧠 Decisões Pendentes (${decisions.length})\n\n${lines.join("\n")}`;
      }
      level = "consult";
    }

    else if (intent === "plans_expiring") {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split("T")[0];

      const { data: plans } = await supabase.from("nutrition_plans")
        .select("patient_id, plan_name, end_date, total_calories, status")
        .eq("nutritionist_id", user.id).in("status", ["active", "published"])
        .lte("end_date", nextWeekStr).gte("end_date", today);

      if (!plans || plans.length === 0) {
        responseText = `## ✅ Nenhum plano vence nos próximos 7 dias`;
      } else {
        responseText = `## ⏰ Planos que vencem em 7 dias (${plans.length})\n\n` + plans.map((p: any) => {
          const pat = (patients || []).find((x: any) => x.id === p.patient_id);
          return `- **${pat?.full_name || "?"}** — ${p.plan_name} (${p.total_calories || "?"} kcal) → expira ${p.end_date}`;
        }).join("\n");
      }
      actions = [{ label: "Ver Planos", route: "/meal-plans", type: "navigate" }];
      level = "consult";
    }

    else if (intent === "alerts_active") {
      const { data: alerts } = await supabase.from("clinical_alerts")
        .select("patient_id, title, severity, alert_type, created_at")
        .eq("nutritionist_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(20);

      if (!alerts || alerts.length === 0) {
        responseText = `## ✅ Nenhum alerta ativo\n\nSua carteira está sem alertas clínicos.`;
      } else {
        responseText = `## 🔔 Alertas Ativos (${alerts.length})\n\n` + alerts.map((a: any) => {
          const pat = (patients || []).find((p: any) => p.id === a.patient_id);
          const emoji = a.severity === "critical" ? "🔴" : a.severity === "high" ? "🟠" : "🟡";
          return `- ${emoji} **${pat?.full_name || "?"}** — ${a.title} (${a.alert_type})`;
        }).join("\n");
      }
      level = "consult";
    }

    else if (intent === "protocols_overview") {
      const { data: protocols } = await supabase.from("nutrition_protocols")
        .select("id, name, status, protocol_type, created_at")
        .eq("nutritionist_id", user.id).limit(30);

      const active = (protocols || []).filter((p: any) => p.status === "active");
      responseText = `## 📋 Protocolos\n\n| Indicador | Valor |\n|-----------|-------|\n| Total | ${(protocols || []).length} |\n| Ativos | ${active.length} |\n\n` +
        (active.length > 0 ? active.map((p: any) => `- **${p.name}** (${p.protocol_type || "geral"})`).join("\n") : "Nenhum protocolo ativo.");
      actions = [{ label: "Ver Protocolos", route: "/protocols", type: "navigate" }];
      level = "consult";
    }

    else if (intent === "automations_overview") {
      const { data: automations } = await supabase.from("automation_rules")
        .select("name, is_active, trigger_type").eq("nutritionist_id", user.id);

      const active = (automations || []).filter((a: any) => a.is_active);
      responseText = `## ⚡ Automações\n\n| Total | Ativas |\n|-------|--------|\n| ${(automations || []).length} | ${active.length} |\n\n` +
        (active.length > 0 ? active.map((a: any) => `- ✅ **${a.name}** (trigger: ${a.trigger_type})`).join("\n") : "Nenhuma automação ativa.");
      actions = [{ label: "Ver Automações", route: "/automation", type: "navigate" }];
      level = "consult";
    }

    else {
      // Unknown intent
      responseText = `Não entendi o comando **"${command}"**.\n\nTente algo como:\n- *"Resuma minha carteira"*\n- *"Quem precisa de atenção?"*\n- *"Como está meu financeiro?"*\n- *"Sobre [nome do paciente]"*\n- *"Abra [tela]"*\n\nDigite **"ajuda"** para ver todos os comandos disponíveis.`;
      level = "consult";
    }

    return new Response(JSON.stringify({
      response: responseText,
      actions,
      level,
      intent,
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
