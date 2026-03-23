import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════
// CLINICAL MILESTONE EVALUATOR ENGINE v1.0.0
// ═══════════════════════════════════════════════════════════
// Runs on schedule (2x/day). Evaluates patients who have
// reached a milestone day (7, 15, 30, 45, 60) after plan
// delivery. Computes metrics, classifies, and triggers
// automated actions.
// ═══════════════════════════════════════════════════════════

interface PatientMetrics {
  adherence_score: number;
  weight_delta: number;
  checklist_completion_rate: number;
  engagement_index: number;
  dropout_risk_score: number;
  days_since_last_checkin: number;
  login_frequency: number;
}

type Classification =
  | "positive_progress"
  | "stagnation"
  | "behavioral_risk"
  | "dropout_risk"
  | "metabolic_unexpected"
  | "maintenance_ready";

function classifyPatient(metrics: PatientMetrics, milestoneKey: string): { classification: Classification; riskLevel: string } {
  const { adherence_score, weight_delta, checklist_completion_rate, engagement_index, dropout_risk_score, days_since_last_checkin } = metrics;

  // Critical dropout risk
  if (dropout_risk_score >= 70 || days_since_last_checkin >= 7) {
    return { classification: "dropout_risk", riskLevel: "critical" };
  }

  // Behavioral risk
  if (adherence_score < 40 || (engagement_index < 30 && days_since_last_checkin >= 4)) {
    return { classification: "behavioral_risk", riskLevel: "risk" };
  }

  // Stagnation (relevant after day 15+)
  if (milestoneKey !== "day_7" && Math.abs(weight_delta) < 0.3 && adherence_score >= 60) {
    return { classification: "stagnation", riskLevel: "attention" };
  }

  // Metabolic unexpected (losing too fast or gaining with good adherence)
  if (weight_delta > 1.5 && adherence_score >= 60) {
    return { classification: "metabolic_unexpected", riskLevel: "attention" };
  }
  if (weight_delta < -3 && milestoneKey === "day_7") {
    return { classification: "metabolic_unexpected", riskLevel: "attention" };
  }

  // Maintenance ready (day 60 only)
  if (milestoneKey === "day_60" && adherence_score >= 70 && engagement_index >= 60 && weight_delta <= 0) {
    return { classification: "maintenance_ready", riskLevel: "stable" };
  }

  // Positive progress
  if (adherence_score >= 60 && checklist_completion_rate >= 50) {
    return { classification: "positive_progress", riskLevel: "stable" };
  }

  return { classification: "behavioral_risk", riskLevel: "attention" };
}

function determineLifecycleTransition(
  classification: Classification,
  milestoneKey: string,
  currentState: string
): string | null {
  // Don't override closed/paused
  if (currentState === "closed" || currentState === "paused") return null;

  switch (classification) {
    case "dropout_risk":
      return "retention_risk";
    case "behavioral_risk":
      if (milestoneKey === "day_45" || milestoneKey === "day_60") return "retention_risk";
      return "clinical_attention";
    case "stagnation":
      return "clinical_attention";
    case "maintenance_ready":
      return "maintenance_mode";
    case "positive_progress":
      if (currentState === "plan_delivered") return "active_followup";
      if (currentState === "clinical_attention" || currentState === "retention_risk") return "active_followup";
      return null;
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Log to pipeline_execution_logs
    let execLogId: string | null = null;
    try {
      const { data } = await supabase.rpc("log_pipeline_execution", {
        _pipeline_name: "evaluate-clinical-milestones",
        _status: "started",
        _metadata: {},
      });
      execLogId = data as string | null;
    } catch (_) {}

    const now = new Date();

    // 1. Find all pending milestones that are due
    const { data: dueMilestones, error: fetchErr } = await supabase
      .from("patient_clinical_milestones")
      .select("*, clinical_milestone_definitions!inner(milestone_key, day_offset, actions)")
      .eq("status", "pending")
      .lte("milestone_due_at", now.toISOString())
      .limit(100); // batch size

    if (fetchErr) throw fetchErr;
    if (!dueMilestones || dueMilestones.length === 0) {
      return new Response(
        JSON.stringify({ message: "No milestones due", evaluated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const patientIds = [...new Set(dueMilestones.map((m: any) => m.patient_id))];

    // 2. Batch-fetch all needed data
    const [profilesRes, checkinsRes, checklistRes, lifecycleRes, snapshotsRes, alertsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, engagement_index, adherence_score_7d, clinical_risk_score").in("user_id", patientIds),
      supabase.from("patient_checkins").select("patient_id, weight, created_at").in("patient_id", patientIds).order("created_at", { ascending: false }).limit(500),
      supabase.from("checklist_tasks").select("patient_id, completed, date").in("patient_id", patientIds).gte("date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]),
      supabase.from("patient_lifecycle_states").select("patient_id, lifecycle_state").in("patient_id", patientIds),
      supabase.from("clinical_daily_snapshots").select("patient_id, adherence_score, dropout_risk_score, days_since_last_checkin, days_since_last_meal").in("patient_id", patientIds).order("snapshot_date", { ascending: false }).limit(500),
      supabase.from("clinical_alerts").select("patient_id, severity, is_active").in("patient_id", patientIds).eq("is_active", true),
    ]);

    // Build lookup maps
    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
    const lifecycleMap = new Map((lifecycleRes.data || []).map((l: any) => [l.patient_id, l]));

    // Group checkins by patient
    const checkinMap = new Map<string, any[]>();
    for (const c of checkinsRes.data || []) {
      if (!checkinMap.has(c.patient_id)) checkinMap.set(c.patient_id, []);
      checkinMap.get(c.patient_id)!.push(c);
    }

    // Group checklist by patient
    const checklistMap = new Map<string, any[]>();
    for (const t of checklistRes.data || []) {
      if (!checklistMap.has(t.patient_id)) checklistMap.set(t.patient_id, []);
      checklistMap.get(t.patient_id)!.push(t);
    }

    // Latest snapshot per patient
    const snapshotMap = new Map<string, any>();
    for (const s of snapshotsRes.data || []) {
      if (!snapshotMap.has(s.patient_id)) snapshotMap.set(s.patient_id, s);
    }

    // Active alerts per patient
    const alertMap = new Map<string, number>();
    for (const a of alertsRes.data || []) {
      alertMap.set(a.patient_id, (alertMap.get(a.patient_id) || 0) + 1);
    }

    // 3. Evaluate each milestone
    const results: any[] = [];
    const lifecycleUpdates: any[] = [];
    const timelineEvents: any[] = [];
    const alertsToCreate: any[] = [];

    for (const milestone of dueMilestones) {
      const pid = milestone.patient_id;
      const mKey = milestone.milestone_key;
      const profile = profileMap.get(pid) || {};
      const checkins = checkinMap.get(pid) || [];
      const tasks = checklistMap.get(pid) || [];
      const snapshot = snapshotMap.get(pid) || {};
      const lifecycle = lifecycleMap.get(pid) || {};
      const currentState = lifecycle.lifecycle_state || "plan_delivered";

      // Compute metrics
      const deliveredAt = new Date(milestone.plan_delivered_at).getTime();
      const relevantCheckins = checkins.filter((c: any) => new Date(c.created_at).getTime() >= deliveredAt);
      
      // Weight delta
      let weightDelta = 0;
      if (relevantCheckins.length >= 2) {
        const latest = relevantCheckins[0]?.weight || 0;
        const earliest = relevantCheckins[relevantCheckins.length - 1]?.weight || 0;
        weightDelta = latest - earliest;
      }

      // Checklist completion rate
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t: any) => t.completed).length;
      const checklistRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Days since last checkin
      const lastCheckin = relevantCheckins[0];
      const daysSinceCheckin = lastCheckin
        ? Math.floor((Date.now() - new Date(lastCheckin.created_at).getTime()) / 86400000)
        : 999;

      const metrics: PatientMetrics = {
        adherence_score: Number(profile.adherence_score_7d) || Number(snapshot.adherence_score) || 0,
        weight_delta: weightDelta,
        checklist_completion_rate: checklistRate,
        engagement_index: Number(profile.engagement_index) || 0,
        dropout_risk_score: Number(snapshot.dropout_risk_score) || 0,
        days_since_last_checkin: daysSinceCheckin < 999 ? daysSinceCheckin : Number(snapshot.days_since_last_checkin) || 0,
        login_frequency: 0, // derived from engagement_index
      };

      const { classification, riskLevel } = classifyPatient(metrics, mKey);
      const newState = determineLifecycleTransition(classification, mKey, currentState);

      const actionsExecuted: string[] = [];

      // Generate alert for risk cases
      if (riskLevel === "risk" || riskLevel === "critical") {
        // Find nutritionist
        const { data: np } = await supabase
          .from("nutritionist_patients")
          .select("nutritionist_id")
          .eq("patient_id", pid)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        if (np) {
          alertsToCreate.push({
            patient_id: pid,
            nutritionist_id: np.nutritionist_id,
            alert_type: `milestone_${mKey}_${classification}`,
            severity: riskLevel === "critical" ? "critical" : "high",
            title: `Marco ${mKey.replace("_", " ")}: ${classification.replace(/_/g, " ")}`,
            description: `Paciente classificado como "${classification}" no marco de ${milestone.milestone_key.replace("day_", "")} dias. Adesão: ${metrics.adherence_score}%, Peso Δ: ${weightDelta.toFixed(1)}kg, Checklist: ${checklistRate}%`,
            trigger_source: "milestone_engine",
            metadata: { milestone_key: mKey, metrics, classification },
          });
          actionsExecuted.push("alert_generated");
        }
      }

      // Lifecycle transition
      if (newState && newState !== currentState) {
        lifecycleUpdates.push({
          patient_id: pid,
          lifecycle_state: newState,
          has_clinical_alert: riskLevel === "risk" || riskLevel === "critical",
          has_retention_risk: newState === "retention_risk",
          updated_at: now.toISOString(),
        });
        actionsExecuted.push(`lifecycle_${currentState}_to_${newState}`);
      }

      // Timeline event
      timelineEvents.push({
        patient_id: pid,
        event_type: "clinical_milestone_evaluated",
        title: `Marco clínico: ${mKey.replace("day_", "Dia ")}`,
        description: `Classificação: ${classification} | Risco: ${riskLevel} | Adesão: ${metrics.adherence_score}%`,
        metadata: { milestone_key: mKey, classification, risk_level: riskLevel, metrics, actions: actionsExecuted },
      });

      // Update milestone record
      results.push({
        id: milestone.id,
        status: "evaluated",
        evaluated_at: now.toISOString(),
        adherence_score: metrics.adherence_score,
        weight_delta: weightDelta,
        checklist_completion_rate: checklistRate,
        engagement_index: metrics.engagement_index,
        dropout_risk_score: metrics.dropout_risk_score,
        days_since_last_checkin: metrics.days_since_last_checkin,
        login_frequency: metrics.login_frequency,
        classification,
        risk_level: riskLevel,
        actions_executed: actionsExecuted,
        alerts_generated: riskLevel === "risk" || riskLevel === "critical" ? 1 : 0,
        lifecycle_state_before: currentState,
        lifecycle_state_after: newState || currentState,
      });
    }

    // 4. Batch write all results
    const writePromises: Promise<any>[] = [];

    // Update milestones
    for (const r of results) {
      writePromises.push(
        supabase.from("patient_clinical_milestones").update(r).eq("id", r.id)
      );
    }

    // Insert alerts
    if (alertsToCreate.length > 0) {
      writePromises.push(supabase.from("clinical_alerts").insert(alertsToCreate));
    }

    // Update lifecycle states
    for (const lu of lifecycleUpdates) {
      writePromises.push(
        supabase
          .from("patient_lifecycle_states")
          .update({
            lifecycle_state: lu.lifecycle_state,
            has_clinical_alert: lu.has_clinical_alert,
            has_retention_risk: lu.has_retention_risk,
            updated_at: lu.updated_at,
          })
          .eq("patient_id", lu.patient_id)
      );
    }

    // Insert timeline events
    if (timelineEvents.length > 0) {
      writePromises.push(supabase.from("patient_timeline").insert(timelineEvents));
    }

    await Promise.all(writePromises);

    // Summary
    const summary = {
      evaluated: results.length,
      classifications: results.reduce((acc: any, r: any) => {
        acc[r.classification] = (acc[r.classification] || 0) + 1;
        return acc;
      }, {}),
      lifecycle_transitions: lifecycleUpdates.length,
      alerts_generated: alertsToCreate.length,
      timeline_events: timelineEvents.length,
    };

    console.log("Milestone evaluation complete:", JSON.stringify(summary));

    // Finalize pipeline log
    if (execLogId) {
      try {
        await supabase.rpc("finalize_pipeline_execution", {
          _id: execLogId,
          _status: "completed",
          _patients_processed: patientIds.length,
          _errors_count: 0,
          _error_details: null,
        });
      } catch (_) {}
    }

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Milestone evaluation error:", error);

    // Log failure
    if (typeof execLogId !== "undefined" && execLogId) {
      try {
        await supabase.rpc("finalize_pipeline_execution", {
          _id: execLogId,
          _status: "failed",
          _patients_processed: 0,
          _errors_count: 1,
          _error_details: { error: error.message },
        });
      } catch (_) {}
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
