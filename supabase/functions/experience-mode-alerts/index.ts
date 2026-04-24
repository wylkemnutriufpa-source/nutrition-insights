/**
 * experience-mode-alerts
 * Checks recent failures in experience_mode_audit_log and sends an alert
 * (email + Slack) when failed/blocked attempts exceed a configurable threshold
 * within a sliding window. The alert payload always includes the offending
 * correlation_ids so the operator can trace each attempt end-to-end.
 *
 * Designed to be invoked manually OR by a scheduled cron job.
 *
 * Env vars expected:
 *   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected)
 *   - SLACK_WEBHOOK_URL              (optional)
 *   - ALERT_EMAIL_TO                 (optional — uses Lovable email infra)
 *   - EXP_MODE_ALERT_THRESHOLD       (default: 5)
 *   - EXP_MODE_ALERT_WINDOW_MINUTES  (default: 15)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL");
    const ALERT_EMAIL_TO = Deno.env.get("ALERT_EMAIL_TO");
    const threshold = parseInt(Deno.env.get("EXP_MODE_ALERT_THRESHOLD") || "5", 10);
    const windowMinutes = parseInt(
      Deno.env.get("EXP_MODE_ALERT_WINDOW_MINUTES") || "15",
      10
    );

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
    const { data: rows, error } = await supabase
      .from("experience_mode_audit_log")
      .select("correlation_id, user_id, attempted_mode, outcome, reason, error_code, created_at")
      .in("outcome", ["failed", "blocked", "queue_overflow", "queue_expired"])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const failures = rows || [];
    const triggered = failures.length >= threshold;

    if (!triggered) {
      return new Response(
        JSON.stringify({ ok: true, triggered: false, count: failures.length, threshold, windowMinutes }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const correlationIds = failures.map((r: any) => r.correlation_id).filter(Boolean);
    const summary = {
      window_minutes: windowMinutes,
      threshold,
      count: failures.length,
      by_outcome: failures.reduce((acc: Record<string, number>, r: any) => {
        acc[r.outcome] = (acc[r.outcome] || 0) + 1;
        return acc;
      }, {}),
      correlation_ids: correlationIds.slice(0, 50),
      sample: failures.slice(0, 10),
    };

    // Slack
    let slackResult: any = null;
    if (SLACK_WEBHOOK_URL) {
      const text =
        `:rotating_light: *ExperienceMode alert* — ${failures.length} falhas nos últimos ${windowMinutes}min ` +
        `(threshold ${threshold}).\n` +
        Object.entries(summary.by_outcome)
          .map(([k, v]) => `• ${k}: ${v}`)
          .join("\n") +
        `\nCorrelation IDs: ${correlationIds.slice(0, 20).join(", ")}`;
      const slackRes = await fetch(SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      slackResult = { status: slackRes.status, ok: slackRes.ok };
    }

    // Email via internal queue (best-effort)
    let emailResult: any = null;
    if (ALERT_EMAIL_TO) {
      try {
        const { error: enqueueErr } = await supabase.rpc("enqueue_email", {
          p_template_name: "experience_mode_alert",
          p_recipient_email: ALERT_EMAIL_TO,
          p_payload: {
            subject: `[ExperienceMode] ${failures.length} falhas em ${windowMinutes}min`,
            html: `<h2>Alerta de falhas no Experience Mode</h2>
              <p>${failures.length} falhas detectadas (threshold ${threshold}).</p>
              <ul>${Object.entries(summary.by_outcome)
                .map(([k, v]) => `<li><strong>${k}</strong>: ${v}</li>`)
                .join("")}</ul>
              <p><strong>Correlation IDs:</strong></p>
              <pre style="font-size:11px">${correlationIds.slice(0, 50).join("\n")}</pre>`,
          },
          p_priority: "normal",
          p_purpose: "transactional",
        });
        emailResult = { enqueued: !enqueueErr, error: enqueueErr?.message };
      } catch (err: any) {
        emailResult = { enqueued: false, error: err?.message };
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        triggered: true,
        summary,
        slack: slackResult,
        email: emailResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
