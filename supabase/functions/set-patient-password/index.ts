// Edge function: set-patient-password
// Allows a linked professional to set a new password for one of their patients.
// All operations are audited via patient_password_resets.
// CORS-enabled. JWT validated in code.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  patient_id?: string;
  new_password?: string;
  reason?: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "missing_authorization" }, 401);
    }

    // Validate caller using anon client + JWT
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user: caller }, error: callerErr } =
      await callerClient.auth.getUser();
    if (callerErr || !caller) {
      return jsonResponse({ error: "invalid_session" }, 401);
    }

    // Parse + validate body
    let body: RequestBody;
    try {
      body = (await req.json()) as RequestBody;
    } catch {
      return jsonResponse({ error: "invalid_json" }, 400);
    }
    const { patient_id, new_password, reason } = body || {};
    if (!patient_id || typeof patient_id !== "string") {
      return jsonResponse({ error: "patient_id_required" }, 400);
    }
    if (!new_password || typeof new_password !== "string" ||
        new_password.length < 6) {
      return jsonResponse(
        { error: "password_too_short", message: "Mínimo 6 caracteres" },
        400,
      );
    }
    if (new_password.length > 200) {
      return jsonResponse({ error: "password_too_long" }, 400);
    }

    // Service-role client for admin operations + audit insert
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Verify professional <-> patient linkage
    const { data: linkRow, error: linkErr } = await admin
      .from("nutritionist_patients")
      .select("id")
      .eq("nutritionist_id", caller.id)
      .eq("patient_id", patient_id)
      .maybeSingle();

    if (linkErr) {
      console.error("link_lookup_error", linkErr);
      return jsonResponse({ error: "link_lookup_failed" }, 500);
    }
    if (!linkRow) {
      return jsonResponse(
        { error: "professional_not_linked_to_patient" },
        403,
      );
    }

    // Update password via auth admin API
    const { error: updateErr } = await admin.auth.admin.updateUserById(
      patient_id,
      { password: new_password },
    );
    if (updateErr) {
      console.error("password_update_failed", updateErr);
      return jsonResponse(
        { error: "password_update_failed", message: updateErr.message },
        500,
      );
    }

    // Audit trail
    const ipAddress = req.headers.get("x-forwarded-for") ??
      req.headers.get("cf-connecting-ip") ?? null;
    const userAgent = req.headers.get("user-agent") ?? null;

    const { error: auditErr } = await admin
      .from("patient_password_resets")
      .insert({
        patient_id,
        professional_id: caller.id,
        reason: reason ?? null,
        ip_address: ipAddress,
        user_agent: userAgent,
        reset_method: "manual_set_by_professional",
      });

    if (auditErr) {
      // Don't fail the operation if audit fails — but log it
      console.error("audit_insert_failed", auditErr);
    }

    return jsonResponse({
      ok: true,
      patient_id,
      audited: !auditErr,
    });
  } catch (err) {
    console.error("set-patient-password unexpected", err);
    return jsonResponse(
      { error: "internal_error", message: (err as Error).message },
      500,
    );
  }
});
