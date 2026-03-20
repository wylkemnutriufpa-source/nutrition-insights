import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

/** Process a single patient import with retries */
async function importOnePatient(
  supabase: any,
  email: string,
  fullName: string,
  nutritionistId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Generate a cryptographically random password per patient
    const randomPassword = crypto.randomUUID() + crypto.randomUUID().slice(0, 8);

    // 1. Try RPC first (fastest path)
    const { data: patientUserId, error: rpcError } = await supabase.rpc(
      "create_patient_account",
      { _email: email, _full_name: fullName, _password: randomPassword }
    );

    let finalId = patientUserId;

    if (rpcError) {
      console.log(`[import] RPC failed for ${email}: ${rpcError.message}, trying admin API`);

      // 2. Check if user exists
      const { data: foundId } = await supabase.rpc("find_patient_by_email", { _email: email });

      if (foundId) {
        finalId = foundId;
      } else {
        // 3. Create via admin API with random password
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password: randomPassword,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });

        if (createError) {
          return { ok: false, error: `${email}: ${createError.message}` };
        }
        finalId = newUser.user.id;

        // Fix NULL tokens
        try { await supabase.rpc("fix_user_null_tokens" as any, { _user_id: finalId }); } catch (_) {}
      }

      // Ensure role
      await supabase
        .from("user_roles")
        .upsert({ user_id: finalId, role: "patient" }, { onConflict: "user_id,role" });

      // Ensure profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", finalId)
        .maybeSingle();

      if (!profile) {
        await supabase.from("profiles").insert({ user_id: finalId, full_name: fullName });
      }
    } else if (finalId) {
      // RPC succeeded — ensure role exists (belt & suspenders)
      await supabase
        .from("user_roles")
        .upsert({ user_id: finalId, role: "patient" }, { onConflict: "user_id,role" });

      // Set name if missing
      await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("user_id", finalId)
        .is("full_name", null);
    }

    if (!finalId) {
      return { ok: false, error: `${email}: ID não gerado` };
    }

    // Link to nutritionist
    await supabase.from("nutritionist_patients").upsert(
      { nutritionist_id: nutritionistId, patient_id: finalId, status: "active" },
      { onConflict: "nutritionist_id,patient_id" }
    );

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

    for (let i = 0; i < patients.length; i += PARALLEL) {
      const chunk = patients.slice(i, i + PARALLEL);

      const promises = chunk.map((p: any) => {
        const email = p.email?.trim()?.toLowerCase();
        const fullName = p.name?.trim();
        if (!email || !fullName) {
          results.skipped++;
          return Promise.resolve(null);
        }
        return importOnePatient(supabase, email, fullName, user.id);
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
