import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { logInvitation } from "../_shared/config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { code, correlationId } = body;
    const cid = correlationId || "no-cid";

    if (!code) {
      console.error(`[validate-invitation] [CID:${cid}] Código ausente`);
      throw new Error("CÓDIGO_AUSENTE");
    }

    const normalizedCode = code.trim().toUpperCase();
    const userAgent = req.headers.get("user-agent") || "unknown";
    const origin = req.headers.get("origin") || req.headers.get("referer") || "unknown";

    // 1. Busca o convite usando service_role (bypassing RLS)
    // Agora com a FK correta, podemos fazer o join direto com profiles e tenants
    const { data: invitation, error: fetchError } = await adminClient
      .from("invitations")
      .select(`
        *,
        professional:profiles!professional_id(user_id, full_name, avatar_url, phone),
        clinic:tenants(name)
      `)
      .ilike("code", normalizedCode) // ilike para ser case-insensitive por segurança
      .maybeSingle();

    if (!invitation) {
      // LOG FAILURE: Invalid code
      try {
        await adminClient.from("invitation_audits").insert({
          code: normalizedCode,
          status_code: 400,
          error_type: "INVALID_CODE",
          stage: "validation",
          user_agent: userAgent,
          metadata: { origin, cid }
        });
      } catch (logErr) { console.error("Error logging failure:", logErr); }

      await logInvitation(adminClient, {
      return new Response(JSON.stringify({ 
        success: false, 
        error_code: "INVALID_CODE",
        message: "Este link de convite é inválido ou não foi encontrado." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. Valida expiração
    const now = new Date();
    const expiresAt = invitation.expires_at ? new Date(invitation.expires_at) : null;
    if (expiresAt && now > expiresAt) {
      // LOG FAILURE: Expired
      await logInvitation(adminClient, {
        invitation_id: invitation.id,
        event_type: "validation_failed",
        details: { code: normalizedCode, reason: "EXPIRED", expires_at: invitation.expires_at, origin, cid },
        user_agent: userAgent,
        professional_id: invitation.professional_id,
        patient_email: invitation.patient_email,
        correlation_id: cid
      });
      return new Response(JSON.stringify({ 
        success: false, 
        error_code: "EXPIRED",
        message: "Este convite expirou. Por favor, solicite um novo link ao seu nutricionista.",
        invitation: { 
          professional: invitation.professional,
          clinic: invitation.clinic,
          professional_id: invitation.professional_id
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 4. Valida se já foi usado
    if (invitation.status === 'completed' || invitation.used_at) {
      // LOG FAILURE: Already used
      await logInvitation(adminClient, {
        invitation_id: invitation.id,
        event_type: "validation_failed",
        details: { code: normalizedCode, reason: "ALREADY_USED", used_at: invitation.used_at, origin, cid },
        user_agent: userAgent,
        professional_id: invitation.professional_id,
        patient_email: invitation.patient_email,
        correlation_id: cid
      });
      return new Response(JSON.stringify({ 
        success: false, 
        error_code: "ALREADY_USED",
        message: "Este convite já foi utilizado para concluir um cadastro anteriormente." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 5. Sucesso! Registra a visualização e retorna dados
    try {
      await adminClient.from("invitation_audits").insert({
        code: normalizedCode,
        professional_id: invitation.professional_id,
        status_code: 200,
        stage: "validation",
        user_agent: userAgent,
        metadata: { origin, cid }
      });
    } catch (logErr) { console.error("Error logging success:", logErr); }

    await logInvitation(adminClient, {
      invitation_id: invitation.id,
      event_type: "viewed",
      details: { code: normalizedCode, origin, cid },
      user_agent: userAgent,
      professional_id: invitation.professional_id,
      patient_email: invitation.patient_email,
      correlation_id: cid
    });

    if (invitation.status === 'pending') {
      await adminClient
        .from("invitations")
        .update({ status: 'viewed' })
        .eq("id", invitation.id);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      invitation 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("validate-invitation error:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro desconhecido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});