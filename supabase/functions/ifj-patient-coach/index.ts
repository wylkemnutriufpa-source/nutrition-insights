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

    const { question, conversationHistory } = await req.json();

    // Fetch patient's context
    const [profileRes, planRes, checklistRes, hydrationRes, behaviorRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("patient_meal_plans").select("id, title, total_calories, status, created_at")
        .eq("patient_id", user.id).eq("status", "published").order("created_at", { ascending: false }).limit(1),
      supabase.from("checklist_tasks").select("title, category, completed, date")
        .eq("patient_id", user.id).eq("date", new Date().toISOString().split("T")[0]),
      supabase.from("fit_intelligence_hydration").select("*")
        .eq("patient_id", user.id).eq("date", new Date().toISOString().split("T")[0]).maybeSingle(),
      supabase.from("behavioral_profile").select("*").eq("patient_id", user.id).maybeSingle(),
    ]);

    const profile = profileRes.data as any;
    const activePlan = (planRes.data as any)?.[0];
    const todayTasks = checklistRes.data || [];
    const hydration = hydrationRes.data as any;
    const behavior = behaviorRes.data as any;

    // Fetch active meal plan details if exists
    let meals: any[] = [];
    if (activePlan) {
      const { data } = await supabase
        .from("meal_plan_meals")
        .select("meal_name, meal_time, foods, calories, protein, carbs, fat")
        .eq("plan_id", activePlan.id)
        .order("meal_time");
      meals = data || [];
    }

    const completedTasks = todayTasks.filter((t: any) => t.completed).length;
    const totalTasks = todayTasks.length;

    const systemPrompt = `Você é a IFJ Coach — assistente pessoal de saúde e nutrição do paciente no app FitJourney.

DADOS DO PACIENTE:
- Nome: ${profile?.full_name || "Paciente"}
- Objetivo: ${profile?.goal || "não definido"}
- Peso atual: ${profile?.current_weight || "?"} kg
- Peso meta: ${profile?.target_weight || "?"} kg

PLANO ALIMENTAR ATIVO:
${activePlan ? `- ${activePlan.title} (${activePlan.total_calories} kcal)
- Refeições: ${meals.map((m: any) => `${m.meal_name} às ${m.meal_time} (${m.calories}kcal)`).join(", ")}` : "Nenhum plano ativo"}

CHECKLIST DE HOJE:
- Completadas: ${completedTasks}/${totalTasks}
${todayTasks.map((t: any) => `- [${t.completed ? "✅" : "⬜"}] ${t.title}`).join("\n")}

HIDRATAÇÃO HOJE:
- ${hydration ? `${hydration.consumed_cups}/${hydration.target_cups} copos` : "Sem registro"}

PERFIL COMPORTAMENTAL:
- Estilo de motivação: ${behavior?.motivation_style || "padrão"}
- Tom de mensagem preferido: ${behavior?.message_tone || "gentil"}
- Horário compulsão: ${behavior?.craving_hours?.join(", ") || "não definido"}
- Treina sozinho: ${behavior?.trains_alone ? "sim" : "não"}

REGRAS CRÍTICAS:
1. NUNCA sugira medicamentos, suplementos ou diagnósticos médicos
2. Responda SEMPRE em português brasileiro
3. Seja acolhedor e motivacional, respeitando o tom preferido do paciente
4. Se perguntar sobre receitas, sugira com base no cardápio do plano ativo
5. Nunca contradiga o plano do nutricionista
6. Para dúvidas médicas, oriente a consultar o nutricionista
7. Use emojis moderadamente para engajamento
8. Máximo 200 palavras por resposta
9. Se perguntar sobre troca de alimentos, sugira opções do mesmo grupo nutricional
10. Celebre conquistas e progresso do paciente`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
      { role: "user", content: question },
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
        model: "google/gemini-2.5-flash-lite",
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
    console.error("ifj-patient-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
