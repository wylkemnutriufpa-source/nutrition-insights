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

    const { command, conversationHistory } = await req.json();

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    // PERSONAL TRAINER SCOPED DATA ONLY
    const { data: students } = await supabase
      .from("personal_trainer_students")
      .select("id, student_id, status, created_at")
      .eq("personal_id", user.id)
      .limit(100);

    const studentIds = (students || []).map((s: any) => s.student_id);

    const { data: studentProfiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone")
      .in("user_id", studentIds.length ? studentIds : ["none"]);

    const { data: workoutPlans } = await supabase
      .from("workout_plans")
      .select("id, student_id, plan_name, is_active, created_at")
      .eq("personal_id", user.id)
      .limit(100);

    const { data: feedbacks } = await supabase
      .from("workout_feedbacks")
      .select("id, student_id, pain_areas, pain_level, fatigue_level, mood, created_at")
      .in("student_id", studentIds.length ? studentIds : ["none"])
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: completions } = await supabase
      .from("workout_completions")
      .select("id, student_id, completed_at, duration_minutes")
      .in("student_id", studentIds.length ? studentIds : ["none"])
      .order("completed_at", { ascending: false })
      .limit(100);

    const { data: crossAlerts } = await supabase
      .from("cross_professional_alerts")
      .select("id, patient_id, alert_type, message, severity, is_read, created_at")
      .eq("target_professional_id", user.id)
      .eq("is_read", false)
      .limit(20);

    const studentDetails = (students || []).filter((s: any) => s.status === "active").map((s: any) => {
      const prof = (studentProfiles || []).find((p: any) => p.user_id === s.student_id);
      const plans = (workoutPlans || []).filter((p: any) => p.student_id === s.student_id);
      const stuFeedbacks = (feedbacks || []).filter((f: any) => f.student_id === s.student_id);
      const stuCompletions = (completions || []).filter((c: any) => c.student_id === s.student_id);
      const lastFeedback = stuFeedbacks[0];
      const trainedToday = stuCompletions.some((c: any) => c.completed_at?.startsWith(new Date().toISOString().split("T")[0]));

      return {
        id: s.student_id,
        name: prof?.full_name || "Aluno",
        phone: prof?.phone,
        activePlans: plans.filter((p: any) => p.is_active).length,
        totalCompletions: stuCompletions.length,
        trainedToday,
        lastPainReport: lastFeedback?.pain_areas ? { areas: lastFeedback.pain_areas, level: lastFeedback.pain_level } : null,
        lastMood: lastFeedback?.mood,
        lastFatigue: lastFeedback?.fatigue_level,
      };
    });

    const systemPrompt = `Você é a IFJ (Inteligência FitJourney) — Copiloto do Personal Trainer.
Você tem acesso EXCLUSIVO aos dados deste personal trainer. NÃO acesse dados de outros profissionais.

PERSONAL TRAINER: ${profile?.full_name || "Personal"}

ROTAS DISPONÍVEIS:
- /personal/dashboard → Dashboard do Personal
- /personal/students → Meus Alunos
- /personal/workouts → Módulo de Treinos
- /personal/workouts (tab: templates) → Templates de Treino
- /personal/workouts (tab: anamnesis) → Anamnese do Aluno
- /personal/workouts (tab: assessments) → Avaliações Físicas
- /personal/workouts (tab: evolution) → Evolução de Carga

DADOS DOS ALUNOS:
- Total alunos ativos: ${studentDetails.length}
- Treinaram hoje: ${studentDetails.filter((s: any) => s.trainedToday).length}
- Alertas cross-profissionais: ${(crossAlerts || []).length}

DETALHES DOS ALUNOS:
${JSON.stringify(studentDetails, null, 2)}

ALERTAS MULTIPROFISSIONAIS PENDENTES:
${JSON.stringify((crossAlerts || []).map((a: any) => ({
  aluno: studentDetails.find((s: any) => s.id === a.patient_id)?.name,
  tipo: a.alert_type,
  mensagem: a.message,
  severidade: a.severity,
})), null, 2)}

REGRAS:
1. Responda SEMPRE em português brasileiro
2. Use dados REAIS — nunca invente
3. Quando pedirem para navegar, gere botões: [ACTION:Texto|/rota]
4. NUNCA acesse dados de nutrição, planos alimentares ou dados clínicos — isso é do nutricionista
5. Foque em: treinos, alunos, feedbacks, evolução, dores, avaliações físicas
6. Se aluno reportou dor, destaque com urgência
7. Sugira ações concretas com botões clicáveis
8. Aja como assistente executivo do personal`;

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
