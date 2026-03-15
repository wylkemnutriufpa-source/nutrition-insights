import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENGINE_VERSION = "1.0.0";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log(`[ORG-METRICS] Engine v${ENGINE_VERSION} starting`);

    // 1. Load all active organizations
    const { data: orgs, error: orgsErr } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("is_active", true);

    if (orgsErr) throw orgsErr;
    if (!orgs || orgs.length === 0) {
      return new Response(JSON.stringify({ message: "No active organizations", version: ENGINE_VERSION }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[ORG-METRICS] Processing ${orgs.length} organizations`);

    const results = [];

    for (const org of orgs) {
      try {
        // 2. Get members
        const { data: members } = await supabase
          .from("organization_members")
          .select("user_id, role")
          .eq("organization_id", org.id)
          .eq("status", "active");

        const professionalIds = (members || [])
          .filter(m => ["owner", "admin", "nutritionist"].includes(m.role))
          .map(m => m.user_id);

        if (professionalIds.length === 0) {
          results.push({ org_id: org.id, skipped: true, reason: "no_professionals" });
          continue;
        }

        // 3. Get patients linked to these professionals
        const { data: patientLinks } = await supabase
          .from("nutritionist_patients")
          .select("patient_id, status")
          .in("nutritionist_id", professionalIds);

        const activePatientIds = (patientLinks || [])
          .filter(p => p.status === "active")
          .map(p => p.patient_id);

        const totalPatients = (patientLinks || []).length;
        const activePatients = activePatientIds.length;

        // 4. Get portfolio state for professionals
        const { data: portfolioStates } = await supabase
          .from("clinic_portfolio_state")
          .select("*")
          .in("nutritionist_id", professionalIds);

        // 5. Aggregate metrics
        let avgAdherence = 0;
        let avgPlanEfficacy = 0;
        let dropoutRate = 0;
        let patientsAtRiskPercent = 0;
        let avgPerformance = 0;

        if (portfolioStates && portfolioStates.length > 0) {
          const count = portfolioStates.length;
          avgAdherence = portfolioStates.reduce((s, p) => s + (p.avg_adherence || 0), 0) / count;
          avgPlanEfficacy = portfolioStates.reduce((s, p) => s + (p.avg_plan_efficacy || 0), 0) / count;
          dropoutRate = portfolioStates.reduce((s, p) => s + (p.dropout_rate || 0), 0) / count;
          patientsAtRiskPercent = portfolioStates.reduce((s, p) => s + (p.patients_at_risk_percent || 0), 0) / count;
        }

        // 6. Get performance scores
        if (activePatientIds.length > 0) {
          const { data: perfStates } = await supabase
            .from("patient_human_performance_state")
            .select("overall_performance_score")
            .in("patient_id", activePatientIds.slice(0, 500));

          if (perfStates && perfStates.length > 0) {
            avgPerformance = perfStates.reduce((s, p) => s + (p.overall_performance_score || 0), 0) / perfStates.length;
          }
        }

        // 7. New patients in last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { count: newPatientsCount } = await supabase
          .from("nutritionist_patients")
          .select("id", { count: "exact", head: true })
          .in("nutritionist_id", professionalIds)
          .gte("created_at", thirtyDaysAgo);

        // 8. Classify portfolio
        let classification = "stable";
        if (patientsAtRiskPercent > 40 || dropoutRate > 30) classification = "critical";
        else if (patientsAtRiskPercent > 25 || dropoutRate > 20) classification = "alert";
        else if (avgAdherence > 75 && avgPlanEfficacy > 60) classification = "healthy";

        // 9. Retention rate
        const retentionRate = totalPatients > 0 
          ? Math.round((activePatients / totalPatients) * 100 * 10) / 10 
          : 0;

        // 10. Top protocol
        const { data: topProtocol } = await supabase
          .from("clinic_clinical_evolution_metrics")
          .select("top_protocol_name")
          .in("nutritionist_id", professionalIds)
          .order("computed_at", { ascending: false })
          .limit(1);

        const topProtocolName = topProtocol?.[0]?.top_protocol_name || null;

        // 11. Upsert metrics
        const metricsPayload = {
          organization_id: org.id,
          total_patients: totalPatients,
          active_patients: activePatients,
          total_professionals: professionalIds.length,
          avg_adherence: Math.round(avgAdherence * 10) / 10,
          avg_performance_score: Math.round(avgPerformance * 10) / 10,
          dropout_rate: Math.round(dropoutRate * 10) / 10,
          avg_plan_efficacy: Math.round(avgPlanEfficacy * 10) / 10,
          patients_at_risk_percent: Math.round(patientsAtRiskPercent * 10) / 10,
          portfolio_classification: classification,
          top_protocol_name: topProtocolName,
          new_patients_30d: newPatientsCount || 0,
          retention_rate: retentionRate,
          engine_version: ENGINE_VERSION,
          computed_at: new Date().toISOString(),
        };

        const { error: upsertErr } = await supabase
          .from("organization_metrics_cache")
          .upsert(metricsPayload, { onConflict: "organization_id" });

        if (upsertErr) {
          console.error(`[ORG-METRICS] Upsert error for org ${org.id}:`, upsertErr);
        }

        // 12. Audit log
        await supabase.from("clinical_audit_logs").insert({
          organization_id: org.id,
          action_type: "org_metrics_computed",
          action_metadata: {
            engine_version: ENGINE_VERSION,
            classification,
            total_patients: totalPatients,
            active_patients: activePatients,
          },
        });

        results.push({
          org_id: org.id,
          org_name: org.name,
          classification,
          total_patients: totalPatients,
          active_patients: activePatients,
          professionals: professionalIds.length,
        });

        console.log(`[ORG-METRICS] Org ${org.slug}: ${classification} (${activePatients} patients)`);
      } catch (orgErr) {
        console.error(`[ORG-METRICS] Error processing org ${org.id}:`, orgErr);
        results.push({ org_id: org.id, error: String(orgErr) });
      }
    }

    return new Response(JSON.stringify({
      version: ENGINE_VERSION,
      organizations_processed: results.length,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ORG-METRICS] Fatal error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
