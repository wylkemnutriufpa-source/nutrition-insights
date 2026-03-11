import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { patient_id, nutritionist_id } = await req.json();

    if (!patient_id) {
      return new Response(JSON.stringify({ error: "patient_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deactivate old signals for this patient
    await supabase
      .from("patient_signals")
      .update({ is_active: false })
      .eq("patient_id", patient_id)
      .eq("detected_by", "system");

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const signals: Array<{
      patient_id: string;
      signal_key: string;
      severity: string;
      value: number | null;
      context: Record<string, unknown>;
    }> = [];

    // ── Parallel data fetches ──
    const [
      anamnesisRes,
      checklistTodayRes,
      checklist3dRes,
      mealsRecentRes,
      mealPlansRes,
      protocolsRes,
      checkinsRes,
      playerStatsRes,
      assessmentsRes,
      mealAdherenceRes,
      patientCreatedRes,
    ] = await Promise.all([
      // Anamnesis
      supabase
        .from("patient_anamnesis")
        .select("id, status")
        .eq("user_id", patient_id)
        .order("created_at", { ascending: false })
        .limit(1),
      // Checklist today
      supabase
        .from("checklist_tasks")
        .select("id, completed")
        .eq("patient_id", patient_id)
        .eq("date", today),
      // Checklist last 3 days
      supabase
        .from("checklist_tasks")
        .select("id, completed, date")
        .eq("patient_id", patient_id)
        .gte("date", daysAgo(3))
        .lte("date", today),
      // Meals last 7 days
      supabase
        .from("meals")
        .select("id, logged_at")
        .eq("user_id", patient_id)
        .gte("logged_at", daysAgo(7)),
      // Active meal plans
      supabase
        .from("meal_plans")
        .select("id")
        .eq("patient_id", patient_id)
        .eq("is_active", true)
        .limit(1),
      // Active protocols
      supabase
        .from("patient_protocols")
        .select("id")
        .eq("patient_id", patient_id)
        .eq("status", "active")
        .limit(1),
      // Checkins last 14 days
      supabase
        .from("patient_checkins")
        .select("id, created_at")
        .eq("patient_id", patient_id)
        .gte("created_at", daysAgo(14)),
      // Player stats
      supabase
        .from("player_stats")
        .select("current_streak, last_meal_date")
        .eq("user_id", patient_id)
        .limit(1),
      // Last 2 assessments for weight stagnation
      supabase
        .from("physical_assessments")
        .select("weight, body_fat_percentage, assessment_date")
        .eq("patient_id", patient_id)
        .order("assessment_date", { ascending: false })
        .limit(3),
      // Meal adherence last 7 days
      supabase
        .from("meal_item_completions")
        .select("id, adherence_status, completed")
        .eq("patient_id", patient_id)
        .gte("date", daysAgo(7)),
      // Patient created_at
      supabase
        .from("nutritionist_patients")
        .select("created_at")
        .eq("patient_id", patient_id)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    // ── Signal Detection Logic ──

    // 1. Missing anamnesis
    const anamnesis = anamnesisRes.data?.[0];
    if (!anamnesis || anamnesis.status !== "completed") {
      signals.push({
        patient_id,
        signal_key: "missing_anamnesis",
        severity: "high",
        value: null,
        context: { status: anamnesis?.status || "missing" },
      });
    }

    // 2. Checklist today
    const todayTasks = checklistTodayRes.data || [];
    if (todayTasks.length > 0) {
      const completed = todayTasks.filter((t) => t.completed).length;
      if (completed === 0) {
        signals.push({
          patient_id,
          signal_key: "zero_checklist_today",
          severity: "medium",
          value: 0,
          context: { total_tasks: todayTasks.length },
        });
      }
      if (completed === todayTasks.length && todayTasks.length >= 3) {
        signals.push({
          patient_id,
          signal_key: "perfect_day",
          severity: "info",
          value: 100,
          context: { completed, total: todayTasks.length },
        });
      }
    }

    // 3. Low checklist adherence (3 days)
    const tasks3d = checklist3dRes.data || [];
    if (tasks3d.length > 0) {
      const completed3d = tasks3d.filter((t) => t.completed).length;
      const pct3d = (completed3d / tasks3d.length) * 100;
      if (pct3d < 50) {
        signals.push({
          patient_id,
          signal_key: "low_checklist_adherence",
          severity: pct3d < 25 ? "critical" : "high",
          value: Math.round(pct3d),
          context: { completed: completed3d, total: tasks3d.length, days: 3 },
        });
      }
    }

    // 4. Meal logging gaps
    const recentMeals = mealsRecentRes.data || [];
    const mealDates = new Set(
      recentMeals.map((m) => m.logged_at.split("T")[0])
    );
    const daysSinceLastMeal = recentMeals.length === 0 ? 7 : 0;

    if (recentMeals.length === 0) {
      signals.push({
        patient_id,
        signal_key: "no_meal_logged_7d",
        severity: "critical",
        value: 7,
        context: {},
      });
    } else if (mealDates.size <= 2) {
      // Only 1-2 days with meals in 7 days → check if last 3 days have meals
      const last3days = [today, daysAgo(1), daysAgo(2)];
      const hasRecentMeal = last3days.some((d) => mealDates.has(d));
      if (!hasRecentMeal) {
        signals.push({
          patient_id,
          signal_key: "no_meal_logged_3d",
          severity: "high",
          value: 3,
          context: { days_with_meals: mealDates.size },
        });
      }
    }

    // 5. No active meal plan
    if (!mealPlansRes.data?.length) {
      signals.push({
        patient_id,
        signal_key: "no_meal_plan",
        severity: "high",
        value: null,
        context: {},
      });
    }

    // 6. No active protocol
    if (!protocolsRes.data?.length) {
      signals.push({
        patient_id,
        signal_key: "no_active_protocol",
        severity: "medium",
        value: null,
        context: {},
      });
    }

    // 7. Checkin gaps
    const checkins14d = checkinsRes.data || [];
    if (checkins14d.length === 0) {
      signals.push({
        patient_id,
        signal_key: "no_checkin_14d",
        severity: "high",
        value: 14,
        context: {},
      });
    } else {
      // Check if any in last 7 days
      const cutoff7d = new Date(daysAgo(7)).getTime();
      const hasRecent = checkins14d.some(
        (c) => new Date(c.created_at).getTime() >= cutoff7d
      );
      if (!hasRecent) {
        signals.push({
          patient_id,
          signal_key: "no_checkin_7d",
          severity: "medium",
          value: 7,
          context: {},
        });
      }
    }

    // 8. Player stats signals
    const stats = playerStatsRes.data?.[0];
    if (stats) {
      if (stats.current_streak >= 7) {
        signals.push({
          patient_id,
          signal_key: "high_streak",
          severity: "info",
          value: stats.current_streak,
          context: { streak: stats.current_streak },
        });
      }

      // Inactivity from last_meal_date
      if (stats.last_meal_date) {
        const daysSince = daysDiff(stats.last_meal_date, today);
        if (daysSince >= 14) {
          signals.push({
            patient_id,
            signal_key: "inactive_14d",
            severity: "critical",
            value: daysSince,
            context: { last_activity: stats.last_meal_date },
          });
        } else if (daysSince >= 7) {
          signals.push({
            patient_id,
            signal_key: "inactive_7d",
            severity: "high",
            value: daysSince,
            context: { last_activity: stats.last_meal_date },
          });
        }
      }
    }

    // 9. Weight stagnation
    const assessments = assessmentsRes.data || [];
    if (assessments.length >= 2) {
      const [latest, prev] = assessments;
      if (latest.weight && prev.weight) {
        const diff = Math.abs(latest.weight - prev.weight);
        const weeksBetween = daysDiff(prev.assessment_date, latest.assessment_date) / 7;
        if (diff < 0.5 && weeksBetween >= 3) {
          signals.push({
            patient_id,
            signal_key: "weight_stagnation",
            severity: "medium",
            value: weeksBetween,
            context: {
              current_weight: latest.weight,
              prev_weight: prev.weight,
              weeks: Math.round(weeksBetween),
            },
          });
        }
        if (latest.weight - prev.weight > 2) {
          signals.push({
            patient_id,
            signal_key: "weight_gain_unexpected",
            severity: "high",
            value: latest.weight - prev.weight,
            context: {
              gain_kg: +(latest.weight - prev.weight).toFixed(1),
              current: latest.weight,
              previous: prev.weight,
            },
          });
        }
      }
      if (latest.body_fat_percentage && latest.body_fat_percentage > 30) {
        signals.push({
          patient_id,
          signal_key: "high_body_fat",
          severity: "medium",
          value: latest.body_fat_percentage,
          context: { body_fat: latest.body_fat_percentage },
        });
      }
    }

    // 10. Meal plan adherence
    const mealCompletions = mealAdherenceRes.data || [];
    if (mealCompletions.length > 0) {
      const followed = mealCompletions.filter(
        (m) => m.adherence_status === "followed" && m.completed
      ).length;
      const pct = (followed / mealCompletions.length) * 100;
      if (pct < 40) {
        signals.push({
          patient_id,
          signal_key: "low_meal_adherence",
          severity: pct < 20 ? "critical" : "high",
          value: Math.round(pct),
          context: { followed, total: mealCompletions.length },
        });
      }
    }

    // 11. New patient
    const patientCreated = patientCreatedRes.data?.[0];
    if (patientCreated) {
      const daysSinceCreated = daysDiff(
        patientCreated.created_at.split("T")[0],
        today
      );
      if (daysSinceCreated <= 7) {
        signals.push({
          patient_id,
          signal_key: "new_patient",
          severity: "info",
          value: daysSinceCreated,
          context: { days_since_created: daysSinceCreated },
        });
      }
    }

    // 12. Declining adherence (compare week1 vs week2)
    if (tasks3d.length > 0) {
      // We already have 3d data, let's also check if there's a decline pattern
      // by comparing today vs previous days
      const byDate: Record<string, { done: number; total: number }> = {};
      for (const t of tasks3d) {
        if (!byDate[t.date]) byDate[t.date] = { done: 0, total: 0 };
        byDate[t.date].total++;
        if (t.completed) byDate[t.date].done++;
      }
      const dates = Object.keys(byDate).sort();
      if (dates.length >= 3) {
        const rates = dates.map(
          (d) => (byDate[d].done / byDate[d].total) * 100
        );
        // Check if declining trend
        if (rates.length >= 2 && rates[rates.length - 1] < rates[0] - 20) {
          signals.push({
            patient_id,
            signal_key: "declining_adherence",
            severity: "high",
            value: Math.round(rates[rates.length - 1]),
            context: {
              trend: rates.map((r) => Math.round(r)),
              dates,
            },
          });
        }
      }
    }

    // ── Insert detected signals ──
    if (signals.length > 0) {
      const rows = signals.map((s) => ({
        ...s,
        detected_by: "system",
        is_active: true,
      }));
      await supabase.from("patient_signals").insert(rows);
    }

    return new Response(
      JSON.stringify({
        patient_id,
        signals_detected: signals.length,
        signals: signals.map((s) => ({
          signal_key: s.signal_key,
          severity: s.severity,
          value: s.value,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Signal detection error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function daysDiff(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.abs(Math.round((b - a) / (1000 * 60 * 60 * 24)));
}
