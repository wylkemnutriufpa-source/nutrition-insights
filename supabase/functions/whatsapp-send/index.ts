import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendRequest {
  patient_phone: string;
  message: string;
  event_type: string;
  patient_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SendRequest = await req.json();
    const { patient_phone, message, event_type, patient_id } = body;

    if (!patient_phone || !message || !event_type) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: patient_phone, message, event_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get professional's Z-API integration
    const { data: integration, error: intErr } = await supabase
      .from("whatsapp_integrations")
      .select("*")
      .eq("professional_id", user.id)
      .eq("is_active", true)
      .single();

    if (intErr || !integration) {
      return new Response(JSON.stringify({ error: "WhatsApp não conectado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Anti-spam: check messages sent today to this patient
    if (patient_id) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("whatsapp_logs")
        .select("*", { count: "exact", head: true })
        .eq("professional_id", user.id)
        .eq("patient_id", patient_id)
        .eq("delivery_status", "sent")
        .gte("sent_at", todayStart.toISOString());

      if ((count ?? 0) >= 3) {
        return new Response(JSON.stringify({ error: "Limite diário atingido (3 msgs/dia por paciente)" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check sending hours (8h-21h BRT)
    const now = new Date();
    const brtHour = (now.getUTCHours() - 3 + 24) % 24;
    if (brtHour < 8 || brtHour >= 21) {
      // Queue for later - just log as pending
      await supabase.from("whatsapp_logs").insert({
        professional_id: user.id,
        patient_id: patient_id || null,
        event_type,
        message_body: message,
        delivery_status: "queued",
      });

      return new Response(JSON.stringify({ success: true, status: "queued", reason: "Fora do horário de envio (8h-21h)" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean phone number
    const cleanPhone = patient_phone.replace(/\D/g, "");
    const phone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

    // Retrieve token from Vault
    const { data: vaultToken } = await supabase.rpc("get_whatsapp_token", { _professional_id: user.id });
    if (!vaultToken) {
      return new Response(JSON.stringify({ error: "Token WhatsApp não configurado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via Z-API
    const zapiUrl = `https://api.z-api.io/instances/${integration.instance_id}/token/${vaultToken}/send-text`;

    const zapiResponse = await fetch(zapiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });

    const zapiData = await zapiResponse.json();

    if (!zapiResponse.ok) {
      // Log error
      await supabase.from("whatsapp_logs").insert({
        professional_id: user.id,
        patient_id: patient_id || null,
        event_type,
        message_body: message,
        delivery_status: "error",
        error_message: JSON.stringify(zapiData),
      });

      return new Response(JSON.stringify({ error: "Falha ao enviar via Z-API", details: zapiData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log success
    await supabase.from("whatsapp_logs").insert({
      professional_id: user.id,
      patient_id: patient_id || null,
      event_type,
      message_body: message,
      delivery_status: "sent",
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, status: "sent" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
