import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const THERAPEUTIC_ENGINE_VERSION = "1.0.0";
const THERAPEUTIC_MODEL = "adaptive_therapy_engine_v1";
const BATCH_SIZE = 100;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════
// BLOCO 1 — MODELO CLÍNICO DE RESPOSTA CALÓRICA
// ═══════════════════════════════════════════

type CaloricResponseStatus =
  | "resposta_rapida"
  | "resposta_adequada"
  | "resposta_lenta"
  | "estagnado"
  | "resposta_negativa"
  | "risco_adaptacao_metabolica";

function classifyCaloricResponseStatus(
  weightVelocity14d: number,
  cluster: string,
  adherence7d: number,
  riskScore: number,
  weightTrend: string
): CaloricResponseStatus {
  // Rapid loss
  if (weightVelocity14d < -0.8 && adherence7d >= 60) return "resposta_rapida";

  // Adequate response
  if (weightVelocity14d <= -0.3 && weightVelocity14d >= -0.8 && adherence7d >= 60) return "resposta_adequada";

  // Slow response
  if (weightVelocity14d > -0.3 && weightVelocity14d < -0.05 && adherence7d >= 60) return "resposta_lenta";

  // Metabolic adaptation risk (BEFORE estagnado — higher priority clinical signal)
  if (
    adherence7d >= 75 &&
    (weightTrend === "stagnated" || weightTrend === "slow_loss") &&
    (cluster === "resistant_profile" || cluster === "metabolic_adaptive")
  ) {
    return "risco_adaptacao_metabolica";
  }

  // Stagnated
  if (Math.abs(weightVelocity14d) <= 0.05 && adherence7d >= 50) return "estagnado";

  // Negative response (gaining weight)
  if (weightVelocity14d > 0.1) return "resposta_negativa";

  // Default based on velocity
  if (weightVelocity14d >= 0) return "resposta_negativa";
  return "resposta_lenta";
}

// ═══════════════════════════════════════════
// BLOCO 2 — MOTOR DE AJUSTE CALÓRICO TERAPÊUTICO
// ═══════════════════════════════════════════

type CaloricAdjustmentType =
  | "manter"
  | "reduzir_leve"
  | "reduzir_moderado"
  | "aumentar_leve"
  | "diet_break_controlado"
  | "troca_estrategia";

interface TherapeuticAdjustment {
  type: CaloricAdjustmentType;
  delta_percent: number;
  reason: string;
  duration_days?: number;
}

function computeTherapeuticCaloricAdjustment(
  caloricResponse: CaloricResponseStatus,
  cluster: string,
  adherence7d: number,
  riskScore: number,
  planDays: number,
  currentCalories: number
): TherapeuticAdjustment {
  // SAFETY: never adjust if plan < 7 days
  if (planDays < 7) return { type: "manter", delta_percent: 0, reason: "Plano ativo há menos de 7 dias — aguardar estabilização" };

  // SAFETY: never adjust if adherence < 40%
  if (adherence7d < 40) return { type: "manter", delta_percent: 0, reason: "Adesão abaixo de 40% — foco comportamental, não calórico" };

  // SAFETY: critical risk requires manual confirmation
  if (riskScore >= 60) return { type: "manter", delta_percent: 0, reason: "Risco clínico crítico — requer avaliação manual do profissional" };

  // Cluster: disengaging → block caloric adjustment
  if (cluster === "disengaging_patient") {
    return { type: "manter", delta_percent: 0, reason: "Paciente em desengajamento — ajuste calórico bloqueado, foco em retenção" };
  }

  // Cluster: behavioral_struggler + low adherence → don't reduce, simplify
  if (cluster === "behavioral_struggler" && adherence7d < 60) {
    return { type: "troca_estrategia", delta_percent: 0, reason: "Luta comportamental com adesão baixa — simplificar plano, não reduzir calorias" };
  }

  // Cluster: metabolic_adaptive + stagnation + metabolic risk → diet break
  if (cluster === "metabolic_adaptive" && caloricResponse === "risco_adaptacao_metabolica") {
    return {
      type: "diet_break_controlado",
      delta_percent: 12,
      duration_days: 7,
      reason: "Adaptação metabólica detectada em perfil adaptativo — diet break controlado (+12% por 7 dias) para reset metabólico",
    };
  }

  // Cluster: resistant + slow response + high adherence → reduce leve
  if (cluster === "resistant_profile" && caloricResponse === "resposta_lenta" && adherence7d >= 70) {
    return {
      type: "reduzir_leve",
      delta_percent: -6,
      reason: "Perfil resistente com resposta lenta e boa adesão — redução leve de 6%",
    };
  }

  // Stagnated with good adherence → reduce leve
  if (caloricResponse === "estagnado" && adherence7d >= 70) {
    return {
      type: "reduzir_leve",
      delta_percent: -7,
      reason: `Estagnação com adesão de ${adherence7d}% — redução leve de 7% recomendada`,
    };
  }

  // Slow response with very high adherence → reduce moderado
  if (caloricResponse === "resposta_lenta" && adherence7d >= 85 && planDays >= 21) {
    return {
      type: "reduzir_moderado",
      delta_percent: -10,
      reason: "Resposta lenta persistente com adesão excelente (>85%) há 21+ dias — redução moderada de 10%",
    };
  }

  // Rapid response → protect metabolism
  if (caloricResponse === "resposta_rapida") {
    return {
      type: "aumentar_leve",
      delta_percent: 5,
      reason: "Perda acelerada detectada — aumento leve de 5% para preservação de massa magra e proteção metabólica",
    };
  }

  // Metabolic adaptation risk (generic) → diet break
  if (caloricResponse === "risco_adaptacao_metabolica" && planDays >= 28) {
    return {
      type: "diet_break_controlado",
      delta_percent: 12,
      duration_days: 7,
      reason: "Risco de adaptação metabólica após 28+ dias — diet break controlado recomendado",
    };
  }

  return { type: "manter", delta_percent: 0, reason: "Nenhum ajuste necessário no momento" };
}

// ═══════════════════════════════════════════
// BLOCO 3 — STATUS DE COMPLEXIDADE DO PLANO
// ═══════════════════════════════════════════

type PlanComplexityStatus = "simplificar_plano" | "manter" | "aumentar_estrutura" | "estrategia_metabolica";

function computePlanComplexityStatus(
  cluster: string,
  adherence7d: number,
  alertCount: number,
  therapeuticFailures: number
): PlanComplexityStatus {
  // Behavioral struggler or disengaging → simplify
  if ((cluster === "behavioral_struggler" || cluster === "disengaging_patient") && adherence7d < 55) {
    return "simplificar_plano";
  }

  // High alert count + low adherence → simplify
  if (alertCount >= 3 && adherence7d < 50) return "simplificar_plano";

  // Multiple therapeutic failures → strategic change
  if (therapeuticFailures >= 2) return "estrategia_metabolica";

  // Metabolic adaptive with good adherence → add structure
  if (cluster === "metabolic_adaptive" && adherence7d >= 70) return "aumentar_estrutura";

  // Resistant with good adherence → metabolic strategy
  if (cluster === "resistant_profile" && adherence7d >= 75) return "estrategia_metabolica";

  return "manter";
}

// ═══════════════════════════════════════════
// BLOCO 4 — SCORE DE EFICÁCIA TERAPÊUTICA
// ═══════════════════════════════════════════

type EfficacyLevel = "alta_eficacia" | "eficacia_moderada" | "baixa_eficacia" | "falha_terapeutica";

interface EfficacyResult {
  score: number;
  level: EfficacyLevel;
}

function computeTherapeuticEfficacy(
  weightVelocity: number,
  adherence7d: number,
  alertCount: number,
  engagementIndex: number,
  planDays: number
): EfficacyResult {
  if (planDays < 7) return { score: 50, level: "eficacia_moderada" }; // too early

  let score = 50; // baseline

  // Weight evolution (0-30 points)
  if (weightVelocity < -0.5) score += 30;
  else if (weightVelocity < -0.2) score += 20;
  else if (weightVelocity < 0) score += 10;
  else if (weightVelocity > 0.2) score -= 15;

  // Adherence (0-30 points)
  if (adherence7d >= 80) score += 30;
  else if (adherence7d >= 60) score += 20;
  else if (adherence7d >= 40) score += 10;
  else score -= 10;

  // Clinical alerts penalty (-20 to 0)
  score -= Math.min(alertCount * 5, 20);

  // Engagement stability (0-10 points)
  if (engagementIndex >= 70) score += 10;
  else if (engagementIndex >= 50) score += 5;
  else if (engagementIndex < 30) score -= 5;

  // Clamp
  score = Math.max(0, Math.min(100, score));

  let level: EfficacyLevel;
  if (score >= 75) level = "alta_eficacia";
  else if (score >= 50) level = "eficacia_moderada";
  else if (score >= 25) level = "baixa_eficacia";
  else level = "falha_terapeutica";

  return { score, level };
}

// ═══════════════════════════════════════════
// BLOCO 8 — SAFETY VALIDATIONS
// ═══════════════════════════════════════════

function validateTherapeuticSafety(
  adjustment: TherapeuticAdjustment,
  adherence7d: number,
  planDays: number,
  riskScore: number
): { safe: boolean; reason?: string } {
  // Never reduce >12% automatically
  if (adjustment.delta_percent < -12) {
    return { safe: false, reason: "Redução calórica >12% bloqueada — limitar a -12%" };
  }
  // Never if adherence < 40%
  if (adjustment.delta_percent !== 0 && adherence7d < 40) {
    return { safe: false, reason: "Ajuste bloqueado — adesão <40%" };
  }
  // Never if plan < 7 days
  if (adjustment.delta_percent !== 0 && planDays < 7) {
    return { safe: false, reason: "Ajuste bloqueado — plano <7 dias" };
  }
  // Critical risk requires confirmation
  if (adjustment.delta_percent !== 0 && riskScore >= 60) {
    return { safe: false, reason: "Risco crítico — requer confirmação manual" };
  }
  return { safe: true };
}

// ═══════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════

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
    const nutritionistId = body.nutritionist_id;
    const singlePatientId = body.patient_id;

    console.log(`[THERAPEUTIC v${THERAPEUTIC_ENGINE_VERSION}] Starting. Model: ${THERAPEUTIC_MODEL}`);

    // Get active patients
    let patientIds: string[] = [];

    if (singlePatientId) {
      patientIds = [singlePatientId];
    } else {
      let npQuery = supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("status", "active");
      if (nutritionistId) npQuery = npQuery.eq("nutritionist_id", nutritionistId);
      const { data: rels } = await npQuery;
      if (!rels || rels.length === 0) {
        return jsonResponse({ patients_processed: 0, engine_version: THERAPEUTIC_ENGINE_VERSION, duration_ms: Date.now() - startTime });
      }
      patientIds = [...new Set(rels.map((r: any) => r.patient_id))];
    }

    let totalInterventions = 0;
    let totalProcessed = 0;

    for (let i = 0; i < patientIds.length; i += BATCH_SIZE) {
      const batch = patientIds.slice(i, i + BATCH_SIZE);
      const result = await processBatch(supabase, batch);
      totalInterventions += result.interventions;
      totalProcessed += result.processed;
    }

    const duration = Date.now() - startTime;
    console.log(`[THERAPEUTIC v${THERAPEUTIC_ENGINE_VERSION}] Complete. ${totalProcessed} processed, ${totalInterventions} interventions, ${duration}ms`);

    return jsonResponse({
      patients_processed: totalProcessed,
      interventions_created: totalInterventions,
      engine_version: THERAPEUTIC_ENGINE_VERSION,
      therapeutic_model: THERAPEUTIC_MODEL,
      duration_ms: duration,
    });
  } catch (error: any) {
    console.error("[THERAPEUTIC] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message, engine_version: THERAPEUTIC_ENGINE_VERSION }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function jsonResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function processBatch(
  supabase: any,
  patientIds: string[]
): Promise<{ interventions: number; processed: number }> {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

  // Batch fetch all needed data in parallel
  const [
    profilesRes,
    plansRes,
    snapshotsRes,
    clusterRes,
    alertsRes,
    existingInterventionsRes,
    assessmentsRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, weight_trend_status, weight_velocity_kg_week, adherence_score_7d, engagement_index, engagement_level, clinical_risk_level")
      .in("user_id", patientIds),
    supabase
      .from("meal_plans")
      .select("patient_id, id, start_date, plan_status, generation_metadata, therapeutic_effectiveness_status, therapeutic_efficacy_score")
      .in("patient_id", patientIds)
      .eq("is_active", true)
      .in("plan_status", ["published_to_patient", "approved"]),
    supabase
      .from("patient_clinical_snapshots")
      .select("patient_id, snapshot_date, weight_velocity_kg_week, adherence_score, caloric_response_status, risk_score")
      .in("patient_id", patientIds)
      .gte("snapshot_date", fourteenDaysAgo.split("T")[0])
      .order("snapshot_date", { ascending: false }),
    supabase
      .from("patient_clinical_state")
      .select("patient_id, metabolic_cluster, metabolic_cluster_confidence, caloric_response_status, stagnation_risk_level")
      .in("patient_id", patientIds),
    supabase
      .from("clinical_alerts")
      .select("patient_id, severity, alert_type")
      .in("patient_id", patientIds)
      .eq("is_active", true),
    // Check for recent pending interventions (dedup - last 7 days)
    supabase
      .from("nutritional_intervention_suggestions")
      .select("patient_id, intervention_type, created_at")
      .in("patient_id", patientIds)
      .eq("status", "pending")
      .gte("created_at", sevenDaysAgo),
    // Weight data for 14d velocity
    supabase
      .from("physical_assessments")
      .select("patient_id, weight, assessment_date")
      .in("patient_id", patientIds)
      .gte("assessment_date", fourteenDaysAgo.split("T")[0])
      .order("assessment_date", { ascending: true }),
  ]);

  const profileMap = indexBy(profilesRes.data || [], "user_id");
  const planMap = indexBy(plansRes.data || [], "patient_id");
  const snapshotsByP = groupBy(snapshotsRes.data || [], "patient_id");
  const clusterMap = indexBy(clusterRes.data || [], "patient_id");
  const alertsByP = groupBy(alertsRes.data || [], "patient_id");
  const existingByP = groupBy(existingInterventionsRes.data || [], "patient_id");
  const assessByP = groupBy(assessmentsRes.data || [], "patient_id");

  const interventions: any[] = [];
  const planUpdates: any[] = [];
  const timelineEntries: any[] = [];
  let processed = 0;

  for (const pid of patientIds) {
    const profile = profileMap[pid] as {
      adherence_score_7d?: number | null;
      engagement_index?: number | null;
      weight_trend_status?: string | null;
      weight_velocity_kg_week?: number | null;
      clinical_risk_level?: string | null;
    } | undefined;
    const plan = planMap[pid] as {
      id: string;
      start_date?: string | null;
      generation_metadata?: { calorie_target?: number | null } | null;
      therapeutic_effectiveness_status?: string | null;
    } | undefined;
    const clusterState = clusterMap[pid] as { metabolic_cluster?: string | null } | undefined;
    const alerts = alertsByP[pid] || [];
    const existingPending = existingByP[pid] || [];
    const assessments = assessByP[pid] || [];

    if (!plan || !profile) continue;
    processed++;

    // Skip if already has pending intervention
    if (existingPending.length > 0) continue;

    const meta = plan.generation_metadata || {};
    const currentCalories = meta.calorie_target || 0;
    const planDays = Math.floor((now.getTime() - new Date(plan.start_date || now.toISOString()).getTime()) / 86400000);
    const cluster = clusterState?.metabolic_cluster || "unknown";
    const adherence7d = profile.adherence_score_7d || 0;
    const engagementIndex = profile.engagement_index || 50;
    const weightTrend = profile.weight_trend_status || "unknown";

    // Calculate 14d weight velocity from assessments
    let weightVelocity14d = profile.weight_velocity_kg_week || 0;
    if (assessments.length >= 2) {
      const first = assessments[0] as { assessment_date?: string; weight?: number | null };
      const last = assessments[assessments.length - 1] as { assessment_date?: string; weight?: number | null };
      const daysBetween = (new Date(last.assessment_date || now.toISOString()).getTime() - new Date(first.assessment_date || now.toISOString()).getTime()) / 86400000;
      if (daysBetween >= 7 && first.weight && last.weight) {
        weightVelocity14d = (last.weight - first.weight) / (daysBetween / 7);
      }
    }

    // Risk score mapping
    const riskLevel = profile.clinical_risk_level || "stable";
    const riskScore = riskLevel === "critical" ? 70 : riskLevel === "risk" ? 40 : riskLevel === "attention" ? 15 : 5;

    // Count previous therapeutic failures for this patient
    const therapeuticEffectiveness = plan.therapeutic_effectiveness_status || "";
    const therapeuticFailures = therapeuticEffectiveness === "falha_terapeutica" ? 1 : 0;

    // ─── BLOCO 1: Classify caloric response ───
    const caloricResponse = classifyCaloricResponseStatus(
      weightVelocity14d,
      cluster,
      adherence7d,
      riskScore,
      weightTrend
    );

    // ─── BLOCO 4: Compute efficacy score ───
    const efficacy = computeTherapeuticEfficacy(
      weightVelocity14d,
      adherence7d,
      alerts.length,
      engagementIndex,
      planDays
    );

    // Update plan efficacy score
    planUpdates.push({ id: plan.id, efficacy_score: efficacy.score, effectiveness: efficacy.level });

    // ─── BLOCO 2: Compute caloric adjustment ───
    const adjustment = computeTherapeuticCaloricAdjustment(
      caloricResponse,
      cluster,
      adherence7d,
      riskScore,
      planDays,
      currentCalories
    );

    // ─── BLOCO 3: Compute plan complexity status ───
    const complexityStatus = computePlanComplexityStatus(
      cluster,
      adherence7d,
      alerts.length,
      therapeuticFailures
    );

    // Only create intervention if there's something to do
    if (adjustment.type === "manter" && complexityStatus === "manter") continue;

    // ─── BLOCO 8: Safety validation ───
    const safety = validateTherapeuticSafety(adjustment, adherence7d, planDays, riskScore);
    if (!safety.safe) {
      console.log(`[THERAPEUTIC] Safety block for ${pid}: ${safety.reason}`);
      // Still record as blocked intervention for audit
      interventions.push({
        patient_id: pid,
        plan_id: plan.id,
        intervention_type: `blocked_${adjustment.type}`,
        caloric_adjustment_percent: adjustment.delta_percent,
        clinical_reason: `${adjustment.reason} | BLOQUEADO: ${safety.reason}`,
        cluster_origin: cluster,
        risk_at_moment: riskLevel,
        efficacy_score: efficacy.score,
        engine_version: THERAPEUTIC_ENGINE_VERSION,
        status: "blocked",
        metadata: {
          caloric_response: caloricResponse,
          complexity_status: complexityStatus,
          weight_velocity_14d: weightVelocity14d,
          adherence_7d: adherence7d,
          plan_days: planDays,
          safety_reason: safety.reason,
          efficacy_level: efficacy.level,
          therapeutic_model: THERAPEUTIC_MODEL,
        },
      });
      continue;
    }

    // Determine primary intervention type
    let interventionType = adjustment.type as string;
    if (adjustment.type === "manter" && complexityStatus !== "manter") {
      interventionType = complexityStatus;
    }

    interventions.push({
      patient_id: pid,
      plan_id: plan.id,
      intervention_type: interventionType,
      caloric_adjustment_percent: adjustment.delta_percent,
      clinical_reason: adjustment.reason + (complexityStatus !== "manter" ? ` | Complexidade: ${complexityStatus}` : ""),
      cluster_origin: cluster,
      risk_at_moment: riskLevel,
      efficacy_score: efficacy.score,
      engine_version: THERAPEUTIC_ENGINE_VERSION,
      status: "pending",
      metadata: {
        caloric_response: caloricResponse,
        complexity_status: complexityStatus,
        weight_velocity_14d: weightVelocity14d,
        adherence_7d: adherence7d,
        engagement_index: engagementIndex,
        plan_days: planDays,
        current_calories: currentCalories,
        suggested_calories: adjustment.delta_percent !== 0 ? Math.round(currentCalories * (1 + adjustment.delta_percent / 100)) : currentCalories,
        duration_days: adjustment.duration_days || null,
        efficacy_level: efficacy.level,
        therapeutic_model: THERAPEUTIC_MODEL,
      },
    });

    // Timeline entry
    timelineEntries.push({
      patient_id: pid,
      event_type: "therapeutic_intervention_suggested",
      title: "Intervenção terapêutica sugerida",
      description: `Motor terapêutico v${THERAPEUTIC_ENGINE_VERSION}: ${adjustment.reason}`,
      metadata: {
        intervention_type: interventionType,
        delta_percent: adjustment.delta_percent,
        efficacy_score: efficacy.score,
        cluster: cluster,
      },
    });
  }

  // ─── Batch persist interventions ───
  if (interventions.length > 0) {
    const { error } = await supabase
      .from("nutritional_intervention_suggestions")
      .insert(interventions);
    if (error) console.error("[THERAPEUTIC] Insert error:", error);
  }

  // ─── Update plan efficacy scores ───
  if (planUpdates.length > 0) {
    const updatePromises = planUpdates.map((u) =>
      supabase
        .from("meal_plans")
        .update({
          therapeutic_efficacy_score: u.efficacy_score,
          therapeutic_effectiveness_status: u.effectiveness,
        })
        .eq("id", u.id)
    );
    await Promise.all(updatePromises);
  }

  // ─── Timeline entries ───
  if (timelineEntries.length > 0) {
    const { error } = await supabase.from("patient_timeline").insert(timelineEntries);
    if (error) console.error("[THERAPEUTIC] Timeline insert error:", error);
  }

  console.log(`[THERAPEUTIC] Batch: ${processed} processed, ${interventions.filter((i) => i.status === "pending").length} interventions`);
  return { interventions: interventions.filter((i) => i.status === "pending").length, processed };
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
