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

    // Fetch professional's patient data for context
    const { data: patients } = await supabase
      .from("patients")
      .select("id, full_name, status, journey_status, goal, current_weight, target_weight")
      .eq("nutritionist_id", user.id)
      .eq("status", "active")
      .limit(100);

    const { data: alerts } = await supabase
      .from("clinical_alerts")
      .select("id, title, severity, patient_id, alert_type, created_at")
      .eq("nutritionist_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: snapshots } = await supabase
      .from("clinical_daily_snapshots")
      .select("patient_id, adherence_score, dropout_risk_score, risk_level, weight_trend, snapshot_date")
      .in("patient_id", (patients || []).map((p: any) => p.id))
      .eq("snapshot_date", new Date().toISOString().split("T")[0])
      .limit(100);

    const { data: decisions } = await supabase
      .from("clinical_decisions")
      .select("patient_id, title, urgency, status, created_at")
      .eq("nutritionist_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10);

    // Build clinical context
    const patientSummaries = (patients || []).map((p: any) => {
      const snap = (snapshots || []).find((s: any) => s.patient_id === p.id);
      const patientAlerts = (alerts || []).filter((a: any) => a.patient_id === p.id);
      return {
        name: p.full_name,
        status: p.journey_status,
        goal: p.goal,
        weight: p.current_weight,
        targetWeight: p.target_weight,
        adherence: snap?.adherence_score,
        dropoutRisk: snap?.dropout_risk_score,
        riskLevel: snap?.risk_level,
        weightTrend: snap?.weight_trend,
        activeAlerts: patientAlerts.length,
        alertTypes: patientAlerts.map((a: any) => a.alert_type),
      };
    });

    const systemPrompt = `Você é o Copiloto Clínico IFJ (Inteligência FitJourney), um assistente de IA altamente especializado para nutricionistas.

CONTEXTO DA CARTEIRA (dados reais do profissional):
- Total de pacientes ativos: ${(patients || []).length}
- Alertas clínicos ativos: ${(alerts || []).length}
- Decisões pendentes: ${(decisions || []).length}

DADOS DOS PACIENTES:
${JSON.stringify(patientSummaries, null, 2)}

DECISÕES PENDENTES:
${JSON.stringify((decisions || []).map((d: any) => ({
  patient: (patients || []).find((p: any) => p.id === d.patient_id)?.full_name,
  title: d.title,
  urgency: d.urgency,
})), null, 2)}

REGRAS:
1. Responda SEMPRE em português brasileiro
2. Use dados REAIS dos pacientes — nunca invente dados
3. Se não tiver dados sobre algo, diga claramente
4. Seja conciso, clínico e direto
5. Quando listar pacientes, use nome completo
6. Sugira ações clínicas concretas quando apropriado
7. Para perguntas como "quem precisa de atenção", priorize por: risco alto > dropout > baixa adesão > alertas ativos
8. Formate respostas com markdown para melhor leitura`;

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
        model: "google/gemini-3-flash-preview",
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
    console.error("ifj-conversational error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
