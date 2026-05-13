import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireCronOrAdmin } from "../_shared/cron-guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC_KEY = "BEvGFMB5dpy0wBBOKQhwOY_duamSBsGsu0CTVhu9W6IoEzmxI2BFbZR8c0Q6T5wEwiqT7kHdKwXNSiUlYYQ745s";
const VAPID_SUBJECT = "mailto:contato@fitjourney.app";

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return true;
  const key = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!key || key.length < 10) return false;
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, key);
    vapidConfigured = true;
    return true;
  } catch { return false; }
}

async function sendRealPush(
  supabase: any,
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  if (!ensureVapid()) return 0;
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/",
    tag: payload.tag || "fitjourney-smart",
    icon: "/pwa-192x192.png",
  });

  let sent = 0;
  for (const sub of subscriptions || []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        pushPayload
      );
      sent++;
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
    }
  }

  // Also store in-app
  await supabase.from("notifications").insert({
    user_id: userId,
    title: payload.title,
    message: payload.body,
    type: "smart_push",
    action_url: payload.url || null,
  });

  return sent;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  
  try { await requireCronOrAdmin(req); } catch (r) { if (r instanceof Response) return r; throw r; }
const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const now = new Date();
    const hour = now.getHours();
    const today = now.toISOString().split("T")[0];
    const results: string[] = [];

    // 1. Morning motivation (8-9 AM)
    if (hour >= 8 && hour < 9) {
      const { data: patients } = await supabase
        .from("checklist_tasks")
        .select("patient_id")
        .eq("date", today)
        .eq("completed", false);

      const uniquePatients = [...new Set((patients || []).map((p: any) => p.patient_id))];
      let pushCount = 0;
      for (const patientId of uniquePatients.slice(0, 50)) {
        pushCount += await sendRealPush(supabase, patientId, {
          title: "Bom dia! ☀️",
          body: "Suas tarefas do dia estão te esperando. Vamos começar?",
          url: "/checklist",
        });
      }
      results.push(`morning_motivation: ${uniquePatients.length} patients, ${pushCount} pushes`);
    }

    // 2. Streak risk (7-8 PM)
    if (hour >= 19 && hour < 20) {
      const { data: activePlayers } = await supabase
        .from("player_stats")
        .select("user_id, current_streak")
        .gt("current_streak", 2);

      let pushCount = 0;
      for (const player of (activePlayers || []).slice(0, 50)) {
        const { count } = await supabase
          .from("checklist_tasks")
          .select("id", { count: "exact", head: true })
          .eq("patient_id", player.user_id)
          .eq("date", today)
          .eq("completed", true);

        if ((count || 0) === 0) {
          pushCount += await sendRealPush(supabase, player.user_id, {
            title: `Seu streak de ${player.current_streak} dias está em risco! 🔥`,
            body: "Complete pelo menos 1 tarefa para manter seu progresso.",
            url: "/checklist",
          });
        }
      }
      results.push(`streak_risk: checked ${(activePlayers || []).length}, ${pushCount} pushes`);
    }

    // 3. Meal reminder (12-13 PM)
    if (hour >= 12 && hour < 13) {
      const { data: patientsWithPlans } = await supabase
        .from("meal_plans")
        .select("patient_id")
        .eq("is_active", true);

      const uniqueMealPatients = [...new Set((patientsWithPlans || []).map((p: any) => p.patient_id))];
      let pushCount = 0;
      for (const patientId of uniqueMealPatients.slice(0, 30)) {
        const { count } = await supabase
          .from("meals")
          .select("id", { count: "exact", head: true })
          .eq("user_id", patientId)
          .eq("meal_type", "lunch")
          .gte("logged_at", today);

        if ((count || 0) === 0) {
          pushCount += await sendRealPush(supabase, patientId, {
            title: "Hora do almoço! 🥗",
            body: "Registre sua refeição e ganhe pontos no ranking.",
            url: "/meals",
          });
        }
      }
      results.push(`meal_reminder: ${uniqueMealPatients.length}, ${pushCount} pushes`);
    }

    // 4. Weekly celebration (Sunday 10 AM)
    if (now.getDay() === 0 && hour >= 10 && hour < 11) {
      const { data: topPlayers } = await supabase
        .from("patient_ranking_cache")
        .select("patient_id, total_points, rank_position")
        .order("rank_position")
        .limit(10);

      let pushCount = 0;
      for (const player of topPlayers || []) {
        pushCount += await sendRealPush(supabase, player.patient_id, {
          title: `Parabéns! Você está em ${player.rank_position}º no ranking! 🏆`,
          body: `${player.total_points} pontos esta semana. Continue assim!`,
          url: "/ranking",
        });
      }
      results.push(`weekly_celebration: ${(topPlayers || []).length}, ${pushCount} pushes`);
    }

    // 5. Inactivity alert (3 days without activity)
    if (hour >= 10 && hour < 11) {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
      const { data: inactivePatients } = await supabase
        .from("player_stats")
        .select("user_id")
        .lt("last_login", threeDaysAgo);

      let pushCount = 0;
      for (const patient of (inactivePatients || []).slice(0, 20)) {
        pushCount += await sendRealPush(supabase, patient.user_id, {
          title: "Sentimos sua falta! 💚",
          body: "Que tal voltar e conferir suas novidades? Seus objetivos te esperam.",
          url: "/",
        });
      }
      results.push(`inactivity_alert: ${(inactivePatients || []).length}, ${pushCount} pushes`);
    }

    // ═══════════════════════════════════════════════════
    // 6. Workout plan expiry reminder (10-11 AM daily)
    // Notifies students whose workout plan expires within 5 days
    // ═══════════════════════════════════════════════════
    if (hour >= 10 && hour < 11) {
      const fiveDaysFromNow = new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0];
      const { data: expiringPlans } = await supabase
        .from("workout_plans")
        .select("id, title, student_id, personal_id, end_date")
        .eq("is_active", true)
        .not("end_date", "is", null)
        .lte("end_date", fiveDaysFromNow)
        .gte("end_date", today);

      let pushCount = 0;
      for (const plan of (expiringPlans || []).slice(0, 50)) {
        const daysLeft = Math.ceil((new Date(plan.end_date).getTime() - Date.now()) / 86400000);
        // Notify student
        pushCount += await sendRealPush(supabase, plan.student_id, {
          title: `Seu treino vence em ${daysLeft} dia(s)! 🏋️`,
          body: `O plano "${plan.title}" está próximo do vencimento. Fale com seu personal.`,
          url: "/workouts",
          tag: "workout-expiry",
        });
        // Notify personal trainer
        pushCount += await sendRealPush(supabase, plan.personal_id, {
          title: `Plano de treino vencendo! ⏰`,
          body: `O plano "${plan.title}" do aluno vence em ${daysLeft} dia(s).`,
          url: "/personal/workouts",
          tag: "workout-expiry-personal",
        });
      }
      results.push(`workout_expiry: ${(expiringPlans || []).length} plans, ${pushCount} pushes`);
    }

    // ═══════════════════════════════════════════════════
    // 7. Daily workout reminder (7-8 AM)
    // Reminds students who have active workout plans
    // ═══════════════════════════════════════════════════
    if (hour >= 7 && hour < 8) {
      const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
      const { data: activePlans } = await supabase
        .from("workout_plans")
        .select("student_id, title")
        .eq("is_active", true);

      const uniqueStudents = [...new Set((activePlans || []).map((p: any) => p.student_id))];
      let pushCount = 0;
      for (const studentId of uniqueStudents.slice(0, 50)) {
        pushCount += await sendRealPush(supabase, studentId, {
          title: "Hora do treino! 💪",
          body: "Seu plano de treino te espera. Bora treinar?",
          url: "/workouts",
          tag: "workout-daily",
        });
      }
      results.push(`workout_daily_reminder: ${uniqueStudents.length} students, ${pushCount} pushes`);
    }

    // ═══════════════════════════════════════════════════
    // 8. Workout feedback pending (8-9 PM)
    // Reminds students to give feedback after training
    // ═══════════════════════════════════════════════════
    if (hour >= 20 && hour < 21) {
      const { data: todayLogs } = await supabase
        .from("workout_logs")
        .select("student_id")
        .gte("completed_at", today)
        .is("effort_level", null);

      const uniquePending = [...new Set((todayLogs || []).map((l: any) => l.student_id))];
      let pushCount = 0;
      for (const studentId of uniquePending.slice(0, 30)) {
        pushCount += await sendRealPush(supabase, studentId, {
          title: "Como foi o treino? 📝",
          body: "Registre seu feedback para seu personal acompanhar sua evolução.",
          url: "/workouts",
          tag: "workout-feedback",
        });
      }
      results.push(`workout_feedback: ${uniquePending.length} students, ${pushCount} pushes`);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[SMART-PUSH] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
