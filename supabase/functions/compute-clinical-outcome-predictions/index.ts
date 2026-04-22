import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENGINE_VERSION = "1.0.0";

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

// ── Goal Achievement Probability ────────────────────────────
function computeGoalAchievementProbability(
  adherence: number,
  weightTrend: string,
  clusterType: string,
  performanceLevel: string,
  planEfficacy: number,
  riskLevel: string
): number {
  let base = 50;

  // Adherence impact (major driver)
  if (adherence >= 85) base += 25;
  else if (adherence >= 70) base += 15;
  else if (adherence >= 50) base += 0;
  else base -= 20;

  // Weight trend
  if (weightTrend === "expected_loss") base += 15;
  else if (weightTrend === "slow_loss") base += 5;
  else if (weightTrend === "stagnated") base -= 10;
  else if (weightTrend === "gaining") base -= 20;

  // Cluster
  if (clusterType === "metabolic_responder") base += 10;
  else if (clusterType === "metabolic_adaptive") base += 5;
  else if (clusterType === "resistant_profile") base -= 10;
  else if (clusterType === "disengaging_patient") base -= 15;

  // Performance
  if (performanceLevel === "peak_condition") base += 10;
  else if (performanceLevel === "high_performance") base += 5;
  else if (performanceLevel === "unstable") base -= 5;
  else if (performanceLevel === "compromised") base -= 10;

  // Plan efficacy
  base += (planEfficacy - 50) * 0.2;

  // Risk level penalty
  if (riskLevel === "critical") base -= 15;
  else if (riskLevel === "risk") base -= 8;

  return clamp(base);
}

function classifyGoal(prob: number): string {
  if (prob >= 80) return "very_high";
  if (prob >= 65) return "high";
  if (prob >= 45) return "moderate";
  if (prob >= 25) return "low";
  return "very_low";
}

// ── Stagnation Probability ──────────────────────────────────
function computeStagnationProbability(
  weightTrend: string,
  clusterType: string,
  planEfficacy: number,
  daysInCurrentTrend: number
): number {
  let base = 25;

  if (weightTrend === "stagnated") base += 30;
  else if (weightTrend === "slow_loss") base += 15;
  else if (weightTrend === "expected_loss") base -= 15;

  if (clusterType === "resistant_profile") base += 15;
  else if (clusterType === "metabolic_adaptive") base += 10;
  else if (clusterType === "metabolic_responder") base -= 10;

  if (planEfficacy < 40) base += 10;
  else if (planEfficacy > 70) base -= 10;

  if (daysInCurrentTrend > 21) base += 10;
  else if (daysInCurrentTrend > 14) base += 5;

  return clamp(base);
}

function classifyStagnation(prob: number): string {
  if (prob >= 75) return "risco_iminente";
  if (prob >= 55) return "alto_risco";
  if (prob >= 35) return "risco_moderado";
  return "baixo_risco";
}

// ── Dropout Probability ─────────────────────────────────────
function computeDropoutProbability(
  dropoutRiskScore: number,
  clusterType: string,
  consistencyScore: number,
  stressLoad: number,
  daysSinceLastIntervention: number,
  activeAlerts: number
): number {
  let base = dropoutRiskScore * 0.4;

  if (clusterType === "disengaging_patient") base += 20;
  else if (clusterType === "behavioral_struggler") base += 10;

  base += (100 - consistencyScore) * 0.15;
  base += stressLoad * 0.1;

  if (daysSinceLastIntervention > 14) base += 10;
  else if (daysSinceLastIntervention > 7) base += 5;

  base += Math.min(activeAlerts * 3, 15);

  return clamp(base);
}

// ── Regression Probability ──────────────────────────────────
function computeRegressionProbability(
  weightTrend: string,
  engagementStability: number,
  stressLoad: number,
  recoveryScore: number,
  performanceLevel: string
): number {
  let base = 15;

  if (weightTrend === "gaining") base += 25;
  else if (weightTrend === "stagnated") base += 5;
  else if (weightTrend === "expected_loss") base -= 10;

  if (engagementStability < 40) base += 15;
  else if (engagementStability < 60) base += 5;

  if (stressLoad > 70) base += 15;
  else if (stressLoad > 50) base += 5;

  if (recoveryScore < 40) base += 10;

  if (performanceLevel === "compromised") base += 10;
  else if (performanceLevel === "unstable") base += 5;

  return clamp(base);
}

// ── Time to Next Intervention ───────────────────────────────
function computeInterventionDays(
  dropoutProb: number,
  regressionProb: number,
  performanceLevel: string,
  riskLevel: string
): number {
  const urgencyScore = dropoutProb * 0.4 + regressionProb * 0.3 +
    (riskLevel === "critical" ? 30 : riskLevel === "risk" ? 15 : 0);

  if (urgencyScore >= 60) return 1;
  if (urgencyScore >= 45) return 3;
  if (urgencyScore >= 30) return 7;
  if (urgencyScore >= 15) return 14;
  return 21;
}

// ── Main Prediction Driver ──────────────────────────────────
function determinePredictionDriver(
  adherence: number,
  clusterType: string,
  stressLoad: number,
  recoveryScore: number,
  planEfficacy: number,
  weightTrend: string,
  consistencyScore: number,
  goalProb: number
): string {
  // Priority-ordered checks
  if (stressLoad > 70) return "high_stress";
  if (recoveryScore < 35) return "low_recovery";
  if (clusterType === "disengaging_patient") return "disengagement_risk";
  if (adherence < 40) return "low_adherence";
  if (consistencyScore < 40) return "behavioral_instability";
  if (clusterType === "resistant_profile" && weightTrend === "stagnated") return "metabolic_resistance";
  if (planEfficacy < 35) return "therapeutic_failure";
  if (planEfficacy < 50 && weightTrend !== "expected_loss") return "protocol_mismatch";
  if (goalProb >= 65) return "positive_momentum";
  return "low_adherence";
}

// ── Confidence Score ────────────────────────────────────────
function computeConfidenceScore(
  snapshotCount: number,
  hasWearableData: boolean,
  clusterStable: boolean,
  daysOfData: number,
  registrationConsistency: number
): number {
  let score = 30;

  // Data quantity
  if (snapshotCount >= 14) score += 20;
  else if (snapshotCount >= 7) score += 10;
  else score -= 10;

  // Wearable data bonus
  if (hasWearableData) score += 15;

  // Cluster stability
  if (clusterStable) score += 10;

  // Days of history
  if (daysOfData >= 30) score += 15;
  else if (daysOfData >= 14) score += 8;

  // Registration consistency
  score += registrationConsistency * 0.1;

  return clamp(score);
}

function classifyConfidence(score: number): string {
  if (score >= 70) return "alta_confianca";
  if (score >= 45) return "media_confianca";
  return "baixa_confianca";
}

export async function handler(req: Request, supabaseClient?: any) {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = supabaseClient ?? createClient(
      Deno.env.get("SUPABASE_URL") ?? "", 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Load patients with snapshots
    const { data: patients } = await supabase
      .from("nutritionist_patients")
      .select("patient_id, nutritionist_id")
      .eq("status", "active");

    if (!patients?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const patientIds = patients.map((p: any) => p.patient_id);

    // 2. Load latest snapshots
    const { data: snapshots } = await supabase
      .from("patient_clinical_snapshots")
      .select("*")
      .in("patient_id", patientIds)
      .order("snapshot_date", { ascending: false });

    // 3. Load performance state
    const { data: perfStates } = await supabase
      .from("patient_performance_state")
      .select("*")
      .in("patient_id", patientIds);

    // 4. Load cluster assignments
    const { data: clusters } = await supabase
      .from("patient_metabolic_clusters")
      .select("*")
      .in("patient_id", patientIds);

    // 5. Load physiology snapshots
    const { data: physioSnapshots } = await supabase
      .from("patient_physiology_snapshots")
      .select("*")
      .in("patient_id", patientIds);

    // 6. Load active alerts count
    const { data: alerts } = await supabase
      .from("clinical_alerts")
      .select("patient_id")
      .in("patient_id", patientIds)
      .eq("is_active", true);

    // 7. Load wearable devices
    const { data: wearables } = await supabase
      .from("wearable_devices")
      .select("patient_id")
      .in("patient_id", patientIds)
      .eq("status", "connected");

    // Build lookup maps
    const latestSnapshot = new Map<string, any>();
    const snapshotCounts = new Map<string, number>();
    for (const s of snapshots || []) {
      if (!latestSnapshot.has(s.patient_id)) latestSnapshot.set(s.patient_id, s);
      snapshotCounts.set(s.patient_id, (snapshotCounts.get(s.patient_id) || 0) + 1);
    }

    const perfMap = new Map<string, any>();
    for (const p of perfStates || []) perfMap.set(p.patient_id, p);

    const clusterMap = new Map<string, any>();
    for (const c of clusters || []) clusterMap.set(c.patient_id, c);

    const physioMap = new Map<string, any>();
    for (const p of physioSnapshots || []) {
      if (!physioMap.has(p.patient_id)) physioMap.set(p.patient_id, p);
    }

    const alertCounts = new Map<string, number>();
    for (const a of alerts || []) {
      alertCounts.set(a.patient_id, (alertCounts.get(a.patient_id) || 0) + 1);
    }

    const wearableSet = new Set((wearables || []).map((w: any) => w.patient_id));

    // 8. Compute predictions
    const predictions: any[] = [];

    for (const pid of patientIds) {
      const snap = latestSnapshot.get(pid);
      const perf = perfMap.get(pid);
      const cluster = clusterMap.get(pid);
      const physio = physioMap.get(pid);

      const adherence = snap?.adherence_7d ?? 50;
      const weightTrend = snap?.weight_trend_status ?? "stagnated";
      const clusterType = cluster?.cluster_type ?? "behavioral_struggler";
      const performanceLevel = perf?.performance_level ?? "stable";
      const planEfficacy = perf?.plan_efficacy_score ?? 50;
      const riskLevel = snap?.risk_level ?? "attention";
      const consistencyScore = perf?.consistency_score ?? 50;
      const stressLoad = physio?.psi ?? perf?.stress_load_score ?? 30;
      const recoveryScore = physio?.rpi ?? perf?.recovery_score ?? 60;
      const engagementStability = snap?.engagement_stability_index ?? 60;
      const dropoutRiskScore = perf?.dropout_risk_score ?? 20;
      const daysInTrend = 14;
      const daysSinceIntervention = 7;

      const goalProb = computeGoalAchievementProbability(
        adherence, weightTrend, clusterType, performanceLevel, planEfficacy, riskLevel
      );
      const stagnationProb = computeStagnationProbability(
        weightTrend, clusterType, planEfficacy, daysInTrend
      );
      const dropoutProb = computeDropoutProbability(
        dropoutRiskScore, clusterType, consistencyScore, stressLoad,
        daysSinceIntervention, alertCounts.get(pid) || 0
      );
      const regressionProb = computeRegressionProbability(
        weightTrend, engagementStability, stressLoad, recoveryScore, performanceLevel
      );
      const interventionDays = computeInterventionDays(
        dropoutProb, regressionProb, performanceLevel, riskLevel
      );
      const driver = determinePredictionDriver(
        adherence, clusterType, stressLoad, recoveryScore,
        planEfficacy, weightTrend, consistencyScore, goalProb
      );

      const snapCount = snapshotCounts.get(pid) || 0;
      const hasWearable = wearableSet.has(pid);
      const confidence = computeConfidenceScore(
        snapCount, hasWearable, !!cluster, snapCount * 2, consistencyScore
      );

      predictions.push({
        patient_id: pid,
        predicted_goal_achievement_probability: goalProb,
        predicted_stagnation_probability: stagnationProb,
        predicted_dropout_probability: dropoutProb,
        predicted_regression_probability: regressionProb,
        predicted_time_to_next_intervention_days: interventionDays,
        prediction_confidence_score: confidence,
        main_prediction_driver: driver,
        prediction_window_days: 30,
        goal_classification: classifyGoal(goalProb),
        stagnation_classification: classifyStagnation(stagnationProb),
        dropout_classification: classifyStagnation(dropoutProb),
        regression_classification: classifyStagnation(regressionProb),
        confidence_classification: classifyConfidence(confidence),
        calculation_metadata: {
          inputs: { adherence, weightTrend, clusterType, performanceLevel, planEfficacy, riskLevel, stressLoad, recoveryScore },
          engine_version: ENGINE_VERSION,
        },
        engine_version: ENGINE_VERSION,
        updated_at: new Date().toISOString(),
      });
    }

    // 9. Upsert
    if (predictions.length > 0) {
      const { error } = await supabase
        .from("patient_predicted_outcomes")
        .upsert(predictions, { onConflict: "patient_id" });

      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ processed: predictions.length, engine_version: ENGINE_VERSION }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
