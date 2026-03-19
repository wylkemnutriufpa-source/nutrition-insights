import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Thresholds
const CHECKLIST_DROP_THRESHOLD = 40; // below 40% = drop
const MEAL_DROP_THRESHOLD = 1; // less than 1 meal/day average
const LOGIN_ABSENCE_DAYS = 3;
const SCORE_DROP_THRESHOLD = 20; // 20-point drop week over week

// Mission templates by signal type
const MISSION_TEMPLATES: Record<string, Array<{
  title: string; description: string; mission_type: string;
  icon: string; target_value: number; xp_reward: number; duration_hours: number;
}>> = {
  checklist_drop: [
    { title: "Micro-Meta: 3 tarefas hoje", description: "Complete apenas 3 tarefas do checklist. Pequenos passos contam!", mission_type: "consistency", icon: "✅", target_value: 3, xp_reward: 30, duration_hours: 24 },
    { title: "Hidratação Express", description: "Beba 4 copos de água hoje. Comece agora!", mission_type: "hydration", icon: "💧", target_value: 4, xp_reward: 20, duration_hours: 24 },
  ],
  meal_drop: [
    { title: "Registre 2 refeições", description: "Registre pelo menos 2 refeições hoje. Não precisa ser perfeito!", mission_type: "tracking", icon: "📝", target_value: 2, xp_reward: 25, duration_hours: 24 },
    { title: "Foto do prato", description: "Tire foto de 1 refeição e registre. Consciência alimentar!", mission_type: "quality", icon: "📸", target_value: 1, xp_reward: 15, duration_hours: 24 },
  ],
  login_absence: [
    { title: "Bem-vindo de volta!", description: "Complete qualquer 1 tarefa do checklist para retomar sua jornada", mission_type: "consistency", icon: "🔥", target_value: 1, xp_reward: 40, duration_hours: 48 },
  ],
  streak_break: [
    { title: "Reconstrua seu streak", description: "Complete o checklist hoje para iniciar um novo streak!", mission_type: "streak", icon: "⚡", target_value: 1, xp_reward: 35, duration_hours: 24 },
  ],
};

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

    // Get active relationships
    let npQuery = supabase
      .from("nutritionist_patients")
      .select("nutritionist_id, patient_id")
      .eq("status", "active");
    if (nutritionistId) npQuery = npQuery.eq("nutritionist_id", nutritionistId);
    const { data: relationships } = await npQuery;

    if (!relationships || relationships.length === 0) {
      return new Response(JSON.stringify({ signals_detected: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
    const prevWeekStart = new Date(sevenDaysAgo);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekStartStr = prevWeekStart.toISOString().split("T")[0];

    const patientIds = [...new Set(relationships.map((r) => r.patient_id))];
    let signalsDetected = 0;

    // Batch fetch checklist data for all patients (last 14 days)
    const { data: allTasks } = await supabase
      .from("checklist_tasks")
      .select("patient_id, date, completed")
      .in("patient_id", patientIds)
      .gte("date", prevWeekStartStr)
      .lte("date", todayStr);

    // Batch fetch meals for all patients (last 7 days)
    const { data: allMeals } = await supabase
      .from("meals")
      .select("user_id, logged_at")
      .in("user_id", patientIds)
      .gte("logged_at", sevenDaysAgo.toISOString());

    // Batch fetch recent signals to avoid duplicates (last 24h)
    const oneDayAgo = new Date(today);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const { data: recentSignals } = await supabase
      .from("engagement_signals")
      .select("patient_id, signal_type")
      .in("patient_id", patientIds)
      .gte("detected_at", oneDayAgo.toISOString());

    const recentSignalSet = new Set(
      (recentSignals || []).map((s) => `${s.patient_id}:${s.signal_type}`)
    );

    // Group data by patient
    const tasksByPatient: Record<string, Array<{ date: string; completed: boolean }>> = {};
    for (const t of allTasks || []) {
      if (!tasksByPatient[t.patient_id]) tasksByPatient[t.patient_id] = [];
      tasksByPatient[t.patient_id].push(t);
    }

    const mealsByPatient: Record<string, number> = {};
    for (const m of allMeals || []) {
      mealsByPatient[m.user_id] = (mealsByPatient[m.user_id] || 0) + 1;
    }

    const signalsToInsert: Array<Record<string, unknown>> = [];
    const missionsToInsert: Array<Record<string, unknown>> = [];
    const adherenceToUpsert: Array<Record<string, unknown>> = [];

    for (const patientId of patientIds) {
      const nutri = relationships.find((r) => r.patient_id === patientId);
      if (!nutri) continue;

      const tasks = tasksByPatient[patientId] || [];
      const detectedSignals: string[] = [];

      // === Calculate daily adherence ===
      const todayTasks = tasks.filter((t) => t.date === todayStr);
      const totalToday = todayTasks.length;
      const completedToday = todayTasks.filter((t) => t.completed).length;
      const checklistPct = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;

      const mealsThisWeek = mealsByPatient[patientId] || 0;
      const mealsDailyAvg = mealsThisWeek / 7;
      const mealsScore = Math.min(100, mealsDailyAvg * 33.3); // 3 meals/day = 100

      // Streak: count consecutive days with >50% checklist
      let streak = 0;
      for (let d = 0; d < 30; d++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - d);
        const dateStr = checkDate.toISOString().split("T")[0];
        const dayTasks = tasks.filter((t) => t.date === dateStr);
        if (dayTasks.length === 0) break;
        const dayPct = dayTasks.filter((t) => t.completed).length / dayTasks.length;
        if (dayPct >= 0.5) streak++;
        else break;
      }
      const streakScore = Math.min(100, streak * 14.3); // 7 days = 100

      const totalScore = checklistPct * 0.4 + mealsScore * 0.3 + streakScore * 0.3;

      adherenceToUpsert.push({
        patient_id: patientId,
        date: todayStr,
        checklist_score: Math.round(checklistPct * 100) / 100,
        meals_score: Math.round(mealsScore * 100) / 100,
        plan_score: 0,
        checkin_score: 0,
        streak_score: Math.round(streakScore * 100) / 100,
        total_score: Math.round(totalScore * 100) / 100,
        streak_days: streak,
      });

      // === Detect signals ===

      // 1. Checklist drop (this week avg)
      const thisWeekTasks = tasks.filter((t) => t.date >= sevenDaysAgoStr);
      const thisWeekTotal = thisWeekTasks.length;
      const thisWeekCompleted = thisWeekTasks.filter((t) => t.completed).length;
      const thisWeekPct = thisWeekTotal > 0 ? (thisWeekCompleted / thisWeekTotal) * 100 : 0;

      if (thisWeekPct < CHECKLIST_DROP_THRESHOLD && thisWeekTotal > 0) {
        if (!recentSignalSet.has(`${patientId}:checklist_drop`)) {
          detectedSignals.push("checklist_drop");
          signalsToInsert.push({
            patient_id: patientId,
            nutritionist_id: nutri.nutritionist_id,
            signal_type: "checklist_drop",
            severity: thisWeekPct < 20 ? "high" : "medium",
            signal_data: { week_pct: thisWeekPct, completed: thisWeekCompleted, total: thisWeekTotal },
          });
        }
      }

      // 2. Meal registration drop
      if (mealsDailyAvg < MEAL_DROP_THRESHOLD) {
        if (!recentSignalSet.has(`${patientId}:meal_drop`)) {
          detectedSignals.push("meal_drop");
          signalsToInsert.push({
            patient_id: patientId,
            nutritionist_id: nutri.nutritionist_id,
            signal_type: "meal_drop",
            severity: mealsThisWeek === 0 ? "high" : "medium",
            signal_data: { meals_this_week: mealsThisWeek, daily_avg: mealsDailyAvg },
          });
        }
      }

      // 3. Streak break
      if (streak === 0 && thisWeekTotal > 0) {
        // Check if they had a streak before
        const prevWeekTasks = tasks.filter((t) => t.date >= prevWeekStartStr && t.date < sevenDaysAgoStr);
        const prevTotal = prevWeekTasks.length;
        const prevCompleted = prevWeekTasks.filter((t) => t.completed).length;
        const prevPct = prevTotal > 0 ? (prevCompleted / prevTotal) * 100 : 0;
        if (prevPct > 60) {
          if (!recentSignalSet.has(`${patientId}:streak_break`)) {
            detectedSignals.push("streak_break");
            signalsToInsert.push({
              patient_id: patientId,
              nutritionist_id: nutri.nutritionist_id,
              signal_type: "streak_break",
              severity: "medium",
              signal_data: { prev_week_pct: prevPct, current_streak: 0 },
            });
          }
        }
      }

      // === Generate missions for detected signals ===
      for (const signalType of detectedSignals) {
        const templates = MISSION_TEMPLATES[signalType];
        if (!templates || templates.length === 0) continue;
        const tmpl = templates[Math.floor(Math.random() * templates.length)];
        const expiresAt = new Date(today);
        expiresAt.setHours(expiresAt.getHours() + tmpl.duration_hours);

        missionsToInsert.push({
          patient_id: patientId,
          nutritionist_id: nutri.nutritionist_id,
          title: tmpl.title,
          description: tmpl.description,
          mission_type: tmpl.mission_type,
          icon: tmpl.icon,
          target_value: tmpl.target_value,
          current_value: 0,
          xp_reward: tmpl.xp_reward,
          duration_hours: tmpl.duration_hours,
          status: "active",
          expires_at: expiresAt.toISOString(),
        });
      }

      signalsDetected += detectedSignals.length;
    }

    // Batch insert signals
    if (signalsToInsert.length > 0) {
      await supabase.from("engagement_signals").insert(signalsToInsert);
    }

    // Batch insert missions
    if (missionsToInsert.length > 0) {
      await supabase.from("patient_missions").insert(missionsToInsert);
    }

    // Batch upsert adherence
    if (adherenceToUpsert.length > 0) {
      await supabase.from("patient_daily_adherence").upsert(adherenceToUpsert, {
        onConflict: "patient_id,date",
      });
    }

    return new Response(
      JSON.stringify({
        signals_detected: signalsDetected,
        missions_created: missionsToInsert.length,
        adherence_updated: adherenceToUpsert.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error detecting engagement signals:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
