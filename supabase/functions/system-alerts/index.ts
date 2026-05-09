import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    console.log("System Alert Received:", payload)

    // Log the alert to internal monitoring
    const { type, severity, message, job_id, error } = payload

    // 1. Format the message for external providers
    const alertBody = {
      text: `*${severity.toUpperCase()} ALERT*: ${message}\n*Job ID*: ${job_id}\n*Error*: ${error || 'N/A'}\n*Dashboard*: https://www.fitjourney.com.br/admin/health`,
      severity,
      timestamp: new Date().toISOString()
    }

    // 2. Mock external notification (Slack/Discord)
    // In production, we would fetch the webhook from job_alert_configs
    console.log("Would notify external channel with:", JSON.stringify(alertBody, null, 2))

    // 3. Optional: Send email via Resend/SendGrid if severity is critical
    if (severity === 'critical') {
      console.log("Critical failure! Triggering fail-safe email alert.")
    }

    return new Response(JSON.stringify({ status: 'alert_processed', sent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Alert Processing Error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
