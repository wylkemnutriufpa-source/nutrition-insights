import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LONGITUDINAL_ENGINE_VERSION = "1.0.0";
const BATCH_SIZE = 100;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Weight Trend Classification ───
function classifyWeightTrend(
  velocityPctPerWeek: number,
  absVariationKg: number
): string {
  if (absVariationKg < 0.2) return "stagnated";
  if (velocityPctPerWeek < -1) return "fast_loss";
  if (velocityPctPerWeek <= -0.4) return "expected_loss";
  if (velocityPctPerWeek < 0) return "slow_loss";
  return "gaining";
}

// ─── Adherence Momentum Classification ───
function classifyAdherenceMomentum(
  current7d: number,
  prev7d: number
): string {
  const diff = current7d - prev7d;
  if (diff <= -20) return "critical_drop";
  if (diff <= -5) return "declining";
  if (diff >= 5) return "improving";
  return "stable";
}

// ─── Engagement Level Classification ───
function classifyEngagement(index: number): string {
  if (index >= 75) return "high_engagement";
  if (index >= 50) return "moderate";
  if (index >= 25) return "unstable";
  return "drop_risk";
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
    const nutritionistId = body.nutritionist_id;

    console.log(
      `[LONGITUDINAL v${LONGITUDINAL_ENGINE_VERSION}] Starting. Filter: ${nutritionistId || "all"}`
    );

    // 1. Get active patient IDs
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
        engine_version: LONGITUDINAL_ENGINE_VERSION,
        duration_ms: Date.now() - startTime,
      });
    }

    const patientIds = [...new Set(rels.map((r: any) => r.patient_id))];
    let totalProcessed = 0;

    for (let i = 0; i < patientIds.length; i += BATCH_SIZE) {
      const batch = patientIds.slice(i, i + BATCH_SIZE);
      await processBatch(supabase, batch);
      totalProcessed += batch.length;
      console.log(
        `[LONGITUDINAL] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} patients`
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `[LONGITUDINAL v${LONGITUDINAL_ENGINE_VERSION}] Complete. ${totalProcessed} patients, ${duration}ms`
    );

    return jsonResponse({
      patients_processed: totalProcessed,
      engine_version: LONGITUDINAL_ENGINE_VERSION,
      duration_ms: duration,
    });
  } catch (error: any) {
    console.error("[LONGITUDINAL] Fatal error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        engine_version: LONGITUDINAL_ENGINE_VERSION,
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

async function processBatch(supabase: any, patientIds: string[]) {
  const now = new Date();
  const twentyEightDaysAgo = new Date(
    now.getTime() - 28 * 86400000
  ).toISOString();
  const fourteenDaysAgo = new Date(
    now.getTime() - 14 * 86400000
  ).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const sevenDaysAgoDate = sevenDaysAgo.split("T")[0];
  const fourteenDaysAgoDate = fourteenDaysAgo.split("T")[0];

  // ─── Batch fetch all data in parallel ───
  const [assessRes, checklistRes, checklistPrevRes, mealsRes, sessionsRes] =
    await Promise.all([
      // Weight assessments last 28 days
      supabase
        .from("physical_assessments")
        .select("patient_id, weight, assessment_date")
        .in("patient_id", patientIds)
        .gte("assessment_date", twentyEightDaysAgo.split("T")[0])
        .order("assessment_date", { ascending: true }),

      // Checklist last 7 days (current week)
      supabase
        .from("checklist_tasks")
        .select("patient_id, completed, date")
        .in("patient_id", patientIds)
        .gte("date", sevenDaysAgoDate),

      // Checklist previous 7 days (7-14 days ago)
      supabase
        .from("checklist_tasks")
        .select("patient_id, completed, date")
        .in("patient_id", patientIds)
        .gte("date", fourteenDaysAgoDate)
        .lt("date", sevenDaysAgoDate),

      // Meals last 14 days (for engagement: login proxy)
      supabase
        .from("meals")
        .select("user_id, logged_at")
        .in("user_id", patientIds)
        .gte("logged_at", fourteenDaysAgo),

      // Sessions for login frequency
      supabase
        .from("user_sessions")
        .select("user_id, last_seen_at, session_count")
        .in("user_id", patientIds),
    ]);

  // ─── Group data ───
  const assessByPatient = groupBy(assessRes.data || [], "patient_id");
  const checklistByPatient = groupBy(checklistRes.data || [], "patient_id");
  const checklistPrevByPatient = groupBy(
    checklistPrevRes.data || [],
    "patient_id"
  );
  const mealsByPatient = groupBy(mealsRes.data || [], "user_id");
  const sessionMap = indexBy(sessionsRes.data || [], "user_id");

  // ─── Calculate per patient ───
  const updates: any[] = [];

  for (const pid of patientIds) {
    const assessments = assessByPatient[pid] || [];
    const checklist7d = checklistByPatient[pid] || [];
    const checklistPrev7d = checklistPrevByPatient[pid] || [];
    const meals14d = mealsByPatient[pid] || [];
    const session = sessionMap[pid] as { last_seen_at?: string | null; session_count?: number | null } | undefined;

    // ══════════ 1. WEIGHT TREND VELOCITY ══════════
    let weightVelocity = 0;
    let weightTrend = "unknown";
    let dataPointsWeight = assessments.length;

    if (assessments.length >= 2) {
      const first: any = assessments[0];
      const last: any = assessments[assessments.length - 1];
      const daysBetween =
        (new Date(last.assessment_date).getTime() -
          new Date(first.assessment_date).getTime()) /
        86400000;

      if (daysBetween >= 7 && first.weight && last.weight) {
        const totalChange = last.weight - first.weight;
        const weeks = daysBetween / 7;
        weightVelocity = Number((totalChange / weeks).toFixed(3));

        const velocityPct = (weightVelocity / first.weight) * 100;
        const absVariation = Math.abs(totalChange);
        weightTrend = classifyWeightTrend(velocityPct, absVariation);
      }
    }

    // ══════════ 2. ADHERENCE MOMENTUM ══════════
    const total7d = checklist7d.length;
    const completed7d = checklist7d.filter((t: any) => t.completed).length;
    const adherenceScore7d =
      total7d > 0 ? Math.round((completed7d / total7d) * 100) : 0;

    const totalPrev7d = checklistPrev7d.length;
    const completedPrev7d = checklistPrev7d.filter(
      (t: any) => t.completed
    ).length;
    const adherenceScorePrev7d =
      totalPrev7d > 0 ? Math.round((completedPrev7d / totalPrev7d) * 100) : 0;

    const adherenceMomentum =
      total7d > 0 && totalPrev7d > 0
        ? classifyAdherenceMomentum(adherenceScore7d, adherenceScorePrev7d)
        : "stable";

    // ══════════ 3. ENGAGEMENT STABILITY INDEX ══════════
    // Login frequency score (0-40)
    const daysSinceLogin = session?.last_seen_at
      ? (now.getTime() - new Date(session.last_seen_at).getTime()) / 86400000
      : 14;
    const loginScore =
      daysSinceLogin <= 1
        ? 40
        : daysSinceLogin <= 3
          ? 30
          : daysSinceLogin <= 5
            ? 20
            : daysSinceLogin <= 7
              ? 10
              : 0;

    // Meal logging frequency score (0-30)
    const uniqueMealDays = new Set(
      meals14d.map((m: any) =>
        new Date(m.logged_at).toISOString().split("T")[0]
      )
    );
    const mealDayRatio = uniqueMealDays.size / 14;
    const mealScore = Math.round(mealDayRatio * 30);

    // Checklist response score (0-30)
    const checklistScore =
      total7d > 0 ? Math.round((completed7d / total7d) * 30) : 0;

    const engagementIndex = Math.min(
      100,
      loginScore + mealScore + checklistScore
    );
    const engagementLevel = classifyEngagement(engagementIndex);

    updates.push({
      user_id: pid,
      weight_trend_status: weightTrend,
      weight_velocity_kg_week: weightVelocity,
      adherence_momentum: adherenceMomentum,
      adherence_score_7d: adherenceScore7d,
      adherence_score_prev_7d: adherenceScorePrev7d,
      engagement_index: engagementIndex,
      engagement_level: engagementLevel,
    });
  }

  // ─── Batch update profiles ───
  // Supabase doesn't support bulk update by different keys, so use parallel upserts
  const updatePromises = updates.map((u) =>
    supabase
      .from("profiles")
      .update({
        weight_trend_status: u.weight_trend_status,
        weight_velocity_kg_week: u.weight_velocity_kg_week,
        adherence_momentum: u.adherence_momentum,
        adherence_score_7d: u.adherence_score_7d,
        adherence_score_prev_7d: u.adherence_score_prev_7d,
        engagement_index: u.engagement_index,
        engagement_level: u.engagement_level,
      })
      .eq("user_id", u.user_id)
  );

  await Promise.all(updatePromises);

  console.log(
    `[LONGITUDINAL] Updated ${updates.length} profiles with longitudinal indicators`
  );
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
