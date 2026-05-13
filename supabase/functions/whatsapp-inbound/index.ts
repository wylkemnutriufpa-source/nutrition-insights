import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

// HMAC-SHA256 hex
async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sharedSecret = Deno.env.get("WHATSAPP_WEBHOOK_SECRET");
    if (!sharedSecret) {
      console.error("[whatsapp-inbound] WHATSAPP_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();

    // Accept either an HMAC signature header (x-webhook-signature) OR a plain shared-secret header.
    const sigHeader = req.headers.get("x-webhook-signature");
    const sharedHeader = req.headers.get("x-webhook-secret");

    let authorized = false;
    if (sigHeader) {
      const expected = await hmacHex(sharedSecret, rawBody);
      authorized = constantTimeEqual(sigHeader.replace(/^sha256=/, ""), expected);
    } else if (sharedHeader && constantTimeEqual(sharedHeader, sharedSecret)) {
      authorized = true;
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = JSON.parse(rawBody || "{}");

    const phone = body?.phone || body?.from || body?.sender || null;
    const messageText = body?.text?.message || body?.message?.text || body?.body || null;
    const instanceId = body?.instanceId || null;

    if (!phone || !messageText) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanPhone = String(phone).replace(/\D/g, "");

    let professionalId: string | null = null;
    let patientId: string | null = null;

    if (instanceId) {
      const { data: integration } = await supabase
        .from("whatsapp_integrations")
        .select("professional_id")
        .eq("instance_id", instanceId)
        .eq("is_active", true)
        .maybeSingle();
      if (integration) professionalId = integration.professional_id;
    }

    const phoneSuffix = cleanPhone.length > 10 ? cleanPhone.slice(-11) : cleanPhone;
    const { data: patientMatch } = await supabase
      .from("profiles")
      .select("id")
      .or(`phone.ilike.%${phoneSuffix}`)
      .limit(1)
      .maybeSingle();

    if (patientMatch) {
      patientId = patientMatch.id;
      if (!professionalId) {
        const { data: link } = await supabase
          .from("nutritionist_patients")
          .select("nutritionist_id")
          .eq("patient_id", patientId)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();
        if (link) professionalId = link.nutritionist_id;
      }
    }

    const { error: insertErr } = await supabase
      .from("whatsapp_inbound_messages")
      .insert({
        patient_id: patientId,
        professional_id: professionalId,
        phone_number: cleanPhone,
        message_text: messageText,
        interpreted_intent: null,
        confidence_score: null,
        processed: false,
      });

    if (insertErr) console.error("Error saving inbound message:", insertErr.message);

    if (professionalId) {
      await supabase.from("whatsapp_logs").insert({
        professional_id: professionalId,
        patient_id: patientId,
        event_type: "INBOUND",
        message_body: String(messageText).substring(0, 500),
        delivery_status: "received",
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Inbound webhook error:", error instanceof Error ? error.message : "unknown");
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
