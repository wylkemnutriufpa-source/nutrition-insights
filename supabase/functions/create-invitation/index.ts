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
    const { tenant_id, old_code } = body;
    const name = body.name || body.patient_name;
    const email = body.email || body.patient_email;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Se um código antigo foi passado, valida se o solicitante é o dono original
    if (old_code) {
      const { data: oldInvitation } = await adminClient
        .from("invitations")
        .select("professional_id")
        .eq("code", old_code)
        .maybeSingle();
      
      if (oldInvitation && oldInvitation.professional_id !== caller.id) {
        throw new Error("Você não tem permissão para gerar um novo convite a partir deste link.");
      }
    }

    // Reuso de convite: Verifica se já existe um convite GERAL (sem nome/email) ativo para este nutricionista
    // Convites gerais NÃO expiram automaticamente — só são invalidados quando usados (used_at definido).
    if (!name && !email) {
      const { data: existingGeneral } = await adminClient
        .from("invitations")
        .select("id, code, created_at, expires_at")
        .eq("professional_id", caller.id)
        .is("patient_name", null)
        .is("patient_email", null)
        .in("status", ["pending", "viewed"])
        .is("used_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingGeneral) {
        const browserOrigin = req.headers.get("origin");
        const referer = req.headers.get("referer");
        let origin = "https://www.fitjourney.com.br";
        if (browserOrigin && !browserOrigin.includes("supabase")) {
          origin = browserOrigin;
        } else if (referer) {
          try { origin = new URL(referer).origin; } catch { }
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          code: existingGeneral.code, 
          url: `${origin}/convite/${existingGeneral.code}`,
          reused: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Bloqueio de duplicados para convites específicos: verifica se já existe um convite PENDENTE para este email e nutricionista nos últimos 5 minutos
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

    // Para convites GERAIS (sem nome/email): nunca expiram automaticamente.
    // Só são invalidados quando o paciente FINALIZA o cadastro (used_at).
    // Para convites ESPECÍFICOS (com email): expiram em 30 dias para evitar acúmulo indefinido.
    const isGeneralInvite = !name && !email;
    const expiresAt = isGeneralInvite
      ? null
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: invitation, error: insertError } = await adminClient
      .from("invitations")
      .insert({
        code,
        professional_id: caller.id,
        tenant_id: tenant_id || null,
        patient_name: name || null,
        patient_email: email || null,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Usa origin/referer do navegador (não o host do edge runtime).
    // Fallback: domínio oficial de produção.
    const browserOrigin = req.headers.get("origin");
    const referer = req.headers.get("referer");
    let origin = "https://www.fitjourney.com.br";
    if (browserOrigin && !browserOrigin.includes("supabase")) {
      origin = browserOrigin;
    } else if (referer) {
      try {
        origin = new URL(referer).origin;
      } catch { /* keep fallback */ }
    }
    const friendlyUrl = `${origin}/convite/${code}`;
    const userAgent = req.headers.get("user-agent") || "unknown";
    const host = req.headers.get("host") || "unknown";

    // Log da criação
    await logInvitation(adminClient, {
      invitation_id: invitation.id,
      event_type: "generated",
      details: { 
        name, 
        email, 
        tenant_id,
        host
      },
      domain_used: origin,
      user_agent: userAgent,
      professional_id: caller.id,
      patient_email: email || null
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
