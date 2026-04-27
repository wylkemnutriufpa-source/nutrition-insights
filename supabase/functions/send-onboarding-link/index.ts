// Edge function: send-onboarding-link
// Reenvia/gera link de onboarding (magic link) para o paciente, redirecionando para /onboarding.
// Único caminho oficial do fluxo: paciente loga e cai direto na pipeline de onboarding.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { BASE_URL, isValidDomain, logInvitation } from "../_shared/config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Rate limit: 20 envios por 15 min por profissional
    const rl = await checkRateLimit("send-onboarding-link", caller.id, 20, 15);
    if (!rl.allowed) return rateLimitResponse();

    // Caller deve ser profissional/admin
    const { data: callerRoles } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    const isPro = callerRoles?.some((r: any) =>
      ["nutritionist", "personal", "admin"].includes(r.role),
    );
    if (!isPro) throw new Error("Only professionals can send onboarding links");

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const patientId = body?.patient_id ? String(body.patient_id) : null;
    if (!email) throw new Error("email required");

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verifica vínculo entre profissional e paciente
    if (patientId) {
      const { data: link } = await adminClient
        .from("nutritionist_patients")
        .select("id")
        .eq("nutritionist_id", caller.id)
        .eq("patient_id", patientId)
        .eq("status", "active")
        .maybeSingle();
      if (!link) throw new Error("Patient is not linked to this professional");
    }

    const origin = BASE_URL;
    const redirectTo = `${origin}/~oauth/auth/confirm?type=magiclink&next=/onboarding`;

    if (!isValidDomain(redirectTo)) {
      throw new Error(`Domínio de redirecionamento inválido: ${redirectTo}`);
    }

    // Envia magic link real por email. `generateLink` apenas gera a URL e não entrega email.
    const emailClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: otpErr } = await emailClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: false,
      },
    });
    if (otpErr) throw otpErr;

    // Log do envio do link
    await logInvitation(adminClient, {
      event_type: "generated",
      details: { 
        patient_id: patientId, 
        action: "send-onboarding-link",
        email 
      },
      domain_used: origin
    });

    // Notificação in-app caso o paciente já tenha conta
    if (patientId) {
      await adminClient.from("notifications").insert({
        user_id: patientId,
        title: "📩 Link de onboarding enviado",
        message:
          "Seu profissional reenviou o link para preencher o onboarding. Verifique seu email.",
        type: "info",
        target_route: "/onboarding",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        action_link: null,
        email_sent: true,
        delivered_to: email,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("send-onboarding-link error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
