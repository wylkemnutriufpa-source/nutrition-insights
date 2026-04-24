import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ADAPTIVE_ENGINE_VERSION = "1.0.0";
const THERAPEUTIC_MODEL = "deterministic_clinical_rules_v1";
const BATCH_SIZE = 100;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════
// BLOCO 1 — Clinical Indicators
// ═══════════════════════════════════════════

type CaloricResponse =
  | "hiperresponsivo"
  | "responsivo"
  | "neutro"
  | "resistente"
  | "possivel_adaptacao_metabolica";

function classifyCaloricResponse(
  caloricDeltaPct: number,
  weightVelocityPct: number,
  adherence: number
): CaloricResponse {
  // Only classify if we have meaningful adherence data
  if (adherence < 50) return "neutro"; // can't assess response with low adherence

  // Patient is eating at/below target but losing fast
  if (caloricDeltaPct <= 5 && weightVelocityPct < -1) return "hiperresponsivo";
  // Normal response
  if (caloricDeltaPct <= 10 && weightVelocityPct <= -0.4) return "responsivo";
  // Eating close to target, losing slowly
  if (
    caloricDeltaPct <= 15 &&
    weightVelocityPct > -0.4 &&
    weightVelocityPct < 0
  )
    return "neutro";
  // Good adherence but not responding
  if (adherence >= 70 && weightVelocityPct >= -0.2) return "resistente";
  // Strong adherence but stagnated/gaining
  if (adherence >= 75 && weightVelocityPct >= 0)
    return "possivel_adaptacao_metabolica";

  return "neutro";
}

type TherapeuticEffectiveness =
  | "protocolo_eficaz"
  | "eficacia_parcial"
  | "baixa_eficacia"
  | "falha_terapeutica";

function classifyTherapeuticEffectiveness(
  adherence: number,
  weightTrend: string,
  engagementLevel: string,
  planDays: number
): TherapeuticEffectiveness {
  if (planDays < 14) return "protocolo_eficaz"; // too early to evaluate

  const goodAdherence = adherence >= 70;
  const goodTrend =
    weightTrend === "fast_loss" || weightTrend === "expected_loss";
  const goodEngagement =
    engagementLevel === "high_engagement" || engagementLevel === "moderate";

  if (goodAdherence && goodTrend && goodEngagement) return "protocolo_eficaz";
  if ((goodAdherence && goodTrend) || (goodAdherence && goodEngagement))
    return "eficacia_parcial";
  if (!goodAdherence && !goodTrend) return "baixa_eficacia";
  if (adherence < 40 && !goodTrend && planDays > 21)
    return "falha_terapeutica";

  return "eficacia_parcial";
}

type StagnationRisk = "risco_baixo" | "risco_moderado" | "risco_alto";

function classifyStagnationRisk(
  weightTrend: string,
  adherence: number,
  planDays: number
): StagnationRisk {
  const slowOrStagnated =
    weightTrend === "slow_loss" || weightTrend === "stagnated";

  if (!slowOrStagnated || adherence < 50) return "risco_baixo";
  if (slowOrStagnated && adherence >= 70 && planDays >= 28)
    return "risco_alto";
  if (slowOrStagnated && adherence >= 70 && planDays >= 21)
    return "risco_moderado";

  return "risco_baixo";
}

// ═══════════════════════════════════════════
// BLOCO 2 — Caloric Adjustment Decision
// ═══════════════════════════════════════════

interface CaloricAdjustment {
  delta_percent: number;
  direction: "decrease" | "increase" | "none";
  reason: string;
  confidence: "low" | "medium" | "high";
}

function computeCaloricAdjustment(
  caloricResponse: CaloricResponse,
  weightTrend: string,
  adherence: number,
  weightVelocityPct: number,
  goal: string,
  planDays: number
): CaloricAdjustment | null {
  // Safety: never adjust plans < 7 days
  if (planDays < 7) return null;

  const isWeightLoss =
    goal === "lose_weight" ||
    goal === "emagrecimento" ||
    goal === "perda_de_peso";
  const isMassGain =
    goal === "gain_muscle" ||
    goal === "ganho_de_massa" ||
    goal === "hipertrofia";

  if (isWeightLoss) {
    // Resistant + good adherence + stagnated → decrease
    if (
      caloricResponse === "resistente" &&
      adherence >= 75 &&
      (weightTrend === "stagnated" || weightTrend === "slow_loss")
    ) {
      const delta = adherence >= 85 ? -10 : -7;
      return {
        delta_percent: delta,
        direction: "decrease",
        reason: `Resposta calórica resistente com adesão de ${adherence}%. Peso ${weightTrend === "stagnated" ? "estagnado" : "em perda lenta"}. Redução de ${Math.abs(delta)}% recomendada.`,
        confidence: adherence >= 85 ? "high" : "medium",
      };
    }

    // Possible metabolic adaptation → moderate decrease
    if (caloricResponse === "possivel_adaptacao_metabolica" && adherence >= 75) {
      return {
        delta_percent: -5,
        direction: "decrease",
        reason: `Possível adaptação metabólica detectada. Adesão de ${adherence}% mas sem resposta de peso. Redução conservadora de 5% com refeed strategy sugerida.`,
        confidence: "medium",
      };
    }

    // Hyper-responsive → protect metabolism
    if (
      caloricResponse === "hiperresponsivo" &&
      weightVelocityPct < -1.2
    ) {
      return {
        delta_percent: 5,
        direction: "increase",
        reason: `Perda de peso acelerada (${weightVelocityPct.toFixed(1)}%/sem). Aumento de 5% para proteção metabólica e preservação de massa magra.`,
        confidence: "high",
      };
    }
  }

  if (isMassGain) {
    // No gain with good adherence
    if (
      adherence >= 70 &&
      (weightTrend === "stagnated" || weightTrend === "slow_loss")
    ) {
      return {
        delta_percent: 8,
        direction: "increase",
        reason: `Objetivo de ganho de massa sem progresso. Adesão de ${adherence}%. Aumento de 8% recomendado.`,
        confidence: "medium",
      };
    }
  }

  return null;
}

// ═══════════════════════════════════════════
// BLOCO 3 — Template Switch Decision
// ═══════════════════════════════════════════

interface TemplateSuggestion {
  reason: string;
  target_complexity: string;
  target_style: string;
}

function computeTemplateSwitch(
  adherence: number,
  effectiveness: TherapeuticEffectiveness,
  caloricResponse: CaloricResponse,
  currentComplexity: string,
  planDays: number
): TemplateSuggestion | null {
  if (planDays < 14) return null;

  // Low adherence + complex plan → simpler
  if (adherence < 50 && currentComplexity !== "basico") {
    return {
      reason: `Adesão de ${adherence}% sugere que o plano atual é complexo demais. Sugerir template mais prático.`,
      target_complexity: "basico",
      target_style: "pratico",
    };
  }

  // Caloric excess recurrent → more structured
  if (
    effectiveness === "baixa_eficacia" &&
    caloricResponse === "resistente"
  ) {
    return {
      reason:
        "Baixa eficácia terapêutica com resposta resistente. Sugerir template mais estruturado com porções controladas.",
      target_complexity: "intermediario",
      target_style: "estruturado",
    };
  }

  // Metabolic adaptation → cyclic
  if (caloricResponse === "possivel_adaptacao_metabolica" && planDays > 28) {
    return {
      reason:
        "Possível adaptação metabólica após 28+ dias. Sugerir template com ciclagem calórica ou refeed controlado.",
      target_complexity: "avancado",
      target_style: "ciclico",
    };
  }

  return null;
}

// ═══════════════════════════════════════════
// BLOCO 6 — Safety Checks
// ═══════════════════════════════════════════

interface SafetyCheck {
  safe: boolean;
  reason?: string;
}

function checkTherapeuticSafety(
  planDays: number,
  daysSinceLastCheckin: number,
  hasPregnancyFlag: boolean,
  hasCriticalCondition: boolean
): SafetyCheck {
  if (planDays < 7)
    return { safe: false, reason: "Plano ativo há menos de 7 dias" };
  if (daysSinceLastCheckin > 10)
    return { safe: false, reason: "Paciente sem check-in recente (>10 dias)" };
  if (hasPregnancyFlag)
    return { safe: false, reason: "Gestante — ajuste automático bloqueado" };
  if (hasCriticalCondition)
    return {
      safe: false,
      reason: "Condição clínica crítica ativa — requer avaliação manual",
    };
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

    console.log(
      `[ADAPTIVE v${ADAPTIVE_ENGINE_VERSION}] Starting. Model: ${THERAPEUTIC_MODEL}`
    );

    // Get adaptive mode setting
    const { data: modeSetting } = await supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "adaptive_protocol_mode")
      .maybeSingle();

    const mode = (modeSetting?.setting_value || "SUGGEST_ONLY").replace(
      /"/g,
      ""
    );
    console.log(`[ADAPTIVE] Mode: ${mode}`);

    if (mode === "OFF") {
      return jsonResponse({
        status: "disabled",
        engine_version: ADAPTIVE_ENGINE_VERSION,
      });
    }

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
        engine_version: ADAPTIVE_ENGINE_VERSION,
        duration_ms: Date.now() - startTime,
      });
    }

    const patientIds = [...new Set(rels.map((r: any) => r.patient_id))];
    let totalSuggestions = 0;
    let totalStatesUpdated = 0;

    for (let i = 0; i < patientIds.length; i += BATCH_SIZE) {
      const batch = patientIds.slice(i, i + BATCH_SIZE);
      const result = await processBatch(supabase, batch, mode);
      totalSuggestions += result.suggestions;
      totalStatesUpdated += result.states;
    }

    const duration = Date.now() - startTime;
    console.log(
      `[ADAPTIVE v${ADAPTIVE_ENGINE_VERSION}] Complete. ${totalStatesUpdated} states, ${totalSuggestions} suggestions, ${duration}ms`
    );

    return jsonResponse({
      patients_processed: patientIds.length,
      states_updated: totalStatesUpdated,
      suggestions_created: totalSuggestions,
      mode,
      engine_version: ADAPTIVE_ENGINE_VERSION,
      therapeutic_model: THERAPEUTIC_MODEL,
      duration_ms: duration,
    });
  } catch (error: any) {
    console.error("[ADAPTIVE] Fatal error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        engine_version: ADAPTIVE_ENGINE_VERSION,
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
  patientIds: string[],
  mode: string
): Promise<{ suggestions: number; states: number }> {
  const now = new Date();
  const twentyEightDaysAgo = new Date(
    now.getTime() - 28 * 86400000
  ).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

  // Batch fetch all data in parallel
  const [
    profilesRes,
    plansRes,
    mealsRes,
    checklistRes,
    assessRes,
    sessionsRes,
    alertsRes,
    existingSuggestionsRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "user_id, weight_trend_status, weight_velocity_kg_week, adherence_score_7d, adherence_momentum, engagement_level, engagement_index, clinical_risk_level"
      )
      .in("user_id", patientIds),
    supabase
      .from("meal_plans")
      .select(
        "patient_id, id, generation_metadata, start_date, plan_status, therapeutic_effectiveness_status"
      )
      .in("patient_id", patientIds)
      .eq("is_active", true)
      .in("plan_status", ["published_to_patient", "approved"]),
    supabase
      .from("meals")
      .select("user_id, calories, logged_at")
      .in("user_id", patientIds)
      .gte("logged_at", twentyEightDaysAgo),
    supabase
      .from("checklist_tasks")
      .select("patient_id, completed, date")
      .in("patient_id", patientIds)
      .gte("date", twentyEightDaysAgo.split("T")[0]),
    supabase
      .from("physical_assessments")
      .select("patient_id, weight, assessment_date")
      .in("patient_id", patientIds)
      .gte("assessment_date", twentyEightDaysAgo.split("T")[0])
      .order("assessment_date", { ascending: true }),
    supabase
      .from("user_sessions")
      .select("user_id, last_seen_at")
      .in("user_id", patientIds),
    supabase
      .from("clinical_alerts")
      .select("patient_id, severity, alert_type")
      .in("patient_id", patientIds)
      .eq("is_active", true),
    // Check for recent pending suggestions to avoid duplicates
    supabase
      .from("meal_plan_adjustment_suggestions")
      .select("patient_id, suggestion_type, created_at")
      .in("patient_id", patientIds)
      .eq("status", "pending")
      .gte("created_at", sevenDaysAgo),
  ]);

  const profileMap = indexBy(profilesRes.data || [], "user_id");
  const planMap = indexBy(plansRes.data || [], "patient_id");
  const mealsByP = groupBy(mealsRes.data || [], "user_id");
  const checklistByP = groupBy(checklistRes.data || [], "patient_id");
  const assessByP = groupBy(assessRes.data || [], "patient_id");
  const sessionMap = indexBy(sessionsRes.data || [], "user_id");
  const alertsByP = groupBy(alertsRes.data || [], "patient_id");
  const existingSuggByP = groupBy(
    existingSuggestionsRes.data || [],
    "patient_id"
  );

  const clinicalStates: any[] = [];
  const suggestions: any[] = [];
  const planUpdates: any[] = [];

  for (const pid of patientIds) {
    const profile: any = profileMap[pid];
    const plan: any = planMap[pid];
    const meals = mealsByP[pid] || [];
    const checklist = checklistByP[pid] || [];
    const assessments = assessByP[pid] || [];
    const session: any = sessionMap[pid];
    const alerts = alertsByP[pid] || [];
    const existingSugs = existingSuggByP[pid] || [];

    if (!plan || !profile) continue;

    const meta = plan.generation_metadata || {};
    const calorieTarget = meta.calorie_target || 0;
    const goal = meta.goal || "";
    const complexity = meta.complexity_level || "intermediario";
    const planDays = Math.floor(
      (now.getTime() - new Date(plan.start_date).getTime()) / 86400000
    );

    // Calculate real calorie average (28d)
    const mealsWithCal = meals.filter(
      (m: any) => m.calories && m.calories > 0
    );
    const uniqueDays = new Set(
      mealsWithCal.map((m: any) =>
        new Date(m.logged_at).toISOString().split("T")[0]
      )
    );
    const calorieAvgReal =
      mealsWithCal.length > 0 && uniqueDays.size > 0
        ? mealsWithCal.reduce((s: number, m: any) => s + m.calories, 0) /
          uniqueDays.size
        : 0;

    // Caloric delta %
    const caloricDeltaPct =
      calorieTarget > 0
        ? ((calorieAvgReal - calorieTarget) / calorieTarget) * 100
        : 0;

    // Adherence 28d
    const totalChecklist = checklist.length;
    const completedChecklist = checklist.filter(
      (t: any) => t.completed
    ).length;
    const adherence28d =
      totalChecklist > 0
        ? Math.round((completedChecklist / totalChecklist) * 100)
        : 0;

    // Weight velocity %
    const latestAssessment = assessments[0] as { weight?: number | null } | undefined;
    const weightVelocityPct =
      profile.weight_velocity_kg_week && assessments.length > 0
        ? (profile.weight_velocity_kg_week / (latestAssessment?.weight || 70)) * 100
        : 0;

    const weightTrend = profile.weight_trend_status || "unknown";
    const engagementLevel = profile.engagement_level || "moderate";

    // ─── BLOCO 1: Classify indicators ───
    const caloricResponse = classifyCaloricResponse(
      caloricDeltaPct,
      weightVelocityPct,
      adherence28d
    );

    const effectiveness = classifyTherapeuticEffectiveness(
      adherence28d,
      weightTrend,
      engagementLevel,
      planDays
    );

    const stagnationRisk = classifyStagnationRisk(
      weightTrend,
      adherence28d,
      planDays
    );

    // Save clinical state
    clinicalStates.push({
      patient_id: pid,
      caloric_response_status: caloricResponse,
      stagnation_risk_level: stagnationRisk,
      calorie_target: calorieTarget,
      calorie_avg_real: Math.round(calorieAvgReal),
      weight_velocity_pct: Number(weightVelocityPct.toFixed(3)),
      adherence_avg_28d: adherence28d,
      engagement_avg_28d: profile.engagement_index || 0,
      plan_active_days: planDays,
      data_points_used: assessments.length + mealsWithCal.length,
      analysis_window_days: 28,
      calculation_version: ADAPTIVE_ENGINE_VERSION,
      updated_at: now.toISOString(),
    });

    // Update therapeutic effectiveness on meal_plan
    planUpdates.push({
      id: plan.id,
      effectiveness,
    });

    // ─── BLOCO 6: Safety check ───
    const daysSinceCheckin = session?.last_seen_at
      ? (now.getTime() - new Date(session.last_seen_at).getTime()) / 86400000
      : 999;

    const hasCritical = alerts.some(
      (a: any) => a.severity === "critical"
    );
    // Check for pregnancy flag in anamnesis (simplified: check profile metadata)
    const hasPregnancy = false; // Would need anamnesis data

    const safety = checkTherapeuticSafety(
      planDays,
      daysSinceCheckin,
      hasPregnancy,
      hasCritical
    );

    if (!safety.safe) {
      console.log(
        `[ADAPTIVE] Skipping ${pid}: ${safety.reason}`
      );
      continue;
    }

    // Check for existing pending suggestions (dedup)
    const hasPendingCaloric = existingSugs.some(
      (s: any) => s.suggestion_type === "caloric_adjustment"
    );
    const hasPendingTemplate = existingSugs.some(
      (s: any) => s.suggestion_type === "template_switch"
    );

    // ─── BLOCO 2: Caloric adjustment ───
    if (!hasPendingCaloric) {
      const adjustment = computeCaloricAdjustment(
        caloricResponse,
        weightTrend,
        adherence28d,
        weightVelocityPct,
        goal,
        planDays
      );

      if (adjustment) {
        const suggestedValue = Math.round(
          calorieTarget * (1 + adjustment.delta_percent / 100)
        );
        suggestions.push({
          patient_id: pid,
          meal_plan_id: plan.id,
          suggestion_type: "caloric_adjustment",
          current_value: calorieTarget,
          suggested_value: suggestedValue,
          delta_percent: adjustment.delta_percent,
          clinical_reason: adjustment.reason,
          confidence: adjustment.confidence,
          engine_version: ADAPTIVE_ENGINE_VERSION,
          metadata: {
            caloric_response: caloricResponse,
            weight_trend: weightTrend,
            weight_velocity_pct: weightVelocityPct,
            adherence_28d: adherence28d,
            calorie_avg_real: Math.round(calorieAvgReal),
            calorie_target: calorieTarget,
            plan_active_days: planDays,
            goal,
            stagnation_risk: stagnationRisk,
            therapeutic_effectiveness: effectiveness,
            therapeutic_model: THERAPEUTIC_MODEL,
            engine_version: ADAPTIVE_ENGINE_VERSION,
          },
        });
      }
    }

    // ─── BLOCO 3: Template switch ───
    if (!hasPendingTemplate) {
      const templateSuggestion = computeTemplateSwitch(
        adherence28d,
        effectiveness,
        caloricResponse,
        complexity,
        planDays
      );

      if (templateSuggestion) {
        suggestions.push({
          patient_id: pid,
          meal_plan_id: plan.id,
          suggestion_type: "template_switch",
          clinical_reason: templateSuggestion.reason,
          confidence: "medium",
          engine_version: ADAPTIVE_ENGINE_VERSION,
          metadata: {
            target_complexity: templateSuggestion.target_complexity,
            target_style: templateSuggestion.target_style,
            current_complexity: complexity,
            adherence_28d: adherence28d,
            therapeutic_effectiveness: effectiveness,
            caloric_response: caloricResponse,
            plan_active_days: planDays,
            therapeutic_model: THERAPEUTIC_MODEL,
            engine_version: ADAPTIVE_ENGINE_VERSION,
          },
        });
      }
    }
  }

  // ─── Batch persist clinical states (upsert) ───
  if (clinicalStates.length > 0) {
    const { error: stateError } = await supabase
      .from("patient_clinical_state")
      .upsert(clinicalStates, { onConflict: "patient_id" });
    if (stateError)
      console.error("[ADAPTIVE] Clinical state upsert error:", stateError);
  }

  // ─── Batch persist suggestions ───
  if (suggestions.length > 0) {
    const { error: sugError } = await supabase
      .from("meal_plan_adjustment_suggestions")
      .insert(suggestions);
    if (sugError)
      console.error("[ADAPTIVE] Suggestion insert error:", sugError);
  }

  // ─── Update therapeutic effectiveness on plans ───
  const effectivenessPromises = planUpdates.map((u) =>
    supabase
      .from("meal_plans")
      .update({ therapeutic_effectiveness_status: u.effectiveness })
      .eq("id", u.id)
  );
  await Promise.all(effectivenessPromises);

  // ─── Update snapshot with new fields ───
  const today = now.toISOString().split("T")[0];
  const snapshotUpdates = clinicalStates.map((s) =>
    supabase
      .from("patient_clinical_snapshots")
      .update({
        caloric_response_status: s.caloric_response_status,
        stagnation_risk_level: s.stagnation_risk_level,
      })
      .eq("patient_id", s.patient_id)
      .eq("snapshot_date", today)
  );
  await Promise.all(snapshotUpdates);

  console.log(
    `[ADAPTIVE] Batch: ${clinicalStates.length} states, ${suggestions.length} suggestions`
  );

  return { suggestions: suggestions.length, states: clinicalStates.length };
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
