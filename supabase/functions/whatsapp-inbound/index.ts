import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    console.log("WhatsApp inbound webhook received:", JSON.stringify(body));

    // Z-API webhook payload structure
    const phone = body?.phone || body?.from || body?.sender || null;
    const messageText = body?.text?.message || body?.message?.text || body?.body || null;
    const instanceId = body?.instanceId || null;

    if (!phone || !messageText) {
      console.log("Ignoring non-text or empty message");
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, "");

    // Find professional by instance_id or by matching patient phone
    let professionalId: string | null = null;
    let patientId: string | null = null;

    if (instanceId) {
      const { data: integration } = await supabase
        .from("whatsapp_integrations")
        .select("professional_id")
        .eq("instance_id", instanceId)
        .eq("is_active", true)
        .maybeSingle();
      if (integration) {
        professionalId = integration.professional_id;
      }
    }

    // Try to find patient by phone number
    const phoneSuffix = cleanPhone.length > 10 ? cleanPhone.slice(-11) : cleanPhone;
    const { data: patientMatch } = await supabase
      .from("profiles")
      .select("id")
      .or(`phone.ilike.%${phoneSuffix}`)
      .limit(1)
      .maybeSingle();

    if (patientMatch) {
      patientId = patientMatch.id;

      // If we didn't find professional via instance, find via nutritionist_patients
      if (!professionalId) {
        const { data: link } = await supabase
          .from("nutritionist_patients")
          .select("nutritionist_id")
          .eq("patient_id", patientId)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();
        if (link) {
          professionalId = link.nutritionist_id;
        }
      }
    }

    // Save inbound message
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

    if (insertErr) {
      console.error("Error saving inbound message:", insertErr);
    }

    // Log in whatsapp_logs too for audit
    if (professionalId) {
      await supabase.from("whatsapp_logs").insert({
        professional_id: professionalId,
        patient_id: patientId,
        event_type: "INBOUND",
        message_body: messageText.substring(0, 500),
        delivery_status: "received",
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Inbound webhook error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
