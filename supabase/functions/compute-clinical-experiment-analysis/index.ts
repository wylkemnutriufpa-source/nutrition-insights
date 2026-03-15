import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENGINE_VERSION = "1.0.0";

function classifyResult(avgWeight: number, avgAdherence: number, dropoutRate: number, regressionRate: number): string {
  if (dropoutRate > 40 || regressionRate > 30) return "high_risk_effect";
  if (avgWeight < -1.5 && avgAdherence > 5 && dropoutRate < 15) return "strong_positive_effect";
  if (avgWeight < -0.5 && avgAdherence > 0) return "moderate_positive_effect";
  if (avgWeight > 0.5 || avgAdherence < -10) return "negative_effect";
  return "neutral_effect";
}

function computeSignalStrength(patientsCount: number, avgWeightChange: number, avgAdherenceChange: number): number {
  if (patientsCount < 5) return Math.min(patientsCount * 5, 25);
  const effectMagnitude = Math.abs(avgWeightChange) * 10 + Math.abs(avgAdherenceChange) * 2;
  const sampleBonus = Math.min(patientsCount * 2, 40);
  return Math.min(Math.round(effectMagnitude + sampleBonus), 100);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Load running experiments
    const { data: experiments } = await supabase
      .from("clinical_experiments")
      .select("*")
      .eq("status", "running");

    if (!experiments?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalProcessed = 0;

    for (const exp of experiments) {
      // 2. Load groups
      const { data: groups } = await supabase
        .from("clinical_experiment_groups")
        .select("*")
        .eq("experiment_id", exp.id);

      if (!groups?.length) continue;

      // 3. Load assignments
      const { data: assignments } = await supabase
        .from("clinical_experiment_assignments")
        .select("*")
        .eq("experiment_id", exp.id);

      if (!assignments?.length) continue;

      const patientIds = assignments.map((a: any) => a.patient_id);

      // 4. Load current snapshots
      const { data: snapshots } = await supabase
        .from("patient_clinical_snapshots")
        .select("*")
        .in("patient_id", patientIds)
        .order("snapshot_date", { ascending: false });

      const latestSnap = new Map<string, any>();
      for (const s of snapshots || []) {
        if (!latestSnap.has(s.patient_id)) latestSnap.set(s.patient_id, s);
      }

      // 5. Compute outcomes per patient
      const outcomes: any[] = [];
      for (const assign of assignments) {
        const baseline = assign.baseline_snapshot || {};
        const current = latestSnap.get(assign.patient_id);
        if (!current) continue;

        const weightDelta = (current.weight ?? baseline.weight ?? 0) - (baseline.weight ?? 0);
        const adherenceDelta = (current.adherence_7d ?? 50) - (baseline.adherence_7d ?? 50);
        const perfDelta = (current.engagement_stability_index ?? 50) - (baseline.engagement_stability ?? 50);
        const riskDelta = 0; // simplified

        outcomes.push({
          experiment_id: exp.id,
          patient_id: assign.patient_id,
          adherence_delta: adherenceDelta,
          weight_delta: weightDelta,
          performance_delta: perfDelta,
          risk_delta: riskDelta,
          dropout_event: (current.adherence_7d ?? 50) < 20,
          stagnation_event: current.weight_trend_status === "stagnated",
          regression_event: weightDelta > 1,
          evaluation_window_days: exp.expected_duration_days,
        });
      }

      // Upsert outcomes
      if (outcomes.length > 0) {
        await supabase.from("clinical_experiment_outcomes").delete().eq("experiment_id", exp.id);
        await supabase.from("clinical_experiment_outcomes").insert(outcomes);
      }

      // 6. Compute results per group
      const assignByGroup = new Map<string, string[]>();
      for (const a of assignments) {
        const list = assignByGroup.get(a.group_id) || [];
        list.push(a.patient_id);
        assignByGroup.set(a.group_id, list);
      }

      const results: any[] = [];
      const insights: any[] = [];
      let bestGroup: any = null;
      let bestScore = -Infinity;

      for (const group of groups) {
        const gPatients = assignByGroup.get(group.id) || [];
        const gOutcomes = outcomes.filter((o: any) => gPatients.includes(o.patient_id));
        const count = gOutcomes.length;
        if (count === 0) continue;

        const avgWeight = gOutcomes.reduce((s: number, o: any) => s + o.weight_delta, 0) / count;
        const avgAdherence = gOutcomes.reduce((s: number, o: any) => s + o.adherence_delta, 0) / count;
        const avgPerf = gOutcomes.reduce((s: number, o: any) => s + o.performance_delta, 0) / count;
        const dropoutRate = (gOutcomes.filter((o: any) => o.dropout_event).length / count) * 100;
        const stagnationRate = (gOutcomes.filter((o: any) => o.stagnation_event).length / count) * 100;
        const regressionRate = (gOutcomes.filter((o: any) => o.regression_event).length / count) * 100;

        const interpretation = classifyResult(avgWeight, avgAdherence, dropoutRate, regressionRate);
        const signal = computeSignalStrength(count, avgWeight, avgAdherence);

        const groupResult = {
          experiment_id: exp.id,
          group_id: group.id,
          patients_count: count,
          avg_weight_change: Math.round(avgWeight * 100) / 100,
          avg_adherence_change: Math.round(avgAdherence * 100) / 100,
          avg_performance_change: Math.round(avgPerf * 100) / 100,
          stagnation_rate: Math.round(stagnationRate),
          dropout_rate: Math.round(dropoutRate),
          regression_rate: Math.round(regressionRate),
          statistical_signal_strength: signal,
          result_interpretation: interpretation,
        };

        results.push(groupResult);

        const score = -avgWeight * 10 + avgAdherence * 2 - dropoutRate - regressionRate;
        if (score > bestScore) { bestScore = score; bestGroup = { ...groupResult, group_name: group.group_name }; }
      }

      // Upsert results
      if (results.length > 0) {
        await supabase.from("clinical_experiment_results").delete().eq("experiment_id", exp.id);
        await supabase.from("clinical_experiment_results").insert(results);
      }

      // Generate insights
      if (bestGroup) {
        insights.push({
          experiment_id: exp.id,
          insight_description: `Grupo "${bestGroup.group_name}" apresentou melhor desfecho com variação média de peso de ${bestGroup.avg_weight_change}kg e adesão de ${bestGroup.avg_adherence_change > 0 ? "+" : ""}${bestGroup.avg_adherence_change}%.`,
          confidence_level: bestGroup.statistical_signal_strength >= 60 ? "high" : bestGroup.statistical_signal_strength >= 35 ? "medium" : "low",
        });

        if (bestGroup.dropout_rate > 20) {
          insights.push({
            experiment_id: exp.id,
            insight_description: `Atenção: taxa de abandono de ${bestGroup.dropout_rate}% no grupo líder requer análise antes de generalização.`,
            confidence_level: "high",
          });
        }
      }

      if (insights.length > 0) {
        await supabase.from("clinical_experiment_insights").delete().eq("experiment_id", exp.id);
        await supabase.from("clinical_experiment_insights").insert(insights);
      }

      // Auto-complete if past duration
      const startDate = new Date(exp.start_date);
      const elapsed = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (elapsed >= exp.expected_duration_days) {
        await supabase.from("clinical_experiments").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", exp.id);
      }

      totalProcessed++;
    }

    return new Response(
      JSON.stringify({ processed: totalProcessed, engine_version: ENGINE_VERSION }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
