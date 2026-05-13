/**
 * Cron secret guard for system-only edge functions.
 * Cron jobs must send X-Cron-Secret header matching CRON_SECRET env.
 * Admin users with a valid JWT may also invoke (for manual triggers).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Content-Type": "application/json",
};

export async function requireCronOrAdmin(req: Request): Promise<void> {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (cronSecret && provided && provided === cronSecret) return;

  // Allow admin via JWT
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    try {
      const c = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await c.auth.getUser();
      if (data?.user?.id) {
        const svc = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: roles } = await svc.from("user_roles").select("role").eq("user_id", data.user.id);
        if ((roles || []).some((r: any) => r.role === "admin")) return;
      }
    } catch (_) { /* fall through */ }
  }

  throw new Response(
    JSON.stringify({ error: "Forbidden — cron secret or admin auth required" }),
    { status: 403, headers: corsHeaders }
  );
}
