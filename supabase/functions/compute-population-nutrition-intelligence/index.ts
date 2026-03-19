import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENGINE_VERSION = "1.0.0";
const MIN_COHORT_SIZE = 20;

// ── Helper Functions ────────────────────────────────────────

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

function getAdherenceBand(adh: number): string {
  if (adh >= 85) return "high";
  if (adh >= 60) return "moderate";
  if (adh >= 35) return "low";
  return "very_low";
}

function classifyBenchmark(percentile: number): string {
  if (percentile >= 90) return "exceptional_responder";
  if (percentile >= 70) return "above_average";
  if (percentile >= 40) return "average";
  if (percentile >= 20) return "below_average";
  return "underperforming";
}

function computePercentile(value: number, allValues: number[]): number {
  if (allValues.length === 0) return 50;
  const sorted = [...allValues].sort((a, b) => a - b);
  const rank = sorted.filter(v => v < value).length;
  return Math.round((rank / sorted.length) * 100);
}

function generateCohortSlug(sig: Record<string, string>): string {
  return Object.entries(sig)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");
}

interface PatientNutritionData {
  patient_id: string;
  nutritionist_id: string;
  goal: string;
  caloric_band: string;
  metabolic_cluster: string;
  adherence_band: string;
  bmi_band: string;
  sex: string;
  age_band: string;
  activity_level: string;
  adherence_avg: number;
  weight_change_14d: number;
  weight_change_30d: number;
  body_fat_change: number;
  performance_score: number;
  is_stagnated: boolean;
  is_dropout: boolean;
  is_regressed: boolean;
  protocol_id: string | null;
  protocol_name: string | null;
  plan_efficacy: number;
  metabolic_response: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Load Data ───────────────────────────────────────────
    const { data: links } = await supabase
      .from("nutritionist_patients")
      .select("patient_id, nutritionist_id")
      .eq("status", "active");

    if (!links || links.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const patientIds = [...new Set(links.map((l: any) => l.patient_id))];
    const nutritionistMap = new Map<string, string>();
    links.forEach((l: any) => nutritionistMap.set(l.patient_id, l.nutritionist_id));

    const [snapshotsRes, clustersRes, profilesRes, performanceRes, plansRes, protocolsRes, dynamicsRes] = await Promise.all([
      supabase.from("patient_clinical_snapshots")
        .select("patient_id, weight_velocity_kg_week, adherence_momentum, trend_status, calorie_avg, plan_efficacy_score, snapshot_date")
        .in("patient_id", patientIds).order("snapshot_date", { ascending: false }),
      supabase.from("patient_metabolic_clusters")
        .select("patient_id, cluster_type, metabolic_stability")
        .in("patient_id", patientIds).order("computed_at", { ascending: false }),
      supabase.from("profiles")
        .select("user_id, full_name, gender, birth_date, weight, height, activity_level")
        .in("user_id", patientIds),
      supabase.from("patient_human_performance_state")
        .select("patient_id, overall_performance_score")
        .in("patient_id", patientIds),
      supabase.from("meal_plans")
        .select("patient_id, total_calories, goal, protocol_id")
        .in("patient_id", patientIds).eq("is_active", true),
      supabase.from("nutrition_protocols").select("id, name"),
      supabase.from("patient_weight_dynamics")
        .select("patient_id, avg_weekly_weight_change, metabolic_response_classification")
        .in("patient_id", patientIds),
    ]);

    const snapshots = snapshotsRes.data || [];
    const clusters = clustersRes.data || [];
    const profiles = profilesRes.data || [];
    const performance = performanceRes.data || [];
    const plans = plansRes.data || [];
    const protocols = protocolsRes.data || [];
    const dynamics = dynamicsRes.data || [];

    const protocolMap = new Map<string, string>();
    protocols.forEach((p: any) => protocolMap.set(p.id, p.name));

    // ── Build Patient Nutrition Data ────────────────────────
    const allPatients: PatientNutritionData[] = [];

    for (const pid of patientIds) {
      const snap = snapshots.find((s: any) => s.patient_id === pid);
      const cluster = clusters.find((c: any) => c.patient_id === pid);
      const profile = profiles.find((p: any) => p.user_id === pid);
      const perf = performance.find((p: any) => p.patient_id === pid);
      const plan = plans.find((p: any) => p.patient_id === pid);
      const dyn = dynamics.find((d: any) => d.patient_id === pid);

      const bmi = profile?.weight && profile?.height
        ? profile.weight / Math.pow(profile.height / 100, 2)
        : null;

      const patSnaps = snapshots.filter((s: any) => s.patient_id === pid);
      let change14d = 0, change30d = 0;
      if (patSnaps.length >= 2) {
        const recent = patSnaps[0];
        const s14 = patSnaps.find((s: any) => {
          const d = (new Date(recent.snapshot_date).getTime() - new Date(s.snapshot_date).getTime()) / 86400000;
          return d >= 12 && d <= 16;
        });
        const s30 = patSnaps.find((s: any) => {
          const d = (new Date(recent.snapshot_date).getTime() - new Date(s.snapshot_date).getTime()) / 86400000;
          return d >= 28 && d <= 32;
        });
        if (s14) change14d = (s14.weight_velocity_kg_week || 0) * 2;
        if (s30) change30d = (s30.weight_velocity_kg_week || 0) * 4.3;
      }

      const adherence = snap?.adherence_momentum ?? 50;

      allPatients.push({
        patient_id: pid,
        nutritionist_id: nutritionistMap.get(pid) || "",
        goal: plan?.goal || "weight_loss",
        caloric_band: getCalorieRange(plan?.total_calories),
        metabolic_cluster: cluster?.cluster_type || "adaptive",
        adherence_band: getAdherenceBand(adherence),
        bmi_band: getBmiRange(bmi),
        sex: profile?.gender || "unknown",
        age_band: getAgeRange(profile?.birth_date),
        activity_level: profile?.activity_level || "moderate",
        adherence_avg: adherence,
        weight_change_14d: change14d,
        weight_change_30d: change30d,
        body_fat_change: 0,
        performance_score: perf?.overall_performance_score ?? 50,
        is_stagnated: snap?.trend_status === "stagnated",
        is_dropout: false,
        is_regressed: snap?.trend_status === "regressing",
        protocol_id: plan?.protocol_id || null,
        protocol_name: plan?.protocol_id ? (protocolMap.get(plan.protocol_id) || null) : null,
        plan_efficacy: snap?.plan_efficacy_score ?? 50,
        metabolic_response: cluster?.metabolic_stability ?? 50,
      });
    }

    // ── BLOCO 1: Build Nutrition Cohorts ─────────────────────
    const cohortGroups = new Map<string, PatientNutritionData[]>();

    for (const p of allPatients) {
      const sig: Record<string, string> = {
        goal: p.goal,
        caloric_band: p.caloric_band,
        cluster: p.metabolic_cluster,
      };
      const slug = generateCohortSlug(sig);
      const group = cohortGroups.get(slug) || [];
      group.push(p);
      cohortGroups.set(slug, group);
    }

    let totalCohorts = 0;
    let totalBenchmarks = 0;
    let totalPatterns = 0;
    let totalMatrixEntries = 0;

    // Clear old patterns
    await supabase.from("population_response_patterns").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    for (const [slug, members] of cohortGroups) {
      const sig = Object.fromEntries(slug.split("|").map(s => s.split(":")));
      const firstMember = members[0];

      // Upsert cohort
      const { data: cohort } = await supabase.from("population_nutrition_cohorts").upsert({
        cohort_slug: slug,
        cohort_signature: sig,
        goal_category: firstMember.goal,
        caloric_band: firstMember.caloric_band,
        metabolic_cluster: firstMember.metabolic_cluster,
        adherence_band: members.length > 0
          ? getAdherenceBand(members.reduce((s, m) => s + m.adherence_avg, 0) / members.length)
          : "moderate",
        bmi_band: firstMember.bmi_band,
        sex: firstMember.sex,
        age_band: firstMember.age_band,
        activity_level: firstMember.activity_level,
        patients_count: members.length,
        updated_at: new Date().toISOString(),
      }, { onConflict: "cohort_slug" }).select("id").single();

      if (!cohort) continue;
      totalCohorts++;

      // ── BLOCO 2: Calculate Nutrition Metrics ──────────────
      const avgAdherence = members.reduce((s, m) => s + m.adherence_avg, 0) / members.length;
      const avgChange14d = members.reduce((s, m) => s + m.weight_change_14d, 0) / members.length;
      const avgChange30d = members.reduce((s, m) => s + m.weight_change_30d, 0) / members.length;
      const avgPerformance = members.reduce((s, m) => s + m.performance_score, 0) / members.length;
      const stagnationRate = (members.filter(m => m.is_stagnated).length / members.length) * 100;
      const dropoutRate = (members.filter(m => m.is_dropout).length / members.length) * 100;
      const regressionRate = (members.filter(m => m.is_regressed).length / members.length) * 100;
      const avgEfficacy = members.reduce((s, m) => s + m.plan_efficacy, 0) / members.length;

      await supabase.from("population_nutrition_metrics").upsert({
        cohort_id: cohort.id,
        avg_weight_change_14d: Math.round(avgChange14d * 100) / 100,
        avg_weight_change_30d: Math.round(avgChange30d * 100) / 100,
        avg_body_fat_change: 0,
        avg_adherence: Math.round(avgAdherence * 10) / 10,
        avg_dropout_rate: Math.round(dropoutRate * 10) / 10,
        avg_stagnation_rate: Math.round(stagnationRate * 10) / 10,
        avg_regression_rate: Math.round(regressionRate * 10) / 10,
        avg_performance_score: Math.round(avgPerformance * 10) / 10,
        avg_protocol_success_score: Math.round(avgEfficacy * 10) / 10,
        engine_version: ENGINE_VERSION,
        updated_at: new Date().toISOString(),
      }, { onConflict: "cohort_id" });

      // ── BLOCO 3: Protocol × Profile Matrix ───────────────
      const byProtocol = new Map<string, PatientNutritionData[]>();
      for (const m of members) {
        if (!m.protocol_id) continue;
        const grp = byProtocol.get(m.protocol_id) || [];
        grp.push(m);
        byProtocol.set(m.protocol_id, grp);
      }

      for (const [protocolId, protMembers] of byProtocol) {
        if (protMembers.length < 3) continue;
        const pAdh = protMembers.reduce((s, m) => s + m.adherence_avg, 0) / protMembers.length;
        const pStag = (protMembers.filter(m => m.is_stagnated).length / protMembers.length) * 100;
        const pDrop = (protMembers.filter(m => m.is_dropout).length / protMembers.length) * 100;
        const pMetRes = protMembers.reduce((s, m) => s + m.metabolic_response, 0) / protMembers.length;
        const successRate = Math.max(0, Math.min(100, pAdh * 0.4 + (100 - pStag) * 0.3 + (100 - pDrop) * 0.2 + pMetRes * 0.1));
        const evidence = protMembers.length >= 30 ? "high" : protMembers.length >= 15 ? "medium" : "low";

        await supabase.from("protocol_population_success_matrix").upsert({
          protocol_id: protocolId,
          cohort_id: cohort.id,
          cluster_type: firstMember.metabolic_cluster,
          success_rate: Math.round(successRate * 10) / 10,
          adherence_rate: Math.round(pAdh * 10) / 10,
          stagnation_rate: Math.round(pStag * 10) / 10,
          dropout_rate: Math.round(pDrop * 10) / 10,
          metabolic_response_score: Math.round(pMetRes * 10) / 10,
          evidence_strength: evidence,
          sample_size: protMembers.length,
          updated_at: new Date().toISOString(),
        }, { onConflict: "protocol_id,cohort_id" });
        totalMatrixEntries++;
      }

      // ── BLOCO 4: Detect Response Patterns ─────────────────
      if (members.length >= MIN_COHORT_SIZE) {
        const patterns: any[] = [];

        if (avgAdherence < 50 && stagnationRate > 30) {
          patterns.push({
            pattern_type: "low_adherence_stagnation_link",
            pattern_description: `Cohort ${sig.goal}/${sig.cluster} com adesão baixa (${Math.round(avgAdherence)}%) apresenta ${Math.round(stagnationRate)}% de estagnação. Planos mais simples podem melhorar adesão.`,
            supporting_metrics: { avg_adherence: avgAdherence, stagnation_rate: stagnationRate, sample_size: members.length },
            confidence_score: members.length >= 30 ? 0.85 : 0.65,
            affected_cohort: slug,
            engine_version: ENGINE_VERSION,
            nutritionist_id: firstMember.nutritionist_id,
          });
        }

        if (avgAdherence >= 75 && avgPerformance >= 65) {
          patterns.push({
            pattern_type: "high_performance_protocol",
            pattern_description: `Estratégia para ${sig.goal} em perfil ${sig.cluster} gera adesão de ${Math.round(avgAdherence)}% e performance de ${Math.round(avgPerformance)}/100. Replicar para perfis similares.`,
            supporting_metrics: { avg_adherence: avgAdherence, avg_performance: avgPerformance, sample_size: members.length },
            confidence_score: members.length >= 30 ? 0.9 : 0.7,
            affected_cohort: slug,
            engine_version: ENGINE_VERSION,
            nutritionist_id: firstMember.nutritionist_id,
          });
        }

        if (dropoutRate > 20) {
          patterns.push({
            pattern_type: "dropout_risk_pattern",
            pattern_description: `Taxa de abandono de ${Math.round(dropoutRate)}% no perfil ${sig.cluster}/${sig.goal}. Considere intervenção preventiva e diet breaks.`,
            supporting_metrics: { dropout_rate: dropoutRate, sample_size: members.length },
            confidence_score: members.length >= 30 ? 0.8 : 0.6,
            affected_cohort: slug,
            engine_version: ENGINE_VERSION,
            nutritionist_id: firstMember.nutritionist_id,
          });
        }

        if (stagnationRate > 40 && sig.caloric_band && sig.caloric_band.includes("1200")) {
          patterns.push({
            pattern_type: "aggressive_deficit_stagnation",
            pattern_description: `Déficits agressivos (${sig.caloric_band} kcal) associados a ${Math.round(stagnationRate)}% de estagnação neste perfil. Considere ciclo calórico.`,
            supporting_metrics: { caloric_band: sig.caloric_band, stagnation_rate: stagnationRate, sample_size: members.length },
            confidence_score: 0.75,
            affected_cohort: slug,
            engine_version: ENGINE_VERSION,
            nutritionist_id: firstMember.nutritionist_id,
          });
        }

        if (regressionRate > 15) {
          patterns.push({
            pattern_type: "regression_risk_pattern",
            pattern_description: `${Math.round(regressionRate)}% de regressão no cohort ${sig.goal}/${sig.cluster}. Revisar intensidade e duração do protocolo.`,
            supporting_metrics: { regression_rate: regressionRate, sample_size: members.length },
            confidence_score: 0.7,
            affected_cohort: slug,
            engine_version: ENGINE_VERSION,
            nutritionist_id: firstMember.nutritionist_id,
          });
        }

        if (patterns.length > 0) {
          await supabase.from("population_response_patterns").insert(patterns);
          totalPatterns += patterns.length;
        }

        // ── BLOCO 5: Individual Benchmarks ──────────────────
        const allAdherences = members.map(m => m.adherence_avg);
        const allPerformances = members.map(m => m.performance_score);
        const allWeightResponses = members.map(m => Math.abs(m.weight_change_30d));
        const allRisks = members.map(m => (m.is_stagnated ? 30 : 0) + (m.is_dropout ? 50 : 0) + (m.is_regressed ? 20 : 0));

        for (const m of members) {
          const adhPerc = computePercentile(m.adherence_avg, allAdherences);
          const perfPerc = computePercentile(m.performance_score, allPerformances);
          const weightPerc = computePercentile(Math.abs(m.weight_change_30d), allWeightResponses);
          const riskScore = (m.is_stagnated ? 30 : 0) + (m.is_dropout ? 50 : 0) + (m.is_regressed ? 20 : 0);
          const riskPerc = 100 - computePercentile(riskScore, allRisks);
          const avgPerc = (adhPerc + perfPerc + weightPerc) / 3;
          const classification = classifyBenchmark(avgPerc);

          await supabase.from("patient_nutrition_benchmarks").upsert({
            patient_id: m.patient_id,
            cohort_id: cohort.id,
            weight_response_percentile: weightPerc,
            adherence_percentile: adhPerc,
            performance_percentile: perfPerc,
            risk_percentile: riskPerc,
            benchmark_classification: classification,
            engine_version: ENGINE_VERSION,
            updated_at: new Date().toISOString(),
          }, { onConflict: "patient_id" });
          totalBenchmarks++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        cohorts: totalCohorts,
        benchmarks: totalBenchmarks,
        patterns: totalPatterns,
        matrix_entries: totalMatrixEntries,
        engine_version: ENGINE_VERSION,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
