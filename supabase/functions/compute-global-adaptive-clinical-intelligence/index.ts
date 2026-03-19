import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENGINE_VERSION = "1.0.0";
const MAX_ADJUSTMENT_PERCENT = 5; // ±5% max per cycle
const MIN_SAMPLE_SIZE = 15; // Minimum evidence required

// ─── Evidence Signal Computation ───
function computeInterventionSuccessRate(adjustments: any[]): { value: number; sample: number } {
  if (!adjustments?.length) return { value: 0, sample: 0 };
  const reversed = adjustments.filter((a: any) => a.was_reversed);
  const rate = ((adjustments.length - reversed.length) / adjustments.length) * 100;
  return { value: Math.round(rate * 100) / 100, sample: adjustments.length };
}

function computeAutomationSafetyIndex(adjustments: any[]): { value: number; sample: number } {
  if (!adjustments?.length) return { value: 100, sample: 0 };
  const guardrailApproved = adjustments.filter((a: any) => a.approved_by_guardrail);
  const reversed = adjustments.filter((a: any) => a.was_reversed);
  const approvalRate = (guardrailApproved.length / adjustments.length) * 50;
  const safetyRate = ((adjustments.length - reversed.length) / adjustments.length) * 50;
  return { value: Math.round(approvalRate + safetyRate), sample: adjustments.length };
}

function computeProtocolEffectivenessIndex(matrix: any[]): { value: number; sample: number } {
  if (!matrix?.length) return { value: 0, sample: 0 };
  const totalSample = matrix.reduce((s: number, m: any) => s + (m.sample_size || 0), 0);
  const weightedScore = matrix.reduce((s: number, m: any) => s + (m.success_score || 0) * (m.sample_size || 1), 0);
  return { value: Math.round((weightedScore / Math.max(totalSample, 1)) * 100) / 100, sample: totalSample };
}

function computePredictionAccuracyIndex(predictions: any[], snapshots: any[]): { value: number; sample: number } {
  if (!predictions?.length || !snapshots?.length) return { value: 50, sample: 0 };
  const snapshotMap = new Map<string, any>();
  for (const s of snapshots) {
    if (!snapshotMap.has(s.patient_id)) snapshotMap.set(s.patient_id, s);
  }
  let correct = 0;
  let total = 0;
  for (const p of predictions) {
    const snap = snapshotMap.get(p.patient_id);
    if (!snap) continue;
    total++;
    const predictedGoal = (p.predicted_goal_probability ?? 50) > 50;
    const actualProgress = (snap.performance_level ?? 'moderate') !== 'critical';
    if (predictedGoal === actualProgress) correct++;
  }
  if (total === 0) return { value: 50, sample: 0 };
  return { value: Math.round((correct / total) * 100), sample: total };
}

function computeClusterResponseVariance(matrix: any[]): { value: number; sample: number } {
  if (!matrix?.length || matrix.length < 2) return { value: 0, sample: 0 };
  const scores = matrix.map((m: any) => m.success_score || 0);
  const mean = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
  const variance = scores.reduce((s: number, v: number) => s + Math.pow(v - mean, 2), 0) / scores.length;
  return { value: Math.round(Math.sqrt(variance) * 100) / 100, sample: matrix.length };
}

// ─── Maturity Calculation ───
function computeMaturityScore(signals: Map<string, number>): { score: number; level: string } {
  const predictionAcc = signals.get("prediction_accuracy_index") ?? 50;
  const therapyEff = signals.get("protocol_effectiveness_index") ?? 0;
  const interventionSuccess = signals.get("intervention_success_rate") ?? 0;
  const automationSafety = signals.get("automation_safety_index") ?? 0;
  const clusterVar = signals.get("cluster_response_variance") ?? 50;

  const stabilityComponent = Math.max(0, 100 - clusterVar * 2);
  const score = Math.round(
    predictionAcc * 0.25 +
    therapyEff * 0.25 +
    interventionSuccess * 0.20 +
    automationSafety * 0.15 +
    stabilityComponent * 0.15
  );

  let level: string;
  if (score >= 85) level = "elite_clinical_system";
  else if (score >= 70) level = "high_precision";
  else if (score >= 55) level = "optimized";
  else if (score >= 35) level = "developing_intelligence";
  else level = "early_learning";

  return { score: Math.min(score, 100), level };
}

// ─── Recalibration Logic ───
interface RecalibrationAction {
  component: string;
  parameter: string;
  oldWeight: number;
  newWeight: number;
  adjustPercent: number;
  reason: string;
  evidenceStrength: number;
  sampleSize: number;
}

function computeRecalibrations(
  currentState: any[],
  signals: Map<string, number>,
  signalSamples: Map<string, number>
): RecalibrationAction[] {
  const actions: RecalibrationAction[] = [];
  const stateMap = new Map<string, any>();
  for (const s of currentState) {
    stateMap.set(`${s.engine_component}::${s.parameter_name}`, s);
  }

  // Rule 1: If intervention success rate is high, increase automation confidence threshold
  const interventionSuccess = signals.get("intervention_success_rate") ?? 0;
  const interventionSample = signalSamples.get("intervention_success_rate") ?? 0;
  if (interventionSample >= MIN_SAMPLE_SIZE && interventionSuccess > 80) {
    const key = "automation_engine::confidence_threshold";
    const current = stateMap.get(key)?.current_weight ?? 70;
    const adj = Math.min(MAX_ADJUSTMENT_PERCENT, (interventionSuccess - 80) * 0.5);
    if (adj > 0.5) {
      actions.push({
        component: "automation_engine",
        parameter: "confidence_threshold",
        oldWeight: current,
        newWeight: Math.round((current - adj) * 100) / 100, // Lower threshold = more automation
        adjustPercent: -adj,
        reason: `Intervention success rate ${interventionSuccess}% justifies lower confidence threshold`,
        evidenceStrength: Math.min(interventionSuccess, 95),
        sampleSize: interventionSample,
      });
    }
  }

  // Rule 2: If automation safety is low, increase safety constraints
  const automationSafety = signals.get("automation_safety_index") ?? 100;
  const automationSample = signalSamples.get("automation_safety_index") ?? 0;
  if (automationSample >= MIN_SAMPLE_SIZE && automationSafety < 60) {
    const key = "automation_engine::caloric_adjustment_limit";
    const current = stateMap.get(key)?.current_weight ?? 5;
    const adj = Math.min(MAX_ADJUSTMENT_PERCENT, (60 - automationSafety) * 0.3);
    if (adj > 0.5) {
      actions.push({
        component: "automation_engine",
        parameter: "caloric_adjustment_limit",
        oldWeight: current,
        newWeight: Math.round((current - adj * 0.1) * 100) / 100,
        adjustPercent: -adj,
        reason: `Automation safety index ${automationSafety}% requires reduced caloric adjustment limits`,
        evidenceStrength: Math.min(100 - automationSafety, 90),
        sampleSize: automationSample,
      });
    }
  }

  // Rule 3: If protocol effectiveness varies by cluster, adjust cluster weights
  const clusterVariance = signals.get("cluster_response_variance") ?? 0;
  const clusterSample = signalSamples.get("cluster_response_variance") ?? 0;
  if (clusterSample >= MIN_SAMPLE_SIZE && clusterVariance > 20) {
    const key = "cluster_engine::variance_sensitivity";
    const current = stateMap.get(key)?.current_weight ?? 1.0;
    const adj = Math.min(MAX_ADJUSTMENT_PERCENT, clusterVariance * 0.1);
    if (adj > 0.5) {
      actions.push({
        component: "cluster_engine",
        parameter: "variance_sensitivity",
        oldWeight: current,
        newWeight: Math.round((current + adj * 0.01) * 100) / 100,
        adjustPercent: adj,
        reason: `High cluster response variance (${clusterVariance}) requires increased sensitivity`,
        evidenceStrength: Math.min(clusterVariance * 2, 80),
        sampleSize: clusterSample,
      });
    }
  }

  // Rule 4: If prediction accuracy is high, increase prediction weight in orchestration
  const predictionAcc = signals.get("prediction_accuracy_index") ?? 50;
  const predictionSample = signalSamples.get("prediction_accuracy_index") ?? 0;
  if (predictionSample >= MIN_SAMPLE_SIZE && predictionAcc > 70) {
    const key = "outcome_prediction_engine::orchestration_weight";
    const current = stateMap.get(key)?.current_weight ?? 0.20;
    const adj = Math.min(MAX_ADJUSTMENT_PERCENT, (predictionAcc - 70) * 0.15);
    if (adj > 0.5) {
      actions.push({
        component: "outcome_prediction_engine",
        parameter: "orchestration_weight",
        oldWeight: current,
        newWeight: Math.round((current + adj * 0.01) * 100) / 100,
        adjustPercent: adj,
        reason: `Prediction accuracy ${predictionAcc}% justifies higher orchestration weight`,
        evidenceStrength: predictionAcc,
        sampleSize: predictionSample,
      });
    }
  }

  // Rule 5: If protocol effectiveness is very high for specific protocols, boost simulation weight
  const protocolEff = signals.get("protocol_effectiveness_index") ?? 0;
  const protocolSample = signalSamples.get("protocol_effectiveness_index") ?? 0;
  if (protocolSample >= MIN_SAMPLE_SIZE && protocolEff > 65) {
    const key = "simulation_engine::protocol_history_weight";
    const current = stateMap.get(key)?.current_weight ?? 0.15;
    const adj = Math.min(MAX_ADJUSTMENT_PERCENT, (protocolEff - 65) * 0.2);
    if (adj > 0.5) {
      actions.push({
        component: "simulation_engine",
        parameter: "protocol_history_weight",
        oldWeight: current,
        newWeight: Math.round((current + adj * 0.01) * 100) / 100,
        adjustPercent: adj,
        reason: `Protocol effectiveness ${protocolEff}% supports higher historical weight in simulations`,
        evidenceStrength: Math.min(protocolEff, 90),
        sampleSize: protocolSample,
      });
    }
  }

  return actions;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Load data sources in parallel
    const [
      { data: adjustments },
      { data: clusterMatrix },
      { data: predictions },
      { data: snapshots },
      { data: currentLearningState },
    ] = await Promise.all([
      supabase.from("clinical_auto_adjustment_logs").select("*").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
      supabase.from("cluster_protocol_matrix").select("*"),
      supabase.from("patient_clinical_outcome_predictions").select("patient_id, predicted_goal_probability, confidence_score").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
      supabase.from("patient_clinical_snapshots").select("patient_id, performance_level").order("snapshot_date", { ascending: false }),
      supabase.from("global_clinical_learning_state").select("*"),
    ]);

    // 2. Compute evidence signals
    const interventionSuccess = computeInterventionSuccessRate(adjustments || []);
    const automationSafety = computeAutomationSafetyIndex(adjustments || []);
    const protocolEffectiveness = computeProtocolEffectivenessIndex(clusterMatrix || []);
    const predictionAccuracy = computePredictionAccuracyIndex(predictions || [], snapshots || []);
    const clusterVariance = computeClusterResponseVariance(clusterMatrix || []);

    const signalEntries = [
      { signal_name: "intervention_success_rate", signal_value: interventionSuccess.value, sample_size: interventionSuccess.sample, confidence: Math.min(interventionSuccess.sample * 3, 100), signal_trend: interventionSuccess.value > 70 ? "positive" : interventionSuccess.value > 40 ? "stable" : "negative", engine_version: ENGINE_VERSION },
      { signal_name: "automation_safety_index", signal_value: automationSafety.value, sample_size: automationSafety.sample, confidence: Math.min(automationSafety.sample * 3, 100), signal_trend: automationSafety.value > 80 ? "positive" : "stable", engine_version: ENGINE_VERSION },
      { signal_name: "protocol_effectiveness_index", signal_value: protocolEffectiveness.value, sample_size: protocolEffectiveness.sample, confidence: Math.min(protocolEffectiveness.sample, 100), signal_trend: protocolEffectiveness.value > 60 ? "positive" : "stable", engine_version: ENGINE_VERSION },
      { signal_name: "prediction_accuracy_index", signal_value: predictionAccuracy.value, sample_size: predictionAccuracy.sample, confidence: Math.min(predictionAccuracy.sample * 2, 100), signal_trend: predictionAccuracy.value > 65 ? "positive" : "stable", engine_version: ENGINE_VERSION },
      { signal_name: "cluster_response_variance", signal_value: clusterVariance.value, sample_size: clusterVariance.sample, confidence: Math.min(clusterVariance.sample * 5, 100), signal_trend: clusterVariance.value < 15 ? "positive" : clusterVariance.value > 30 ? "negative" : "stable", engine_version: ENGINE_VERSION },
    ];

    // Persist signals
    await supabase.from("global_evidence_signals").delete().gte("computed_at", new Date(Date.now() - 86400000).toISOString());
    await supabase.from("global_evidence_signals").insert(signalEntries);

    // 3. Build signal maps
    const signalMap = new Map<string, number>();
    const sampleMap = new Map<string, number>();
    for (const s of signalEntries) {
      signalMap.set(s.signal_name, s.signal_value);
      sampleMap.set(s.signal_name, s.sample_size);
    }

    // 4. Compute recalibrations
    const recalibrations = computeRecalibrations(currentLearningState || [], signalMap, sampleMap);

    // 5. Apply recalibrations
    for (const r of recalibrations) {
      // Upsert learning state
      await supabase.from("global_clinical_learning_state").upsert({
        engine_component: r.component,
        parameter_name: r.parameter,
        current_weight: r.newWeight,
        previous_weight: r.oldWeight,
        adjustment_reason: r.reason,
        evidence_strength: r.evidenceStrength,
        sample_size: r.sampleSize,
        engine_version: ENGINE_VERSION,
        last_updated_at: new Date().toISOString(),
      }, { onConflict: "engine_component,parameter_name" });

      // Audit log
      await supabase.from("recalibration_audit_log").insert({
        engine_component: r.component,
        parameter_name: r.parameter,
        old_weight: r.oldWeight,
        new_weight: r.newWeight,
        adjustment_percent: r.adjustPercent,
        reason: r.reason,
        evidence_strength: r.evidenceStrength,
        sample_size: r.sampleSize,
        status: "auto_applied",
        engine_version: ENGINE_VERSION,
      });
    }

    // 6. Compute and persist maturity
    const maturity = computeMaturityScore(signalMap);
    const totalPatients = (snapshots || []).length;
    const totalInterventions = (adjustments || []).length;

    await supabase.from("platform_maturity_history").insert({
      maturity_score: maturity.score,
      maturity_level: maturity.level,
      prediction_accuracy: predictionAccuracy.value,
      therapeutic_efficacy: protocolEffectiveness.value,
      population_stability: Math.max(0, 100 - clusterVariance.value * 2),
      global_dropout_rate: 0, // computed elsewhere
      result_consistency: interventionSuccess.value,
      total_patients_analyzed: totalPatients,
      total_interventions_analyzed: totalInterventions,
      engine_version: ENGINE_VERSION,
    });

    return new Response(
      JSON.stringify({
        engine_version: ENGINE_VERSION,
        signals_computed: signalEntries.length,
        recalibrations_applied: recalibrations.length,
        maturity_score: maturity.score,
        maturity_level: maturity.level,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
