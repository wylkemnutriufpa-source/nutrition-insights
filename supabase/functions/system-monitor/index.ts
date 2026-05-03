/**
 * FitJourney — System Monitor (Deterministic Alerts)
 * 
 * Runs on schedule (cron) to analyze system health metrics
 * and generate real alerts when thresholds are breached.
 * 
 * NO AI. Pure deterministic monitoring.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertRule {
  id: string;
  name: string;
  query: (client: any, now: Date) => Promise<{ value: number; context?: Record<string, unknown> }>;
  threshold: number;
  comparison: "gt" | "gte" | "lt" | "lte";
  severity: "low" | "medium" | "high" | "critical";
  alertType: string;
  functionName: string;
  messageTemplate: (value: number) => string;
  cooldownMinutes: number;
}

const ALERT_RULES: AlertRule[] = [
  {
    id: "high_error_rate_1h",
    name: "Alta taxa de erros (1h)",
    query: async (client, now) => {
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const { count } = await client
        .from("system_error_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneHourAgo);
      return { value: count ?? 0 };
    },
    threshold: 50,
    comparison: "gt",
    severity: "critical",
    alertType: "high_error_rate",
    functionName: "system-monitor",
    messageTemplate: (v) => `${v} erros na última hora — investigar imediatamente`,
    cooldownMinutes: 30,
  },
  {
    id: "stuck_meal_plan_jobs",
    name: "Jobs de plano alimentar travados",
    query: async (client, now) => {
      const { data } = await client.rpc("check_job_anomalies");
      const stuckCount = data?.filter((a: any) => a.anomaly_type === 'stuck_job').length || 0;
      return { value: stuckCount };
    },
    threshold: 0,
    comparison: "gt",
    severity: "high",
    alertType: "stuck_job",
    functionName: "process-meal-plan-jobs",
    messageTemplate: (v) => `${v} jobs de plano alimentar estão travados em processamento`,
    cooldownMinutes: 15,
  },
  {
    id: "high_meal_plan_job_failure_rate",
    name: "Alta taxa de falha em jobs de plano",
    query: async (client, now) => {
      const { data } = await client.rpc("check_job_anomalies");
      const highFailure = data?.some((a: any) => a.anomaly_type === 'high_failure_rate');
      return { value: highFailure ? 1 : 0 };
    },
    threshold: 0,
    comparison: "gt",
    severity: "critical",
    alertType: "job_failure_rate_threshold",
    functionName: "process-meal-plan-jobs",
    messageTemplate: () => `Taxa de falha crítica nos jobs de plano alimentar ( > 20% na última hora)`,
    cooldownMinutes: 30,
  },
];

function breached(value: number, threshold: number, comparison: string): boolean {
  switch (comparison) {
    case "gt": return value > threshold;
    case "gte": return value >= threshold;
    case "lt": return value < threshold;
    case "lte": return value <= threshold;
    default: return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, serviceKey);
    const now = new Date();

    const results = [];
    let alertsCreated = 0;

    for (const rule of ALERT_RULES) {
      const { value, context } = await rule.query(client, now);
      const triggered = breached(value, rule.threshold, rule.comparison);

      if (triggered) {
        const cooldownCutoff = new Date(now.getTime() - rule.cooldownMinutes * 60 * 1000).toISOString();
        const { count: recentAlerts } = await client
          .from("system_alerts")
          .select("*", { count: "exact", head: true })
          .eq("alert_type", rule.alertType)
          .gte("created_at", cooldownCutoff);

        if ((recentAlerts ?? 0) === 0) {
          await client.from("system_alerts").insert({
            alert_type: rule.alertType,
            severity: rule.severity,
            function_name: rule.functionName,
            message: rule.messageTemplate(value),
            metadata: { ...context, value, threshold: rule.threshold },
          });
          alertsCreated++;
        }
      }
      results.push({ rule: rule.id, value, triggered });
    }

    return new Response(JSON.stringify({ success: true, alertsCreated, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
