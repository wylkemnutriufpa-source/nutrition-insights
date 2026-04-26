import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { BASE_URL, logInvitation } from "../_shared/config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Gerador de código curto aleatório
function generateCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sem O, I, 0, 1 para evitar confusão
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Invalid session");

    // Rate limit: 20 convites por 15 min
    const rl = await checkRateLimit("create-invitation", caller.id, 20, 15);
    if (!rl.allowed) return rateLimitResponse();

    const body = await req.json();
    const { tenant_id } = body;
    const name = body.name || body.patient_name;
    const email = body.email || body.patient_email;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Bloqueio de duplicados: verifica se já existe um convite PENDENTE para este email e nutricionista nos últimos 5 minutos
    if (email) {
      const { data: existingPending } = await adminClient
        .from("invitations")
        .select("id, created_at")
        .eq("professional_id", caller.id)
        .eq("patient_email", email)
        .eq("status", "pending")
        .gt("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .maybeSingle();

      if (existingPending) {
        throw new Error("Já existe um convite pendente recente para este paciente. Aguarde alguns minutos ou use o link anterior.");
      }
    }

    // Tenta gerar um código único até 3 vezes
    let code = "";
    let isUnique = false;
    for (let i = 0; i < 3; i++) {
      code = generateCode();
      const { data: existing } = await adminClient
        .from("invitations")
        .select("id")
        .eq("code", code)
        .maybeSingle();
      if (!existing) {
        isUnique = true;
        break;
      }
    }

    if (!isUnique) throw new Error("Falha ao gerar código de convite único. Tente novamente.");

    const { data: invitation, error: insertError } = await adminClient
      .from("invitations")
      .insert({
        code,
        professional_id: caller.id,
        tenant_id: tenant_id || null,
        patient_name: name || null,
        patient_email: email || null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const host = req.headers.get("host") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const friendlyUrl = `${BASE_URL}/convite/${code}`;

    // Log da criação
    await logInvitation(adminClient, {
      invitation_id: invitation.id,
      event_type: "generated",
      details: { 
        name, 
        email, 
        tenant_id,
        host: host
      },
      domain_used: BASE_URL,
      user_agent: userAgent
    });

    return new Response(JSON.stringify({ 
      success: true, 
      code, 
      url: friendlyUrl 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("create-invitation error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
