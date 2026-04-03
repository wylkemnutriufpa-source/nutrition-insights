import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const runId = `audit-${Date.now()}`;
    const issues: Array<{
      plan_id: string | null;
      patient_id: string | null;
      audit_type: string;
      severity: string;
      details: Record<string, unknown>;
    }> = [];

    // 1. Plans marked active but not published
    const { data: badStatus } = await sb
      .from("meal_plans")
      .select("id, patient_id, plan_status, is_active")
      .eq("is_active", true)
      .not("plan_status", "in", '("published","published_to_patient","approved")');

    for (const p of badStatus || []) {
      issues.push({
        plan_id: p.id,
        patient_id: p.patient_id,
        audit_type: "active_not_published",
        severity: "critical",
        details: { plan_status: p.plan_status },
      });
    }

    // 2. Active plans with zero items
    const { data: activePlans } = await sb
      .from("meal_plans")
      .select("id, patient_id")
      .eq("is_active", true);

    for (const p of activePlans || []) {
      const { count } = await sb
        .from("meal_plan_items")
        .select("id", { count: "exact", head: true })
        .eq("meal_plan_id", p.id);

      if ((count ?? 0) === 0) {
        issues.push({
          plan_id: p.id,
          patient_id: p.patient_id,
          audit_type: "no_items",
          severity: "critical",
          details: { item_count: 0 },
        });
      }
    }

    // 3. Active plans without nutritionist binding
    const { data: activePlansAll } = await sb
      .from("meal_plans")
      .select("id, patient_id, nutritionist_id")
      .eq("is_active", true)
      .is("nutritionist_id", null);

    for (const p of activePlansAll || []) {
      issues.push({
        plan_id: p.id,
        patient_id: p.patient_id,
        audit_type: "missing_nutritionist_binding",
        severity: "critical",
        details: {},
      });
    }

    // 4. Orphan drafts older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: orphanDrafts } = await sb
      .from("meal_plans")
      .select("id, patient_id, plan_status, created_at")
      .in("plan_status", ["draft", "under_professional_review"])
      .eq("is_active", false)
      .lt("created_at", sevenDaysAgo)
      .limit(200);

    for (const p of orphanDrafts || []) {
      issues.push({
        plan_id: p.id,
        patient_id: p.patient_id,
        audit_type: "orphan_draft",
        severity: "warning",
        details: { created_at: p.created_at, plan_status: p.plan_status },
      });
    }

    // 5. Macro consistency check on active plans (sample)
    for (const p of (activePlans || []).slice(0, 50)) {
      const { data: items } = await sb
        .from("meal_plan_items")
        .select("day_of_week, protein_g, calories")
        .eq("meal_plan_id", p.id);

      if (!items || items.length === 0) continue;

      // Group protein by day
      const byDay: Record<number, number> = {};
      for (const it of items) {
        const d = it.day_of_week ?? 0;
        byDay[d] = (byDay[d] || 0) + (it.protein_g || 0);
      }

      const days = Object.values(byDay);
      if (days.length < 2) continue;

      const avg = days.reduce((s, v) => s + v, 0) / days.length;
      const maxDeviation = Math.max(...days.map((d) => Math.abs(d - avg) / avg));

      if (maxDeviation > 0.15) {
        issues.push({
          plan_id: p.id,
          patient_id: p.patient_id,
          audit_type: "macro_inconsistency",
          severity: maxDeviation > 0.25 ? "critical" : "warning",
          details: {
            protein_by_day: byDay,
            avg_protein: Math.round(avg),
            max_deviation_pct: Math.round(maxDeviation * 100),
          },
        });
      }
    }

    // Persist results
    if (issues.length > 0) {
      const rows = issues.map((i) => ({ ...i, audit_run_id: runId }));
      const { error: insertErr } = await sb
        .from("plan_audit_results")
        .insert(rows);

      if (insertErr) {
        console.error("[AUDIT] Insert error:", insertErr);
      }
    }

    console.info(`[AUDIT] Run ${runId}: ${issues.length} issues found`);

    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        issues_found: issues.length,
        breakdown: {
          critical: issues.filter((i) => i.severity === "critical").length,
          warning: issues.filter((i) => i.severity === "warning").length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[AUDIT] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
