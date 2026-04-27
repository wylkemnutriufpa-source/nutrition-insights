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
    const { data: invitation, error: fetchError } = await adminClient
      .from("invitations")
      .select(`*`)
      .eq("code", normalizedCode)
      .maybeSingle();

    if (fetchError) {
      console.error("[validate-invitation] Database error:", fetchError);
      throw new Error("ERRO_BANCO_DADOS");
    }

    if (!invitation) {
      // LOG FAILURE: Invalid code
      await logInvitation(adminClient, {
        event_type: "validation_failed",
        details: { code: normalizedCode, reason: "INVALID_CODE", origin },
        user_agent: userAgent
      });
      return new Response(JSON.stringify({ 
        success: false, 
        error_code: "INVALID_CODE",
        message: "Este link de convite é inválido ou não foi encontrado." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Busca dados do profissional e clínica em paralelo
    const [profileRes, clinicRes] = await Promise.all([
      adminClient.from("profiles").select("full_name, avatar_url").eq("user_id", invitation.professional_id).maybeSingle(),
      invitation.tenant_id ? adminClient.from("tenants").select("name").eq("id", invitation.tenant_id).maybeSingle() : Promise.resolve({ data: null })
    ]);

    invitation.professional = profileRes.data;
    invitation.clinic = clinicRes.data;

    // 3. Valida expiração
    const now = new Date();
    const expiresAt = invitation.expires_at ? new Date(invitation.expires_at) : null;
    if (expiresAt && now > expiresAt) {
      // LOG FAILURE: Expired
      await logInvitation(adminClient, {
        invitation_id: invitation.id,
        event_type: "validation_failed",
        details: { code: normalizedCode, reason: "EXPIRED", expires_at: invitation.expires_at, origin },
        user_agent: userAgent,
        professional_id: invitation.professional_id,
        patient_email: invitation.patient_email
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
        details: { code: normalizedCode, reason: "ALREADY_USED", used_at: invitation.used_at, origin },
        user_agent: userAgent,
        professional_id: invitation.professional_id,
        patient_email: invitation.patient_email
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
    await logInvitation(adminClient, {
      invitation_id: invitation.id,
      event_type: "viewed",
      details: { code: normalizedCode, origin },
      user_agent: userAgent,
      professional_id: invitation.professional_id,
      patient_email: invitation.patient_email
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