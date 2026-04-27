import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE = "https://www.fitjourney.com.br";

const PATHS = [
  "/",
  "/auth",
  "/landing",
  "/landing-paciente",
  "/cadastro",
  "/cadastro?code=HEALTHCHECK",
  "/intake/healthcheck-token",
  "/convite/HEALTHCHECK",
  "/~oauth/cadastro",
  "/~oauth/convite/HEALTHCHECK",
  "/~oauth/intake/healthcheck-token",
  "/~oauth/auth/confirm",
  "/politica-de-privacidade",
  "/termos-de-uso",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: Array<{ pathname: string; status_code: number; ok: boolean; notes: string | null }> = [];

    for (const path of PATHS) {
      try {
        // SPA: every public route should return 200 (index.html). 404 means hosting is broken.
        const res = await fetch(`${BASE}${path}`, {
          method: "GET",
          redirect: "manual",
          headers: {
            "user-agent": "FitJourneyAuditBot/1.0 (+routes)",
            "cache-control": "no-cache",
          },
        });
        // SPA fallback should always serve index.html (status 200) — anything >=400 is a real failure.
        const ok = res.status >= 200 && res.status < 400;
        results.push({
          pathname: path,
          status_code: res.status,
          ok,
          notes: ok ? null : `unexpected status ${res.status}`,
        });
      } catch (e: any) {
        results.push({
          pathname: path,
          status_code: 0,
          ok: false,
          notes: `fetch failed: ${e?.message || "unknown"}`,
        });
      }
    }

    await admin.from("public_route_audits").insert(results);

    const failing = results.filter((r) => !r.ok);

    // Trigger an alert for every failing route so admins see it the same day.
    if (failing.length > 0) {
      const auditRunId = crypto.randomUUID();
      const alertRows = failing.map((r) => ({
        pathname: r.pathname,
        status_code: r.status_code,
        notes: r.notes,
        audit_run_id: auditRunId,
      }));
      const { error: alertErr } = await admin.from("route_audit_alerts").insert(alertRows);
      if (alertErr) {
        console.error("audit-public-routes: failed to write alerts:", alertErr.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: results.length,
        failing: failing.length,
        failing_paths: failing.map((r) => ({ path: r.pathname, status: r.status_code, notes: r.notes })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("audit-public-routes error:", err?.message || err);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});