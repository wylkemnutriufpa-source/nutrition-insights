import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireCronOrAdmin } from "../_shared/cron-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  
  try { await requireCronOrAdmin(req); } catch (r) { if (r instanceof Response) return r; throw r; }
try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // 1. Aggregate checklist_tasks for today
    const { data: tasks } = await client
      .from("checklist_tasks")
      .select("patient_id, completed")
      .eq("date", today);

    if (tasks && tasks.length > 0) {
      const grouped: Record<string, { total: number; completed: number }> = {};
      for (const t of tasks) {
        if (!grouped[t.patient_id]) grouped[t.patient_id] = { total: 0, completed: 0 };
        grouped[t.patient_id].total++;
        if (t.completed) grouped[t.patient_id].completed++;
      }

      for (const [patientId, stats] of Object.entries(grouped)) {
        const rate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
        await client.from("checklist_daily_summary").upsert({
          patient_id: patientId,
          summary_date: today,
          total_tasks: stats.total,
          completed_tasks: stats.completed,
          completion_rate: Math.round(rate * 100) / 100,
        }, { onConflict: "patient_id,summary_date" });
      }
    }

    // 2. Cleanup old logs (>90 days)
    const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const cleanupResults: Record<string, number> = {};

    const tables = [
      "system_error_logs",
      "system_diagnostic_logs",
      "edge_function_rate_limits",
      "security_events",
    ];

    for (const table of tables) {
      const { count } = await client
        .from(table)
        .delete({ count: "exact" })
        .lt("created_at", cutoff);
      cleanupResults[table] = count ?? 0;
    }

    // 3. Check for alert conditions
    const alerts: Array<{ alert_type: string; severity: string; function_name: string; message: string }> = [];

    // Check error rate in last hour
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const { count: recentErrors } = await client
      .from("system_error_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneHourAgo);

    if ((recentErrors ?? 0) > 50) {
      alerts.push({
        alert_type: "high_error_rate",
        severity: "critical",
        function_name: "system",
        message: `${recentErrors} erros na última hora — verificar sistema`,
      });
    }

    // Check rate limit violations in last hour
    const { count: rateLimitViolations } = await client
      .from("security_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "rate_limit_exceeded")
      .gte("created_at", oneHourAgo);

    if ((rateLimitViolations ?? 0) > 10) {
      alerts.push({
        alert_type: "rate_limit_abuse",
        severity: "high",
        function_name: "rate-limit",
        message: `${rateLimitViolations} violações de rate limit na última hora`,
      });
    }

    // Insert alerts
    if (alerts.length > 0) {
      await client.from("system_alerts").insert(alerts);
    }

    return new Response(
      JSON.stringify({
        success: true,
        aggregated_patients: tasks ? Object.keys(tasks.reduce((acc: any, t: any) => { acc[t.patient_id] = true; return acc; }, {})).length : 0,
        cleanup: cleanupResults,
        alerts_generated: alerts.length,
        timestamp: now.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
