import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENGINE_VERSION = "1.0.0";
const MIN_COHORT_SIZE = 15;

interface PatientData {
  patient_id: string;
  nutritionist_id: string;
  goal?: string;
  calorie_range?: string;
  cluster_type?: string;
  gender?: string;
  age_range?: string;
  bmi_range?: string;
  adherence_avg?: number;
  weight_loss_14d?: number;
  weight_loss_30d?: number;
  weight_velocity?: number;
  performance_score?: number;
  is_stagnated?: boolean;
  is_dropout?: boolean;
  metabolic_stability?: number;
  protocol_name?: string;
}

function getCalorieRange(cal: number | null): string {
  if (!cal || cal <= 0) return "unknown";
  if (cal < 1200) return "<1200";
  if (cal < 1500) return "1200-1500";
  if (cal < 1800) return "1500-1800";
  if (cal < 2100) return "1800-2100";
  if (cal < 2500) return "2100-2500";
  return "2500+";
}

function getAgeRange(birthDate: string | null): string {
  if (!birthDate) return "unknown";
  const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 86400000));
  if (age < 25) return "18-24";
  if (age < 35) return "25-34";
  if (age < 45) return "35-44";
  if (age < 55) return "45-54";
  return "55+";
}

function getBmiRange(bmi: number | null): string {
  if (!bmi || bmi <= 0) return "unknown";
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  if (bmi < 35) return "obese_1";
  return "obese_2+";
}

function generateCohortKey(sig: Record<string, string>): string {
  return Object.entries(sig).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join("|");
}

function classifyBenchmark(relativeScore: number): string {
  if (relativeScore >= 1.3) return "resposta_excepcional";
  if (relativeScore >= 1.05) return "acima_da_media";
  if (relativeScore >= 0.85) return "dentro_da_media";
  if (relativeScore >= 0.6) return "abaixo_da_media";
  return "resposta_preocupante";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Load active patients with their nutritionist
    const { data: links } = await supabase
      .from("nutritionist_patients")
      .select("patient_id, nutritionist_id")
      .eq("status", "active");

    if (!links || links.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const patientIds = [...new Set(links.map((l: any) => l.patient_id))];
    const nutritionistMap = new Map<string, string>();
    links.forEach((l: any) => nutritionistMap.set(l.patient_id, l.nutritionist_id));

    // Load all required data in parallel
    const [snapshotsRes, clustersRes, profilesRes, performanceRes, plansRes] = await Promise.all([
      supabase.from("patient_clinical_snapshots").select("patient_id, weight_velocity_kg_week, adherence_momentum, trend_status, calorie_avg, plan_efficacy_score, snapshot_date")
        .in("patient_id", patientIds).order("snapshot_date", { ascending: false }),
      supabase.from("patient_metabolic_clusters").select("patient_id, cluster_type, metabolic_stability")
        .in("patient_id", patientIds).order("computed_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name, gender, birth_date, weight, height")
        .in("user_id", patientIds),
      supabase.from("patient_human_performance_state").select("patient_id, overall_performance_score")
        .in("patient_id", patientIds),
      supabase.from("meal_plans").select("patient_id, total_calories, goal")
        .in("patient_id", patientIds).eq("is_active", true),
    ]);

    const snapshots = snapshotsRes.data || [];
    const clusters = clustersRes.data || [];
    const profiles = profilesRes.data || [];
    const performance = performanceRes.data || [];
    const plans = plansRes.data || [];

    // Build patient data
    const patientDataMap = new Map<string, PatientData>();

    for (const pid of patientIds) {
      const snap = snapshots.find((s: any) => s.patient_id === pid);
      const cluster = clusters.find((c: any) => c.patient_id === pid);
      const profile = profiles.find((p: any) => p.user_id === pid);
      const perf = performance.find((p: any) => p.patient_id === pid);
      const plan = plans.find((p: any) => p.patient_id === pid);

      const bmi = profile?.weight && profile?.height
        ? profile.weight / Math.pow(profile.height / 100, 2)
        : null;

      // Calculate weight losses from snapshots
      const patSnaps = snapshots.filter((s: any) => s.patient_id === pid);
      let loss14d = 0, loss30d = 0;
      if (patSnaps.length >= 2) {
        const recent = patSnaps[0];
        const snap14 = patSnaps.find((s: any) => {
          const d = (new Date(recent.snapshot_date).getTime() - new Date(s.snapshot_date).getTime()) / 86400000;
          return d >= 12 && d <= 16;
        });
        const snap30 = patSnaps.find((s: any) => {
          const d = (new Date(recent.snapshot_date).getTime() - new Date(s.snapshot_date).getTime()) / 86400000;
          return d >= 28 && d <= 32;
        });
        if (snap14) loss14d = (snap14.weight_velocity_kg_week || 0) * 2;
        if (snap30) loss30d = (snap30.weight_velocity_kg_week || 0) * 4.3;
      }

      patientDataMap.set(pid, {
        patient_id: pid,
        nutritionist_id: nutritionistMap.get(pid) || "",
        goal: plan?.goal || "weight_loss",
        calorie_range: getCalorieRange(plan?.total_calories),
        cluster_type: cluster?.cluster_type || "adaptive",
        gender: profile?.gender || "unknown",
        age_range: getAgeRange(profile?.birth_date),
        bmi_range: getBmiRange(bmi),
        adherence_avg: snap?.adherence_momentum ?? 50,
        weight_loss_14d: loss14d,
        weight_loss_30d: loss30d,
        weight_velocity: snap?.weight_velocity_kg_week ?? 0,
        performance_score: perf?.overall_performance_score ?? 50,
        is_stagnated: snap?.trend_status === "stagnated",
        is_dropout: false,
        metabolic_stability: cluster?.metabolic_stability ?? 50,
      });
    }

    // Group by nutritionist
    const byNutritionist = new Map<string, PatientData[]>();
    for (const pd of patientDataMap.values()) {
      const list = byNutritionist.get(pd.nutritionist_id) || [];
      list.push(pd);
      byNutritionist.set(pd.nutritionist_id, list);
    }

    let totalCohorts = 0;
    let totalBenchmarks = 0;
    let totalInsights = 0;

    for (const [nutritionistId, patients] of byNutritionist) {
      // Create cohorts by cluster_type + goal (primary grouping)
      const cohortGroups = new Map<string, PatientData[]>();

      for (const p of patients) {
        const sig = { cluster: p.cluster_type || "unknown", goal: p.goal || "unknown" };
        const key = generateCohortKey(sig);
        const group = cohortGroups.get(key) || [];
        group.push(p);
        cohortGroups.set(key, group);
      }

      // Clear old data for this nutritionist
      await supabase.from("population_clinical_insights").delete().eq("nutritionist_id", nutritionistId);

      for (const [cohortKey, members] of cohortGroups) {
        const sig = Object.fromEntries(cohortKey.split("|").map(s => s.split(":")));

        // Upsert cohort
        const { data: cohort } = await supabase.from("population_cohorts").upsert({
          cohort_key: `${nutritionistId}:${cohortKey}`,
          cohort_signature: sig,
          patients_count: members.length,
          nutritionist_id: nutritionistId,
          updated_at: new Date().toISOString(),
        }, { onConflict: "cohort_key" }).select("id").single();

        if (!cohort) continue;
        totalCohorts++;

        // Calculate cohort metrics
        const avgAdherence = members.reduce((s, m) => s + (m.adherence_avg || 0), 0) / members.length;
        const avgLoss14d = members.reduce((s, m) => s + (m.weight_loss_14d || 0), 0) / members.length;
        const avgLoss30d = members.reduce((s, m) => s + (m.weight_loss_30d || 0), 0) / members.length;
        const stagnationRate = (members.filter(m => m.is_stagnated).length / members.length) * 100;
        const dropoutRate = (members.filter(m => m.is_dropout).length / members.length) * 100;
        const avgVelocity = members.reduce((s, m) => s + Math.abs(m.weight_velocity || 0), 0) / members.length;
        const avgStability = members.reduce((s, m) => s + (m.metabolic_stability || 0), 0) / members.length;
        const avgPerformance = members.reduce((s, m) => s + (m.performance_score || 0), 0) / members.length;

        await supabase.from("population_cohort_metrics").upsert({
          cohort_id: cohort.id,
          avg_weight_loss_14d: Math.round(avgLoss14d * 100) / 100,
          avg_weight_loss_30d: Math.round(avgLoss30d * 100) / 100,
          stagnation_rate: Math.round(stagnationRate * 10) / 10,
          dropout_rate: Math.round(dropoutRate * 10) / 10,
          avg_adherence: Math.round(avgAdherence * 10) / 10,
          avg_response_velocity: Math.round(avgVelocity * 100) / 100,
          metabolic_stability: Math.round(avgStability * 10) / 10,
          avg_performance_score: Math.round(avgPerformance * 10) / 10,
          engine_version: ENGINE_VERSION,
          updated_at: new Date().toISOString(),
        }, { onConflict: "cohort_id" });

        // Only benchmark if cohort >= MIN_COHORT_SIZE
        if (members.length >= MIN_COHORT_SIZE) {
          for (const m of members) {
            const relAdherence = avgAdherence > 0 ? (m.adherence_avg || 0) / avgAdherence : 1;
            const relPerformance = avgPerformance > 0 ? (m.performance_score || 0) / avgPerformance : 1;
            const relWeight = avgVelocity > 0 ? Math.abs(m.weight_velocity || 0) / avgVelocity : 1;
            const avgRelative = (relAdherence + relPerformance + relWeight) / 3;
            const classification = classifyBenchmark(avgRelative);

            await supabase.from("patient_population_benchmark").upsert({
              patient_id: m.patient_id,
              cohort_id: cohort.id,
              relative_weight_response: Math.round(relWeight * 100) / 100,
              relative_adherence: Math.round(relAdherence * 100) / 100,
              relative_performance_score: Math.round(relPerformance * 100) / 100,
              benchmark_classification: classification,
              engine_version: ENGINE_VERSION,
              updated_at: new Date().toISOString(),
            }, { onConflict: "patient_id" });

            totalBenchmarks++;
          }

          // Generate insights for significant cohorts
          const insights: any[] = [];

          if (avgAdherence >= 75) {
            insights.push({
              nutritionist_id: nutritionistId,
              insight_type: "high_adherence_cohort",
              insight_description: `Cohort ${sig.cluster}/${sig.goal} apresenta adesão média de ${Math.round(avgAdherence)}%, indicando boa aceitação do protocolo.`,
              statistical_confidence: members.length >= 30 ? "high" : "medium",
              supporting_data: { cohort_key: cohortKey, avg_adherence: avgAdherence, sample_size: members.length },
            });
          }

          if (stagnationRate > 40) {
            insights.push({
              nutritionist_id: nutritionistId,
              insight_type: "high_stagnation_alert",
              insight_description: `${Math.round(stagnationRate)}% dos pacientes no cohort ${sig.cluster}/${sig.goal} estão estagnados. Considere revisão de estratégia calórica.`,
              statistical_confidence: members.length >= 30 ? "high" : "medium",
              supporting_data: { cohort_key: cohortKey, stagnation_rate: stagnationRate, sample_size: members.length },
            });
          }

          if (avgPerformance >= 70) {
            insights.push({
              nutritionist_id: nutritionistId,
              insight_type: "high_performance_cohort",
              insight_description: `Cohort ${sig.cluster}/${sig.goal} tem performance média de ${Math.round(avgPerformance)}/100 — estratégia eficaz para este perfil.`,
              statistical_confidence: members.length >= 30 ? "high" : "medium",
              supporting_data: { cohort_key: cohortKey, avg_performance: avgPerformance, sample_size: members.length },
            });
          }

          if (dropoutRate > 25) {
            insights.push({
              nutritionist_id: nutritionistId,
              insight_type: "dropout_risk_cohort",
              insight_description: `Taxa de abandono de ${Math.round(dropoutRate)}% no cohort ${sig.cluster}/${sig.goal}. Intervenção preventiva recomendada.`,
              statistical_confidence: "medium",
              supporting_data: { cohort_key: cohortKey, dropout_rate: dropoutRate, sample_size: members.length },
            });
          }

          if (insights.length > 0) {
            await supabase.from("population_clinical_insights").insert(insights);
            totalInsights += insights.length;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, cohorts: totalCohorts, benchmarks: totalBenchmarks, insights: totalInsights, engine_version: ENGINE_VERSION }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
