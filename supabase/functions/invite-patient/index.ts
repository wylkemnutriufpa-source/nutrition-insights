import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { BASE_URL, isValidDomain, unauthorizedDomainResponse, logInvitation } from "../_shared/config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function ensurePatientBindingIntegrity(
  adminClient: any,
  patientId: string,
  nutritionistId: string,
  tenantId: string | null,
) {
  const payload = {
    nutritionist_id: nutritionistId,
    patient_id: patientId,
    status: "active",
    journey_status: "awaiting_payment",
    tenant_id: tenantId,
  };

  const { error: linkError } = await adminClient
    .from("nutritionist_patients")
    .upsert(payload, { onConflict: "nutritionist_id,patient_id" });

  if (linkError) {
    throw new Error(`Falha ao vincular paciente: ${linkError.message}`);
  }

  const { data: confirmedLink, error: confirmError } = await adminClient
    .from("nutritionist_patients")
    .select("id")
    .eq("nutritionist_id", nutritionistId)
    .eq("patient_id", patientId)
    .eq("status", "active")
    .maybeSingle();

  if (confirmError || !confirmedLink) {
    throw new Error("Vínculo do paciente não foi persistido com segurança");
  }

  const { data: activePipeline, error: pipelineLookupError } = await adminClient
    .from("onboarding_pipelines")
    .select("id")
    .eq("patient_id", patientId)
    .not("status", "in", '("completed","archived","superseded_by_active_plan","superseded_by_published_plan","rejected","superseded_by_reset")')
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pipelineLookupError) {
    throw new Error(`Falha ao verificar pipeline: ${pipelineLookupError.message}`);
  }

  if (!activePipeline) {
    const { error: pipelineCreateError } = await adminClient
      .from("onboarding_pipelines")
      .insert({
        patient_id: patientId,
        nutritionist_id: nutritionistId,
        status: "pending_anamnesis",
        release_status: "awaiting_release",
      });

    if (pipelineCreateError) {
      throw new Error(`Falha ao criar pipeline de onboarding: ${pipelineCreateError.message}`);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  async function resolveTenantForUser(sb: any, uid: string): Promise<string | null> {
    const { data } = await sb.from("user_tenants").select("tenant_id").eq("user_id", uid).limit(1).maybeSingle();
    return data?.tenant_id || null;
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Invalid session");

    // Rate limit: 10 requests per 15 minutes
    const rl = await checkRateLimit("invite-patient", caller.id, 10, 15);
    if (!rl.allowed) return rateLimitResponse();

    // Verify caller is a professional
    const { data: callerRoles } = await callerClient.from("user_roles").select("role").eq("user_id", caller.id);
    const isPro = callerRoles?.some((r: any) => ["nutritionist", "personal", "admin"].includes(r.role));
    if (!isPro) throw new Error("Only professionals can invite patients");

    const { name, email, phone, method, password } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!name || !normalizedEmail) throw new Error("Name and email required");

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let patientId: string;

    // Try to create user first
    const finalPassword = method === "password" && password
      ? password
      : "Fit@2026!";

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: finalPassword,
      email_confirm: true,
      user_metadata: { full_name: name, role: "patient" },
    });

    if (createError) {
      // If user already exists, find them and link
      if (createError.message?.includes("already been registered") || (createError as any).code === "email_exists") {
        console.log(`[invite-patient] User already exists, linking...`);
        
        // Find user by email using admin API
        const { data: userList } = await adminClient.auth.admin.listUsers({ perPage: 1, page: 1 });
        // listUsers doesn't filter by email, use RPC instead
        const { data: foundId } = await adminClient.rpc("find_patient_by_email", { _email: normalizedEmail });
        
        if (foundId) {
          patientId = foundId;
        } else {
          // User exists in auth but not found via RPC - try getUserByEmail approach
          // Search through admin API
          const { data: { users } } = await adminClient.auth.admin.listUsers();
          const existingUser = users?.find((u: any) => u.email?.toLowerCase() === normalizedEmail);
          if (!existingUser) throw new Error("Usuário existe mas não foi possível localizar. Tente via importação.");
          patientId = existingUser.id;
        }

        // If password method, update the password
        if (method === "password" && password) {
          await adminClient.auth.admin.updateUserById(patientId, { password });
        }
      } else {
        throw createError;
      }
    } else {
      patientId = newUser.user.id;
    }

    // ─── ROTA CANÔNICA: substitui upserts manuais (profile/role/tenant/vínculo/pipeline/lifecycle/log) ───
    const callerTenantLink = await resolveTenantForUser(adminClient, caller.id);
    const { error: canonErr } = await adminClient.rpc("create_patient_canonical" as any, {
      _patient_id: patientId,
      _full_name: name,
      _email: normalizedEmail,
      _phone: phone || null,
      _nutritionist_id: caller.id,
      _source: "invite",
      _metadata: { method: method || "password", invited_by: caller.id },
    });
    if (canonErr) {
      console.error("[invite-patient] canonical error:", canonErr);
      throw new Error(`Falha na canônica: ${canonErr.message}`);
    }

    // Notificação para o paciente
    await adminClient.from("notifications").insert({
      user_id: patientId,
      title: "Bem-vindo ao FitJourney! 🎉",
      message: `Seu acesso foi criado por ${name ? "seu nutricionista" : "um profissional"}. Aguarde a confirmação do pagamento para iniciar seu acompanhamento.`,
      type: "info",
      target_route: "/patient-dashboard",
      tenant_id: callerTenantLink,
    });

    const host = req.headers.get("host") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Magic link opcional
    if (method === "magic_link") {
      try {
        const redirectTo = BASE_URL;
        if (!isValidDomain(redirectTo)) {
          console.error(`[invite-patient] Tentativa de usar domínio inválido: ${redirectTo}`);
        }

        await adminClient.auth.admin.generateLink({
          type: "magiclink",
          email: normalizedEmail,
          options: { redirectTo },
        });

        // Log da geração do convite/link
        await logInvitation(adminClient, {
          event_type: "generated",
          details: { 
            patient_id: patientId, 
            method: "magic_link", 
            invited_by: caller.id,
            email: normalizedEmail,
            host: host
          },
          domain_used: redirectTo,
          user_agent: userAgent
        });
      } catch (e) {
        console.log("[invite-patient] Magic link generation failed, patient can use forgot password:", e);
      }
    } else {
      // Log para método de senha também
      await logInvitation(adminClient, {
        event_type: "generated",
        details: { 
          patient_id: patientId, 
          method: "password", 
          invited_by: caller.id,
          email: normalizedEmail,
          host: host
        },
        user_agent: userAgent
      });
    }

    return new Response(JSON.stringify({ success: true, patient_id: patientId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("invite-patient error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
