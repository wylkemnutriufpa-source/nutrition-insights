import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALERT_ENGINE_VERSION = "2.0.0";
const BATCH_SIZE = 50;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Alert Type Definitions ───
const ALERT_TYPES = {
  LOW_ADHERENCE: {
    type: "low_adherence",
    severity: "high" as const,
    title: "🔴 Adesão Baixa Detectada",
    source: "adherence_engine",
    cooldown_days: 3,
  },
  WEIGHT_STAGNATION: {
    type: "weight_stagnation",
    severity: "medium" as const,
    title: "🟠 Estagnação de Peso",
    source: "weight_engine",
    cooldown_days: 14,
  },
  UNEXPECTED_WEIGHT_GAIN: {
    type: "unexpected_weight_gain",
    severity: "high" as const,
    title: "🔴 Ganho de Peso Inesperado",
    source: "weight_engine",
    cooldown_days: 7,
  },
  LOW_CHECKIN_FREQUENCY: {
    type: "low_checkin_frequency",
    severity: "medium" as const,
    title: "🟡 Baixa Frequência de Registros",
    source: "checkin_engine",
    cooldown_days: 5,
  },
  POSSIBLE_ABANDONMENT: {
    type: "possible_abandonment",
    severity: "critical" as const,
    title: "🔴 Possível Abandono",
    source: "engagement_engine",
    cooldown_days: 7,
  },
  CALORIC_EXCESS: {
    type: "caloric_excess",
    severity: "medium" as const,
    title: "🟠 Excesso Calórico Persistente",
    source: "metabolic_engine",
    cooldown_days: 7,
  },
} as const;

const SCORE_MAP: Record<string, number> = {
  critical: 40,
  high: 25,
  medium: 10,
  low: 5,
};

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

    console.log(`[ALERT-ENGINE v${ALERT_ENGINE_VERSION}] Starting. Filter: ${nutritionistId || "all"}`);

    // 1. Get active relationships
    let npQuery = supabase
      .from("nutritionist_patients")
      .select("nutritionist_id, patient_id")
      .eq("status", "active");
    if (nutritionistId) npQuery = npQuery.eq("nutritionist_id", nutritionistId);
    const { data: relationships } = await npQuery;

    if (!relationships || relationships.length === 0) {
      console.log("[ALERT-ENGINE] No active relationships found");
      return jsonResponse({ alerts_created: 0, patients_scanned: 0, engine_version: ALERT_ENGINE_VERSION, duration_ms: Date.now() - startTime });
    }

    const patientIds = [...new Set(relationships.map((r) => r.patient_id))];
    let totalAlerts = 0;
    const batchResults: any[] = [];

    // Process patients in batches
    for (let i = 0; i < patientIds.length; i += BATCH_SIZE) {
      const batch = patientIds.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      console.log(`[ALERT-ENGINE] Batch ${batchNum}: ${batch.length} patients`);

      const batchAlerts = await processBatch(supabase, batch, relationships);
      totalAlerts += batchAlerts.length;
      batchResults.push({ batch: batchNum, patients: batch.length, alerts: batchAlerts.length });

      // Update risk scores for this batch
      await updateRiskScores(supabase, batch);

      // Save daily snapshots for this batch
      await saveDailySnapshots(supabase, batch);
    }

    const duration = Date.now() - startTime;
    console.log(`[ALERT-ENGINE] Complete. ${totalAlerts} alerts, ${patientIds.length} patients, ${duration}ms`);

    return jsonResponse({
      alerts_created: totalAlerts,
      patients_scanned: patientIds.length,
      engine_version: ALERT_ENGINE_VERSION,
      duration_ms: duration,
      batches: batchResults,
    });
  } catch (error) {
    console.error("[ALERT-ENGINE] Fatal error:", error);
    return new Response(JSON.stringify({ error: error.message, engine_version: ALERT_ENGINE_VERSION }), {
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

// ─── Batch Processing ───
async function processBatch(supabase: any, patientIds: string[], relationships: any[]) {
  const alerts: any[] = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString();

  // Batch fetch all data in parallel
  const [checklistRes, mealsRes, assessmentsRes, profilesRes, presenceRes, mealPlansRes, mealCompletionsRes] =
    await Promise.all([
      supabase
        .from("checklist_tasks")
        .select("patient_id, completed, date")
        .in("patient_id", patientIds)
        .gte("date", sevenDaysAgo.split("T")[0]),
      supabase
        .from("meals")
        .select("user_id, logged_at, calories")
        .in("user_id", patientIds)
        .gte("logged_at", sevenDaysAgo),
      supabase
        .from("physical_assessments")
        .select("patient_id, weight, assessment_date")
        .in("patient_id", patientIds)
        .order("assessment_date", { ascending: false })
        .limit(patientIds.length * 5),
      supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", patientIds),
      supabase
        .from("user_sessions")
        .select("user_id, last_seen_at")
        .in("user_id", patientIds),
      supabase
        .from("meal_plans")
        .select("patient_id, generation_metadata")
        .in("patient_id", patientIds)
        .eq("is_active", true)
        .eq("plan_status", "published_to_patient"),
      supabase
        .from("meal_item_completions")
        .select("patient_id, adherence_status, completed, date")
        .in("patient_id", patientIds)
        .gte("date", sevenDaysAgo.split("T")[0]),
    ]);

  const checklistByPatient = groupBy(checklistRes.data || [], "patient_id");
  const mealsByPatient = groupBy(mealsRes.data || [], "user_id");
  const profileMap = indexBy(profilesRes.data || [], "user_id");
  const presenceMap = indexBy(presenceRes.data || [], "user_id");
  const mealPlanMap = indexBy(mealPlansRes.data || [], "patient_id");
  const mealCompByPatient = groupBy(mealCompletionsRes.data || [], "patient_id");

  const assessmentsByPatient: Record<string, any[]> = {};
  for (const a of assessmentsRes.data || []) {
    if (!assessmentsByPatient[a.patient_id]) assessmentsByPatient[a.patient_id] = [];
    assessmentsByPatient[a.patient_id].push(a);
  }

  for (const patientId of patientIds) {
    const nutritionistIds = relationships
      .filter((r) => r.patient_id === patientId)
      .map((r) => r.nutritionist_id);
    const patientName = profileMap[patientId]?.full_name || "Paciente";
    const checklist = checklistByPatient[patientId] || [];
    const meals = mealsByPatient[patientId] || [];
    const assessments = assessmentsByPatient[patientId] || [];
    const presence = presenceMap[patientId];
    const activePlan = mealPlanMap[patientId];
    const mealComps = mealCompByPatient[patientId] || [];

    // ─── SIGNAL 1: Low Adherence (<60% in 7d) ───
    // Use meal_item_completions for real adherence, fallback to checklist
    let adherence = -1;
    let adherenceTotal = 0;
    let adherenceCompleted = 0;

    if (mealComps.length > 0) {
      adherenceTotal = mealComps.length;
      adherenceCompleted = mealComps.filter((m: any) => m.adherence_status === "followed" && m.completed).length;
      adherence = Math.round((adherenceCompleted / adherenceTotal) * 100);
    } else if (checklist.length > 0) {
      adherenceTotal = checklist.length;
      adherenceCompleted = checklist.filter((t: any) => t.completed).length;
      adherence = Math.round((adherenceCompleted / adherenceTotal) * 100);
    }

    if (adherence >= 0 && adherence < 60) {
      for (const nId of nutritionistIds) {
        const created = await createAlertIfNew(
          supabase, patientId, nId, ALERT_TYPES.LOW_ADHERENCE,
          `${patientName}: adesão de ${adherence}% nos últimos 7 dias (${adherenceCompleted}/${adherenceTotal} itens). Considere simplificar o protocolo.`,
          {
            metric: "adherence",
            period_days: 7,
            measured_value: adherence,
            threshold: 60,
            direction: "below_expected",
            tasks_total: adherenceTotal,
            tasks_completed: adherenceCompleted,
          }
        );
        if (created) alerts.push({ type: "low_adherence", patient_id: patientId, severity: "high" });
      }
    }

    // ─── SIGNAL 2: Weight Stagnation (<0.3kg in 21d, goal = loss) ───
    if (assessments.length >= 2) {
      const latest = assessments[0];
      const oldest = assessments.find((a: any) => {
        const days = (new Date(latest.assessment_date).getTime() - new Date(a.assessment_date).getTime()) / 86400000;
        return days >= 21;
      });

      if (oldest && latest.weight && oldest.weight) {
        const diff = Math.abs(latest.weight - oldest.weight);
        const daysBetween = Math.round(
          (new Date(latest.assessment_date).getTime() - new Date(oldest.assessment_date).getTime()) / 86400000
        );

        if (diff < 0.3) {
          const goalIsLoss = activePlan?.generation_metadata?.goal === "lose_weight" ||
            activePlan?.generation_metadata?.goal === "emagrecimento";

          if (goalIsLoss || !activePlan) {
            for (const nId of nutritionistIds) {
              const created = await createAlertIfNew(
                supabase, patientId, nId, ALERT_TYPES.WEIGHT_STAGNATION,
                `${patientName}: peso estagnado (${latest.weight}kg) há ${daysBetween} dias. Variação de apenas ${diff.toFixed(1)}kg.`,
                {
                  metric: "weight_variation",
                  period_days: daysBetween,
                  measured_value: diff,
                  threshold: 0.3,
                  direction: "stagnant",
                  current_weight: latest.weight,
                  previous_weight: oldest.weight,
                }
              );
              if (created) alerts.push({ type: "weight_stagnation", patient_id: patientId, severity: "medium" });
            }
          }
        }
      }
    }

    // ─── SIGNAL 3: Unexpected Weight Gain (>1.5kg in 10d) ───
    if (assessments.length >= 2) {
      const latest = assessments[0];
      const recent = assessments.find((a: any) => {
        const days = (new Date(latest.assessment_date).getTime() - new Date(a.assessment_date).getTime()) / 86400000;
        return days >= 7 && days <= 14;
      });

      if (recent && latest.weight && recent.weight) {
        const gain = latest.weight - recent.weight;
        if (gain > 1.5) {
          for (const nId of nutritionistIds) {
            const created = await createAlertIfNew(
              supabase, patientId, nId, ALERT_TYPES.UNEXPECTED_WEIGHT_GAIN,
              `${patientName}: ganho de ${gain.toFixed(1)}kg em período curto (${recent.weight}kg → ${latest.weight}kg).`,
              {
                metric: "weight_gain",
                period_days: 10,
                measured_value: gain,
                threshold: 1.5,
                direction: "above_expected",
                current_weight: latest.weight,
                previous_weight: recent.weight,
              }
            );
            if (created) alerts.push({ type: "unexpected_weight_gain", patient_id: patientId, severity: "high" });
          }
        }
      }
    }

    // ─── SIGNAL 4: Low Check-in Frequency (>3d without records) ───
    const recentMeals = meals.filter((m: any) => new Date(m.logged_at) >= new Date(threeDaysAgo));
    if (recentMeals.length === 0 && meals.length > 0) {
      const lastMealDate = meals[0]?.logged_at;
      const daysSince = lastMealDate
        ? Math.floor((now.getTime() - new Date(lastMealDate).getTime()) / 86400000)
        : 3;
      for (const nId of nutritionistIds) {
        const created = await createAlertIfNew(
          supabase, patientId, nId, ALERT_TYPES.LOW_CHECKIN_FREQUENCY,
          `${patientName}: sem registro alimentar há ${daysSince} dias.`,
          {
            metric: "checkin_frequency",
            period_days: daysSince,
            measured_value: 0,
            threshold: 3,
            direction: "below_expected",
            last_meal_date: lastMealDate,
          }
        );
        if (created) alerts.push({ type: "low_checkin_frequency", patient_id: patientId, severity: "medium" });
      }
    }

    // ─── SIGNAL 5: Possible Abandonment (>7d without login) ───
    const lastSeen = presence?.last_seen_at;
    if (lastSeen) {
      const daysSinceLogin = (now.getTime() - new Date(lastSeen).getTime()) / 86400000;
      if (daysSinceLogin > 7) {
        for (const nId of nutritionistIds) {
          const created = await createAlertIfNew(
            supabase, patientId, nId, ALERT_TYPES.POSSIBLE_ABANDONMENT,
            `${patientName}: sem acesso ao sistema há ${Math.floor(daysSinceLogin)} dias. Alto risco de abandono.`,
            {
              metric: "login_recency",
              period_days: Math.floor(daysSinceLogin),
              measured_value: Math.floor(daysSinceLogin),
              threshold: 7,
              direction: "above_expected",
              last_seen: lastSeen,
            }
          );
          if (created) alerts.push({ type: "possible_abandonment", patient_id: patientId, severity: "critical" });
        }
      }
    }

    // ─── SIGNAL 6: Caloric Excess (avg > target +25%) ───
    if (meals.length >= 3 && activePlan?.generation_metadata) {
      const calorieTarget = activePlan.generation_metadata.calorie_target;
      if (calorieTarget && calorieTarget > 0) {
        const mealsWithCalories = meals.filter((m: any) => m.calories && m.calories > 0);
        if (mealsWithCalories.length >= 3) {
          const totalCalories = mealsWithCalories.reduce((sum: number, m: any) => sum + (m.calories || 0), 0);
          const uniqueDays = new Set(mealsWithCalories.map((m: any) => new Date(m.logged_at).toISOString().split("T")[0]));
          const avgDailyCalories = totalCalories / uniqueDays.size;
          const threshold = calorieTarget * 1.25;

          if (avgDailyCalories > threshold) {
            const overshootPct = Math.round(((avgDailyCalories - calorieTarget) / calorieTarget) * 100);
            for (const nId of nutritionistIds) {
              const created = await createAlertIfNew(
                supabase, patientId, nId, ALERT_TYPES.CALORIC_EXCESS,
                `${patientName}: ingestão média (${Math.round(avgDailyCalories)} kcal) excede meta (${calorieTarget} kcal) em +${overshootPct}%.`,
                {
                  metric: "caloric_intake",
                  period_days: 7,
                  measured_value: Math.round(avgDailyCalories),
                  threshold: calorieTarget,
                  direction: "above_expected",
                  overshoot_percent: overshootPct,
                  days_analyzed: uniqueDays.size,
                }
              );
              if (created) alerts.push({ type: "caloric_excess", patient_id: patientId, severity: "medium" });
            }
          }
        }
      }
    }
  }

  return alerts;
}

// ─── Risk Score Update ───
async function updateRiskScores(supabase: any, patientIds: string[]) {
  // Get all active alerts for these patients
  const { data: alerts } = await supabase
    .from("clinical_alerts")
    .select("patient_id, severity")
    .in("patient_id", patientIds)
    .eq("is_active", true);

  // Calculate score per patient
  const scoreMap: Record<string, number> = {};
  for (const pid of patientIds) scoreMap[pid] = 0;

  for (const alert of alerts || []) {
    scoreMap[alert.patient_id] = (scoreMap[alert.patient_id] || 0) + (SCORE_MAP[alert.severity] || 0);
  }

  // Batch update profiles
  for (const pid of patientIds) {
    const score = scoreMap[pid] || 0;
    const level = score >= 60 ? "critical" : score >= 30 ? "risk" : score >= 10 ? "attention" : "stable";

    await supabase
      .from("profiles")
      .update({ clinical_risk_score: score, clinical_risk_level: level })
      .eq("user_id", pid);
  }
}

// ─── Daily Snapshot ───
async function saveDailySnapshots(supabase: any, patientIds: string[]) {
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  // Fetch current data for snapshots
  const [alertsRes, checklistRes, mealsRes, assessRes] = await Promise.all([
    supabase.from("clinical_alerts").select("patient_id, severity").in("patient_id", patientIds).eq("is_active", true),
    supabase.from("checklist_tasks").select("patient_id, completed").in("patient_id", patientIds).gte("date", sevenDaysAgo.split("T")[0]),
    supabase.from("meals").select("user_id, calories").in("user_id", patientIds).gte("logged_at", sevenDaysAgo),
    supabase.from("physical_assessments").select("patient_id, weight").in("patient_id", patientIds).order("assessment_date", { ascending: false }).limit(200),
  ]);

  const checklistByP = groupBy(checklistRes.data || [], "patient_id");
  const mealsByP = groupBy(mealsRes.data || [], "user_id");
  const weightMap: Record<string, number> = {};
  for (const a of assessRes.data || []) {
    if (!weightMap[a.patient_id] && a.weight) weightMap[a.patient_id] = a.weight;
  }

  const alertCountMap: Record<string, number> = {};
  const scoreMap: Record<string, number> = {};
  for (const a of alertsRes.data || []) {
    alertCountMap[a.patient_id] = (alertCountMap[a.patient_id] || 0) + 1;
    scoreMap[a.patient_id] = (scoreMap[a.patient_id] || 0) + (SCORE_MAP[a.severity] || 0);
  }

  const snapshots = patientIds.map((pid) => {
    const cl = checklistByP[pid] || [];
    const adherence = cl.length > 0
      ? Math.round((cl.filter((t: any) => t.completed).length / cl.length) * 100)
      : null;

    const ms = mealsByP[pid] || [];
    const mealsWithCal = ms.filter((m: any) => m.calories && m.calories > 0);
    const uniqueMealDays = new Set(mealsWithCal.map((m: any) => new Date(m.logged_at || m.created_at).toISOString().split("T")[0]));
    const calorieAvg = mealsWithCal.length > 0 && uniqueMealDays.size > 0
      ? Math.round(mealsWithCal.reduce((s: number, m: any) => s + m.calories, 0) / uniqueMealDays.size)
      : null;

    const score = scoreMap[pid] || 0;

    return {
      patient_id: pid,
      snapshot_date: today,
      weight: weightMap[pid] || null,
      adherence_score: adherence,
      calorie_avg: calorieAvg,
      risk_score: score,
      active_alerts_count: alertCountMap[pid] || 0,
      clinical_risk_level: score >= 60 ? "critical" : score >= 30 ? "risk" : score >= 10 ? "attention" : "stable",
    };
  });

  // Upsert (idempotent)
  const { error } = await supabase
    .from("patient_clinical_snapshots")
    .upsert(snapshots, { onConflict: "patient_id,snapshot_date" });

  if (error) console.error("[ALERT-ENGINE] Snapshot upsert error:", error);
}

// ─── Alert Creation with Dedup ───
async function createAlertIfNew(
  supabase: any,
  patientId: string,
  nutritionistId: string,
  alertDef: typeof ALERT_TYPES[keyof typeof ALERT_TYPES],
  description: string,
  metadata: Record<string, any>
): Promise<boolean> {
  const cooldownDate = new Date(Date.now() - alertDef.cooldown_days * 86400000).toISOString();

  const { count } = await supabase
    .from("clinical_alerts")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .eq("nutritionist_id", nutritionistId)
    .eq("alert_type", alertDef.type)
    .eq("is_active", true)
    .gte("created_at", cooldownDate);

  if ((count || 0) > 0) return false;

  const { error: alertError } = await supabase.from("clinical_alerts").insert({
    patient_id: patientId,
    nutritionist_id: nutritionistId,
    alert_type: alertDef.type,
    severity: alertDef.severity,
    title: alertDef.title,
    description,
    trigger_source: alertDef.source,
    metadata: {
      ...metadata,
      engine_version: ALERT_ENGINE_VERSION,
    },
  });

  if (alertError) {
    console.error("[ALERT-ENGINE] Alert insert error:", alertError);
    return false;
  }

  // Notification + Timeline in parallel
  await Promise.all([
    supabase.from("notifications").insert({
      user_id: nutritionistId,
      title: alertDef.title,
      message: description,
      type: "clinical_alert",
      action_url: `/patients/${patientId}`,
      metadata: { alert_type: alertDef.type, severity: alertDef.severity, patient_id: patientId },
    }),
    supabase.from("patient_timeline").insert({
      patient_id: patientId,
      event_type: "clinical_alert",
      title: alertDef.title,
      description,
      metadata: {
        alert_type: alertDef.type,
        severity: alertDef.severity,
        trigger_source: alertDef.source,
        engine_version: ALERT_ENGINE_VERSION,
        ...metadata,
      },
    }),
  ]);

  return true;
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
