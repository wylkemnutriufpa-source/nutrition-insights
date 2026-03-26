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

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { command, conversationHistory } = await req.json();

    // ── RUNTIME PERMISSION: Verify personal trainer role ──
    const { data: userRoles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id);
    const actualRoles = (userRoles || []).map((r: any) => r.role);
    if (!actualRoles.includes("personal") && !actualRoles.includes("admin")) {
      return new Response(JSON.stringify({ error: "Permissão negada. Apenas Personal Trainers." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── AUDIT LOG ──
    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id, action: "ifj_command_center_query",
      resource_type: "ifj_command_center", resource_id: "personal",
      metadata: { command: command?.substring(0, 300), role: "personal" },
    });

    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();

    // ── SCOPED DATA: Only this trainer's students ──
    const { data: students } = await supabase.from("personal_trainer_students").select("id, student_id, status, created_at").eq("personal_id", user.id).limit(100);
    const studentIds = (students || []).map((s: any) => s.student_id);
    const safeIds = studentIds.length ? studentIds : ["00000000-0000-0000-0000-000000000000"];

    const [profilesRes, plansRes, feedbacksRes, completionsRes, alertsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, phone").in("user_id", safeIds),
      supabase.from("workout_plans").select("id, student_id, plan_name, is_active, created_at").eq("personal_id", user.id).limit(100),
      supabase.from("workout_feedbacks").select("id, student_id, pain_areas, pain_level, fatigue_level, mood, created_at").in("student_id", safeIds).order("created_at", { ascending: false }).limit(50),
      supabase.from("workout_completions").select("id, student_id, completed_at, duration_minutes").in("student_id", safeIds).order("completed_at", { ascending: false }).limit(100),
      supabase.from("cross_professional_alerts").select("id, patient_id, alert_type, message, severity, is_read, created_at").eq("target_professional_id", user.id).eq("is_read", false).limit(20),
    ]);

    const today = new Date().toISOString().split("T")[0];
    const studentDetails = (students || []).filter((s: any) => s.status === "active").map((s: any) => {
      const prof = (profilesRes.data || []).find((p: any) => p.user_id === s.student_id);
      const stuPlans = (plansRes.data || []).filter((p: any) => p.student_id === s.student_id);
      const stuFeedbacks = (feedbacksRes.data || []).filter((f: any) => f.student_id === s.student_id);
      const stuCompletions = (completionsRes.data || []).filter((c: any) => c.student_id === s.student_id);
      const lastFeedback = stuFeedbacks[0];
      return {
        id: s.student_id, name: prof?.full_name || "Aluno", phone: prof?.phone,
        activePlans: stuPlans.filter((p: any) => p.is_active).length,
        totalCompletions: stuCompletions.length,
        trainedToday: stuCompletions.some((c: any) => c.completed_at?.startsWith(today)),
        lastPainReport: lastFeedback?.pain_areas ? { areas: lastFeedback.pain_areas, level: lastFeedback.pain_level } : null,
        lastMood: lastFeedback?.mood, lastFatigue: lastFeedback?.fatigue_level,
      };
    });

    const systemPrompt = `Você é a IFJ (Inteligência FitJourney) — Copiloto do Personal Trainer.
ACESSO EXCLUSIVO aos dados deste personal trainer. NUNCA acesse dados de nutrição ou outros profissionais.

PERSONAL TRAINER: ${profile?.full_name || "Personal"}

SISTEMA DE CLASSIFICAÇÃO:
[LEVEL:consult] → Consulta de dados
[LEVEL:suggest] → Sugestão de ação
[LEVEL:prepare] → Preparar operação (navegar)
[LEVEL:execute] → Executar ação (requer confirmação)

ROTAS:
/personal/dashboard, /personal/students, /personal/workouts

DADOS: ${studentDetails.length} alunos ativos | Treinaram hoje: ${studentDetails.filter(s => s.trainedToday).length} | Alertas: ${(alertsRes.data || []).length}
ALUNOS: ${JSON.stringify(studentDetails, null, 2)}
ALERTAS: ${JSON.stringify((alertsRes.data || []).map((a: any) => ({ aluno: studentDetails.find(s => s.id === a.patient_id)?.name, tipo: a.alert_type, msg: a.message, severidade: a.severity })), null, 2)}

REGRAS:
1. Português brasileiro sempre
2. Dados reais, nunca inventar
3. Incluir [LEVEL:...] em toda resposta
4. [ACTION:...] para navegação, [CONFIRM:...] para ações sensíveis
5. NUNCA acessar dados clínicos/nutricionais
6. Destacar dores e alertas com urgência
7. Ser conciso, usar markdown`;

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
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("ifj-command-center-personal error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
