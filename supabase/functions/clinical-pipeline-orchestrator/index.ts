import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════
// CLINICAL PROCESSING PIPELINE ORCHESTRATOR
// ═══════════════════════════════════════════════════════════
// This is the "maestro" of the clinical system.
// It executes all engines in a strict sequential order,
// ensuring data consistency and temporal alignment.
// ═══════════════════════════════════════════════════════════

const PIPELINE_STEPS = [
  { order: 1, name: "Seed Daily Checklist", function: "seed-daily-checklist", category: "ingestion" },
  { order: 2, name: "Detect Adherence Patterns", function: "detect-adherence-patterns", category: "computation" },
  { order: 3, name: "Detect Patient Signals", function: "detect-patient-signals", category: "computation" },
  { order: 4, name: "Detect Clinical Alerts", function: "detect-clinical-alerts", category: "alerts" },
  { order: 5, name: "Clinical Rule Engine", function: "clinical-rule-engine", category: "rules" },
  { order: 6, name: "Compute Behavioral Dropout Risk", function: "compute-behavioral-dropout-risk", category: "risk" },
  { order: 7, name: "Compute Therapeutic Adjustments", function: "compute-therapeutic-adjustments", category: "adjustments" },
  { order: 8, name: "Compute Weight Trajectory", function: "compute-weight-trajectory-engine", category: "projection" },
  { order: 9, name: "Compute Metabolic Twin", function: "compute-metabolic-twin-engine", category: "twin" },
] as const;

const WEEKLY_STEPS = [
  { order: 10, name: "Population Nutrition Intelligence", function: "compute-population-nutrition-intelligence", category: "population" },
  { order: 11, name: "Global Adaptive Intelligence", function: "compute-global-adaptive-clinical-intelligence", category: "calibration" },
] as const;

const ENGINE_VERSIONS: Record<string, string> = {
  "seed-daily-checklist": "1.0.0",
  "detect-adherence-patterns": "1.0.0",
  "detect-patient-signals": "1.0.0",
  "detect-clinical-alerts": "3.0.0",
  "clinical-rule-engine": "1.0.0",
  "compute-behavioral-dropout-risk": "1.0.0",
  "compute-therapeutic-adjustments": "1.0.0",
  "compute-weight-trajectory-engine": "1.0.0",
  "compute-metabolic-twin-engine": "1.0.0",
  "compute-population-nutrition-intelligence": "1.0.0",
  "compute-global-adaptive-clinical-intelligence": "1.0.0",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const runType = body.run_type || "daily";
    const triggeredBy = body.triggered_by || "scheduled";
    const includeWeekly = body.include_weekly || false;
    const dryRun = body.dry_run || false;

    // Prevent concurrent runs
    const { data: activeRuns } = await supabase
      .from("pipeline_runs")
      .select("id")
      .eq("status", "running")
      .gte("started_at", new Date(Date.now() - 3600000).toISOString());

    if (activeRuns && activeRuns.length > 0) {
      return new Response(
        JSON.stringify({ error: "Pipeline already running", active_run_id: activeRuns[0].id }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create pipeline run record
    const { data: run, error: runError } = await supabase
      .from("pipeline_runs")
      .insert({
        run_type: runType,
        status: "running",
        triggered_by: triggeredBy,
        engine_versions: ENGINE_VERSIONS,
      })
      .select()
      .single();

    if (runError || !run) {
      throw new Error(`Failed to create pipeline run: ${runError?.message}`);
    }

    const runId = run.id;
    const stepsToExecute = [...PIPELINE_STEPS, ...(includeWeekly ? WEEKLY_STEPS : [])];
    const stepsCompleted: string[] = [];
    const stepsFailed: string[] = [];
    const executionLog: any[] = [];
    let totalPatientsProcessed = 0;

    // Insert all step records as pending
    const stepRecords = stepsToExecute.map((step) => ({
      run_id: runId,
      step_order: step.order,
      step_name: step.name,
      function_name: step.function,
      status: "pending",
    }));
    await supabase.from("pipeline_step_results").insert(stepRecords);

    // Execute steps sequentially
    for (const step of stepsToExecute) {
      const stepStart = Date.now();
      const logEntry: any = {
        step: step.order,
        name: step.name,
        function: step.function,
        category: step.category,
        started_at: new Date().toISOString(),
      };

      try {
        if (dryRun) {
          logEntry.status = "skipped_dry_run";
          logEntry.duration_ms = 0;
          stepsCompleted.push(step.name);
        } else {
          // Call the edge function
          const fnUrl = `${supabaseUrl}/functions/v1/${step.function}`;
          const response = await fetch(fnUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ pipeline_run_id: runId, step_order: step.order }),
          });

          const stepDuration = Date.now() - stepStart;
          logEntry.duration_ms = stepDuration;
          logEntry.http_status = response.status;

          if (response.ok) {
            const result = await response.json().catch(() => ({}));
            logEntry.status = "completed";
            logEntry.patients_processed = result.patients_processed || 0;
            totalPatientsProcessed += result.patients_processed || 0;
            stepsCompleted.push(step.name);

            // Update step record
            await supabase
              .from("pipeline_step_results")
              .update({
                status: "completed",
                started_at: logEntry.started_at,
                completed_at: new Date().toISOString(),
                duration_ms: stepDuration,
                patients_processed: result.patients_processed || 0,
                output_summary: result,
              })
              .eq("run_id", runId)
              .eq("step_order", step.order);
          } else {
            const errorText = await response.text().catch(() => "Unknown error");
            logEntry.status = "failed";
            logEntry.error = errorText.substring(0, 500);
            stepsFailed.push(step.name);

            await supabase
              .from("pipeline_step_results")
              .update({
                status: "failed",
                started_at: logEntry.started_at,
                completed_at: new Date().toISOString(),
                duration_ms: stepDuration,
                error_message: errorText.substring(0, 1000),
              })
              .eq("run_id", runId)
              .eq("step_order", step.order);

            // For critical steps (order <= 4), abort pipeline
            if (step.order <= 4) {
              logEntry.abort = true;
              executionLog.push(logEntry);
              break;
            }
          }
        }
      } catch (err) {
        const stepDuration = Date.now() - stepStart;
        logEntry.status = "error";
        logEntry.error = err.message?.substring(0, 500);
        logEntry.duration_ms = stepDuration;
        stepsFailed.push(step.name);

        await supabase
          .from("pipeline_step_results")
          .update({
            status: "error",
            started_at: logEntry.started_at,
            completed_at: new Date().toISOString(),
            duration_ms: stepDuration,
            error_message: err.message?.substring(0, 1000),
          })
          .eq("run_id", runId)
          .eq("step_order", step.order);

        if (step.order <= 4) {
          logEntry.abort = true;
          executionLog.push(logEntry);
          break;
        }
      }

      executionLog.push(logEntry);
    }

    // Generate clinical daily snapshot
    if (!dryRun && stepsFailed.length === 0) {
      try {
        await generateDailySnapshots(supabase, runId);
      } catch (err) {
        executionLog.push({
          step: 99,
          name: "Generate Daily Snapshots",
          status: "error",
          error: err.message,
        });
      }
    }

    // Calculate total duration
    const totalDuration = Date.now() - new Date(run.started_at).getTime();
    const finalStatus = stepsFailed.length === 0 ? "completed" : "completed_with_errors";

    // Update pipeline run
    await supabase
      .from("pipeline_runs")
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        total_patients_processed: totalPatientsProcessed,
        steps_completed: stepsCompleted,
        steps_failed: stepsFailed,
        execution_log: executionLog,
        duration_ms: totalDuration,
        error_summary: stepsFailed.length > 0 ? `${stepsFailed.length} steps failed: ${stepsFailed.join(", ")}` : null,
      })
      .eq("id", runId);

    // Refresh ranking cache
    if (!dryRun) {
      await supabase.rpc("refresh_ranking_cache").catch(() => {});
    }

    return new Response(
      JSON.stringify({
        run_id: runId,
        status: finalStatus,
        duration_ms: totalDuration,
        steps_completed: stepsCompleted.length,
        steps_failed: stepsFailed.length,
        total_patients_processed: totalPatientsProcessed,
        execution_log: executionLog,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateDailySnapshots(supabase: any, runId: string) {
  // Get all active patients with their latest data
  const { data: patients } = await supabase
    .from("nutritionist_patients")
    .select("patient_id")
    .eq("status", "active")
    .limit(1000);

  if (!patients || patients.length === 0) return;

  const today = new Date().toISOString().split("T")[0];
  const snapshots = [];

  for (const { patient_id } of patients) {
    // Get latest adherence
    const { data: adherence } = await supabase
      .from("patient_adherence_patterns")
      .select("overall_adherence_score, engagement_level")
      .eq("patient_id", patient_id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get latest clinical alert count
    const { count: alertCount } = await supabase
      .from("clinical_alerts")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", patient_id)
      .eq("is_active", true);

    // Get latest weight
    const { data: latestCheckin } = await supabase
      .from("patient_checkins")
      .select("weight, created_at")
      .eq("patient_id", patient_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get dropout risk
    const { data: dropout } = await supabase
      .from("behavioral_recovery_actions")
      .select("dropout_risk_score, dropout_risk_level")
      .eq("patient_id", patient_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const riskScore = dropout?.dropout_risk_score || 0;
    const riskLevel = riskScore >= 60 ? "critical" : riskScore >= 30 ? "risk" : riskScore >= 10 ? "attention" : "stable";

    snapshots.push({
      patient_id,
      snapshot_date: today,
      pipeline_run_id: runId,
      adherence_score: adherence?.overall_adherence_score || 0,
      clinical_risk_score: riskScore,
      risk_level: riskLevel,
      active_alerts_count: alertCount || 0,
      current_weight: latestCheckin?.weight || null,
      dropout_risk_score: riskScore,
      snapshot_data: {
        engagement_level: adherence?.engagement_level || "unknown",
      },
    });
  }

  // Batch upsert snapshots
  if (snapshots.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < snapshots.length; i += batchSize) {
      const batch = snapshots.slice(i, i + batchSize);
      await supabase.from("clinical_daily_snapshots").upsert(batch, {
        onConflict: "patient_id,snapshot_date",
      });
    }
  }
}
