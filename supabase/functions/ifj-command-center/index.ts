import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { command, conversationHistory, isAdmin } = await req.json();

    // Get professional profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    // ========== FULL SYSTEM DATA ACCESS ==========

    // 1. Patients
    const { data: patients } = await supabase
      .from("patients")
      .select("id, full_name, email, phone, status, journey_status, goal, current_weight, target_weight, created_at")
      .eq("nutritionist_id", user.id)
      .limit(200);

    // 2. Clinical alerts
    const { data: alerts } = await supabase
      .from("clinical_alerts")
      .select("id, title, severity, patient_id, alert_type, is_active, created_at")
      .eq("nutritionist_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(30);

    // 3. Daily snapshots (today)
    const today = new Date().toISOString().split("T")[0];
    const { data: snapshots } = await supabase
      .from("clinical_daily_snapshots")
      .select("patient_id, adherence_score, dropout_risk_score, risk_level, weight_trend, snapshot_date")
      .in("patient_id", (patients || []).map((p: any) => p.id))
      .eq("snapshot_date", today)
      .limit(200);

    // 4. Pending decisions
    const { data: decisions } = await supabase
      .from("clinical_decisions")
      .select("patient_id, title, urgency, status, decision_type, created_at")
      .eq("nutritionist_id", user.id)
      .eq("status", "pending")
      .limit(20);

    // 5. Nutrition plans
    const { data: plans } = await supabase
      .from("nutrition_plans")
      .select("id, patient_id, plan_name, status, start_date, end_date, total_calories, created_at")
      .eq("nutritionist_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    // 6. Appointments
    const { data: appointments } = await supabase
      .from("patient_appointments")
      .select("id, patient_id, appointment_date, appointment_time, status, appointment_type")
      .eq("nutritionist_id", user.id)
      .gte("appointment_date", today)
      .order("appointment_date", { ascending: true })
      .limit(30);

    // 7. Payments
    const { data: payments } = await supabase
      .from("patient_payments")
      .select("id, patient_id, amount, status, payment_date, due_date")
      .eq("nutritionist_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    // 8. Protocols
    const { data: protocols } = await supabase
      .from("nutrition_protocols")
      .select("id, name, status, protocol_type, created_at")
      .eq("nutritionist_id", user.id)
      .limit(30);

    // 9. Automation rules
    const { data: automations } = await supabase
      .from("automation_rules")
      .select("id, name, is_active, trigger_type")
      .eq("nutritionist_id", user.id)
      .limit(20);

    // Build patient summaries with all data
    const patientDetails = (patients || []).map((p: any) => {
      const snap = (snapshots || []).find((s: any) => s.patient_id === p.id);
      const patientAlerts = (alerts || []).filter((a: any) => a.patient_id === p.id);
      const patientPlans = (plans || []).filter((pl: any) => pl.patient_id === p.id);
      const patientAppts = (appointments || []).filter((a: any) => a.patient_id === a.id);
      const patientPayments = (payments || []).filter((pay: any) => pay.patient_id === p.id);
      const activePlan = patientPlans.find((pl: any) => pl.status === "active" || pl.status === "published");
      const pendingPayments = patientPayments.filter((pay: any) => pay.status === "pending");

      return {
        id: p.id,
        name: p.full_name,
        email: p.email,
        phone: p.phone,
        status: p.status,
        journeyStatus: p.journey_status,
        goal: p.goal,
        currentWeight: p.current_weight,
        targetWeight: p.target_weight,
        adherence: snap?.adherence_score,
        dropoutRisk: snap?.dropout_risk_score,
        riskLevel: snap?.risk_level,
        weightTrend: snap?.weight_trend,
        alertCount: patientAlerts.length,
        alertTypes: patientAlerts.map((a: any) => `${a.severity}: ${a.title}`),
        activePlan: activePlan ? { name: activePlan.plan_name, endDate: activePlan.end_date, calories: activePlan.total_calories } : null,
        hasDraftPlan: patientPlans.some((pl: any) => pl.status === "draft"),
        pendingPayments: pendingPayments.length,
        totalOwed: pendingPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
      };
    });

    // Financial summary
    const totalRevenue = (payments || []).filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + (p.amount || 0), 0);
    const totalPending = (payments || []).filter((p: any) => p.status === "pending").reduce((s: number, p: any) => s + (p.amount || 0), 0);
    const overduePayments = (payments || []).filter((p: any) => p.status === "pending" && p.due_date && p.due_date < today);

    const systemPrompt = `Você é a IFJ (Inteligência FitJourney), o copiloto inteligente do sistema FitJourney.
Você tem ACESSO TOTAL ao sistema e pode fazer QUALQUER COISA que o profissional pedir.

PROFISSIONAL LOGADO: ${profile?.full_name || "Profissional"}
NÍVEL DE ACESSO: ${isAdmin ? "ADMINISTRADOR — Acesso total irrestrito ao sistema inteiro" : "PROFISSIONAL — Acesso à sua carteira e ferramentas"}

============ MAPA COMPLETO DO SISTEMA ============

ROTAS DO SISTEMA (use para gerar botões de ação):
- /dashboard → Dashboard principal
- /patients → Lista de pacientes
- /patients/[ID] → Detalhes de um paciente específico
- /control-tower → Torre de Controle Clínico
- /financial → Painel Financeiro
- /meal-plans → Planos Alimentares
- /protocols → Protocolos Clínicos
- /appointments → Agenda / Consultas
- /recipes → Receitas
- /settings → Configurações
- /intelligence → Painel da IFJ (Inteligência)
- /automations → Automações
- /analytics → Analytics e Relatórios
- /personal-dashboard → Painel do Personal Trainer
- /system-diagnostics → Diagnóstico do Sistema (só admin)

============ DADOS DA CARTEIRA EM TEMPO REAL ============

RESUMO GERAL:
- Total pacientes: ${(patients || []).length}
- Alertas ativos: ${(alerts || []).length}
- Decisões pendentes: ${(decisions || []).length}
- Protocolos: ${(protocols || []).length}
- Automações ativas: ${(automations || []).filter((a: any) => a.is_active).length}
- Consultas agendadas: ${(appointments || []).length}

FINANCEIRO:
- Receita total (pagos): R$ ${totalRevenue.toFixed(2)}
- Valores pendentes: R$ ${totalPending.toFixed(2)}
- Pagamentos vencidos: ${overduePayments.length}

PACIENTES DETALHADOS:
${JSON.stringify(patientDetails, null, 2)}

DECISÕES PENDENTES:
${JSON.stringify((decisions || []).map((d: any) => ({
  patient: patientDetails.find((p: any) => p.id === d.patient_id)?.name,
  title: d.title,
  urgency: d.urgency,
  type: d.decision_type,
})), null, 2)}

PRÓXIMAS CONSULTAS:
${JSON.stringify((appointments || []).slice(0, 10).map((a: any) => ({
  patient: patientDetails.find((p: any) => p.id === a.patient_id)?.name,
  date: a.appointment_date,
  time: a.appointment_time,
  type: a.appointment_type,
  status: a.status,
})), null, 2)}

============ REGRAS DE COMPORTAMENTO ============

1. Responda SEMPRE em português brasileiro
2. Use dados REAIS — nunca invente
3. Seja PROATIVO: analise e sugira antes de perguntarem
4. Quando o profissional pedir para ir a algum lugar, GERE UM BOTÃO usando a tag especial:
   [ACTION:Texto do Botão|/rota-do-sistema]
   Exemplos:
   [ACTION:Abrir Financeiro|/financial]
   [ACTION:Ver Paciente Maria|/patients/UUID_DA_MARIA]
   [ACTION:Torre de Controle|/control-tower]
5. Para pedidos sobre pacientes específicos, BUSQUE nos dados e use o ID real
6. Se pedirem "ajustar plano" → analise o status do plano e oriente + botão
7. Se pedirem "cobrar paciente" → identifique pendências e sugira ação
8. Se detectar problemas (plano não publicado, falta validação) → EXPLIQUE o que fazer passo a passo
9. Para problemas técnicos → investigue nos dados e diagnostique
10. Seja conciso mas completo. Use markdown para formatar.
11. Sempre identifique pacientes pelo NOME COMPLETO
12. Quando sugerir ações, SEMPRE inclua botões clicáveis
13. Se não encontrar dados sobre algo, diga claramente
14. Para lembranças/notificações → confirme e simule a ação
15. Aja como um assistente executivo inteligente — antecipe necessidades`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
      { role: "user", content: command },
    ];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ifj-command-center error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
