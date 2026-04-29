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
    const { log } = await req.json()
    console.log("System Alert Received:", log)

    // TODO: Integrate with Discord/Slack/Email
    // Example: fetch(WEBHOOK_URL, { method: 'POST', body: JSON.stringify({ text: `[${log.severity}] ${log.message} at ${log.route}` }) })

    return new Response(JSON.stringify({ status: 'alert_processed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
