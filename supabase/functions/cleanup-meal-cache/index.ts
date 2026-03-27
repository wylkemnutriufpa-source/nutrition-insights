import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════
// CLEANUP-MEAL-CACHE v1.0 — Phase 4
// Removes expired entries from meal_analysis_cache
// Should be called via cron (daily or weekly)
// TTL: entries with expires_at < now() are deleted
// ═══════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();

    // Count expired entries first
    const { count: expiredCount } = await sb
      .from("meal_analysis_cache")
      .select("id", { count: "exact", head: true })
      .lt("expires_at", now);

    // Delete expired entries
    const { error: deleteError } = await sb
      .from("meal_analysis_cache")
      .delete()
      .lt("expires_at", now);

    if (deleteError) throw deleteError;

    // Count remaining entries
    const { count: remainingCount } = await sb
      .from("meal_analysis_cache")
      .select("id", { count: "exact", head: true });

    // Log the cleanup run
    await sb.from("ai_usage_tracking").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      feature_key: "cleanup-meal-cache",
      metadata: {
        source: "system",
        expired_deleted: expiredCount || 0,
        remaining: remainingCount || 0,
        executed_at: now,
      },
    });

    const result = {
      success: true,
      expired_deleted: expiredCount || 0,
      remaining: remainingCount || 0,
      executed_at: now,
    };

    console.log("Cache cleanup completed:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cleanup-meal-cache error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
