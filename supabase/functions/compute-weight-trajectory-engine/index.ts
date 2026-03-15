import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ENGINE_VERSION = "1.0.0";
const BATCH_SIZE = 50;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Silhouette Classification ───
function classifySilhouette(bodyFat: number): string {
  if (bodyFat >= 35) return "high_adiposity";
  if (bodyFat >= 25) return "moderate_adiposity";
  if (bodyFat >= 18) return "lean_transition";
  if (bodyFat >= 12) return "athletic";
  return "high_definition";
}

// ─── Response Pattern Classification ───
function classifyResponsePattern(avgChange: number, volatility: number): string {
  if (Math.abs(avgChange) < 0.05 && volatility < 0.3) return "non_responsive";
  if (avgChange < -0.5 && volatility < 0.5) return "consistent_responder";
  if (avgChange < -0.3) return "moderate_responder";
  if (avgChange < 0 && volatility > 0.8) return "volatile_responder";
  if (avgChange >= 0) return "gaining_pattern";
  return "slow_responder";
}

// ─── Metabolic Response Classification ───
function classifyMetabolicResponse(avgChange: number, plateaus: number, dataPoints: number): string {
  if (dataPoints < 3) return "insufficient_data";
  if (plateaus >= 3 && avgChange > -0.2) return "plateau_dominant";
  if (avgChange < -0.7) return "high_metabolic_response";
  if (avgChange < -0.3) return "moderate_metabolic_response";
  if (avgChange < -0.1) return "low_metabolic_response";
  return "metabolic_resistance";
}

// ─── Plateau Detection ───
function detectPlateaus(weights: { weight: number; date: string }[]): number {
  if (weights.length < 4) return 0;
  let plateauCount = 0;
  const windowSize = 3;

  for (let i = windowSize; i < weights.length; i++) {
    const window = weights.slice(i - windowSize, i + 1);
    const maxW = Math.max(...window.map(w => w.weight));
    const minW = Math.min(...window.map(w => w.weight));
    const range = maxW - minW;
    // Plateau: less than 0.3kg variation over 4+ data points
    if (range < 0.3) plateauCount++;
  }
  return plateauCount;
}

// ─── Volatility Score ───
function computeVolatility(weights: number[]): number {
  if (weights.length < 3) return 0;
  const diffs: number[] = [];
  for (let i = 1; i < weights.length; i++) {
    diffs.push(Math.abs(weights[i] - weights[i - 1]));
  }
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const variance = diffs.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / diffs.length;
  return Math.round(Math.sqrt(variance) * 100) / 100;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const patientId = body.patient_id;
    const nutritionistId = body.nutritionist_id;

    console.log(`[WEIGHT-TRAJECTORY v${ENGINE_VERSION}] Starting. Patient: ${patientId || "all"}, Nutritionist: ${nutritionistId || "all"}`);

    // Get patient IDs
    let patientIds: string[] = [];

    if (patientId) {
      patientIds = [patientId];
    } else {
      let npQuery = supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("status", "active");
      if (nutritionistId) npQuery = npQuery.eq("nutritionist_id", nutritionistId);
      const { data: rels } = await npQuery;
      if (!rels || rels.length === 0) {
        return jsonResponse({ patients_processed: 0, engine_version: ENGINE_VERSION, duration_ms: Date.now() - startTime });
      }
      patientIds = [...new Set(rels.map((r: any) => r.patient_id))];
    }

    let totalProcessed = 0;

    for (let i = 0; i < patientIds.length; i += BATCH_SIZE) {
      const batch = patientIds.slice(i, i + BATCH_SIZE);
      await processBatch(supabase, batch);
      totalProcessed += batch.length;
    }

    const duration = Date.now() - startTime;
    console.log(`[WEIGHT-TRAJECTORY v${ENGINE_VERSION}] Complete. ${totalProcessed} patients, ${duration}ms`);

    return jsonResponse({ patients_processed: totalProcessed, engine_version: ENGINE_VERSION, duration_ms: duration });
  } catch (error: any) {
    console.error("[WEIGHT-TRAJECTORY] Fatal error:", error);
    return new Response(JSON.stringify({ error: error.message, engine_version: ENGINE_VERSION }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function jsonResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function processBatch(supabase: any, patientIds: string[]) {
  // Fetch weight history + physical assessments + clusters + profiles in parallel
  const [historyRes, assessRes, clusterRes, profileRes] = await Promise.all([
    supabase
      .from("patient_weight_history")
      .select("patient_id, weight, body_fat_percentage, waist_circumference, measurement_date")
      .in("patient_id", patientIds)
      .order("measurement_date", { ascending: true }),
    supabase
      .from("physical_assessments")
      .select("patient_id, weight, body_fat_percentage, waist, assessment_date")
      .in("patient_id", patientIds)
      .order("assessment_date", { ascending: true }),
    supabase
      .from("patient_metabolic_clusters")
      .select("patient_id, cluster_type")
      .in("patient_id", patientIds),
    supabase
      .from("profiles")
      .select("user_id, weight_trend_status, adherence_score_7d, engagement_index")
      .in("user_id", patientIds),
  ]);

  const historyByPatient = groupBy(historyRes.data || [], "patient_id");
  const assessByPatient = groupBy(assessRes.data || [], "patient_id");
  const clusterMap = indexBy(clusterRes.data || [], "patient_id");
  const profileMap = indexBy(profileRes.data || [], "user_id");

  for (const pid of patientIds) {
    try {
      await processPatient(supabase, pid, historyByPatient[pid] || [], assessByPatient[pid] || [], clusterMap[pid], profileMap[pid]);
    } catch (err: any) {
      console.error(`[WEIGHT-TRAJECTORY] Error for patient ${pid}:`, err.message);
    }
  }
}

async function processPatient(
  supabase: any,
  patientId: string,
  history: any[],
  assessments: any[],
  cluster: any,
  profile: any
) {
  // Merge weight data from history table + physical assessments
  const allWeights: { weight: number; bodyFat: number | null; date: string }[] = [];

  for (const h of history) {
    allWeights.push({ weight: h.weight, bodyFat: h.body_fat_percentage, date: h.measurement_date });
  }
  for (const a of assessments) {
    // Avoid duplicates on same date
    if (!allWeights.find(w => w.date === a.assessment_date)) {
      allWeights.push({ weight: a.weight, bodyFat: a.body_fat_percentage, date: a.assessment_date });
    }
  }

  allWeights.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (allWeights.length < 2) {
    // Still upsert dynamics with low confidence
    await supabase.from("patient_weight_dynamics").upsert({
      patient_id: patientId,
      total_data_points: allWeights.length,
      first_measurement_date: allWeights[0]?.date || null,
      last_measurement_date: allWeights[allWeights.length - 1]?.date || null,
      metabolic_response_classification: "insufficient_data",
      historical_response_pattern: "unknown",
      engine_version: ENGINE_VERSION,
      computed_at: new Date().toISOString(),
    }, { onConflict: "patient_id" });
    return;
  }

  // ══════════ 1. COMPUTE WEIGHT DYNAMICS ══════════
  const first = allWeights[0];
  const last = allWeights[allWeights.length - 1];
  const totalDays = (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86400000;
  const totalWeeks = Math.max(1, totalDays / 7);
  const totalWeightChange = last.weight - first.weight;
  const avgWeeklyChange = Number((totalWeightChange / totalWeeks).toFixed(3));

  const weightValues = allWeights.map(w => w.weight);
  const volatility = computeVolatility(weightValues);
  const plateaus = detectPlateaus(allWeights.map(w => ({ weight: w.weight, date: w.date })));

  // Best loss / worst gain per week windows
  let bestLoss = 0;
  let worstGain = 0;
  for (let i = 1; i < allWeights.length; i++) {
    const daysDiff = (new Date(allWeights[i].date).getTime() - new Date(allWeights[i - 1].date).getTime()) / 86400000;
    if (daysDiff > 0) {
      const weeklyRate = ((allWeights[i].weight - allWeights[i - 1].weight) / daysDiff) * 7;
      if (weeklyRate < bestLoss) bestLoss = weeklyRate;
      if (weeklyRate > worstGain) worstGain = weeklyRate;
    }
  }

  const responsePattern = classifyResponsePattern(avgWeeklyChange, volatility);
  const metabolicClass = classifyMetabolicResponse(avgWeeklyChange, plateaus, allWeights.length);

  await supabase.from("patient_weight_dynamics").upsert({
    patient_id: patientId,
    avg_weekly_weight_change: avgWeeklyChange,
    historical_response_pattern: responsePattern,
    volatility_score: volatility,
    detected_plateaus: plateaus,
    metabolic_response_classification: metabolicClass,
    total_data_points: allWeights.length,
    first_measurement_date: first.date,
    last_measurement_date: last.date,
    total_weight_change: Number(totalWeightChange.toFixed(2)),
    best_weekly_loss: Number(bestLoss.toFixed(3)),
    worst_weekly_gain: Number(worstGain.toFixed(3)),
    engine_version: ENGINE_VERSION,
    computed_at: new Date().toISOString(),
  }, { onConflict: "patient_id" });

  // ══════════ 2. GENERATE WEIGHT PROJECTIONS ══════════
  const horizons = [4, 8, 12, 24];
  const adherence = profile?.adherence_score_7d || 50;
  const engagement = profile?.engagement_index || 50;

  // Adjust velocity based on adherence and cluster
  const clusterType = cluster?.cluster_type || "unknown";
  let velocityMultiplier = 1.0;
  if (clusterType === "metabolic_resistant") velocityMultiplier = 0.6;
  else if (clusterType === "behavioral_struggler") velocityMultiplier = 0.7;
  else if (clusterType === "metabolic_responder") velocityMultiplier = 1.2;
  else if (clusterType === "disengaging_patient") velocityMultiplier = 0.5;

  // Adherence factor
  const adherenceFactor = Math.max(0.3, adherence / 100);
  const effectiveWeeklyChange = avgWeeklyChange * velocityMultiplier * adherenceFactor;

  // Confidence based on data volume and stability
  const dataConfidence = Math.min(40, allWeights.length * 3);
  const stabilityConfidence = Math.max(0, 30 - volatility * 20);
  const adherenceConfidence = adherence * 0.3;
  const baseConfidence = Math.min(100, dataConfidence + stabilityConfidence + adherenceConfidence);

  // Delete old projections
  await supabase.from("patient_weight_projection").delete().eq("patient_id", patientId);

  const projections = [];
  const bodyProjections = [];
  const currentWeight = last.weight;
  const currentBodyFat = last.bodyFat || (allWeights.filter(w => w.bodyFat).pop()?.bodyFat) || null;

  for (const weeks of horizons) {
    const projectedWeight = Number((currentWeight + effectiveWeeklyChange * weeks).toFixed(2));
    // Confidence decays over time
    const timeDecay = Math.max(0.4, 1 - weeks * 0.02);
    const confidence = Number((baseConfidence * timeDecay).toFixed(1));

    // Risk assessment
    let riskLevel = "low";
    const weeklyLossRate = effectiveWeeklyChange < 0 ? Math.abs(effectiveWeeklyChange) : 0;
    if (weeklyLossRate > 1.2) riskLevel = "high";
    else if (weeklyLossRate > 0.8) riskLevel = "moderate";
    else if (effectiveWeeklyChange > 0.3) riskLevel = "moderate";

    // Stagnation risk
    if (plateaus >= 2 && metabolicClass === "plateau_dominant") riskLevel = "moderate";

    const projDate = new Date();
    projDate.setDate(projDate.getDate() + weeks * 7);

    // Body fat projection (simple linear if we have baseline)
    let projectedBodyFat = null;
    if (currentBodyFat && currentWeight > 0) {
      const fatMass = currentWeight * (currentBodyFat / 100);
      const leanMass = currentWeight - fatMass;
      // Assume 75% of weight loss is fat, 25% lean (standard clinical ratio)
      const weightDelta = projectedWeight - currentWeight;
      const fatDelta = weightDelta * 0.75;
      const newFatMass = Math.max(fatMass + fatDelta, 0);
      projectedBodyFat = Number(((newFatMass / Math.max(projectedWeight, 40)) * 100).toFixed(1));
    }

    projections.push({
      patient_id: patientId,
      projection_date: projDate.toISOString().split("T")[0],
      projected_weight: Math.max(projectedWeight, 30), // Safety floor
      projected_body_fat: projectedBodyFat,
      projected_risk_level: riskLevel,
      projection_confidence: confidence,
      projection_model_version: ENGINE_VERSION,
      horizon_weeks: weeks,
    });

    // Body composition projection
    if (projectedBodyFat !== null) {
      const estimatedLeanMass = Number((projectedWeight * (1 - projectedBodyFat / 100)).toFixed(1));
      bodyProjections.push({
        patient_id: patientId,
        projection_date: projDate.toISOString().split("T")[0],
        estimated_body_fat: projectedBodyFat,
        estimated_lean_mass: estimatedLeanMass,
        silhouette_classification: classifySilhouette(projectedBodyFat),
        projection_confidence: confidence,
        engine_version: ENGINE_VERSION,
      });
    }
  }

  if (projections.length > 0) {
    await supabase.from("patient_weight_projection").insert(projections);
  }

  // Delete old body projections and insert new
  if (bodyProjections.length > 0) {
    await supabase.from("patient_body_projection_states").delete().eq("patient_id", patientId);
    await supabase.from("patient_body_projection_states").insert(bodyProjections);
  }

  console.log(`[WEIGHT-TRAJECTORY] Patient ${patientId}: ${allWeights.length} points, velocity=${avgWeeklyChange}kg/wk, pattern=${responsePattern}`);
}

// ─── Utilities ───
function groupBy<T>(arr: T[], key: string): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const item of arr) {
    const k = (item as any)[key];
    if (!k) continue;
    if (!map[k]) map[k] = [];
    map[k].push(item);
  }
  return map;
}

function indexBy<T>(arr: T[], key: string): Record<string, T> {
  const map: Record<string, T> = {};
  for (const item of arr) {
    const k = (item as any)[key];
    if (k) map[k] = item;
  }
  return map;
}
