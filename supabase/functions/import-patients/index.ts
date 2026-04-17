import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const randomTemporaryPassword = () => {
  const seed = crypto.randomUUID().replace(/-/g, "");
  return `${seed.slice(0, 6)}Aa!${seed.slice(6, 12)}`;
};

async function ensurePatientBindingIntegrity(
  supabase: any,
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

  const { error: linkError } = await supabase
    .from("nutritionist_patients")
    .upsert(payload, { onConflict: "nutritionist_id,patient_id" });

  if (linkError) {
    throw new Error(`Falha ao vincular paciente: ${linkError.message}`);
  }

  const { data: confirmedLink, error: confirmError } = await supabase
    .from("nutritionist_patients")
    .select("id")
    .eq("nutritionist_id", nutritionistId)
    .eq("patient_id", patientId)
    .eq("status", "active")
    .maybeSingle();

  if (confirmError || !confirmedLink) {
    throw new Error("Vínculo do paciente não foi persistido com segurança");
  }

  const { data: activePipeline, error: pipelineLookupError } = await supabase
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
    const { error: pipelineCreateError } = await supabase
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

/** Process a single patient import via canonical RPC */
async function importOnePatient(
  supabase: any,
  email: string,
  fullName: string,
  nutritionistId: string,
  tenantId: string | null
): Promise<{ ok: boolean; error?: string }> {
  try {
    const standardPassword = randomTemporaryPassword();
    let finalId: string | null = null;

    // 1. Cria via admin API (substitui create_patient_account legada/bloqueada)
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: standardPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "patient" },
    });

    if (createErr) {
      const msg = createErr.message || "";
      const exists = msg.includes("already been registered") || (createErr as any).code === "email_exists";
      if (!exists) return { ok: false, error: `${email}: ${msg}` };

      const { data: foundId } = await supabase.rpc("find_patient_by_email", { _email: email });
      if (foundId) {
        finalId = foundId as string;
      } else {
        const { data: list } = await supabase.auth.admin.listUsers();
        const existing = list?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
        if (!existing) return { ok: false, error: `${email}: usuário existe mas não localizado` };
        finalId = existing.id;
      }
    } else {
      finalId = created.user.id;
      try { await supabase.rpc("fix_user_null_tokens" as any, { _user_id: finalId }); } catch (_) {}
    }

    if (!finalId) return { ok: false, error: `${email}: ID não gerado` };

    // 2. Função CANÔNICA — único caminho autorizado
    const { error: canonErr } = await supabase.rpc("create_patient_canonical", {
      _patient_id: finalId,
      _full_name: fullName,
      _email: email,
      _phone: null,
      _nutritionist_id: nutritionistId,
      _source: "import",
      _metadata: { batch_import: true },
    });

    if (canonErr) {
      console.error(`[import] canonical error for ${email}:`, canonErr);
      return { ok: false, error: `${email}: ${canonErr.message}` };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: `${email}: ${err.message}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Tenant resolver
    async function resolveTenantForUser(uid: string): Promise<string | null> {
      const { data } = await supabase.from("user_tenants").select("tenant_id").eq("user_id", uid).limit(1).maybeSingle();
      return data?.tenant_id || null;
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    // Role check
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const userRoles = roles?.map((r: any) => r.role) || [];
    if (!userRoles.includes("nutritionist") && !userRoles.includes("admin")) {
      return json({ error: "Forbidden" }, 403);
    }

    // Rate limit: 5 requests per 15 minutes
    const rl = await checkRateLimit("import-patients", user.id, 5, 15);
    if (!rl.allowed) return rateLimitResponse();

    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    console.log("[import-patients] mode:", body.mode, "patients count:", body.patients?.length, "emails count:", body.emails?.length);

    // ─── CHECK MODE ───
    if (body.mode === "check") {
      const emails: string[] = (body.emails || []).map((e: string) => e.trim().toLowerCase());
      if (emails.length === 0) return json({ existing: [] });

      const { data: existingUsers } = await supabase.rpc("find_existing_patient_emails", {
        _emails: emails,
        _nutritionist_id: user.id,
      });

      return json({ existing: existingUsers || [] });
    }

    // ─── IMPORT MODE ───
    const { patients } = body;

    if (!patients || !Array.isArray(patients) || patients.length === 0) {
      return json({ error: "Invalid patients data" }, 400);
    }

    // Process patients in parallel groups of 5 for speed + safety
    const PARALLEL = 5;
    const results = { created: 0, skipped: 0, errors: [] as string[] };
    const callerTenant = await resolveTenantForUser(user.id);

    for (let i = 0; i < patients.length; i += PARALLEL) {
      const chunk = patients.slice(i, i + PARALLEL);

      const promises = chunk.map((p: any) => {
        const email = p.email?.trim()?.toLowerCase();
        const fullName = p.name?.trim();
        if (!email || !fullName) {
          results.skipped++;
          return Promise.resolve(null);
        }
        return importOnePatient(supabase, email, fullName, user.id, callerTenant);
      });

      const chunkResults = await Promise.all(promises);

      for (const r of chunkResults) {
        if (!r) continue; // skipped
        if (r.ok) results.created++;
        else if (r.error) results.errors.push(r.error);
      }
    }

    // Fix any remaining NULL tokens (fast, idempotent)
    try { await supabase.rpc("fix_all_null_tokens" as any); } catch (_) {}

    console.log("[import-patients] done:", JSON.stringify(results));

    return json(results);
  } catch (err: any) {
    console.error("[import-patients] fatal:", err.message);
    return json({ error: err.message }, 500);
  }
});
