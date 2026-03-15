import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENGINE_VERSION = "1.0.0";

// ── Helper functions ────────────────────────────────────────

function clamp(v: number, min = 0, max = 100): number {
  return Math.round(Math.min(max, Math.max(min, v)) * 10) / 10;
}

function calcCEI(metrics: {
  avgPerformance: number;
  avgAdherence: number;
  dropoutRate: number;
  stagnationRate: number;
  avgPlanEfficacy: number;
}): number {
  const perf = metrics.avgPerformance * 0.25;
  const adh = metrics.avgAdherence * 0.25;
  const retention = (100 - metrics.dropoutRate) * 0.2;
  const noStag = (100 - metrics.stagnationRate) * 0.15;
  const efficacy = metrics.avgPlanEfficacy * 0.15;
  return clamp(perf + adh + retention + noStag + efficacy);
}

function calcPSI(metrics: {
  dropoutRate: number;
  regressionRate: number;
  adherenceVariance: number;
  interventionConsistency: number;
}): number {
  const base = 100;
  const penalty =
    metrics.dropoutRate * 0.3 +
    metrics.regressionRate * 0.25 +
    metrics.adherenceVariance * 0.25 +
    (100 - metrics.interventionConsistency) * 0.2;
  return clamp(base - penalty);
}

function classifyILI(urgencyMean: number, riskPct: number, volume: number): string {
  const score = urgencyMean * 0.4 + riskPct * 0.35 + Math.min(volume / 5, 100) * 0.25;
  if (score > 70) return "critical";
  if (score > 50) return "elevated";
  if (score > 30) return "moderate";
  return "low";
}

function estimateLTV(avgMonths: number, engagementScore: number): number {
  const baseLTV = avgMonths * 150; // R$150/month average
  const engagementMultiplier = 0.5 + (engagementScore / 100) * 1.0;
  return Math.round(baseLTV * engagementMultiplier);
}

function detectAlerts(snapshot: Record<string, number>): Array<{
  alert_type: string;
  severity: string;
  title: string;
  description: string;
}> {
  const alerts: Array<{ alert_type: string; severity: string; title: string; description: string }> = [];

  if (snapshot.dropoutRate > 25) {
    alerts.push({
      alert_type: "high_dropout",
      severity: snapshot.dropoutRate > 40 ? "critical" : "high",
      title: "Taxa de abandono elevada",
      description: `Taxa de abandono em 30d: ${snapshot.dropoutRate.toFixed(1)}%. Intervenção urgente necessária.`,
    });
  }

  if (snapshot.stagnationRate > 35) {
    alerts.push({
      alert_type: "population_stagnation",
      severity: "high",
      title: "Estagnação populacional detectada",
      description: `${snapshot.stagnationRate.toFixed(1)}% dos pacientes em estagnação. Considerar revisão de protocolos.`,
    });
  }

  if (snapshot.avgAdherence < 45) {
    alerts.push({
      alert_type: "global_adherence_drop",
      severity: "high",
      title: "Queda global de adesão",
      description: `Adesão média caiu para ${snapshot.avgAdherence.toFixed(1)}%. Simplificar estratégias.`,
    });
  }

  if (snapshot.highRiskPct > 40) {
    alerts.push({
      alert_type: "high_risk_concentration",
      severity: "critical",
      title: "Concentração de pacientes de alto risco",
      description: `${snapshot.highRiskPct.toFixed(1)}% da carteira em risco elevado.`,
    });
  }

  return alerts;
}

function generateRecommendations(snapshot: Record<string, number>): Array<{
  action_type: string;
  priority: number;
  title: string;
  description: string;
  rationale: string;
  expected_impact: string;
}> {
  const recs: Array<{
    action_type: string;
    priority: number;
    title: string;
    description: string;
    rationale: string;
    expected_impact: string;
  }> = [];

  if (snapshot.dropoutRate > 20) {
    recs.push({
      action_type: "intensify_retention",
      priority: 1,
      title: "Intensificar retenção de pacientes",
      description: "Aumentar frequência de check-ins e intervenções preventivas para pacientes em risco.",
      rationale: `Dropout rate ${snapshot.dropoutRate.toFixed(1)}% acima do limiar aceitável.`,
      expected_impact: "Redução de 15-25% na taxa de abandono em 30 dias.",
    });
  }

  if (snapshot.stagnationRate > 30) {
    recs.push({
      action_type: "review_dominant_protocol",
      priority: 2,
      title: "Revisar protocolo dominante",
      description: "Avaliar eficácia do protocolo mais utilizado e considerar ajustes ou alternativas.",
      rationale: `Estagnação em ${snapshot.stagnationRate.toFixed(1)}% sugere protocolo com eficácia reduzida.`,
      expected_impact: "Melhora de 10-20% na resposta terapêutica.",
    });
  }

  if (snapshot.avgAdherence < 50) {
    recs.push({
      action_type: "simplify_population_strategy",
      priority: 2,
      title: "Simplificar estratégia populacional",
      description: "Reduzir complexidade dos planos para pacientes com adesão abaixo de 50%.",
      rationale: `Adesão média de ${snapshot.avgAdherence.toFixed(1)}% indica planos complexos demais.`,
      expected_impact: "Aumento de 15-30% na adesão global.",
    });
  }

  if (snapshot.interventionLoad > 60) {
    recs.push({
      action_type: "increase_preventive_care",
      priority: 3,
      title: "Aumentar acompanhamento preventivo",
      description: "Implementar intervenções proativas antes de crises clínicas.",
      rationale: "Carga de intervenção elevada indica ações reativas predominantes.",
      expected_impact: "Redução de 20% na carga emergencial.",
    });
  }

  if (snapshot.cei < 40) {
    recs.push({
      action_type: "hire_additional_professional",
      priority: 4,
      title: "Considerar contratação de profissional adicional",
      description: "Eficiência clínica baixa pode indicar sobrecarga do time atual.",
      rationale: `CEI de ${snapshot.cei.toFixed(1)} sugere capacidade operacional insuficiente.`,
      expected_impact: "Melhora de 25% na eficiência clínica com redistribuição.",
    });
  }

  return recs;
}

// ── Main handler ────────────────────────────────────────────

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
    console.log(`[EXEC-CMD] Engine v${ENGINE_VERSION} starting`);

    // 1. Load active organizations
    const { data: orgs, error: orgsErr } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("is_active", true);

    if (orgsErr) throw orgsErr;
    if (!orgs?.length) {
      return new Response(JSON.stringify({ message: "No active organizations", version: ENGINE_VERSION }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const org of orgs) {
      try {
        // 2. Get org metrics cache (from Phase 12 engine)
        const { data: metricsCache } = await supabase
          .from("organization_metrics_cache")
          .select("*")
          .eq("organization_id", org.id)
          .single();

        // 3. Get members
        const { data: members } = await supabase
          .from("organization_members")
          .select("user_id, role")
          .eq("organization_id", org.id)
          .eq("status", "active");

        const professionalIds = (members || [])
          .filter((m) => ["owner", "admin", "nutritionist"].includes(m.role))
          .map((m) => m.user_id);

        if (professionalIds.length === 0) {
          results.push({ org_id: org.id, skipped: true, reason: "no_professionals" });
          continue;
        }

        // 4. Get portfolio states for professionals
        const { data: portfolioStates } = await supabase
          .from("clinic_portfolio_state")
          .select("*")
          .in("nutritionist_id", professionalIds);

        // 5. Get predicted outcomes for risk analysis
        const { data: patientLinks } = await supabase
          .from("nutritionist_patients")
          .select("patient_id, status, created_at")
          .in("nutritionist_id", professionalIds);

        const activePatientIds = (patientLinks || [])
          .filter((p) => p.status === "active")
          .map((p) => p.patient_id);

        const totalPatients = activePatientIds.length;

        // 6. Get predicted outcomes for high-risk count
        let highRiskCount = 0;
        let avgStagnationProb = 0;
        let avgRegressionRate = 0;

        if (activePatientIds.length > 0) {
          const { data: predictions } = await supabase
            .from("patient_predicted_outcomes")
            .select("predicted_dropout_probability, predicted_stagnation_probability, predicted_regression_probability")
            .in("patient_id", activePatientIds.slice(0, 500));

          if (predictions?.length) {
            highRiskCount = predictions.filter((p) => p.predicted_dropout_probability > 60).length;
            avgStagnationProb = predictions.reduce((s, p) => s + (p.predicted_stagnation_probability || 0), 0) / predictions.length;
            avgRegressionRate = predictions.reduce((s, p) => s + (p.predicted_regression_probability || 0), 0) / predictions.length;
          }
        }

        // 7. Aggregate portfolio metrics
        const pCount = portfolioStates?.length || 1;
        const avgAdherence = portfolioStates?.reduce((s, p) => s + (p.avg_adherence || 0), 0) / pCount || 0;
        const avgPlanEfficacy = portfolioStates?.reduce((s, p) => s + (p.avg_plan_efficacy || 0), 0) / pCount || 0;
        const dropoutRate = metricsCache?.dropout_rate || 0;
        const avgPerformance = metricsCache?.avg_performance_score || 0;

        // 8. Calculate KPIs
        const cei = calcCEI({
          avgPerformance,
          avgAdherence,
          dropoutRate,
          stagnationRate: avgStagnationProb,
          avgPlanEfficacy,
        });

        const adherenceVariance = portfolioStates
          ? Math.sqrt(portfolioStates.reduce((s, p) => s + Math.pow((p.avg_adherence || 0) - avgAdherence, 2), 0) / pCount)
          : 30;

        const psi = calcPSI({
          dropoutRate,
          regressionRate: avgRegressionRate,
          adherenceVariance: Math.min(adherenceVariance, 100),
          interventionConsistency: Math.min(avgPlanEfficacy * 1.2, 100),
        });

        const highRiskPct = totalPatients > 0 ? (highRiskCount / totalPatients) * 100 : 0;
        const ili = classifyILI(dropoutRate, highRiskPct, highRiskCount);

        // 9. Growth/contraction rates
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
        const newPatients30d = (patientLinks || []).filter(
          (p) => p.created_at && p.created_at >= thirtyDaysAgo
        ).length;
        const growthRate = totalPatients > 0 ? (newPatients30d / totalPatients) * 100 : 0;
        const contractionRate = dropoutRate;

        // 10. LTV estimate
        const avgEngagement = avgAdherence * 0.6 + avgPerformance * 0.4;
        const avgMonths = totalPatients > 0 ? Math.max(3, 12 * (1 - dropoutRate / 100)) : 6;
        const avgLTV = estimateLTV(avgMonths, avgEngagement);

        // 11. Upsert operational snapshot
        const snapshotPayload = {
          organization_id: org.id,
          snapshot_date: new Date().toISOString().split("T")[0],
          active_patients: totalPatients,
          high_risk_patients: highRiskCount,
          average_adherence: clamp(avgAdherence),
          average_performance_score: clamp(avgPerformance),
          dropout_rate_30d: clamp(dropoutRate),
          stagnation_rate_30d: clamp(avgStagnationProb),
          clinical_intervention_rate: clamp(highRiskPct),
          protocol_adjustment_rate: 0,
          avg_time_between_interventions: 0,
          clinical_efficiency_index: cei,
          portfolio_stability_index: psi,
          intervention_load_level: ili,
          predicted_portfolio_growth_rate: clamp(growthRate),
          predicted_portfolio_contraction_rate: clamp(contractionRate),
          avg_patient_ltv_estimate: avgLTV,
          engine_version: ENGINE_VERSION,
        };

        await supabase
          .from("organization_operational_snapshots")
          .upsert(snapshotPayload, { onConflict: "organization_id,snapshot_date" });

        // 12. Professional metrics
        for (const profId of professionalIds) {
          const profPortfolio = portfolioStates?.find((p) => p.nutritionist_id === profId);

          const profActivePatients = (patientLinks || []).filter(
            (p) => p.status === "active"
          ).length;

          const profCEI = profPortfolio
            ? calcCEI({
                avgPerformance: profPortfolio.avg_metabolic_evolution || 50,
                avgAdherence: profPortfolio.avg_adherence || 50,
                dropoutRate: profPortfolio.dropout_rate || 0,
                stagnationRate: avgStagnationProb,
                avgPlanEfficacy: profPortfolio.avg_plan_efficacy || 50,
              })
            : 50;

          await supabase.from("professional_operational_metrics").upsert(
            {
              professional_id: profId,
              organization_id: org.id,
              active_patients: profPortfolio?.total_patients || profActivePatients,
              avg_patient_performance: clamp(profPortfolio?.avg_metabolic_evolution || 50),
              avg_patient_risk: clamp(profPortfolio?.patients_at_risk_percent || 0),
              intervention_frequency: 0,
              dropout_rate: clamp(profPortfolio?.dropout_rate || 0),
              adherence_mean: clamp(profPortfolio?.avg_adherence || 50),
              clinical_efficiency_score: profCEI,
              portfolio_stability_score: clamp(
                100 - (profPortfolio?.dropout_rate || 0) * 0.5 - (profPortfolio?.patients_at_risk_percent || 0) * 0.5
              ),
              patient_ltv_estimate: avgLTV,
              engine_version: ENGINE_VERSION,
              computed_at: new Date().toISOString(),
            },
            { onConflict: "professional_id" }
          );
        }

        // 13. Detect alerts
        const alertsData = detectAlerts({
          dropoutRate,
          stagnationRate: avgStagnationProb,
          avgAdherence,
          highRiskPct,
          interventionLoad: highRiskPct,
          cei,
        });

        // Deactivate old alerts first
        await supabase
          .from("organization_operational_alerts")
          .update({ is_active: false })
          .eq("organization_id", org.id)
          .eq("is_active", true);

        for (const alert of alertsData) {
          await supabase.from("organization_operational_alerts").insert({
            organization_id: org.id,
            ...alert,
          });
        }

        // 14. Generate recommendations
        const recs = generateRecommendations({
          dropoutRate,
          stagnationRate: avgStagnationProb,
          avgAdherence,
          interventionLoad: highRiskPct,
          cei,
        });

        // Clear old pending recommendations
        await supabase
          .from("organization_recommended_actions")
          .delete()
          .eq("organization_id", org.id)
          .eq("status", "pending");

        for (const rec of recs) {
          await supabase.from("organization_recommended_actions").insert({
            organization_id: org.id,
            ...rec,
            engine_version: ENGINE_VERSION,
          });
        }

        // 15. Audit
        await supabase.from("clinical_audit_logs").insert({
          organization_id: org.id,
          action_type: "operational_intelligence_computed",
          action_metadata: {
            engine_version: ENGINE_VERSION,
            cei,
            psi,
            ili,
            active_patients: totalPatients,
            high_risk: highRiskCount,
            alerts_generated: alertsData.length,
            recommendations: recs.length,
          },
        });

        results.push({
          org_id: org.id,
          org_name: org.name,
          cei,
          psi,
          ili,
          active_patients: totalPatients,
          high_risk: highRiskCount,
          alerts: alertsData.length,
          recommendations: recs.length,
        });

        console.log(`[EXEC-CMD] Org ${org.slug}: CEI=${cei} PSI=${psi} ILI=${ili}`);
      } catch (orgErr) {
        console.error(`[EXEC-CMD] Error for org ${org.id}:`, orgErr);
        results.push({ org_id: org.id, error: String(orgErr) });
      }
    }

    // 16. Rank professionals globally
    const { data: allProfs } = await supabase
      .from("professional_operational_metrics")
      .select("professional_id, clinical_efficiency_score")
      .order("clinical_efficiency_score", { ascending: false });

    if (allProfs) {
      for (let i = 0; i < allProfs.length; i++) {
        await supabase
          .from("professional_operational_metrics")
          .update({ rank_position: i + 1 })
          .eq("professional_id", allProfs[i].professional_id);
      }
    }

    return new Response(
      JSON.stringify({
        version: ENGINE_VERSION,
        organizations_processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[EXEC-CMD] Fatal error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
