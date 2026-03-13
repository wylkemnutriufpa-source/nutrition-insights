import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALERT_ENGINE_VERSION = "1.0.0";

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
  METABOLIC_SIGNAL: {
    type: "metabolic_signal",
    severity: "medium" as const,
    title: "🟠 Sinal Metabólico",
    source: "metabolic_engine",
    cooldown_days: 7,
  },
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const nutritionistId = body.nutritionist_id;

    // 1. Get active relationships
    let npQuery = supabase
      .from("nutritionist_patients")
      .select("nutritionist_id, patient_id")
      .eq("status", "active");
    if (nutritionistId) npQuery = npQuery.eq("nutritionist_id", nutritionistId);
    const { data: relationships } = await npQuery;

    if (!relationships || relationships.length === 0) {
      return new Response(
        JSON.stringify({ alerts_created: 0, engine_version: ALERT_ENGINE_VERSION }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const patientIds = [...new Set(relationships.map((r) => r.patient_id))];
    const alertsCreated: any[] = [];

    // Process patients in batches of 20
    for (let i = 0; i < patientIds.length; i += 20) {
      const batch = patientIds.slice(i, i + 20);
      const batchAlerts = await processBatch(supabase, batch, relationships);
      alertsCreated.push(...batchAlerts);
    }

    return new Response(
      JSON.stringify({
        alerts_created: alertsCreated.length,
        patients_scanned: patientIds.length,
        engine_version: ALERT_ENGINE_VERSION,
        details: alertsCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processBatch(
  supabase: any,
  patientIds: string[],
  relationships: any[]
) {
  const alerts: any[] = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString();
  const twentyOneDaysAgo = new Date(now.getTime() - 21 * 86400000).toISOString();
  const tenDaysAgo = new Date(now.getTime() - 10 * 86400000).toISOString();

  // Batch fetch data for all patients
  const [checklistRes, mealsRes, assessmentsRes, profilesRes, presenceRes, mealPlansRes] =
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
        .limit(200),
      supabase
        .from("profiles")
        .select("user_id, full_name, last_sign_in_at")
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
    ]);

  // Index data by patient
  const checklistByPatient = groupBy(checklistRes.data || [], "patient_id");
  const mealsByPatient = groupBy(mealsRes.data || [], "user_id");
  const profileMap = indexBy(profilesRes.data || [], "user_id");
  const presenceMap = indexBy(presenceRes.data || [], "user_id");
  const mealPlanMap = indexBy(mealPlansRes.data || [], "patient_id");

  // Group assessments (multiple per patient)
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

    // ─── SIGNAL 1: Low Adherence ───
    if (checklist.length > 0) {
      const total = checklist.length;
      const completed = checklist.filter((t: any) => t.completed).length;
      const adherence = Math.round((completed / total) * 100);

      if (adherence < 60) {
        for (const nId of nutritionistIds) {
          const created = await createAlertIfNew(
            supabase, patientId, nId, ALERT_TYPES.LOW_ADHERENCE,
            `${patientName}: adesão de ${adherence}% nos últimos 7 dias. Considere simplificar o protocolo ou entrar em contato.`,
            {
              adherence_percent: adherence,
              tasks_total: total,
              tasks_completed: completed,
              period_days: 7,
            }
          );
          if (created) alerts.push({ type: "low_adherence", patient_id: patientId, severity: "high" });
        }
      }
    }

    // ─── SIGNAL 2: Weight Stagnation ───
    if (assessments.length >= 2) {
      const latest = assessments[0];
      const oldest = assessments.find((a: any) => {
        const days = (new Date(latest.assessment_date).getTime() - new Date(a.assessment_date).getTime()) / 86400000;
        return days >= 21;
      });

      if (oldest && latest.weight && oldest.weight) {
        const diff = Math.abs(latest.weight - oldest.weight);
        if (diff < 0.3) {
          // Check if patient's goal is weight loss
          const goalIsLoss = activePlan?.generation_metadata?.goal === "lose_weight" ||
            activePlan?.generation_metadata?.goal === "emagrecimento";

          if (goalIsLoss || !activePlan) {
            for (const nId of nutritionistIds) {
              const days = Math.round(
                (new Date(latest.assessment_date).getTime() - new Date(oldest.assessment_date).getTime()) / 86400000
              );
              const created = await createAlertIfNew(
                supabase, patientId, nId, ALERT_TYPES.WEIGHT_STAGNATION,
                `${patientName}: peso estagnado (${latest.weight}kg) há ${days} dias. Variação de apenas ${diff.toFixed(1)}kg.`,
                {
                  current_weight: latest.weight,
                  previous_weight: oldest.weight,
                  weight_diff: diff,
                  days_between: days,
                }
              );
              if (created) alerts.push({ type: "weight_stagnation", patient_id: patientId, severity: "medium" });
            }
          }
        }
      }
    }

    // ─── SIGNAL 3: Unexpected Weight Gain ───
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
              `${patientName}: ganho de ${gain.toFixed(1)}kg em período curto (${recent.weight}kg → ${latest.weight}kg). Investigar causas.`,
              {
                current_weight: latest.weight,
                previous_weight: recent.weight,
                weight_gain: gain,
              }
            );
            if (created) alerts.push({ type: "unexpected_weight_gain", patient_id: patientId, severity: "high" });
          }
        }
      }
    }

    // ─── SIGNAL 4: Low Check-in Frequency ───
    const recentMeals = meals.filter((m: any) => new Date(m.logged_at) >= new Date(threeDaysAgo));
    if (recentMeals.length === 0 && meals.length > 0) {
      // Had meals before but none in last 3 days
      for (const nId of nutritionistIds) {
        const lastMealDate = meals[0]?.logged_at;
        const created = await createAlertIfNew(
          supabase, patientId, nId, ALERT_TYPES.LOW_CHECKIN_FREQUENCY,
          `${patientName}: sem registro alimentar há mais de 3 dias. Último registro: ${lastMealDate ? new Date(lastMealDate).toLocaleDateString("pt-BR") : "desconhecido"}.`,
          {
            days_without_record: 3,
            last_meal_date: lastMealDate,
          }
        );
        if (created) alerts.push({ type: "low_checkin_frequency", patient_id: patientId, severity: "medium" });
      }
    }

    // ─── SIGNAL 5: Possible Abandonment ───
    const lastSeen = presence?.last_seen_at;
    if (lastSeen) {
      const daysSinceLogin = (now.getTime() - new Date(lastSeen).getTime()) / 86400000;
      if (daysSinceLogin > 7) {
        for (const nId of nutritionistIds) {
          const created = await createAlertIfNew(
            supabase, patientId, nId, ALERT_TYPES.POSSIBLE_ABANDONMENT,
            `${patientName}: sem acesso ao sistema há ${Math.floor(daysSinceLogin)} dias. Alto risco de abandono.`,
            {
              days_since_login: Math.floor(daysSinceLogin),
              last_seen: lastSeen,
            }
          );
          if (created) alerts.push({ type: "possible_abandonment", patient_id: patientId, severity: "critical" });
        }
      }
    }

    // ─── SIGNAL 6: Metabolic Signal (calorie overshoot) ───
    if (meals.length >= 3 && activePlan?.generation_metadata) {
      const calorieTarget = activePlan.generation_metadata.calorie_target;
      if (calorieTarget && calorieTarget > 0) {
        const mealsWithCalories = meals.filter((m: any) => m.calories && m.calories > 0);
        if (mealsWithCalories.length >= 3) {
          const totalCalories = mealsWithCalories.reduce((sum: number, m: any) => sum + (m.calories || 0), 0);
          // Get unique days
          const uniqueDays = new Set(mealsWithCalories.map((m: any) => new Date(m.logged_at).toISOString().split("T")[0]));
          const avgDailyCalories = totalCalories / uniqueDays.size;
          const threshold = calorieTarget * 1.25;

          if (avgDailyCalories > threshold) {
            for (const nId of nutritionistIds) {
              const created = await createAlertIfNew(
                supabase, patientId, nId, ALERT_TYPES.METABOLIC_SIGNAL,
                `${patientName}: ingestão média (${Math.round(avgDailyCalories)} kcal) excede meta (${calorieTarget} kcal) em +25%. Revisar plano.`,
                {
                  avg_daily_calories: Math.round(avgDailyCalories),
                  calorie_target: calorieTarget,
                  overshoot_percent: Math.round(((avgDailyCalories - calorieTarget) / calorieTarget) * 100),
                  days_analyzed: uniqueDays.size,
                }
              );
              if (created) alerts.push({ type: "metabolic_signal", patient_id: patientId, severity: "medium" });
            }
          }
        }
      }
    }
  }

  return alerts;
}

async function createAlertIfNew(
  supabase: any,
  patientId: string,
  nutritionistId: string,
  alertDef: typeof ALERT_TYPES[keyof typeof ALERT_TYPES],
  description: string,
  metadata: Record<string, any>
): Promise<boolean> {
  // Check cooldown — don't duplicate if active alert exists within cooldown
  const cooldownDate = new Date(
    Date.now() - alertDef.cooldown_days * 86400000
  ).toISOString();

  const { count } = await supabase
    .from("clinical_alerts")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .eq("nutritionist_id", nutritionistId)
    .eq("alert_type", alertDef.type)
    .eq("is_active", true)
    .gte("created_at", cooldownDate);

  if ((count || 0) > 0) return false;

  // Create alert
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
    console.error("Alert insert error:", alertError);
    return false;
  }

  // Create notification
  await supabase.from("notifications").insert({
    user_id: nutritionistId,
    title: alertDef.title,
    message: description,
    type: "clinical_alert",
    action_url: `/patients/${patientId}`,
    metadata: { alert_type: alertDef.type, severity: alertDef.severity, patient_id: patientId },
  });

  // Create timeline event
  await supabase.from("patient_timeline").insert({
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
  });

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
