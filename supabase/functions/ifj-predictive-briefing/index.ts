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

    // Fetch comprehensive data for predictions
    const [patientsRes, snapshotsRes, alertsRes, portfolioRes, milestonesRes] = await Promise.all([
      supabase.from("patients").select("id, full_name, goal, current_weight, target_weight, journey_status, created_at")
        .eq("nutritionist_id", user.id).eq("status", "active"),
      supabase.from("clinical_daily_snapshots").select("*")
        .in("patient_id", []) // Will be filled
        .gte("snapshot_date", new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0])
        .order("snapshot_date", { ascending: false }),
      supabase.from("clinical_alerts").select("*")
        .eq("nutritionist_id", user.id).eq("is_active", true),
      supabase.from("clinic_portfolio_state").select("*")
        .eq("nutritionist_id", user.id).maybeSingle(),
      supabase.from("calendar_milestones").select("*")
        .gte("milestone_date", new Date().toISOString().split("T")[0])
        .lte("milestone_date", new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0])
        .eq("completed", false),
    ]);

    const patients = patientsRes.data || [];
    const patientIds = patients.map((p: any) => p.id);

    // Re-fetch snapshots with actual patient IDs
    const { data: snapshots } = await supabase
      .from("clinical_daily_snapshots")
      .select("*")
      .in("patient_id", patientIds)
      .gte("snapshot_date", new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0])
      .order("snapshot_date", { ascending: false });

    // Compute predictions deterministically
    const predictions: any[] = [];
    
    for (const patient of patients) {
      const patientSnapshots = (snapshots || []).filter((s: any) => s.patient_id === patient.id);
      const patientAlerts = (alertsRes.data || []).filter((a: any) => a.patient_id === patient.id);
      
      if (patientSnapshots.length < 2) continue;

      const latest = patientSnapshots[0];
      const weekAgo = patientSnapshots.find((s: any) => {
        const daysDiff = (Date.now() - new Date(s.snapshot_date).getTime()) / 86400000;
        return daysDiff >= 6;
      });

      // Dropout risk trend
      if (latest?.dropout_risk_score > 50) {
        const trend = weekAgo ? latest.dropout_risk_score - (weekAgo.dropout_risk_score || 0) : 0;
        predictions.push({
          patient_name: patient.full_name,
          patient_id: patient.id,
          type: "dropout_risk",
          severity: latest.dropout_risk_score > 70 ? "critical" : "warning",
          score: latest.dropout_risk_score,
          trend,
          message: `${patient.full_name} tem ${latest.dropout_risk_score}% de risco de abandono${trend > 0 ? ` (↑${trend}% na semana)` : ""}`,
          action: "Agendar contato personalizado e revisar plano",
        });
      }

      // Stagnation detection
      if (latest?.weight_trend === "stable" && patient.goal === "weight_loss") {
        const daysStable = patientSnapshots.filter((s: any) => s.weight_trend === "stable").length;
        if (daysStable >= 7) {
          predictions.push({
            patient_name: patient.full_name,
            patient_id: patient.id,
            type: "plateau",
            severity: daysStable > 14 ? "critical" : "warning",
            score: Math.min(daysStable * 5, 100),
            message: `${patient.full_name} está em platô há ${daysStable} dias`,
            action: "Considerar ajuste calórico ou diet break estratégico",
          });
        }
      }

      // Adherence drop
      if (latest?.adherence_score && weekAgo?.adherence_score) {
        const drop = weekAgo.adherence_score - latest.adherence_score;
        if (drop > 15) {
          predictions.push({
            patient_name: patient.full_name,
            patient_id: patient.id,
            type: "adherence_drop",
            severity: drop > 30 ? "critical" : "warning",
            score: drop,
            message: `${patient.full_name} teve queda de ${drop.toFixed(0)}% na adesão`,
            action: "Investigar causa e adaptar complexidade do plano",
          });
        }
      }
    }

    // Sort by severity
    predictions.sort((a, b) => {
      const sev = { critical: 0, warning: 1, info: 2 };
      return (sev[a.severity as keyof typeof sev] || 2) - (sev[b.severity as keyof typeof sev] || 2);
    });

    // Generate AI narrative briefing
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let narrative = "";

    if (LOVABLE_API_KEY && predictions.length > 0) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: "Você é o motor de briefing da IFJ. Gere um resumo semanal conciso e acionável em português. Use markdown. Máximo 300 palavras."
              },
              {
                role: "user",
                content: `Gere um briefing semanal para o nutricionista com base nestas previsões:\n${JSON.stringify(predictions)}\n\nTotal de pacientes: ${patients.length}\nPortfólio: ${JSON.stringify(portfolioRes.data)}\nMilestones próximos: ${(milestonesRes.data || []).length}`
              }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          narrative = aiData.choices?.[0]?.message?.content || "";
        }
      } catch (e) {
        console.warn("AI narrative failed:", e);
      }
    }

    return new Response(JSON.stringify({
      predictions,
      narrative,
      summary: {
        total_patients: patients.length,
        at_risk: predictions.filter((p: any) => p.type === "dropout_risk").length,
        plateaus: predictions.filter((p: any) => p.type === "plateau").length,
        adherence_drops: predictions.filter((p: any) => p.type === "adherence_drop").length,
        critical_count: predictions.filter((p: any) => p.severity === "critical").length,
        upcoming_milestones: (milestonesRes.data || []).length,
      },
      generated_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ifj-predictive-briefing error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
