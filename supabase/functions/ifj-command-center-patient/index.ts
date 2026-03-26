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
    if (authError || !user) throw new Error("Unauthorized");

    const { command, conversationHistory } = await req.json();

    // ── RUNTIME PERMISSION: Verify patient role ──
    const { data: userRoles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id);
    const actualRoles = (userRoles || []).map((r: any) => r.role);
    if (!actualRoles.includes("patient") && !actualRoles.includes("admin")) {
      return new Response(JSON.stringify({ error: "Permissão negada. Apenas pacientes." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── AUDIT LOG ──
    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id, action: "ifj_command_center_query",
      resource_type: "ifj_command_center", resource_id: "patient",
      metadata: { command: command?.substring(0, 300), role: "patient" },
    });

    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();
    const today = new Date().toISOString().split("T")[0];

    // ── PATIENT SCOPED DATA ONLY ──
    const [checklistRes, mealPlansRes, appointmentsRes, checkinsRes, achievementsRes, linkRes, workoutPlansRes] = await Promise.all([
      supabase.from("checklist_tasks").select("id, title, completed, category, date").eq("patient_id", user.id).eq("date", today),
      supabase.from("meal_plans").select("id, plan_name, status, start_date, end_date, total_calories").eq("patient_id", user.id).eq("status", "active").limit(5),
      supabase.from("patient_appointments").select("id, appointment_date, appointment_time, appointment_type, status").eq("patient_id", user.id).gte("appointment_date", today).order("appointment_date", { ascending: true }).limit(5),
      supabase.from("patient_checkins").select("id, weight, mood, energy_level, created_at").eq("patient_id", user.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("user_achievements").select("id, achievement_id, earned_at").eq("user_id", user.id).limit(20),
      supabase.from("nutritionist_patients").select("nutritionist_id, status, journey_status").eq("patient_id", user.id).eq("status", "active").limit(1),
      supabase.from("workout_plans").select("id, plan_name, is_active").eq("student_id", user.id).eq("is_active", true).limit(5),
    ]);

    const checklist = checklistRes.data || [];
    const completedTasks = checklist.filter((t: any) => t.completed).length;

    const systemPrompt = `Você é a IFJ (Inteligência FitJourney) — Assistente pessoal do paciente.
ACESSO APENAS aos dados DESTE paciente. NUNCA acesse dados de outros pacientes ou profissionais.

PACIENTE: ${profile?.full_name || "Paciente"}

CLASSIFICAÇÃO DE AÇÕES:
[LEVEL:consult] → Consulta de dados pessoais
[LEVEL:suggest] → Sugestão de ação ao paciente
[LEVEL:prepare] → Preparar navegação

ROTAS: /patient-overview, /checklist, /my-meals, /my-progress, /my-team, /achievements, /settings

DADOS HOJE:
- Tarefas: ${completedTasks}/${checklist.length} | Pendentes: ${checklist.filter((t: any) => !t.completed).map((t: any) => t.title).join(", ") || "Nenhuma"}
- Plano alimentar: ${(mealPlansRes.data || []).length > 0 ? `Sim (${mealPlansRes.data![0].total_calories} kcal)` : "Não"}
- Próxima consulta: ${(appointmentsRes.data || []).length > 0 ? `${appointmentsRes.data![0].appointment_date} ${appointmentsRes.data![0].appointment_time}` : "Nenhuma"}
- Treinos ativos: ${(workoutPlansRes.data || []).length}
- Conquistas: ${(achievementsRes.data || []).length}
- Status: ${(linkRes.data || [])[0]?.journey_status || "N/A"}

CHECK-INS RECENTES: ${JSON.stringify((checkinsRes.data || []).slice(0, 5).map((c: any) => ({
  data: c.created_at?.split("T")[0], peso: c.weight, humor: c.mood, energia: c.energy_level,
})), null, 2)}

REGRAS:
1. Português brasileiro, sempre
2. Dados reais, nunca inventar
3. Incluir [LEVEL:...] em toda resposta
4. [ACTION:...] para navegação
5. NUNCA mostrar dados de outros pacientes
6. Ser motivacional, empático, acolhedor
7. Celebrar conquistas e progresso
8. Se não souber algo, sugerir falar com profissional
9. Paciente NÃO tem acesso a ações destrutivas — nunca usar [CONFIRM:...]`;

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
    console.error("ifj-command-center-patient error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
