import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLUSTER_ENGINE_VERSION = "1.0.0";
const CLINICAL_STRATEGY_MODEL = "deterministic_cluster_rules_v1";
const BATCH_SIZE = 100;
const MIN_DATA_DAYS = 14;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════
// CLUSTER DEFINITIONS
// ═══════════════════════════════════════════

type MetabolicCluster =
  | "metabolic_responder"
  | "metabolic_adaptive"
  | "behavioral_struggler"
  | "resistant_profile"
  | "disengaging_patient"
  | "unknown";

interface MetabolicFeatureVector {
  // Physiological
  weight_velocity_avg: number;       // kg/week avg
  weight_variability: number;        // std dev of weekly weights
  caloric_response_ratio: number;    // actual vs expected weight change
  avg_stagnation_days: number;       // avg days in stagnated periods
  recovery_rate_after_adjust: number; // % improvement post-adjustment

  // Behavioral
  adherence_avg_7d: number;
  adherence_avg_30d: number;
  adherence_stability: number;       // 0-100, lower = more variable
  checkin_frequency: number;         // checkins per week avg
  days_between_relapses: number;     // avg days between adherence drops

  // Engagement
  days_since_last_login: number;
  plan_interaction_rate: number;     // meal completions / total items %
  contact_frequency: number;         // messages per month
}

interface ClusterStrategy {
  cluster: MetabolicCluster;
  nutrition_strategy: string;
  caloric_approach: string;
  plan_complexity: string;
  intervention_frequency: string;
  focus_area: string;
  recommendations: string[];
}

// ═══════════════════════════════════════════
// BLOCO 1 — FEATURE EXTRACTION
// ═══════════════════════════════════════════

function extractFeatures(
  assessments: any[],
  checklist7d: any[],
  checklist30d: any[],
  meals14d: any[],
  session: any,
  mealCompletions: any[],
  chatMessages: any[],
  snapshots: any[],
  now: Date
): MetabolicFeatureVector {
  // ── Physiological ──
  let weightVelocityAvg = 0;
  let weightVariability = 0;

  if (assessments.length >= 2) {
    const first = assessments[0];
    const last = assessments[assessments.length - 1];
    const daysBetween =
      (new Date(last.assessment_date).getTime() -
        new Date(first.assessment_date).getTime()) / 86400000;
    if (daysBetween >= 7 && first.weight && last.weight) {
      const weeks = daysBetween / 7;
      weightVelocityAvg = (last.weight - first.weight) / weeks;
    }

    // Weight variability (std dev)
    const weights = assessments.filter((a: any) => a.weight).map((a: any) => a.weight);
    if (weights.length >= 3) {
      const mean = weights.reduce((s: number, w: number) => s + w, 0) / weights.length;
      const variance = weights.reduce((s: number, w: number) => s + Math.pow(w - mean, 2), 0) / weights.length;
      weightVariability = Math.sqrt(variance);
    }
  }

  // Caloric response ratio: actual weight change vs expected from deficit
  const caloricResponseRatio = 1.0; // baseline; refined with snapshot data
  
  // Avg stagnation days from snapshots
  let avgStagnationDays = 0;
  const stagnatedSnapshots = snapshots.filter((s: any) => 
    s.weight_trend_status === "stagnated" || s.weight_trend_status === "slow_loss"
  );
  avgStagnationDays = stagnatedSnapshots.length; // proxy: each snapshot = ~1 day

  // Recovery rate (simplified: how often trend improves after stagnation)
  let recoveryRate = 50; // default
  if (snapshots.length >= 7) {
    let stagnationPeriods = 0;
    let recoveries = 0;
    for (let i = 1; i < snapshots.length; i++) {
      if (snapshots[i - 1].weight_trend_status === "stagnated" && 
          (snapshots[i].weight_trend_status === "expected_loss" || snapshots[i].weight_trend_status === "fast_loss")) {
        recoveries++;
      }
      if (snapshots[i - 1].weight_trend_status === "stagnated") {
        stagnationPeriods++;
      }
    }
    if (stagnationPeriods > 0) {
      recoveryRate = Math.round((recoveries / stagnationPeriods) * 100);
    }
  }

  // ── Behavioral ──
  const total7d = checklist7d.length;
  const completed7d = checklist7d.filter((t: any) => t.completed).length;
  const adherenceAvg7d = total7d > 0 ? Math.round((completed7d / total7d) * 100) : 0;

  const total30d = checklist30d.length;
  const completed30d = checklist30d.filter((t: any) => t.completed).length;
  const adherenceAvg30d = total30d > 0 ? Math.round((completed30d / total30d) * 100) : 0;

  // Adherence stability: compare weekly adherences
  let adherenceStability = 50;
  if (snapshots.length >= 7) {
    const weeklyAdherences = snapshots
      .filter((s: any) => s.adherence_score !== null && s.adherence_score !== undefined)
      .map((s: any) => s.adherence_score);
    if (weeklyAdherences.length >= 3) {
      const mean = weeklyAdherences.reduce((s: number, v: number) => s + v, 0) / weeklyAdherences.length;
      const variance = weeklyAdherences.reduce((s: number, v: number) => s + Math.pow(v - mean, 2), 0) / weeklyAdherences.length;
      const stdDev = Math.sqrt(variance);
      // Lower std dev = more stable = higher score
      adherenceStability = Math.max(0, Math.min(100, Math.round(100 - stdDev * 2)));
    }
  }

  // Checkin frequency (per week)
  const uniqueCheckinDays = new Set(checklist30d.filter((t: any) => t.completed).map((t: any) => t.date));
  const checkinFrequency = uniqueCheckinDays.size > 0 ? (uniqueCheckinDays.size / 4.0) : 0; // ~4 weeks

  // Days between relapses (adherence drops)
  let daysBetweenRelapses = 30; // default high
  if (snapshots.length >= 7) {
    const relapseDays: number[] = [];
    for (let i = 1; i < snapshots.length; i++) {
      const prev = snapshots[i - 1].adherence_score || 0;
      const curr = snapshots[i].adherence_score || 0;
      if (prev >= 60 && curr < 50) {
        relapseDays.push(i);
      }
    }
    if (relapseDays.length >= 2) {
      let totalGap = 0;
      for (let i = 1; i < relapseDays.length; i++) {
        totalGap += relapseDays[i] - relapseDays[i - 1];
      }
      daysBetweenRelapses = Math.round(totalGap / (relapseDays.length - 1));
    }
  }

  // ── Engagement ──
  const daysSinceLogin = session?.last_seen_at
    ? (now.getTime() - new Date(session.last_seen_at).getTime()) / 86400000
    : 30;

  // Plan interaction rate
  const totalMealItems = mealCompletions.length;
  const completedItems = mealCompletions.filter((m: any) => m.completed).length;
  const planInteractionRate = totalMealItems > 0 ? Math.round((completedItems / totalMealItems) * 100) : 0;

  // Contact frequency (messages per 30 days)
  const contactFrequency = chatMessages.length;

  return {
    weight_velocity_avg: Number(weightVelocityAvg.toFixed(3)),
    weight_variability: Number(weightVariability.toFixed(2)),
    caloric_response_ratio: caloricResponseRatio,
    avg_stagnation_days: avgStagnationDays,
    recovery_rate_after_adjust: recoveryRate,
    adherence_avg_7d: adherenceAvg7d,
    adherence_avg_30d: adherenceAvg30d,
    adherence_stability: adherenceStability,
    checkin_frequency: Number(checkinFrequency.toFixed(1)),
    days_between_relapses: daysBetweenRelapses,
    days_since_last_login: Number(daysSinceLogin.toFixed(1)),
    plan_interaction_rate: planInteractionRate,
    contact_frequency: contactFrequency,
  };
}

// ═══════════════════════════════════════════
// BLOCO 2 — CLUSTER CLASSIFICATION
// ═══════════════════════════════════════════

interface ClusterScore {
  cluster: MetabolicCluster;
  score: number;
  reasons: string[];
}

function classifyCluster(
  features: MetabolicFeatureVector,
  dataPoints: number,
  dataDays: number
): { cluster: MetabolicCluster; confidence: string; reasons: string[] } {
  // Minimum data requirement
  if (dataDays < MIN_DATA_DAYS || dataPoints < 5) {
    return { cluster: "unknown", confidence: "low", reasons: ["Dados insuficientes (mínimo 14 dias)"] };
  }

  const scores: ClusterScore[] = [
    scoreResponder(features),
    scoreAdaptive(features),
    scoreBehavioralStruggler(features),
    scoreResistant(features),
    scoreDisengaging(features),
  ];

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  const second = scores[1];

  // Confidence based on margin between top two
  const margin = best.score - second.score;
  const confidence = margin >= 20 ? "high" : margin >= 10 ? "medium" : "low";

  return { cluster: best.cluster, confidence, reasons: best.reasons };
}

function scoreResponder(f: MetabolicFeatureVector): ClusterScore {
  let score = 0;
  const reasons: string[] = [];

  // Consistent weight loss
  if (f.weight_velocity_avg < -0.3) { score += 30; reasons.push("Perda consistente de peso"); }
  // Good adherence
  if (f.adherence_avg_30d >= 70) { score += 25; reasons.push("Boa adesão (30d)"); }
  // Low variability
  if (f.weight_variability < 0.8) { score += 20; reasons.push("Baixa variabilidade de peso"); }
  // Stable adherence
  if (f.adherence_stability >= 70) { score += 15; reasons.push("Adesão estável"); }
  // Active engagement
  if (f.days_since_last_login <= 3) { score += 10; reasons.push("Engajamento ativo"); }

  return { cluster: "metabolic_responder", score, reasons };
}

function scoreAdaptive(f: MetabolicFeatureVector): ClusterScore {
  let score = 0;
  const reasons: string[] = [];

  // Initial good response but slowing
  if (f.weight_velocity_avg > -0.3 && f.weight_velocity_avg < 0) { score += 25; reasons.push("Desaceleração de perda"); }
  // Maintained adherence
  if (f.adherence_avg_30d >= 65) { score += 25; reasons.push("Adesão mantida"); }
  // Stagnation history
  if (f.avg_stagnation_days >= 5) { score += 20; reasons.push("Histórico de estagnação"); }
  // Some recovery
  if (f.recovery_rate_after_adjust >= 30 && f.recovery_rate_after_adjust < 80) { score += 15; reasons.push("Recuperação parcial pós-ajuste"); }
  // Stable engagement
  if (f.days_since_last_login <= 5) { score += 15; reasons.push("Engajamento mantido"); }

  return { cluster: "metabolic_adaptive", score, reasons };
}

function scoreBehavioralStruggler(f: MetabolicFeatureVector): ClusterScore {
  let score = 0;
  const reasons: string[] = [];

  // Unstable adherence
  if (f.adherence_stability < 50) { score += 30; reasons.push("Adesão instável"); }
  // Weight responds when adheres (checking variability as proxy)
  if (f.weight_variability >= 0.8) { score += 20; reasons.push("Peso responde a mudanças de adesão"); }
  // Frequent relapses
  if (f.days_between_relapses < 14) { score += 25; reasons.push("Recaídas frequentes"); }
  // Moderate adherence overall
  if (f.adherence_avg_30d >= 40 && f.adherence_avg_30d < 70) { score += 15; reasons.push("Adesão moderada (40-70%)"); }
  // Still engaged
  if (f.days_since_last_login <= 7) { score += 10; reasons.push("Ainda engajado"); }

  return { cluster: "behavioral_struggler", score, reasons };
}

function scoreResistant(f: MetabolicFeatureVector): ClusterScore {
  let score = 0;
  const reasons: string[] = [];

  // Good adherence
  if (f.adherence_avg_30d >= 70) { score += 30; reasons.push("Boa adesão (≥70%)"); }
  // Low weight response
  if (f.weight_velocity_avg >= -0.15 && f.weight_velocity_avg <= 0.1) { score += 25; reasons.push("Baixa resposta de peso"); }
  // Extended stagnation
  if (f.avg_stagnation_days >= 10) { score += 20; reasons.push("Estagnação prolongada"); }
  // Low recovery rate
  if (f.recovery_rate_after_adjust < 30) { score += 15; reasons.push("Baixa recuperação pós-ajuste"); }
  // Good plan interaction
  if (f.plan_interaction_rate >= 60) { score += 10; reasons.push("Boa interação com plano"); }

  return { cluster: "resistant_profile", score, reasons };
}

function scoreDisengaging(f: MetabolicFeatureVector): ClusterScore {
  let score = 0;
  const reasons: string[] = [];

  // Progressive engagement drop
  if (f.days_since_last_login > 5) { score += 30; reasons.push(`Sem login há ${Math.round(f.days_since_last_login)}d`); }
  // Declining adherence
  if (f.adherence_avg_7d < f.adherence_avg_30d - 15) { score += 25; reasons.push("Queda de adesão recente"); }
  // Low plan interaction
  if (f.plan_interaction_rate < 30) { score += 20; reasons.push("Baixa interação com plano"); }
  // Low contact
  if (f.contact_frequency < 2) { score += 15; reasons.push("Pouco contato com profissional"); }
  // Low checkin frequency
  if (f.checkin_frequency < 2) { score += 10; reasons.push("Baixa frequência de registros"); }

  return { cluster: "disengaging_patient", score, reasons };
}

// ═══════════════════════════════════════════
// BLOCO 3 — STRATEGY GENERATION
// ═══════════════════════════════════════════

function generateStrategy(cluster: MetabolicCluster): ClusterStrategy {
  const strategies: Record<MetabolicCluster, Omit<ClusterStrategy, "cluster">> = {
    metabolic_responder: {
      nutrition_strategy: "Déficit moderado contínuo com progressão gradual",
      caloric_approach: "deficit_continuo",
      plan_complexity: "basico",
      intervention_frequency: "quinzenal",
      focus_area: "manutenção de resultados",
      recommendations: [
        "Manter déficit calórico atual (está funcionando)",
        "Progressão gradual a cada 2 semanas",
        "Planos simples para não complicar o que funciona",
        "Monitorar para não acelerar demais a perda",
      ],
    },
    metabolic_adaptive: {
      nutrition_strategy: "Ciclos calóricos com refeeds programados",
      caloric_approach: "ciclico_com_refeed",
      plan_complexity: "avancado",
      intervention_frequency: "semanal",
      focus_area: "quebrar platô metabólico",
      recommendations: [
        "Implementar ciclagem calórica (2d alto / 5d déficit)",
        "Refeed semanal programado para reset metabólico",
        "Variar macros entre dias de treino e descanso",
        "Avaliar necessidade de pausa metabólica (diet break)",
      ],
    },
    behavioral_struggler: {
      nutrition_strategy: "Planos ultra práticos com menor densidade decisional",
      caloric_approach: "deficit_moderado_simplificado",
      plan_complexity: "basico",
      intervention_frequency: "2x_semana",
      focus_area: "consistência e adesão",
      recommendations: [
        "Simplificar plano ao máximo (poucas decisões por dia)",
        "Focar em 2-3 hábitos por semana, não no plano completo",
        "Missões diárias simples para construir rotina",
        "Contato frequente para reforço positivo",
      ],
    },
    resistant_profile: {
      nutrition_strategy: "Déficit progressivo com aumento proteico e controle de ingestão real",
      caloric_approach: "deficit_progressivo",
      plan_complexity: "intermediario",
      intervention_frequency: "semanal",
      focus_area: "ajuste metabólico fino",
      recommendations: [
        "Aumentar proteína para preservar massa magra",
        "Déficit progressivo -5% a cada 2 semanas",
        "Monitorar ingestão real vs prescrita com mais rigor",
        "Considerar exames laboratoriais (tireoide, insulina)",
      ],
    },
    disengaging_patient: {
      nutrition_strategy: "Plano simplificado com intervenção de resgate",
      caloric_approach: "manutencao_simplificada",
      plan_complexity: "basico",
      intervention_frequency: "urgente",
      focus_area: "retenção e reengajamento",
      recommendations: [
        "Contato imediato para entender barreiras",
        "Reduzir complexidade do plano (modo sobrevivência)",
        "Definir 1 meta semanal alcançável",
        "Ativar notificações push motivacionais",
      ],
    },
    unknown: {
      nutrition_strategy: "Aguardar dados mínimos",
      caloric_approach: "observacao",
      plan_complexity: "basico",
      intervention_frequency: "semanal",
      focus_area: "coleta de dados",
      recommendations: [
        "Incentivar registros diários para calibrar o motor",
        "Manter plano atual sem alterações significativas",
      ],
    },
  };

  return { cluster, ...strategies[cluster] };
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

    console.log(
      `[CLUSTER v${CLUSTER_ENGINE_VERSION}] Starting. Model: ${CLINICAL_STRATEGY_MODEL}`
    );

    // Get active patients
    let npQuery = supabase
      .from("nutritionist_patients")
      .select("patient_id")
      .eq("status", "active");
    if (nutritionistId)
      npQuery = npQuery.eq("nutritionist_id", nutritionistId);
    const { data: rels } = await npQuery;

    if (!rels || rels.length === 0) {
      return jsonResponse({
        patients_processed: 0,
        engine_version: CLUSTER_ENGINE_VERSION,
        duration_ms: Date.now() - startTime,
      });
    }

    const patientIds = [...new Set(rels.map((r: any) => r.patient_id))];
    let totalClustered = 0;
    let totalChanged = 0;
    const clusterDistribution: Record<string, number> = {};

    for (let i = 0; i < patientIds.length; i += BATCH_SIZE) {
      const batch = patientIds.slice(i, i + BATCH_SIZE);
      const result = await processBatch(supabase, batch);
      totalClustered += result.clustered;
      totalChanged += result.changed;
      for (const [k, v] of Object.entries(result.distribution)) {
        clusterDistribution[k] = (clusterDistribution[k] || 0) + v;
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[CLUSTER v${CLUSTER_ENGINE_VERSION}] Complete. ${totalClustered} clustered, ${totalChanged} changed, ${duration}ms`
    );

    return jsonResponse({
      patients_processed: patientIds.length,
      patients_clustered: totalClustered,
      cluster_changes: totalChanged,
      cluster_distribution: clusterDistribution,
      engine_version: CLUSTER_ENGINE_VERSION,
      strategy_model: CLINICAL_STRATEGY_MODEL,
      duration_ms: duration,
    });
  } catch (error: any) {
    console.error("[CLUSTER] Fatal error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        engine_version: CLUSTER_ENGINE_VERSION,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
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
): Promise<{ clustered: number; changed: number; distribution: Record<string, number> }> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const today = now.toISOString().split("T")[0];

  // Batch fetch all data in parallel
  const [
    assessRes,
    checklist7dRes,
    checklist30dRes,
    meals14dRes,
    sessionsRes,
    mealCompletionsRes,
    chatRes,
    snapshotsRes,
    existingStatesRes,
  ] = await Promise.all([
    supabase
      .from("physical_assessments")
      .select("patient_id, weight, assessment_date")
      .in("patient_id", patientIds)
      .gte("assessment_date", thirtyDaysAgo.split("T")[0])
      .order("assessment_date", { ascending: true }),
    supabase
      .from("checklist_tasks")
      .select("patient_id, completed, date")
      .in("patient_id", patientIds)
      .gte("date", sevenDaysAgo.split("T")[0]),
    supabase
      .from("checklist_tasks")
      .select("patient_id, completed, date")
      .in("patient_id", patientIds)
      .gte("date", thirtyDaysAgo.split("T")[0]),
    supabase
      .from("meals")
      .select("user_id, logged_at")
      .in("user_id", patientIds)
      .gte("logged_at", thirtyDaysAgo),
    supabase
      .from("user_sessions")
      .select("user_id, last_seen_at")
      .in("user_id", patientIds),
    supabase
      .from("meal_item_completions")
      .select("patient_id, completed, date")
      .in("patient_id", patientIds)
      .gte("date", thirtyDaysAgo.split("T")[0]),
    supabase
      .from("chat_messages")
      .select("sender_id, created_at")
      .in("sender_id", patientIds)
      .gte("created_at", thirtyDaysAgo),
    supabase
      .from("patient_clinical_snapshots")
      .select("patient_id, snapshot_date, weight_trend_status, adherence_score, engagement_index")
      .in("patient_id", patientIds)
      .gte("snapshot_date", thirtyDaysAgo.split("T")[0])
      .order("snapshot_date", { ascending: true }),
    supabase
      .from("patient_clinical_state")
      .select("patient_id, metabolic_cluster, cluster_changed_at")
      .in("patient_id", patientIds),
  ]);

  const assessByP = groupBy(assessRes.data || [], "patient_id");
  const check7dByP = groupBy(checklist7dRes.data || [], "patient_id");
  const check30dByP = groupBy(checklist30dRes.data || [], "patient_id");
  const mealsByP = groupBy(meals14dRes.data || [], "user_id");
  const sessionMap = indexBy(sessionsRes.data || [], "user_id");
  const completionsByP = groupBy(mealCompletionsRes.data || [], "patient_id");
  const chatByP = groupBy(chatRes.data || [], "sender_id");
  const snapshotsByP = groupBy(snapshotsRes.data || [], "patient_id");
  const existingStateMap = indexBy(existingStatesRes.data || [], "patient_id");

  const stateUpserts: any[] = [];
  const timelineEvents: any[] = [];
  let changed = 0;
  const distribution: Record<string, number> = {};

  for (const pid of patientIds) {
    const assessments = assessByP[pid] || [];
    const checklist7d = check7dByP[pid] || [];
    const checklist30d = check30dByP[pid] || [];
    const meals = mealsByP[pid] || [];
    const session = sessionMap[pid] as { last_seen_at?: string | null } | undefined;
    const completions = completionsByP[pid] || [];
    const chats = chatByP[pid] || [];
    const snapshots = snapshotsByP[pid] || [];
    const existingState = existingStateMap[pid] as { metabolic_cluster?: string | null; cluster_changed_at?: string | null } | undefined;

    // Calculate data coverage
    const uniqueDataDays = new Set([
      ...assessments.map((a: any) => a.assessment_date),
      ...checklist30d.map((t: any) => t.date),
      ...meals.map((m: any) => new Date(m.logged_at).toISOString().split("T")[0]),
    ]);
    const dataDays = uniqueDataDays.size;
    const dataPoints = assessments.length + checklist30d.length + meals.length;

    // Extract features
    const features = extractFeatures(
      assessments, checklist7d, checklist30d, meals,
      session, completions, chats, snapshots, now
    );

    // Classify
    const { cluster, confidence, reasons } = classifyCluster(features, dataPoints, dataDays);

    // STABILITY CHECK: Don't change cluster too frequently
    const previousCluster = existingState?.metabolic_cluster;
    const lastChanged = existingState?.cluster_changed_at
      ? new Date(existingState.cluster_changed_at)
      : null;
    const daysSinceLastChange = lastChanged
      ? (now.getTime() - lastChanged.getTime()) / 86400000
      : 999;

    let finalCluster = cluster;
    let clusterActuallyChanged = false;

    if (previousCluster && previousCluster !== "unknown" && previousCluster !== cluster) {
      // Only allow change after 14 days of consistent data
      if (daysSinceLastChange < MIN_DATA_DAYS) {
        finalCluster = previousCluster;
      } else {
        clusterActuallyChanged = true;
        changed++;
      }
    } else if (!previousCluster || previousCluster === "unknown") {
      if (cluster !== "unknown") {
        clusterActuallyChanged = true;
      }
    }

    // Generate strategy
    const strategy = generateStrategy(finalCluster);

    distribution[finalCluster] = (distribution[finalCluster] || 0) + 1;

    stateUpserts.push({
      patient_id: pid,
      metabolic_cluster: finalCluster,
      metabolic_cluster_confidence: confidence,
      metabolic_feature_vector: features,
      cluster_strategy: strategy,
      cluster_changed_at: clusterActuallyChanged ? now.toISOString() : (existingState?.cluster_changed_at || now.toISOString()),
      cluster_engine_version: CLUSTER_ENGINE_VERSION,
      cluster_data_points: dataPoints,
      cluster_min_days_met: dataDays >= MIN_DATA_DAYS,
      updated_at: now.toISOString(),
    });

    // Timeline event if cluster changed
    if (clusterActuallyChanged && previousCluster) {
      timelineEvents.push({
        patient_id: pid,
        event_type: "metabolic_cluster_changed",
        title: "Cluster metabólico alterado",
        description: `Classificação mudou de ${clusterLabel(previousCluster)} para ${clusterLabel(finalCluster)}. ${reasons.join("; ")}`,
        metadata: {
          previous_cluster: previousCluster,
          new_cluster: finalCluster,
          confidence,
          reasons,
          features_summary: {
            adherence_30d: features.adherence_avg_30d,
            weight_velocity: features.weight_velocity_avg,
            adherence_stability: features.adherence_stability,
            engagement_days: features.days_since_last_login,
          },
          engine_version: CLUSTER_ENGINE_VERSION,
          strategy_model: CLINICAL_STRATEGY_MODEL,
        },
      });
    }
  }

  // Batch upsert states
  if (stateUpserts.length > 0) {
    const { error } = await supabase
      .from("patient_clinical_state")
      .upsert(stateUpserts, { onConflict: "patient_id" });
    if (error) console.error("[CLUSTER] State upsert error:", error);
  }

  // Update today's snapshots with cluster
  const snapshotUpdates = stateUpserts.map((s) =>
    supabase
      .from("patient_clinical_snapshots")
      .update({
        metabolic_cluster: s.metabolic_cluster,
        cluster_confidence: s.metabolic_cluster_confidence,
      })
      .eq("patient_id", s.patient_id)
      .eq("snapshot_date", today)
  );
  await Promise.all(snapshotUpdates);

  // Insert timeline events
  if (timelineEvents.length > 0) {
    const { error } = await supabase
      .from("patient_timeline")
      .insert(timelineEvents);
    if (error) console.error("[CLUSTER] Timeline insert error:", error);
  }

  console.log(
    `[CLUSTER] Batch: ${stateUpserts.length} classified, ${changed} changed`
  );

  return { clustered: stateUpserts.length, changed, distribution };
}

function clusterLabel(cluster: string): string {
  const labels: Record<string, string> = {
    metabolic_responder: "Respondedor Metabólico",
    metabolic_adaptive: "Adaptativo Metabólico",
    behavioral_struggler: "Lutador Comportamental",
    resistant_profile: "Resistente Fisiológico",
    disengaging_patient: "Desengajando",
    unknown: "Não Classificado",
  };
  return labels[cluster] || cluster;
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
