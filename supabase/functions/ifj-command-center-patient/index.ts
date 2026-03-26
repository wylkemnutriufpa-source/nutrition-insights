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

    // PATIENT SCOPED DATA ONLY — only their own data
    const { data: checklist } = await supabase
      .from("checklist_tasks")
      .select("id, title, completed, category, date")
      .eq("patient_id", user.id)
      .eq("date", new Date().toISOString().split("T")[0]);

    const { data: mealPlans } = await supabase
      .from("meal_plans")
      .select("id, plan_name, status, start_date, end_date, total_calories")
      .eq("patient_id", user.id)
      .eq("status", "active")
      .limit(5);

    const { data: appointments } = await supabase
      .from("patient_appointments")
      .select("id, appointment_date, appointment_time, appointment_type, status")
      .eq("patient_id", user.id)
      .gte("appointment_date", new Date().toISOString().split("T")[0])
      .order("appointment_date", { ascending: true })
      .limit(5);

    const { data: checkins } = await supabase
      .from("patient_checkins")
      .select("id, weight, mood, energy_level, created_at")
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    const { data: achievements } = await supabase
      .from("user_achievements")
      .select("id, achievement_id, earned_at")
      .eq("user_id", user.id)
      .limit(20);

    const { data: nutritionistLink } = await supabase
      .from("nutritionist_patients")
      .select("nutritionist_id, status, journey_status")
      .eq("patient_id", user.id)
      .eq("status", "active")
      .limit(1);

    const { data: workoutPlans } = await supabase
      .from("workout_plans")
      .select("id, plan_name, is_active")
      .eq("student_id", user.id)
      .eq("is_active", true)
      .limit(5);

    const checklistItems = checklist || [];
    const completedTasks = checklistItems.filter((t: any) => t.completed).length;

    const systemPrompt = `Você é a IFJ (Inteligência FitJourney) — Assistente pessoal do paciente/aluno.
Você tem acesso APENAS aos dados DESTE paciente. NUNCA acesse dados de outros pacientes ou profissionais.

PACIENTE: ${profile?.full_name || "Paciente"}

ROTAS DISPONÍVEIS:
- /patient-overview → Meu Painel
- /checklist → Minhas Tarefas
- /my-meals → Meu Plano Alimentar
- /my-progress → Meu Progresso
- /my-team → Meu Time (Profissionais)
- /achievements → Conquistas
- /settings → Configurações

DADOS DO PACIENTE HOJE:
- Tarefas hoje: ${completedTasks}/${checklistItems.length} completadas
- Tarefas pendentes: ${checklistItems.filter((t: any) => !t.completed).map((t: any) => t.title).join(", ") || "Nenhuma"}
- Plano alimentar ativo: ${(mealPlans || []).length > 0 ? "Sim" : "Não"}
${(mealPlans || []).length > 0 ? `- Calorias do plano: ${mealPlans![0].total_calories} kcal` : ""}
- Próxima consulta: ${(appointments || []).length > 0 ? `${appointments![0].appointment_date} às ${appointments![0].appointment_time}` : "Nenhuma agendada"}
- Treinos ativos: ${(workoutPlans || []).length}
- Conquistas: ${(achievements || []).length}

CHECK-INS RECENTES:
${JSON.stringify((checkins || []).slice(0, 5).map((c: any) => ({
  data: c.created_at?.split("T")[0],
  peso: c.weight,
  humor: c.mood,
  energia: c.energy_level,
})), null, 2)}

JORNADA:
- Status: ${(nutritionistLink || [])[0]?.journey_status || "N/A"}

REGRAS:
1. Responda SEMPRE em português brasileiro
2. Use dados REAIS — nunca invente
3. Quando pedirem para navegar, gere botões: [ACTION:Texto|/rota]
4. NUNCA mostre dados de outros pacientes ou do profissional
5. Seja motivacional, empático e acolhedor
6. Ajude a entender o plano alimentar de forma simples
7. Lembre de tarefas pendentes quando apropriado
8. Celebre conquistas e progresso
9. Se não souber algo, sugira falar com o profissional
10. Aja como um coach pessoal amigável`;

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
    console.error("ifj-command-center-patient error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
