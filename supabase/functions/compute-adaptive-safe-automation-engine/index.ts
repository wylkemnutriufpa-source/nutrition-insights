import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ENGINE_VERSION = "1.0.0";

interface PatientState {
  patient_id: string;
  prediction_confidence: number;
  performance_level: number;
  physiological_stability: number;
  dropout_risk: number;
  regression_risk: number;
  cluster_type: string;
  longitudinal_stability: number;
}

function classifyAutomationZone(s: PatientState): string {
  // No automation if confidence is too low or critical risk
  if (s.prediction_confidence < 40 || s.dropout_risk > 70 || s.regression_risk > 60) {
    return "no_automation";
  }
  // Limited if moderate risk or unstable cluster
  if (
    s.prediction_confidence < 60 ||
    s.dropout_risk > 40 ||
    s.regression_risk > 35 ||
    s.cluster_type === "behavioral_unstable" ||
    s.physiological_stability < 40
  ) {
    return "limited_automation";
  }
  // High confidence zone
  if (
    s.prediction_confidence >= 80 &&
    s.performance_level >= 60 &&
    s.physiological_stability >= 70 &&
    s.dropout_risk <= 15 &&
    s.regression_risk <= 15 &&
    s.longitudinal_stability >= 65
  ) {
    return "high_confidence_auto_zone";
  }
  return "adaptive_safe_zone";
}

function isSafeToAutoAdjust(
  zone: string,
  hasActiveCriticalAlerts: boolean,
  hasRecentRegression: boolean
): boolean {
  if (zone === "no_automation" || zone === "limited_automation") return false;
  if (hasActiveCriticalAlerts) return false;
  if (hasRecentRegression) return false;
  return true;
}

interface EligibleAdjustment {
  type: string;
  parameters: Record<string, unknown>;
  driver: string;
  expected_effect: string;
  confidence: number;
}

function identifyEligibleAdjustments(
  zone: string,
  perf: number,
  adherence: number,
  weightTrend: string | null,
  daysOnPlan: number
): EligibleAdjustment[] {
  const adjustments: EligibleAdjustment[] = [];

  // Only for safe zones
  if (zone !== "adaptive_safe_zone" && zone !== "high_confidence_auto_zone") {
    return adjustments;
  }

  const maxCaloriePercent = zone === "high_confidence_auto_zone" ? 5 : 3;

  // 1. Micro caloric adjustment
  if (daysOnPlan >= 14 && adherence >= 70) {
    if (weightTrend === "stagnated" || weightTrend === "slow_loss") {
      adjustments.push({
        type: "caloric_micro_adjustment",
        parameters: {
          direction: "decrease",
          percent: Math.min(maxCaloriePercent, 3),
          reason: "stagnation_detected",
        },
        driver: "weight_stagnation",
        expected_effect: "Break plateau by reducing caloric intake slightly",
        confidence: adherence >= 80 ? 85 : 70,
      });
    } else if (weightTrend === "fast_loss" && perf >= 70) {
      adjustments.push({
        type: "caloric_micro_adjustment",
        parameters: {
          direction: "increase",
          percent: Math.min(maxCaloriePercent, 3),
          reason: "fast_loss_prevention",
        },
        driver: "rapid_weight_loss",
        expected_effect: "Slow down weight loss to preserve muscle mass",
        confidence: 75,
      });
    }
  }

  // 2. Behavioral reinforcement
  if (adherence < 75 && adherence >= 55 && perf >= 40) {
    adjustments.push({
      type: "behavioral_reinforcement",
      parameters: {
        action: "activate_light_intervention_template",
        intensity: "low",
      },
      driver: "moderate_adherence_drop",
      expected_effect: "Improve adherence through structured reminders",
      confidence: 72,
    });
  }

  // 3. Monitoring extension
  if (perf >= 65 && adherence >= 70 && daysOnPlan < 14) {
    adjustments.push({
      type: "monitoring_extension",
      parameters: {
        action: "extend_observation_window",
        extra_days: 7,
      },
      driver: "early_plan_good_response",
      expected_effect: "Avoid premature intervention on a working plan",
      confidence: 80,
    });
  }

  // 4. Meal distribution adjustment (high confidence only)
  if (zone === "high_confidence_auto_zone" && adherence >= 80) {
    if (weightTrend === "stagnated" && daysOnPlan >= 21) {
      adjustments.push({
        type: "meal_distribution_adjustment",
        parameters: {
          action: "redistribute_energy",
          strategy: "front_load_calories",
        },
        driver: "prolonged_stagnation_high_adherence",
        expected_effect: "Change energy timing to break plateau",
        confidence: 68,
      });
    }
  }

  return adjustments;
}

function shouldReverseAdjustment(
  adherenceDelta: number,
  riskIncrease: boolean,
  physioDecline: boolean,
  weightRegression: boolean
): { reverse: boolean; reason: string } {
  if (weightRegression) return { reverse: true, reason: "weight_regression_detected" };
  if (adherenceDelta < -15) return { reverse: true, reason: "significant_adherence_drop" };
  if (riskIncrease) return { reverse: true, reason: "clinical_risk_increased" };
  if (physioDecline) return { reverse: true, reason: "physiological_decline_detected" };
  return { reverse: false, reason: "" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let execLogId: string | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Log pipeline start
    try {
      const { data } = await sb.rpc("log_pipeline_execution", {
        _pipeline_name: "compute-adaptive-safe-automation-engine",
        _status: "started",
        _metadata: {},
      });
      execLogId = data as string | null;
    } catch (_) {}

    const body = await req.json().catch(() => ({}));
    const targetPatientId = body.patient_id || null;

    // 1. Load patients with their clinical state
    let patientsQuery = sb
      .from("patient_clinical_snapshots")
      .select("patient_id, performance_score, weight_trend_status, adherence_momentum, engagement_stability_index")
      .order("snapshot_date", { ascending: false });

    if (targetPatientId) {
      patientsQuery = patientsQuery.eq("patient_id", targetPatientId);
    }

    const { data: snapshots } = await patientsQuery.limit(500);
    if (!snapshots || snapshots.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, engine_version: ENGINE_VERSION }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplicate to latest per patient
    const latestByPatient = new Map<string, any>();
    for (const s of snapshots) {
      if (!latestByPatient.has(s.patient_id)) {
        latestByPatient.set(s.patient_id, s);
      }
    }

    // 2. Load predictions
    const patientIds = Array.from(latestByPatient.keys());
    const { data: predictions } = await sb
      .from("patient_outcome_predictions")
      .select("patient_id, dropout_probability, regression_probability, confidence_score")
      .in("patient_id", patientIds)
      .order("predicted_at", { ascending: false });

    const predByPatient = new Map<string, any>();
    for (const p of predictions || []) {
      if (!predByPatient.has(p.patient_id)) {
        predByPatient.set(p.patient_id, p);
      }
    }

    // 3. Load active critical alerts
    const { data: critAlerts } = await sb
      .from("clinical_alerts")
      .select("patient_id")
      .in("patient_id", patientIds)
      .eq("is_active", true)
      .eq("severity", "critical");

    const criticalAlertPatients = new Set((critAlerts || []).map((a: any) => a.patient_id));

    // 4. Load metabolic clusters
    const { data: clusters } = await sb
      .from("patient_metabolic_clusters")
      .select("patient_id, cluster_type")
      .in("patient_id", patientIds)
      .order("computed_at", { ascending: false });

    const clusterByPatient = new Map<string, string>();
    for (const c of clusters || []) {
      if (!clusterByPatient.has(c.patient_id)) {
        clusterByPatient.set(c.patient_id, c.cluster_type);
      }
    }

    // 5. Load existing automation states
    const { data: existingStates } = await sb
      .from("patient_automation_state")
      .select("patient_id, automation_enabled, automation_level")
      .in("patient_id", patientIds);

    const stateByPatient = new Map<string, any>();
    for (const s of existingStates || []) {
      stateByPatient.set(s.patient_id, s);
    }

    // 6. Load active meal plans for days-on-plan
    const { data: activePlans } = await sb
      .from("meal_plans")
      .select("patient_id, created_at")
      .in("patient_id", patientIds)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    const planByPatient = new Map<string, any>();
    for (const p of activePlans || []) {
      if (!planByPatient.has(p.patient_id)) {
        planByPatient.set(p.patient_id, p);
      }
    }

    // 7. Check recent adjustments for reversal check
    const { data: recentAdjustments } = await sb
      .from("clinical_auto_adjustment_logs")
      .select("*")
      .in("patient_id", patientIds)
      .eq("was_reversed", false)
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .order("created_at", { ascending: false });

    // Process each patient
    const automationStates: any[] = [];
    const adjustmentLogs: any[] = [];
    const reversals: { id: string; reason: string }[] = [];
    let adjustmentsApplied = 0;

    for (const [patientId, snap] of latestByPatient) {
      const pred = predByPatient.get(patientId);
      const cluster = clusterByPatient.get(patientId) || "unknown";
      const existing = stateByPatient.get(patientId);
      const plan = planByPatient.get(patientId);

      // Skip if automation explicitly disabled
      if (existing && !existing.automation_enabled) continue;

      const patientState: PatientState = {
        patient_id: patientId,
        prediction_confidence: pred?.confidence_score ?? 50,
        performance_level: snap.performance_score ?? 50,
        physiological_stability: snap.engagement_stability_index ?? 50,
        dropout_risk: (pred?.dropout_probability ?? 0.3) * 100,
        regression_risk: (pred?.regression_probability ?? 0.3) * 100,
        cluster_type: cluster,
        longitudinal_stability: snap.engagement_stability_index ?? 50,
      };

      const zone = classifyAutomationZone(patientState);
      const hasCritical = criticalAlertPatients.has(patientId);
      const hasRecentRegression = snap.weight_trend_status === "regression";

      // Upsert automation state
      automationStates.push({
        patient_id: patientId,
        automation_zone: zone,
        prediction_confidence: patientState.prediction_confidence,
        performance_level: patientState.performance_level,
        physiological_stability: patientState.physiological_stability,
        dropout_risk: patientState.dropout_risk,
        regression_risk: patientState.regression_risk,
        cluster_type: cluster,
        longitudinal_stability: patientState.longitudinal_stability,
        automation_enabled: existing?.automation_enabled ?? true,
        automation_level: existing?.automation_level ?? "suggest_only",
        engine_version: ENGINE_VERSION,
        updated_at: new Date().toISOString(),
      });

      // Check for reversals on recent adjustments
      const patientAdj = (recentAdjustments || []).filter(
        (a: any) => a.patient_id === patientId
      );
      for (const adj of patientAdj) {
        const reversalCheck = shouldReverseAdjustment(
          (snap.adherence_momentum ?? 0) < -15 ? -20 : 0,
          hasCritical,
          (snap.engagement_stability_index ?? 100) < 30,
          snap.weight_trend_status === "regression"
        );
        if (reversalCheck.reverse) {
          reversals.push({ id: adj.id, reason: reversalCheck.reason });
        }
      }

      // Identify new adjustments
      if (isSafeToAutoAdjust(zone, hasCritical, hasRecentRegression)) {
        const daysOnPlan = plan
          ? Math.floor((Date.now() - new Date(plan.created_at).getTime()) / 86400000)
          : 0;

        const eligible = identifyEligibleAdjustments(
          zone,
          patientState.performance_level,
          snap.adherence_momentum ?? 60,
          snap.weight_trend_status,
          daysOnPlan
        );

        for (const adj of eligible) {
          adjustmentLogs.push({
            patient_id: patientId,
            adjustment_type: adj.type,
            adjustment_parameters: adj.parameters,
            triggering_driver: adj.driver,
            expected_clinical_effect: adj.expected_effect,
            automation_confidence: adj.confidence,
            approved_by_guardrail: true,
          });
          adjustmentsApplied++;
        }
      }
    }

    // Persist automation states
    if (automationStates.length > 0) {
      for (const state of automationStates) {
        await sb.from("patient_automation_state").upsert(state, {
          onConflict: "patient_id",
        });
      }
    }

    // Persist adjustment logs
    if (adjustmentLogs.length > 0) {
      await sb.from("clinical_auto_adjustment_logs").insert(adjustmentLogs);
    }

    // Process reversals
    for (const r of reversals) {
      await sb
        .from("clinical_auto_adjustment_logs")
        .update({
          was_reversed: true,
          reversed_at: new Date().toISOString(),
          reversal_reason: r.reason,
        })
        .eq("id", r.id);
    }

    // Finalize pipeline log
    if (execLogId) {
      try {
        await sb.rpc("finalize_pipeline_execution", {
          _id: execLogId,
          _status: "completed",
          _patients_processed: latestByPatient.size,
          _errors_count: 0,
          _error_details: null,
        });
      } catch (_) {}
    }

    return new Response(
      JSON.stringify({
        engine_version: ENGINE_VERSION,
        patients_processed: latestByPatient.size,
        adjustments_applied: adjustmentsApplied,
        reversals_processed: reversals.length,
        zone_distribution: {
          no_automation: automationStates.filter((s) => s.automation_zone === "no_automation").length,
          limited: automationStates.filter((s) => s.automation_zone === "limited_automation").length,
          adaptive_safe: automationStates.filter((s) => s.automation_zone === "adaptive_safe_zone").length,
          high_confidence: automationStates.filter((s) => s.automation_zone === "high_confidence_auto_zone").length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    // Log failure
    if (typeof execLogId !== "undefined" && execLogId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const sb2 = createClient(supabaseUrl, serviceKey);
        await sb2.rpc("finalize_pipeline_execution", {
          _id: execLogId,
          _status: "failed",
          _patients_processed: 0,
          _errors_count: 1,
          _error_details: { error: err.message },
        });
      } catch (_) {}
    }
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
