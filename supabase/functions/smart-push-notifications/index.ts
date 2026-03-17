import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC_KEY = "BEvGFMB5dpy0wBBOKQhwOY_duamSBsGsu0CTVhu9W6IoEzmxI2BFbZR8c0Q6T5wEwiqT7kHdKwXNSiUlYYQ745s";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = "mailto:contato@fitjourney.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

async function sendRealPush(
  supabase: any,
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string }
) {
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

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[SMART-PUSH] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
