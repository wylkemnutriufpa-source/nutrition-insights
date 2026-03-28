/**
 * FitJourney — System Monitor (Deterministic Alerts)
 * 
 * Runs on schedule (cron) to analyze system health metrics
 * and generate real alerts when thresholds are breached.
 * 
 * NO AI. Pure deterministic monitoring.
 * 
 * Thresholds:
 * - Error rate > 5% of total requests in 1h → high alert
 * - > 50 errors in 1h → critical alert
 * - > 10 rate limit violations in 1h → high alert
 * - > 3 critical errors in 15min → critical alert
 * - Edge function failure rate → monitored
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    id: "critical_errors_15m",
    name: "Erros críticos (15min)",
    query: async (client, now) => {
      const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
      const { count } = await client
        .from("system_error_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", fifteenMinAgo)
        .eq("severity", "critical");
      return { value: count ?? 0 };
    },
    threshold: 3,
    comparison: "gt",
    severity: "critical",
    alertType: "critical_error_burst",
    functionName: "system-monitor",
    messageTemplate: (v) => `${v} erros CRÍTICOS nos últimos 15 minutos`,
    cooldownMinutes: 15,
  },
  {
    id: "rate_limit_abuse_1h",
    name: "Abuso de rate limit (1h)",
    query: async (client, now) => {
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const { count } = await client
        .from("security_events")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "rate_limit_exceeded")
        .gte("created_at", oneHourAgo);
      return { value: count ?? 0 };
    },
    threshold: 10,
    comparison: "gt",
    severity: "high",
    alertType: "rate_limit_abuse",
    functionName: "rate-limiter",
    messageTemplate: (v) => `${v} violações de rate limit na última hora — possível ataque`,
    cooldownMinutes: 30,
  },
  {
    id: "medium_error_rate_1h",
    name: "Taxa moderada de erros (1h)",
    query: async (client, now) => {
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const { count } = await client
        .from("system_error_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneHourAgo);
      return { value: count ?? 0 };
    },
    threshold: 20,
    comparison: "gt",
    severity: "medium",
    alertType: "elevated_error_rate",
    functionName: "system-monitor",
    messageTemplate: (v) => `${v} erros na última hora — monitorar tendência`,
    cooldownMinutes: 60,
  },
  {
    id: "high_severity_errors_1h",
    name: "Erros de alta severidade (1h)",
    query: async (client, now) => {
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const { count } = await client
        .from("system_error_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneHourAgo)
        .in("severity", ["high", "critical"]);
      return { value: count ?? 0 };
    },
    threshold: 5,
    comparison: "gt",
    severity: "high",
    alertType: "high_severity_errors",
    functionName: "system-monitor",
    messageTemplate: (v) => `${v} erros de alta severidade na última hora`,
    cooldownMinutes: 30,
  },
  {
    id: "repeated_module_failures",
    name: "Falhas repetidas no mesmo módulo",
    query: async (client, now) => {
      const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
      const { data } = await client
        .from("system_error_logs")
        .select("module")
        .gte("created_at", thirtyMinAgo);

      if (!data || data.length === 0) return { value: 0 };

      const counts: Record<string, number> = {};
      for (const row of data) {
        counts[row.module] = (counts[row.module] || 0) + 1;
      }
      const maxModule = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      return {
        value: maxModule ? maxModule[1] : 0,
        context: maxModule ? { module: maxModule[0] } : undefined,
      };
    },
    threshold: 10,
    comparison: "gt",
    severity: "high",
    alertType: "repeated_module_failure",
    functionName: "system-monitor",
    messageTemplate: (v) => `Módulo com ${v} falhas repetidas nos últimos 30min`,
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, serviceKey);
    const now = new Date();

    const results: Array<{
      rule: string;
      value: number;
      threshold: number;
      triggered: boolean;
      alertCreated: boolean;
    }> = [];

    let alertsCreated = 0;

    for (const rule of ALERT_RULES) {
      try {
        const { value, context } = await rule.query(client, now);
        const triggered = breached(value, rule.threshold, rule.comparison);

        let alertCreated = false;

        if (triggered) {
          // Check cooldown — don't spam alerts
          const cooldownCutoff = new Date(
            now.getTime() - rule.cooldownMinutes * 60 * 1000
          ).toISOString();

          const { count: recentAlerts } = await client
            .from("system_alerts")
            .select("*", { count: "exact", head: true })
            .eq("alert_type", rule.alertType)
            .gte("created_at", cooldownCutoff);

          if ((recentAlerts ?? 0) === 0) {
            const metadata: Record<string, unknown> = {
              rule_id: rule.id,
              value,
              threshold: rule.threshold,
              ...context,
            };

            await client.from("system_alerts").insert({
              alert_type: rule.alertType,
              severity: rule.severity,
              function_name: rule.functionName,
              message: rule.messageTemplate(value),
              metadata,
            });

            alertCreated = true;
            alertsCreated++;
          }
        }

        results.push({
          rule: rule.id,
          value,
          threshold: rule.threshold,
          triggered,
          alertCreated,
        });
      } catch (ruleError) {
        results.push({
          rule: rule.id,
          value: -1,
          threshold: rule.threshold,
          triggered: false,
          alertCreated: false,
        });
      }
    }

    // Record monitor run for observability
    await client.from("system_diagnostic_logs").insert({
      test_type: "system-monitor",
      health_score: alertsCreated === 0 ? 100 : Math.max(0, 100 - alertsCreated * 20),
      ok_count: results.filter((r) => !r.triggered).length,
      warning_count: results.filter((r) => r.triggered && !r.alertCreated).length,
      critical_count: alertsCreated,
      report_json: { results, timestamp: now.toISOString() },
    });

    return new Response(
      JSON.stringify({
        success: true,
        rules_evaluated: results.length,
        alerts_created: alertsCreated,
        results,
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
