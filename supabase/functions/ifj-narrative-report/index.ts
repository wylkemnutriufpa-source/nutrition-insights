import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isLLMEnabled, llmBlockedResponse } from "../_shared/llm-gate.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // LLM Gate — admin control
    if (!(await isLLMEnabled())) return llmBlockedResponse(corsHeaders);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Rate limit per user
    const { allowed: rlAllowed } = await checkRateLimit("ifj-narrative-report", user.id, 10, 60);
    if (!rlAllowed) return rateLimitResponse();

    const { patient_id } = await req.json();
    if (!patient_id) throw new Error("patient_id required");

    // Verify ownership
    const { data: patient } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patient_id)
      .eq("nutritionist_id", user.id)
      .maybeSingle();

    if (!patient) throw new Error("Patient not found");

    // Fetch comprehensive clinical data
    const [snapshotsRes, alertsRes, plansRes, measurementsRes, anamnesisRes, milestonesRes] = await Promise.all([
      supabase.from("clinical_daily_snapshots").select("*")
        .eq("patient_id", patient_id)
        .order("snapshot_date", { ascending: false }).limit(30),
      supabase.from("clinical_alerts").select("*")
        .eq("patient_id", patient_id)
        .order("created_at", { ascending: false }).limit(20),
      supabase.from("patient_meal_plans").select("id, title, total_calories, status, created_at")
        .eq("patient_id", patient_id)
        .order("created_at", { ascending: false }).limit(5),
      supabase.from("patient_measurements").select("*")
        .eq("patient_id", patient_id)
        .order("measured_at", { ascending: false }).limit(20),
      supabase.from("patient_anamnesis").select("*")
        .eq("patient_id", patient_id)
        .order("created_at", { ascending: false }).limit(1),
      supabase.from("calendar_milestones").select("*")
        .eq("patient_id", patient_id)
        .order("milestone_date", { ascending: false }).limit(10),
    ]);

    const snapshots = snapshotsRes.data || [];
    const alerts = alertsRes.data || [];
    const measurements = measurementsRes.data || [];

    // Compute key metrics
    const latestSnap = snapshots[0];
    const oldestSnap = snapshots[snapshots.length - 1];
    const weightHistory = measurements.filter((m: any) => m.weight).map((m: any) => ({
      date: m.measured_at, weight: m.weight,
    }));
    const weightDelta = weightHistory.length >= 2 ? weightHistory[0].weight - weightHistory[weightHistory.length - 1].weight : null;
    const avgAdherence = snapshots.length > 0
      ? snapshots.reduce((a: number, s: any) => a + (s.adherence_score || 0), 0) / snapshots.length : null;

    const clinicalData = {
      patient_name: (patient as any).full_name,
      goal: (patient as any).goal,
      current_weight: (patient as any).current_weight,
      target_weight: (patient as any).target_weight,
      journey_status: (patient as any).journey_status,
      days_in_program: oldestSnap
        ? Math.floor((Date.now() - new Date(oldestSnap.snapshot_date).getTime()) / 86400000) : 0,
      weight_delta: weightDelta,
      avg_adherence: avgAdherence,
      latest_risk_level: latestSnap?.risk_level,
      dropout_risk: latestSnap?.dropout_risk_score,
      weight_trend: latestSnap?.weight_trend,
      active_alerts: alerts.filter((a: any) => a.is_active).length,
      resolved_alerts: alerts.filter((a: any) => !a.is_active).length,
      total_plans: (plansRes.data || []).length,
      milestones_completed: (milestonesRes.data || []).filter((m: any) => m.completed).length,
      milestones_total: (milestonesRes.data || []).length,
      weight_history: weightHistory.slice(0, 10),
      adherence_history: snapshots.slice(0, 14).map((s: any) => ({
        date: s.snapshot_date, score: s.adherence_score,
      })),
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um gerador de relatórios clínicos narrativos para nutricionistas. 
Gere um relatório profissional completo em formato markdown com as seguintes seções:

# Relatório Clínico Narrativo — [Nome do Paciente]

## 1. Resumo Executivo
Visão geral do caso em 3-4 frases.

## 2. Dados Antropométricos e Evolução
Análise da evolução de peso, tendências e projeções.

## 3. Adesão ao Tratamento
Score médio, tendência, padrões identificados.

## 4. Análise de Risco
Nível de risco atual, score de abandono, alertas ativos.

## 5. Marcos e Conquistas
Milestones completados e pendentes.

## 6. Diagnóstico Clínico IFJ
Classificação do caso e fase do tratamento.

## 7. Recomendações e Próximos Passos
3-5 ações concretas priorizadas.

## 8. Conclusão
Parecer geral e prognóstico.

REGRAS:
- Use linguagem clínica profissional em português brasileiro
- Baseie-se EXCLUSIVAMENTE nos dados fornecidos
- Inclua números e métricas específicas
- Não invente dados inexistentes
- Use formatação markdown com negrito para highlights`
          },
          {
            role: "user",
            content: `Gere o relatório clínico narrativo com base nestes dados:\n${JSON.stringify(clinicalData, null, 2)}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) throw new Error(`AI error: ${aiResponse.status}`);

    const aiData = await aiResponse.json();
    const reportMarkdown = aiData.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({
      report: reportMarkdown,
      clinical_data: clinicalData,
      generated_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ifj-narrative-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
