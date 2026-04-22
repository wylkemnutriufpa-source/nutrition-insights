import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";
import { validateBody } from "../_shared/validator.ts";
import { SimulationEngineSchema } from "../_shared/schemas.ts";

const ENGINE_VERSION = "1.0.0";

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

// ── Baseline Builder ────────────────────────────────────────
interface Baseline {
  adherence_7d: number;
  adherence_30d: number;
  weight_trend: string;
  cluster_type: string;
  plan_efficacy: number;
  caloric_response: string;
  performance_level: string;
  risk_level: string;
  dropout_risk: number;
  stress_load: number;
  recovery_score: number;
  consistency_score: number;
  engagement_stability: number;
  has_physio_data: boolean;
  snapshot_count: number;
  current_calories: number;
}

function buildDefaultBaseline(): Baseline {
  return {
    adherence_7d: 50, adherence_30d: 50, weight_trend: "stagnated",
    cluster_type: "behavioral_struggler", plan_efficacy: 50,
    caloric_response: "neutral", performance_level: "stable",
    risk_level: "attention", dropout_risk: 20, stress_load: 30,
    recovery_score: 60, consistency_score: 50, engagement_stability: 60,
    has_physio_data: false, snapshot_count: 0, current_calories: 1600,
  };
}

// ── Scenario Projections ────────────────────────────────────

interface ProjectedOutcome {
  projected_goal_achievement_delta: number;
  projected_adherence_delta: number;
  projected_stagnation_risk_delta: number;
  projected_dropout_risk_delta: number;
  projected_regression_risk_delta: number;
  projected_time_to_response_days: number;
}

interface ProjectedRisks {
  adherence_drop_risk: string;
  metabolic_stress_risk: string;
  disengagement_risk: string;
  regression_risk: string;
  low_confidence_risk: string;
}

function riskLevel(v: number): string {
  if (v >= 60) return "high";
  if (v >= 35) return "moderate";
  return "low";
}

function simulateCaloricReduction(b: Baseline): { outcomes: ProjectedOutcome; risks: ProjectedRisks } {
  const isResistant = b.cluster_type === "resistant_profile";
  const isAdaptive = b.cluster_type === "metabolic_adaptive";

  let goalDelta = isResistant ? 5 : isAdaptive ? 8 : 12;
  let adherenceDelta = b.adherence_7d >= 70 ? -3 : -8;
  let stagnationDelta = isResistant ? -5 : -15;
  let dropoutDelta = b.adherence_7d < 50 ? 8 : 2;
  let regressionDelta = -5;

  if (b.stress_load > 60) { adherenceDelta -= 5; dropoutDelta += 5; }

  return {
    outcomes: {
      projected_goal_achievement_delta: goalDelta,
      projected_adherence_delta: adherenceDelta,
      projected_stagnation_risk_delta: stagnationDelta,
      projected_dropout_risk_delta: dropoutDelta,
      projected_regression_risk_delta: regressionDelta,
      projected_time_to_response_days: isResistant ? 21 : 14,
    },
    risks: {
      adherence_drop_risk: riskLevel(Math.abs(adherenceDelta) * 8),
      metabolic_stress_risk: riskLevel(b.stress_load + 10),
      disengagement_risk: riskLevel(b.dropout_risk + dropoutDelta),
      regression_risk: "low",
      low_confidence_risk: riskLevel(100 - b.snapshot_count * 5),
    },
  };
}

function simulateCaloricIncrease(b: Baseline): { outcomes: ProjectedOutcome; risks: ProjectedRisks } {
  const isAdaptive = b.cluster_type === "metabolic_adaptive";

  let goalDelta = isAdaptive ? 5 : -3;
  let adherenceDelta = 5;
  let stagnationDelta = isAdaptive ? -10 : 5;
  let regressionDelta = b.weight_trend === "gaining" ? 10 : 3;

  return {
    outcomes: {
      projected_goal_achievement_delta: goalDelta,
      projected_adherence_delta: adherenceDelta,
      projected_stagnation_risk_delta: stagnationDelta,
      projected_dropout_risk_delta: -5,
      projected_regression_risk_delta: regressionDelta,
      projected_time_to_response_days: 14,
    },
    risks: {
      adherence_drop_risk: "low",
      metabolic_stress_risk: "low",
      disengagement_risk: riskLevel(b.dropout_risk - 5),
      regression_risk: riskLevel(regressionDelta * 5),
      low_confidence_risk: riskLevel(100 - b.snapshot_count * 5),
    },
  };
}

function simulateDietBreak(b: Baseline): { outcomes: ProjectedOutcome; risks: ProjectedRisks } {
  const isResistant = b.cluster_type === "resistant_profile";
  const isAdaptive = b.cluster_type === "metabolic_adaptive";
  const benefit = isResistant || isAdaptive;

  return {
    outcomes: {
      projected_goal_achievement_delta: benefit ? 10 : 2,
      projected_adherence_delta: benefit ? 8 : 3,
      projected_stagnation_risk_delta: benefit ? -20 : -5,
      projected_dropout_risk_delta: -5,
      projected_regression_risk_delta: benefit ? -3 : 5,
      projected_time_to_response_days: 7,
    },
    risks: {
      adherence_drop_risk: "low",
      metabolic_stress_risk: "low",
      disengagement_risk: riskLevel(b.dropout_risk - 5),
      regression_risk: benefit ? "low" : "moderate",
      low_confidence_risk: riskLevel(100 - b.snapshot_count * 5),
    },
  };
}

function simulateTemplateSwitch(b: Baseline): { outcomes: ProjectedOutcome; risks: ProjectedRisks } {
  const isStruggler = b.cluster_type === "behavioral_struggler" || b.cluster_type === "disengaging_patient";

  return {
    outcomes: {
      projected_goal_achievement_delta: isStruggler ? 8 : 3,
      projected_adherence_delta: isStruggler ? 12 : 5,
      projected_stagnation_risk_delta: -5,
      projected_dropout_risk_delta: isStruggler ? -10 : -3,
      projected_regression_risk_delta: -2,
      projected_time_to_response_days: 10,
    },
    risks: {
      adherence_drop_risk: "low",
      metabolic_stress_risk: "low",
      disengagement_risk: riskLevel(b.dropout_risk - 8),
      regression_risk: "low",
      low_confidence_risk: riskLevel(100 - b.snapshot_count * 5),
    },
  };
}

function simulateProtocolSwitch(b: Baseline): { outcomes: ProjectedOutcome; risks: ProjectedRisks } {
  const lowEfficacy = b.plan_efficacy < 40;

  return {
    outcomes: {
      projected_goal_achievement_delta: lowEfficacy ? 15 : 5,
      projected_adherence_delta: lowEfficacy ? 8 : -2,
      projected_stagnation_risk_delta: lowEfficacy ? -18 : -5,
      projected_dropout_risk_delta: lowEfficacy ? -5 : 3,
      projected_regression_risk_delta: -5,
      projected_time_to_response_days: 14,
    },
    risks: {
      adherence_drop_risk: lowEfficacy ? "low" : "moderate",
      metabolic_stress_risk: "low",
      disengagement_risk: riskLevel(b.dropout_risk + (lowEfficacy ? -5 : 3)),
      regression_risk: "low",
      low_confidence_risk: riskLevel(100 - b.snapshot_count * 5),
    },
  };
}

function simulateNoChange(b: Baseline): { outcomes: ProjectedOutcome; risks: ProjectedRisks } {
  const stagnating = b.weight_trend === "stagnated";
  const goodProgress = b.weight_trend === "expected_loss" && b.adherence_7d >= 70;

  return {
    outcomes: {
      projected_goal_achievement_delta: goodProgress ? 3 : stagnating ? -8 : 0,
      projected_adherence_delta: goodProgress ? 2 : stagnating ? -5 : -1,
      projected_stagnation_risk_delta: stagnating ? 15 : -2,
      projected_dropout_risk_delta: stagnating ? 10 : goodProgress ? -3 : 2,
      projected_regression_risk_delta: stagnating ? 8 : -2,
      projected_time_to_response_days: 0,
    },
    risks: {
      adherence_drop_risk: riskLevel(stagnating ? 40 : 10),
      metabolic_stress_risk: "low",
      disengagement_risk: riskLevel(b.dropout_risk + (stagnating ? 10 : -3)),
      regression_risk: riskLevel(stagnating ? 35 : 10),
      low_confidence_risk: riskLevel(100 - b.snapshot_count * 5),
    },
  };
}

function simulateBehavioralSimplification(b: Baseline): { outcomes: ProjectedOutcome; risks: ProjectedRisks } {
  const isDisengaging = b.cluster_type === "disengaging_patient";
  const isStruggler = b.cluster_type === "behavioral_struggler";
  const benefit = isDisengaging || isStruggler || b.adherence_7d < 50;

  return {
    outcomes: {
      projected_goal_achievement_delta: benefit ? 10 : 2,
      projected_adherence_delta: benefit ? 15 : 5,
      projected_stagnation_risk_delta: -3,
      projected_dropout_risk_delta: benefit ? -15 : -5,
      projected_regression_risk_delta: -5,
      projected_time_to_response_days: 7,
    },
    risks: {
      adherence_drop_risk: "low",
      metabolic_stress_risk: "low",
      disengagement_risk: riskLevel(b.dropout_risk - (benefit ? 15 : 5)),
      regression_risk: "low",
      low_confidence_risk: riskLevel(100 - b.snapshot_count * 5),
    },
  };
}

// ── Confidence Score ────────────────────────────────────────
function computeSimulationConfidence(b: Baseline): number {
  let score = 30;
  if (b.snapshot_count >= 14) score += 20;
  else if (b.snapshot_count >= 7) score += 10;
  else score -= 10;
  if (b.has_physio_data) score += 15;
  if (b.adherence_30d > 0) score += 10;
  score += b.consistency_score * 0.1;
  if (b.engagement_stability >= 60) score += 5;
  return clamp(score);
}

function classifyConfidence(s: number): string {
  if (s >= 70) return "alta_confianca";
  if (s >= 45) return "media_confianca";
  return "baixa_confianca";
}

// ── Best Decision ───────────────────────────────────────────
interface ScenarioResult {
  type: string;
  outcomes: ProjectedOutcome;
  risks: ProjectedRisks;
  decision: string;
}

function scenarioScore(o: ProjectedOutcome): number {
  return o.projected_goal_achievement_delta * 2
    + o.projected_adherence_delta * 1.5
    - o.projected_stagnation_risk_delta * 1
    - o.projected_dropout_risk_delta * 1.5
    - o.projected_regression_risk_delta * 1;
}

const TYPE_TO_DECISION: Record<string, string> = {
  caloric_adjustment_down: "apply_caloric_reduction",
  caloric_adjustment_up: "apply_caloric_increase",
  diet_break: "start_diet_break",
  template_switch: "switch_template",
  protocol_switch: "switch_protocol",
  behavioral_simplification: "simplify_plan",
  no_change_monitoring: "keep_and_monitor",
};

export async function handler(req: Request, supabaseClient?: any) {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = supabaseClient ?? createClient(
      Deno.env.get("SUPABASE_URL") ?? "", 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: body, response: errorResponse } = await validateBody(req, SimulationEngineSchema);
    // SimulationEngineSchema has optional patient_id and scenario
    const targetPatientId = body?.patient_id;
    const targetScenario = body?.scenario;

    // Get patients to simulate
    let patientIds: string[] = [];
    if (targetPatientId) {
      patientIds = [targetPatientId];
    } else {
      // Run for high-priority patients (high risk or high dropout)
      const { data: predictions } = await supabase
        .from("patient_predicted_outcomes")
        .select("patient_id")
        .or("predicted_dropout_probability.gte.40,predicted_stagnation_probability.gte.50")
        .limit(50);
      patientIds = (predictions || []).map((p: any) => p.patient_id);
    }

    if (!patientIds.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load data
    const { data: snapshots } = await supabase
      .from("patient_clinical_snapshots")
      .select("*")
      .in("patient_id", patientIds)
      .order("snapshot_date", { ascending: false });

    const { data: perfStates } = await supabase
      .from("patient_performance_state")
      .select("*")
      .in("patient_id", patientIds);

    const { data: clusters } = await supabase
      .from("patient_metabolic_clusters")
      .select("*")
      .in("patient_id", patientIds);

    const { data: physioSnaps } = await supabase
      .from("patient_physiology_snapshots")
      .select("patient_id")
      .in("patient_id", patientIds);

    const { data: mealPlans } = await supabase
      .from("meal_plans")
      .select("patient_id, id, protocol_id, calorie_target")
      .in("patient_id", patientIds)
      .eq("is_active", true);

    // Build lookup maps
    const latestSnap = new Map<string, any>();
    const snapCounts = new Map<string, number>();
    for (const s of snapshots || []) {
      if (!latestSnap.has(s.patient_id)) latestSnap.set(s.patient_id, s);
      snapCounts.set(s.patient_id, (snapCounts.get(s.patient_id) || 0) + 1);
    }
    const perfMap = new Map((perfStates || []).map((p: any) => [p.patient_id, p]));
    const clusterMap = new Map((clusters || []).map((c: any) => [c.patient_id, c]));
    const physioSet = new Set((physioSnaps || []).map((p: any) => p.patient_id));
    const planMap = new Map((mealPlans || []).map((m: any) => [m.patient_id, m]));

    const allSimulations: any[] = [];

    for (const pid of patientIds) {
      const snap = latestSnap.get(pid) as any;
      const perf = perfMap.get(pid) as any;
      const cluster = clusterMap.get(pid) as any;
      const plan = planMap.get(pid) as any;

      const baseline: Baseline = {
        adherence_7d: snap?.adherence_7d ?? 50,
        adherence_30d: snap?.adherence_30d ?? 50,
        weight_trend: snap?.weight_trend_status ?? "stagnated",
        cluster_type: cluster?.cluster_type ?? "behavioral_struggler",
        plan_efficacy: perf?.plan_efficacy_score ?? 50,
        caloric_response: "neutral",
        performance_level: perf?.performance_level ?? "stable",
        risk_level: snap?.risk_level ?? "attention",
        dropout_risk: perf?.dropout_risk_score ?? 20,
        stress_load: perf?.stress_load_score ?? 30,
        recovery_score: perf?.recovery_score ?? 60,
        consistency_score: perf?.consistency_score ?? 50,
        engagement_stability: snap?.engagement_stability_index ?? 60,
        has_physio_data: physioSet.has(pid),
        snapshot_count: snapCounts.get(pid) || 0,
        current_calories: plan?.calorie_target ?? 1600,
      };

      const confidence = computeSimulationConfidence(baseline);
      const confClass = classifyConfidence(confidence);

      // Run all scenarios
      const scenarios: ScenarioResult[] = [
        { type: "caloric_adjustment_down", ...simulateCaloricReduction(baseline), decision: "apply_caloric_reduction" },
        { type: "caloric_adjustment_up", ...simulateCaloricIncrease(baseline), decision: "apply_caloric_increase" },
        { type: "diet_break", ...simulateDietBreak(baseline), decision: "start_diet_break" },
        { type: "template_switch", ...simulateTemplateSwitch(baseline), decision: "switch_template" },
        { type: "protocol_switch", ...simulateProtocolSwitch(baseline), decision: "switch_protocol" },
        { type: "behavioral_simplification", ...simulateBehavioralSimplification(baseline), decision: "simplify_plan" },
        { type: "no_change_monitoring", ...simulateNoChange(baseline), decision: "keep_and_monitor" },
      ];

      // Find best scenario
      let bestIdx = 0;
      let bestScore = -Infinity;
      for (let i = 0; i < scenarios.length; i++) {
        const s = scenarioScore(scenarios[i].outcomes);
        if (s > bestScore) { bestScore = s; bestIdx = i; }
      }

      const bestDecision = confClass === "baixa_confianca" ? "require_manual_review" : scenarios[bestIdx].decision;

      for (const sc of scenarios) {
        allSimulations.push({
          patient_id: pid,
          current_plan_id: plan?.id || null,
          current_protocol_id: plan?.protocol_id || null,
          simulation_type: sc.type,
          simulated_intervention: { type: sc.type, calories: baseline.current_calories },
          baseline_state: baseline,
          projected_outcomes: sc.outcomes,
          projected_risks: sc.risks,
          recommended_decision: sc.type === scenarios[bestIdx].type ? bestDecision : sc.decision,
          simulation_confidence_score: confidence,
          confidence_classification: confClass,
          engine_version: ENGINE_VERSION,
        });
      }
    }

    // Delete old simulations for these patients then insert new
    if (allSimulations.length > 0) {
      await supabase
        .from("clinical_intervention_simulations")
        .delete()
        .in("patient_id", patientIds);

      const { error } = await supabase
        .from("clinical_intervention_simulations")
        .insert(allSimulations);

      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ processed: patientIds.length, simulations: allSimulations.length, engine_version: ENGINE_VERSION }),
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
