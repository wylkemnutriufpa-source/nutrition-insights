import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BEHAVIOR_ENGINE_VERSION = "1.0.0";
const BATCH_SIZE = 100;
const DROPOUT_ALERT_COOLDOWN_DAYS = 5;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════
// BLOCO 1 — SCORE DE RISCO DE ABANDONO
// ═══════════════════════════════════════════

function computeDropoutRiskScore(params: {
  daysWithoutLogin: number;
  adherenceDrop14d: number; // percentage drop (positive = dropped)
  adherence7d: number;
  checkinReduction: number; // 0-100 how much check-ins reduced
  alertCount: number;
  cluster: string;
  evolutionScore: number; // efficacy score from therapeutic engine
  engagementVelocity: number; // engagement index change
}): number {
  let score = 0;

  // Days without login (0-35 pts)
  if (params.daysWithoutLogin >= 10) score += 35;
  else if (params.daysWithoutLogin >= 5) score += 20;
  else if (params.daysWithoutLogin >= 3) score += 10;

  // Adherence level (0-30 pts)
  if (params.adherence7d < 30) score += 30;
  else if (params.adherence7d < 50) score += 20;
  else if (params.adherence7d < 60) score += 10;

  // Adherence drop in 14 days (0-15 pts)
  if (params.adherenceDrop14d > 30) score += 15;
  else if (params.adherenceDrop14d > 15) score += 10;
  else if (params.adherenceDrop14d > 5) score += 5;

  // Cluster influence (0-25 pts)
  if (params.cluster === "disengaging_patient") score += 25;
  else if (params.cluster === "behavioral_struggler") score += 10;

  // Therapeutic failure (0-20 pts)
  if (params.evolutionScore < 25) score += 20;
  else if (params.evolutionScore < 40) score += 10;

  // Alert frequency (0-10 pts)
  if (params.alertCount >= 4) score += 10;
  else if (params.alertCount >= 2) score += 5;

  // Check-in reduction (0-10 pts)
  if (params.checkinReduction > 50) score += 10;
  else if (params.checkinReduction > 25) score += 5;

  // Engagement velocity declining (0-10 pts)
  if (params.engagementVelocity < -20) score += 10;
  else if (params.engagementVelocity < -10) score += 5;

  return Math.min(100, Math.max(0, score));
}

// ═══════════════════════════════════════════
// BLOCO 2 — CLASSIFICAÇÃO
// ═══════════════════════════════════════════

type DropoutRiskLevel = "baixo" | "moderado" | "alto" | "critico";

function classifyDropoutRisk(score: number): DropoutRiskLevel {
  if (score >= 70) return "critico";
  if (score >= 50) return "alto";
  if (score >= 30) return "moderado";
  return "baixo";
}

// ═══════════════════════════════════════════
// BLOCO 4 — MOTOR DE RECUPERAÇÃO AUTOMÁTICA
// ═══════════════════════════════════════════

type RecoveryStrategy =
  | "contato_imediato"
  | "simplificar_plano"
  | "reduzir_pressao_resultado"
  | "estrategia_motivacional"
  | "agendar_retorno"
  | "intervencao_intensiva";

interface RecoveryDecision {
  strategy: RecoveryStrategy;
  reason: string;
  priority: number; // 1=urgent, 5=low
}

function computeRecoveryStrategy(
  dropoutLevel: DropoutRiskLevel,
  cluster: string,
  adherence7d: number,
  planEfficacy: number,
  daysInactive: number
): RecoveryDecision {
  // Critical + disengaging = intensive intervention
  if (dropoutLevel === "critico" && cluster === "disengaging_patient") {
    return {
      strategy: "intervencao_intensiva",
      reason: "Risco crítico de abandono com perfil desengajando — protocolo de recuperação intensiva necessário",
      priority: 1,
    };
  }

  // Critical + any cluster = immediate contact
  if (dropoutLevel === "critico") {
    return {
      strategy: "contato_imediato",
      reason: `Risco crítico de abandono (${daysInactive}d inativo, adesão ${adherence7d}%) — contato imediato recomendado`,
      priority: 1,
    };
  }

  // High risk + behavioral struggler = simplify plan
  if (dropoutLevel === "alto" && cluster === "behavioral_struggler") {
    return {
      strategy: "simplificar_plano",
      reason: "Risco alto com perfil de luta comportamental — simplificar plano para aumentar adesão",
      priority: 2,
    };
  }

  // High risk + low plan efficacy = reduce pressure
  if (dropoutLevel === "alto" && planEfficacy < 40) {
    return {
      strategy: "reduzir_pressao_resultado",
      reason: "Risco alto com baixa eficácia terapêutica — reduzir pressão por resultados e ajustar expectativas",
      priority: 2,
    };
  }

  // High risk = schedule return
  if (dropoutLevel === "alto") {
    return {
      strategy: "agendar_retorno",
      reason: `Risco alto de abandono — agendar retorno para reengajamento (adesão: ${adherence7d}%)`,
      priority: 2,
    };
  }

  // Moderate + disengaging = motivational
  if (dropoutLevel === "moderado" && cluster === "disengaging_patient") {
    return {
      strategy: "estrategia_motivacional",
      reason: "Risco moderado com tendência de desengajamento — aplicar estratégia motivacional",
      priority: 3,
    };
  }

  // Moderate + low adherence = simplify
  if (dropoutLevel === "moderado" && adherence7d < 45) {
    return {
      strategy: "simplificar_plano",
      reason: `Risco moderado com adesão baixa (${adherence7d}%) — simplificar plano para facilitar retomada`,
      priority: 3,
    };
  }

  // Moderate default = schedule return
  if (dropoutLevel === "moderado") {
    return {
      strategy: "agendar_retorno",
      reason: "Risco moderado de abandono — agendar consulta de acompanhamento preventiva",
      priority: 4,
    };
  }

  // Low risk (shouldn't normally reach here)
  return {
    strategy: "estrategia_motivacional",
    reason: "Monitoramento preventivo — reforço motivacional leve recomendado",
    priority: 5,
  };
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

    console.log(`[BEHAVIOR v${BEHAVIOR_ENGINE_VERSION}] Starting dropout risk analysis`);

    // Get active patients
    let patientIds: string[] = [];

    if (singlePatientId) {
      patientIds = [singlePatientId];
    } else {
      let npQuery = supabase
        .from("nutritionist_patients")
        .select("patient_id, nutritionist_id")
        .eq("status", "active");
      if (nutritionistId) npQuery = npQuery.eq("nutritionist_id", nutritionistId);
      const { data: rels } = await npQuery;
      if (!rels || rels.length === 0) {
        return jsonResponse({ patients_processed: 0, engine_version: BEHAVIOR_ENGINE_VERSION, duration_ms: Date.now() - startTime });
      }
      patientIds = [...new Set(rels.map((r: any) => r.patient_id))];
    }

    let totalRecoveryActions = 0;
    let totalAlerts = 0;
    let totalProcessed = 0;

    for (let i = 0; i < patientIds.length; i += BATCH_SIZE) {
      const batch = patientIds.slice(i, i + BATCH_SIZE);
      const result = await processBatch(supabase, batch);
      totalRecoveryActions += result.recoveryActions;
      totalAlerts += result.alerts;
      totalProcessed += result.processed;
    }

    const duration = Date.now() - startTime;
    console.log(`[BEHAVIOR v${BEHAVIOR_ENGINE_VERSION}] Complete. ${totalProcessed} processed, ${totalRecoveryActions} recovery actions, ${totalAlerts} alerts, ${duration}ms`);

    return jsonResponse({
      patients_processed: totalProcessed,
      recovery_actions_created: totalRecoveryActions,
      alerts_created: totalAlerts,
      engine_version: BEHAVIOR_ENGINE_VERSION,
      duration_ms: duration,
    });
  } catch (error: any) {
    console.error("[BEHAVIOR] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message, engine_version: BEHAVIOR_ENGINE_VERSION }),
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
): Promise<{ recoveryActions: number; alerts: number; processed: number }> {
  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - DROPOUT_ALERT_COOLDOWN_DAYS * 86400000).toISOString();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

  // Batch fetch all needed data
  const [
    profilesRes,
    sessionsRes,
    clusterRes,
    alertsRes,
    plansRes,
    existingRecoveryRes,
    existingDropoutAlertsRes,
    snapshotsRes,
    checklistCurrentRes,
    checklistPrevRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, adherence_score_7d, adherence_score_prev_7d, engagement_index, engagement_level, clinical_risk_level, weight_trend_status")
      .in("user_id", patientIds),
    supabase
      .from("user_sessions")
      .select("user_id, last_seen_at")
      .in("user_id", patientIds),
    supabase
      .from("patient_clinical_state")
      .select("patient_id, metabolic_cluster")
      .in("patient_id", patientIds),
    supabase
      .from("clinical_alerts")
      .select("patient_id, severity")
      .in("patient_id", patientIds)
      .eq("is_active", true),
    supabase
      .from("meal_plans")
      .select("patient_id, therapeutic_efficacy_score, therapeutic_effectiveness_status")
      .in("patient_id", patientIds)
      .eq("is_active", true),
    // Existing pending recovery actions (dedup)
    supabase
      .from("behavioral_recovery_actions")
      .select("patient_id")
      .in("patient_id", patientIds)
      .eq("status", "pending"),
    // Recent dropout alerts (cooldown check)
    supabase
      .from("clinical_alerts")
      .select("patient_id")
      .in("patient_id", patientIds)
      .eq("alert_type", "possible_behavioral_dropout")
      .gte("created_at", fiveDaysAgo),
    // Snapshots for longitudinal analysis
    supabase
      .from("patient_clinical_snapshots")
      .select("patient_id, adherence_score, engagement_stability_index, snapshot_date")
      .in("patient_id", patientIds)
      .gte("snapshot_date", fourteenDaysAgo.split("T")[0])
      .order("snapshot_date", { ascending: true }),
    // Current week checklist
    supabase
      .from("checklist_tasks")
      .select("patient_id")
      .in("patient_id", patientIds)
      .gte("date", sevenDaysAgo.split("T")[0]),
    // Previous week checklist
    supabase
      .from("checklist_tasks")
      .select("patient_id")
      .in("patient_id", patientIds)
      .gte("date", fourteenDaysAgo.split("T")[0])
      .lt("date", sevenDaysAgo.split("T")[0]),
  ]);

  const profileMap = indexBy(profilesRes.data || [], "user_id");
  const sessionMap = indexBy(sessionsRes.data || [], "user_id");
  const clusterMap = indexBy(clusterRes.data || [], "patient_id");
  const alertsByP = groupBy(alertsRes.data || [], "patient_id");
  const planMap = indexBy(plansRes.data || [], "patient_id");
  const existingRecoverySet = new Set((existingRecoveryRes.data || []).map((r: any) => r.patient_id));
  const recentDropoutAlertSet = new Set((existingDropoutAlertsRes.data || []).map((r: any) => r.patient_id));
  const snapshotsByP = groupBy(snapshotsRes.data || [], "patient_id");
  const checkinCurrentByP = groupBy(checklistCurrentRes.data || [], "patient_id");
  const checkinPrevByP = groupBy(checklistPrevRes.data || [], "patient_id");

  const recoveryActions: any[] = [];
  const newAlerts: any[] = [];
  const timelineEntries: any[] = [];
  let processed = 0;

  for (const pid of patientIds) {
    const profile = profileMap[pid];
    if (!profile) continue;
    processed++;

    const session = sessionMap[pid];
    const cluster = clusterMap[pid]?.metabolic_cluster || "unknown";
    const alerts = alertsByP[pid] || [];
    const plan = planMap[pid];
    const snapshots = snapshotsByP[pid] || [];

    // Calculate days without login
    const daysWithoutLogin = session?.last_seen_at
      ? Math.floor((now.getTime() - new Date(session.last_seen_at).getTime()) / 86400000)
      : 30; // assume worst if no session

    // Calculate adherence drop (14d comparison)
    const adherence7d = profile.adherence_score_7d || 0;
    const adherencePrev7d = profile.adherence_score_prev_7d || 0;
    const adherenceDrop14d = Math.max(0, adherencePrev7d - adherence7d);

    // Check-in reduction
    const currentCheckins = (checkinCurrentByP[pid] || []).length;
    const prevCheckins = (checkinPrevByP[pid] || []).length;
    const checkinReduction = prevCheckins > 0
      ? Math.round(((prevCheckins - currentCheckins) / prevCheckins) * 100)
      : 0;

    // Engagement velocity from snapshots
    let engagementVelocity = 0;
    if (snapshots.length >= 2) {
      const first = snapshots[0];
      const last = snapshots[snapshots.length - 1];
      engagementVelocity = (last.engagement_stability_index || 50) - (first.engagement_stability_index || 50);
    }

    // Plan efficacy
    const planEfficacy = plan?.therapeutic_efficacy_score || 50;

    // ─── BLOCO 1: Compute dropout score ───
    const dropoutScore = computeDropoutRiskScore({
      daysWithoutLogin,
      adherenceDrop14d,
      adherence7d,
      checkinReduction: Math.max(0, checkinReduction),
      alertCount: alerts.length,
      cluster,
      evolutionScore: planEfficacy,
      engagementVelocity,
    });

    // ─── BLOCO 2: Classify risk ───
    const dropoutLevel = classifyDropoutRisk(dropoutScore);

    // Skip if low risk
    if (dropoutLevel === "baixo") continue;

    // ─── BLOCO 3: Create alert if needed (with cooldown) ───
    if (
      dropoutScore >= 55 &&
      !recentDropoutAlertSet.has(pid)
    ) {
      // Determine nutritionist_id
      const { data: npData } = await supabase
        .from("nutritionist_patients")
        .select("nutritionist_id")
        .eq("patient_id", pid)
        .eq("status", "active")
        .limit(1);

      const nutritionistId = npData?.[0]?.nutritionist_id;

      if (nutritionistId) {
        // SAFETY: Block alert in critical metabolic risk
        const riskLevel = profile.clinical_risk_level || "stable";
        const isCriticalMetabolic = riskLevel === "critical" && profile.weight_trend_status === "gaining";

        if (!isCriticalMetabolic) {
          newAlerts.push({
            patient_id: pid,
            nutritionist_id: nutritionistId,
            alert_type: "possible_behavioral_dropout",
            severity: dropoutScore >= 70 ? "critical" : "high",
            title: "Risco de abandono comportamental",
            description: `Score de abandono: ${dropoutScore}/100. ${daysWithoutLogin}d sem login, adesão ${adherence7d}%. Cluster: ${cluster}.`,
            trigger_source: `behavior_engine_v${BEHAVIOR_ENGINE_VERSION}`,
            metadata: {
              dropout_score: dropoutScore,
              dropout_level: dropoutLevel,
              days_inactive: daysWithoutLogin,
              adherence_7d: adherence7d,
              adherence_drop_14d: adherenceDrop14d,
              cluster,
              engagement_velocity: engagementVelocity,
              plan_efficacy: planEfficacy,
            },
          });
        }
      }
    }

    // ─── BLOCO 4: Generate recovery strategy ───
    // Skip if already has pending recovery action
    if (existingRecoverySet.has(pid)) continue;

    const recovery = computeRecoveryStrategy(
      dropoutLevel,
      cluster,
      adherence7d,
      planEfficacy,
      daysWithoutLogin
    );

    recoveryActions.push({
      patient_id: pid,
      dropout_risk_score: dropoutScore,
      dropout_risk_level: dropoutLevel,
      suggested_strategy: recovery.strategy,
      clinical_reason: recovery.reason,
      priority: recovery.priority,
      cluster_origin: cluster,
      plan_efficacy_score: planEfficacy,
      days_inactive: daysWithoutLogin,
      adherence_at_moment: adherence7d,
      engine_version: BEHAVIOR_ENGINE_VERSION,
      status: "pending",
      metadata: {
        adherence_drop_14d: adherenceDrop14d,
        checkin_reduction: Math.max(0, checkinReduction),
        engagement_velocity: engagementVelocity,
        alert_count: alerts.length,
      },
    });

    // Timeline entry
    timelineEntries.push({
      patient_id: pid,
      event_type: "behavioral_dropout_risk_detected",
      title: `Risco de abandono: ${dropoutLevel}`,
      description: `Motor comportamental v${BEHAVIOR_ENGINE_VERSION}: Score ${dropoutScore}/100. Estratégia: ${recovery.strategy}`,
      metadata: {
        dropout_score: dropoutScore,
        dropout_level: dropoutLevel,
        strategy: recovery.strategy,
        priority: recovery.priority,
      },
    });
  }

  // ─── Batch persist recovery actions ───
  if (recoveryActions.length > 0) {
    const { error } = await supabase
      .from("behavioral_recovery_actions")
      .insert(recoveryActions);
    if (error) console.error("[BEHAVIOR] Insert recovery actions error:", error);
  }

  // ─── Batch persist alerts ───
  if (newAlerts.length > 0) {
    const { error } = await supabase
      .from("clinical_alerts")
      .insert(newAlerts);
    if (error) console.error("[BEHAVIOR] Insert alerts error:", error);
  }

  // ─── Timeline entries ───
  if (timelineEntries.length > 0) {
    const { error } = await supabase.from("patient_timeline").insert(timelineEntries);
    if (error) console.error("[BEHAVIOR] Timeline insert error:", error);
  }

  console.log(`[BEHAVIOR] Batch: ${processed} processed, ${recoveryActions.length} recovery actions, ${newAlerts.length} alerts`);
  return { recoveryActions: recoveryActions.length, alerts: newAlerts.length, processed };
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
