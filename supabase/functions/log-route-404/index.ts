import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({} as any));
    const pathname = String(body?.pathname || "").slice(0, 500);
    if (!pathname) {
      return new Response(JSON.stringify({ error: "pathname required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const ua = String(body?.user_agent || req.headers.get("user-agent") || "").slice(0, 500);
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios|edg/i.test(ua);

    await admin.from("route_404_telemetry").insert({
      pathname,
      full_url: String(body?.full_url || "").slice(0, 1000) || null,
      referrer: String(body?.referrer || "").slice(0, 1000) || null,
      user_agent: ua || null,
      is_ios: isIos,
      is_safari: isSafari,
      is_standalone: Boolean(body?.is_standalone),
      has_service_worker: Boolean(body?.has_service_worker),
      build_hash: String(body?.build_hash || "").slice(0, 100) || null,
      session_id: String(body?.session_id || "").slice(0, 100) || null,
      metadata: typeof body?.metadata === "object" && body.metadata !== null ? body.metadata : {},
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("log-route-404 error:", err?.message || err);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});