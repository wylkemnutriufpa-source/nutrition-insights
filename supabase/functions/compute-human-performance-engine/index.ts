import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENGINE_VERSION = "1.0.0";

interface PatientPerformanceContext {
  patient_id: string;
  // Nutrition signals
  adherence_7d: number;
  adherence_30d: number;
  calorie_alerts: number;
  plan_efficacy: number;
  // Recovery signals
  sleep_quality: number;
  sleep_regularity: number;
  fatigue_perception: number;
  // Training signals
  training_frequency: number;
  training_consistency: number;
  // Consistency signals
  login_frequency: number;
  checkin_frequency: number;
  meals_logged: number;
  // Metabolic signals
  weight_velocity: number;
  cluster_type: string;
  weight_stability: number;
  active_alerts: number;
  // Stress signals
  stress_perception: number;
  engagement_drops: number;
  behavior_oscillations: number;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function computeNutritionScore(ctx: PatientPerformanceContext): number {
  const adherenceBlend = ctx.adherence_7d * 0.6 + ctx.adherence_30d * 0.4;
  const alertPenalty = Math.min(ctx.calorie_alerts * 5, 30);
  const efficacyBonus = ctx.plan_efficacy * 0.3;
  return clamp(adherenceBlend * 0.6 + efficacyBonus + (100 - alertPenalty) * 0.1);
}

function computeRecoveryScore(ctx: PatientPerformanceContext): number {
  const sleepScore = ctx.sleep_quality * 0.5 + ctx.sleep_regularity * 0.3;
  const fatiguePenalty = ctx.fatigue_perception * 0.2;
  return clamp(sleepScore - fatiguePenalty);
}

function computeTrainingScore(ctx: PatientPerformanceContext): number {
  return clamp(ctx.training_frequency * 0.5 + ctx.training_consistency * 0.5);
}

function computeConsistencyScore(ctx: PatientPerformanceContext): number {
  return clamp(
    ctx.login_frequency * 0.25 +
    ctx.checkin_frequency * 0.35 +
    ctx.meals_logged * 0.40
  );
}

function computeMetabolicScore(ctx: PatientPerformanceContext): number {
  const velocityScore = ctx.weight_velocity >= 0 ? 70 : Math.min(100, 70 + Math.abs(ctx.weight_velocity) * 10);
  const stabilityScore = ctx.weight_stability;
  const clusterBonus = ctx.cluster_type === "responder" ? 15 : ctx.cluster_type === "adaptive" ? 10 : 0;
  const alertPenalty = Math.min(ctx.active_alerts * 8, 40);
  return clamp(velocityScore * 0.35 + stabilityScore * 0.35 + clusterBonus + (100 - alertPenalty) * 0.15);
}

function computeStressLoadScore(ctx: PatientPerformanceContext): number {
  return clamp(
    ctx.stress_perception * 0.40 +
    ctx.engagement_drops * 10 * 0.30 +
    ctx.behavior_oscillations * 15 * 0.30
  );
}

function classifyPerformanceLevel(score: number): string {
  if (score >= 90) return "peak_condition";
  if (score >= 75) return "high_performance";
  if (score >= 60) return "stable";
  if (score >= 40) return "unstable";
  return "compromised";
}

function classifyPerformanceProfile(scores: {
  nutrition: number; recovery: number; training: number;
  consistency: number; metabolic: number; stress: number;
}): string {
  const { nutrition, recovery, training, consistency, metabolic, stress } = scores;
  
  // Find the weakest dimension
  const dims = [
    { key: "recovery_limited", val: recovery },
    { key: "training_limited", val: training },
    { key: "stress_limited", val: 100 - stress },
    { key: "nutrition_driven", val: nutrition },
    { key: "behavior_driven", val: consistency },
  ];

  // If stress is very high (>70), stress-limited
  if (stress > 70) return "stress_limited";
  // If recovery is lowest and <50
  if (recovery < 50 && recovery <= Math.min(training, consistency, nutrition)) return "recovery_limited";
  // If training is lowest and <50
  if (training < 50 && training <= Math.min(recovery, consistency, nutrition)) return "training_limited";
  // If consistency is low
  if (consistency < 50) return "inconsistent_responder";
  // If metabolic is high with good adherence
  if (metabolic >= 70 && nutrition >= 70) return "metabolically_efficient";
  // If nutrition drives results
  if (nutrition >= 75 && nutrition > training) return "nutrition_driven";
  // Behavior driven
  if (consistency >= 75) return "behavior_driven";
  
  return "inconsistent_responder";
}

function computeRecommendedFocus(scores: {
  nutrition: number; recovery: number; training: number;
  consistency: number; metabolic: number; stress: number;
}, profile: string): string {
  if (profile === "stress_limited") return "reduce_stress_load";
  if (profile === "recovery_limited") return "improve_sleep_consistency";
  if (profile === "training_limited") return "increase_training_consistency";
  if (scores.nutrition < 60) return "stabilize_nutrition_adherence";
  if (scores.stress > 60) return "reduce_protocol_complexity";
  if (scores.nutrition >= 70 && scores.metabolic >= 70) return "hold_strategy_and_monitor";
  return "stabilize_nutrition_adherence";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Load all active patients with snapshots
    const { data: patients, error: pErr } = await supabase
      .from("nutritionist_patients")
      .select("patient_id, nutritionist_id")
      .eq("status", "active");

    if (pErr) throw pErr;
    if (!patients || patients.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const patientIds = [...new Set(patients.map((p: any) => p.patient_id))];
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    let processed = 0;

    // Process in batches of 20
    for (let i = 0; i < patientIds.length; i += 20) {
      const batch = patientIds.slice(i, i + 20);

      // Load data in parallel for this batch
      const [
        snapshotsRes,
        checklistRes,
        mealsRes,
        alertsRes,
        checkinsRes,
        clusterRes,
        performanceRes,
      ] = await Promise.all([
        supabase.from("patient_clinical_snapshots").select("*")
          .in("patient_id", batch).gte("snapshot_date", monthAgo).order("snapshot_date", { ascending: false }),
        supabase.from("checklist_tasks").select("patient_id, completed, category, date")
          .in("patient_id", batch).gte("date", weekAgo),
        supabase.from("meals").select("user_id, created_at")
          .in("user_id", batch).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from("clinical_alerts").select("patient_id, severity, is_active")
          .in("patient_id", batch).eq("is_active", true),
        supabase.from("patient_checkins").select("patient_id, created_at, weight, sleep_hours, stress_level, energy_level")
          .in("patient_id", batch).gte("created_at", new Date(Date.now() - 14 * 86400000).toISOString()),
        supabase.from("patient_metabolic_clusters").select("patient_id, cluster_type, metabolic_stability")
          .in("patient_id", batch).order("computed_at", { ascending: false }),
        supabase.from("protocol_clinical_performance").select("protocol_id, effectiveness_score")
          .limit(100),
      ]);

      const snapshots = snapshotsRes.data || [];
      const checklist = checklistRes.data || [];
      const meals = mealsRes.data || [];
      const alerts = alertsRes.data || [];
      const checkins = checkinsRes.data || [];
      const clusters = clusterRes.data || [];

      for (const pid of batch) {
        // Build context from available data
        const patSnapshots = snapshots.filter((s: any) => s.patient_id === pid);
        const patChecklist = checklist.filter((c: any) => c.patient_id === pid);
        const patMeals = meals.filter((m: any) => m.user_id === pid);
        const patAlerts = alerts.filter((a: any) => a.patient_id === pid);
        const patCheckins = checkins.filter((c: any) => c.patient_id === pid);
        const patCluster = clusters.find((c: any) => c.patient_id === pid);

        // Compute adherence
        const totalTasks = patChecklist.length || 1;
        const completedTasks = patChecklist.filter((c: any) => c.completed).length;
        const adherence7d = Math.round((completedTasks / totalTasks) * 100);

        const latestSnapshot = patSnapshots[0];
        const adherence30d = latestSnapshot?.adherence_momentum ?? adherence7d;

        // Calorie alerts
        const calorieAlerts = patAlerts.filter((a: any) => 
          a.severity === "high" || a.severity === "critical"
        ).length;

        // Plan efficacy from snapshot
        const planEfficacy = latestSnapshot?.plan_efficacy_score ?? 50;

        // Recovery from checkins
        const avgSleep = patCheckins.length > 0
          ? patCheckins.reduce((s: number, c: any) => s + (c.sleep_hours || 7), 0) / patCheckins.length
          : 7;
        const sleepQuality = clamp(avgSleep / 8 * 100);
        const sleepRegularity = patCheckins.length >= 3 ? 70 : patCheckins.length >= 1 ? 50 : 30;

        const avgEnergy = patCheckins.length > 0
          ? patCheckins.reduce((s: number, c: any) => s + (c.energy_level || 5), 0) / patCheckins.length
          : 5;
        const fatiguePerception = clamp((10 - avgEnergy) * 10);

        // Training from workout_completions
        const trainingFrequency = clamp(50); // Default if no workout data
        const trainingConsistency = clamp(50);

        // Consistency
        const mealDays = new Set(patMeals.map((m: any) => m.created_at?.split("T")[0])).size;
        const mealsLoggedScore = clamp((mealDays / 7) * 100);
        const checkinDays = new Set(patCheckins.map((c: any) => c.created_at?.split("T")[0])).size;
        const checkinScore = clamp((checkinDays / 7) * 100);
        const loginFrequency = clamp(Math.max(mealsLoggedScore, checkinScore, 30));

        // Metabolic
        const weightVelocity = latestSnapshot?.weight_velocity_kg_week ?? 0;
        const clusterType = patCluster?.cluster_type || "adaptive";
        const weightStability = patCluster?.metabolic_stability ?? 50;
        const activeAlerts = patAlerts.length;

        // Stress
        const avgStress = patCheckins.length > 0
          ? patCheckins.reduce((s: number, c: any) => s + (c.stress_level || 5), 0) / patCheckins.length
          : 5;
        const stressPerception = clamp(avgStress * 10);
        const engagementDrops = adherence7d < adherence30d * 0.8 ? 2 : adherence7d < adherence30d * 0.9 ? 1 : 0;
        const behaviorOscillations = Math.abs(adherence7d - adherence30d) > 20 ? 2 : Math.abs(adherence7d - adherence30d) > 10 ? 1 : 0;

        const ctx: PatientPerformanceContext = {
          patient_id: pid,
          adherence_7d: adherence7d,
          adherence_30d: adherence30d,
          calorie_alerts: calorieAlerts,
          plan_efficacy: planEfficacy,
          sleep_quality: sleepQuality,
          sleep_regularity: sleepRegularity,
          fatigue_perception: fatiguePerception,
          training_frequency: trainingFrequency,
          training_consistency: trainingConsistency,
          login_frequency: loginFrequency,
          checkin_frequency: checkinScore,
          meals_logged: mealsLoggedScore,
          weight_velocity: weightVelocity,
          cluster_type: clusterType,
          weight_stability: weightStability,
          active_alerts: activeAlerts,
          stress_perception: stressPerception,
          engagement_drops: engagementDrops,
          behavior_oscillations: behaviorOscillations,
        };

        // Compute scores
        const nutrition = computeNutritionScore(ctx);
        const recovery = computeRecoveryScore(ctx);
        const training = computeTrainingScore(ctx);
        const consistency = computeConsistencyScore(ctx);
        const metabolic = computeMetabolicScore(ctx);
        const stress = computeStressLoadScore(ctx);

        const overall = clamp(
          nutrition * 0.25 +
          recovery * 0.15 +
          training * 0.15 +
          consistency * 0.15 +
          metabolic * 0.20 +
          (100 - stress) * 0.10
        );

        const performanceLevel = classifyPerformanceLevel(overall);
        const performanceProfile = classifyPerformanceProfile({ nutrition, recovery, training, consistency, metabolic, stress });
        const recommendedFocus = computeRecommendedFocus({ nutrition, recovery, training, consistency, metabolic, stress }, performanceProfile);

        // Upsert state
        await supabase.from("patient_human_performance_state").upsert({
          patient_id: pid,
          nutrition_score: nutrition,
          recovery_score: recovery,
          training_score: training,
          consistency_score: consistency,
          metabolic_score: metabolic,
          stress_load_score: stress,
          overall_performance_score: overall,
          performance_level: performanceLevel,
          performance_profile: performanceProfile,
          recommended_focus: recommendedFocus,
          engine_version: ENGINE_VERSION,
          metadata: {
            adherence_7d: adherence7d,
            adherence_30d: adherence30d,
            cluster_type: clusterType,
            active_alerts: activeAlerts,
            checkins_count: patCheckins.length,
            snapshots_count: patSnapshots.length,
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: "patient_id" });

        // Upsert snapshot
        await supabase.from("patient_performance_snapshots").upsert({
          patient_id: pid,
          snapshot_date: today,
          nutrition_score: nutrition,
          recovery_score: recovery,
          training_score: training,
          consistency_score: consistency,
          metabolic_score: metabolic,
          stress_load_score: stress,
          overall_performance_score: overall,
          performance_level: performanceLevel,
          performance_profile: performanceProfile,
          engine_version: ENGINE_VERSION,
        }, { onConflict: "patient_id,snapshot_date" });

        processed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, engine_version: ENGINE_VERSION }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
