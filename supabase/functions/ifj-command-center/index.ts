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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { command, conversationHistory, isAdmin } = await req.json();

    // ── AUDIT: Log every command ──
    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id,
      action: "ifj_command_center_query",
      resource_type: "ifj_command_center",
      resource_id: isAdmin ? "admin" : "nutritionist",
      metadata: { command: command?.substring(0, 300), role: isAdmin ? "admin" : "nutritionist" },
    });

    // ── RUNTIME PERMISSION VALIDATION ──
    // Verify actual role from database, never trust client isAdmin
    const { data: userRoles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id);
    const actualRoles = (userRoles || []).map((r: any) => r.role);
    const verifiedAdmin = actualRoles.includes("admin");
    const verifiedNutritionist = actualRoles.includes("nutritionist") || verifiedAdmin;

    if (!verifiedNutritionist) {
      return new Response(JSON.stringify({ error: "Permissão negada. Apenas nutricionistas e admins." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();

    // ── DATA ACCESS (RLS-scoped) ──
    const { data: patients } = await supabase
      .from("patients")
      .select("id, full_name, email, phone, status, journey_status, goal, current_weight, target_weight, created_at")
      .eq("nutritionist_id", user.id).limit(200);

    const { data: alerts } = await supabase
      .from("clinical_alerts")
      .select("id, title, severity, patient_id, alert_type, is_active, created_at")
      .eq("nutritionist_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(30);

    const today = new Date().toISOString().split("T")[0];
    const { data: snapshots } = await supabase
      .from("clinical_daily_snapshots")
      .select("patient_id, adherence_score, dropout_risk_score, risk_level, weight_trend, snapshot_date")
      .in("patient_id", (patients || []).map((p: any) => p.id))
      .eq("snapshot_date", today).limit(200);

    const { data: decisions } = await supabase
      .from("clinical_decisions")
      .select("patient_id, title, urgency, status, decision_type, created_at")
      .eq("nutritionist_id", user.id).eq("status", "pending").limit(20);

    const { data: plans } = await supabase
      .from("nutrition_plans")
      .select("id, patient_id, plan_name, status, start_date, end_date, total_calories, created_at")
      .eq("nutritionist_id", user.id).order("created_at", { ascending: false }).limit(100);

    const { data: appointments } = await supabase
      .from("patient_appointments")
      .select("id, patient_id, appointment_date, appointment_time, status, appointment_type")
      .eq("nutritionist_id", user.id).gte("appointment_date", today).order("appointment_date", { ascending: true }).limit(30);

    const { data: payments } = await supabase
      .from("patient_payments")
      .select("id, patient_id, amount, status, payment_date, due_date")
      .eq("nutritionist_id", user.id).order("created_at", { ascending: false }).limit(50);

    const { data: protocols } = await supabase
      .from("nutrition_protocols")
      .select("id, name, status, protocol_type, created_at")
      .eq("nutritionist_id", user.id).limit(30);

    const { data: automations } = await supabase
      .from("automation_rules")
      .select("id, name, is_active, trigger_type")
      .eq("nutritionist_id", user.id).limit(20);

    const patientDetails = (patients || []).map((p: any) => {
      const snap = (snapshots || []).find((s: any) => s.patient_id === p.id);
      const patientAlerts = (alerts || []).filter((a: any) => a.patient_id === p.id);
      const patientPlans = (plans || []).filter((pl: any) => pl.patient_id === p.id);
      const patientPayments = (payments || []).filter((pay: any) => pay.patient_id === p.id);
      const activePlan = patientPlans.find((pl: any) => pl.status === "active" || pl.status === "published");
      const pendingPayments = patientPayments.filter((pay: any) => pay.status === "pending");
      return {
        id: p.id, name: p.full_name, email: p.email, phone: p.phone,
        status: p.status, journeyStatus: p.journey_status, goal: p.goal,
        currentWeight: p.current_weight, targetWeight: p.target_weight,
        adherence: snap?.adherence_score, dropoutRisk: snap?.dropout_risk_score,
        riskLevel: snap?.risk_level, weightTrend: snap?.weight_trend,
        alertCount: patientAlerts.length,
        activePlan: activePlan ? { name: activePlan.plan_name, endDate: activePlan.end_date } : null,
        hasDraftPlan: patientPlans.some((pl: any) => pl.status === "draft"),
        pendingPayments: pendingPayments.length,
        totalOwed: pendingPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
      };
    });

    const totalRevenue = (payments || []).filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + (p.amount || 0), 0);
    const totalPending = (payments || []).filter((p: any) => p.status === "pending").reduce((s: number, p: any) => s + (p.amount || 0), 0);
    const overduePayments = (payments || []).filter((p: any) => p.status === "pending" && p.due_date && p.due_date < today);

    const systemPrompt = `Você é a IFJ (Inteligência FitJourney), copiloto inteligente do sistema FitJourney.

PROFISSIONAL: ${profile?.full_name || "Profissional"}
NÍVEL: ${verifiedAdmin ? "ADMINISTRADOR — Acesso total, mas ações críticas requerem confirmação" : "NUTRICIONISTA — Acesso à sua carteira"}

============ SISTEMA DE CLASSIFICAÇÃO DE AÇÕES ============
Toda resposta DEVE incluir uma tag de nível de ação:
[LEVEL:consult] → Apenas consulta/leitura de dados
[LEVEL:suggest] → Sugestão de ação, sem execução
[LEVEL:prepare] → Preparação de operação (abrir tela, revisar)
[LEVEL:execute] → Execução de ação (requer confirmação)

============ REGRAS DE SEGURANÇA ============
1. NUNCA acesse dados de outros profissionais — dados são isolados por RLS
2. Para ações destrutivas/sensíveis (excluir, arquivar, alterar status), use [CONFIRM:Texto|/rota|Mensagem de confirmação]
3. Para navegação simples, use [ACTION:Texto|/rota]
4. Admin pode consultar tudo, mas NUNCA execute ações sem confirmação
5. Profissional comum só vê sua própria carteira — isso já é garantido pelos dados

============ ROTAS DISPONÍVEIS ============
/dashboard, /patients, /patients/[ID], /control-tower, /financial,
/meal-plans, /protocols, /appointments, /recipes, /settings,
/intelligence, /automations, /analytics, /system-diagnostics (admin only)

============ DADOS EM TEMPO REAL ============
Pacientes: ${(patients || []).length} | Alertas: ${(alerts || []).length} | Decisões: ${(decisions || []).length}
Protocolos: ${(protocols || []).length} | Automações ativas: ${(automations || []).filter((a: any) => a.is_active).length}
Consultas agendadas: ${(appointments || []).length}
Receita (pagos): R$ ${totalRevenue.toFixed(2)} | Pendente: R$ ${totalPending.toFixed(2)} | Vencidos: ${overduePayments.length}

PACIENTES: ${JSON.stringify(patientDetails, null, 2)}

DECISÕES PENDENTES: ${JSON.stringify((decisions || []).map((d: any) => ({
  patient: patientDetails.find((p: any) => p.id === d.patient_id)?.name,
  title: d.title, urgency: d.urgency, type: d.decision_type,
})), null, 2)}

PRÓXIMAS CONSULTAS: ${JSON.stringify((appointments || []).slice(0, 10).map((a: any) => ({
  patient: patientDetails.find((p: any) => p.id === a.patient_id)?.name,
  date: a.appointment_date, time: a.appointment_time, status: a.status,
})), null, 2)}

============ REGRAS DE COMPORTAMENTO ============
1. Responda SEMPRE em português brasileiro
2. Use dados REAIS — nunca invente
3. Inclua SEMPRE a tag [LEVEL:...] na resposta
4. Para pedidos de navegação → [ACTION:...] com [LEVEL:prepare]
5. Para ações sensíveis → [CONFIRM:...] com [LEVEL:execute]
6. Identifique pacientes pelo NOME COMPLETO
7. Seja conciso, use markdown
8. Se não encontrar dados, diga claramente`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
      { role: "user", content: command },
    ];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, stream: true }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("ifj-command-center error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
