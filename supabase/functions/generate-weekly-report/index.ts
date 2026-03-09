import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nutritionistId = userData.user.id;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoISO = weekAgo.toISOString();

    // Get nutritionist's patients
    const { data: patients } = await supabase
      .from("nutritionist_patients")
      .select("patient_id")
      .eq("nutritionist_id", nutritionistId)
      .eq("status", "active");

    const patientIds = patients?.map((p) => p.patient_id) || [];

    if (patientIds.length === 0) {
      return new Response(JSON.stringify({
        report: {
          weekStart: weekAgoISO,
          weekEnd: now.toISOString(),
          totalPatients: 0,
          activePatients: 0,
          mealsLogged: 0,
          checklistCompletion: 0,
          appointmentsScheduled: 0,
          appointmentsCompleted: 0,
          newFeedbacks: 0,
          topPerformers: [],
          needsAttention: [],
          highlights: ["Nenhum paciente ativo encontrado."],
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch aggregated data
    const [
      { count: mealsCount },
      { data: checklistData },
      { count: appointmentsScheduled },
      { data: completedAppointments },
      { count: feedbacksCount },
      { data: playerStats },
      { data: profiles },
    ] = await Promise.all([
      supabase.from("meals").select("id", { count: "exact", head: true })
        .in("user_id", patientIds).gte("created_at", weekAgoISO),
      supabase.from("checklist_tasks").select("patient_id, completed")
        .in("patient_id", patientIds).gte("created_at", weekAgoISO),
      supabase.from("patient_appointments").select("id", { count: "exact", head: true })
        .eq("nutritionist_id", nutritionistId).gte("appointment_date", weekAgoISO),
      supabase.from("patient_appointments").select("id")
        .eq("nutritionist_id", nutritionistId).eq("status", "completed")
        .gte("appointment_date", weekAgoISO),
      supabase.from("feedbacks").select("id", { count: "exact", head: true })
        .eq("nutritionist_id", nutritionistId).gte("created_at", weekAgoISO),
      supabase.from("player_stats").select("user_id, total_xp, current_streak, meals_logged")
        .in("user_id", patientIds),
      supabase.from("profiles").select("user_id, full_name")
        .in("user_id", patientIds),
    ]);

    // Calculate checklist completion rate
    const totalTasks = checklistData?.length || 0;
    const completedTasks = checklistData?.filter((t) => t.completed).length || 0;
    const checklistCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Find active patients (logged meals this week)
    const activePatientIds = new Set(
      (await supabase.from("meals").select("user_id").in("user_id", patientIds).gte("created_at", weekAgoISO))
        .data?.map((m) => m.user_id) || []
    );

    // Create profile map
    const profileMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);

    // Top performers (by XP or streak)
    const topPerformers = (playerStats || [])
      .sort((a, b) => (b.current_streak * 100 + b.total_xp) - (a.current_streak * 100 + a.total_xp))
      .slice(0, 3)
      .map((p) => ({
        id: p.user_id,
        name: profileMap.get(p.user_id) || "Paciente",
        streak: p.current_streak,
        xp: p.total_xp,
      }));

    // Needs attention (inactive this week, low streak)
    const needsAttention = (playerStats || [])
      .filter((p) => !activePatientIds.has(p.user_id) || p.current_streak < 3)
      .slice(0, 5)
      .map((p) => ({
        id: p.user_id,
        name: profileMap.get(p.user_id) || "Paciente",
        reason: !activePatientIds.has(p.user_id) ? "Inativo esta semana" : "Streak baixo",
      }));

    // Generate highlights
    const highlights: string[] = [];
    if (mealsCount && mealsCount > 0) highlights.push(`${mealsCount} refeições registradas esta semana`);
    if (checklistCompletion >= 80) highlights.push(`Excelente aderência ao checklist: ${checklistCompletion}%`);
    else if (checklistCompletion < 50) highlights.push(`Aderência ao checklist precisa de atenção: ${checklistCompletion}%`);
    if (topPerformers.length > 0) highlights.push(`Top performer: ${topPerformers[0].name} com ${topPerformers[0].streak} dias de streak`);
    if (needsAttention.length > 0) highlights.push(`${needsAttention.length} pacientes precisam de atenção`);

    const report = {
      weekStart: weekAgoISO,
      weekEnd: now.toISOString(),
      totalPatients: patientIds.length,
      activePatients: activePatientIds.size,
      mealsLogged: mealsCount || 0,
      checklistCompletion,
      appointmentsScheduled: appointmentsScheduled || 0,
      appointmentsCompleted: completedAppointments?.length || 0,
      newFeedbacks: feedbacksCount || 0,
      topPerformers,
      needsAttention,
      highlights,
    };

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weekly-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
