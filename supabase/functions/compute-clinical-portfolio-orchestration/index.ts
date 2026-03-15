import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENGINE_VERSION = "1.0.0";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════
interface PatientPriorityInput {
  patient_id: string;
  nutritionist_id: string;
  clinical_risk_score: number;
  dropout_risk_score: number;
  plan_efficacy_score: number;
  cluster_type: string;
  adherence: number;
  weight_trend: string;
  days_since_contact: number;
  active_critical_alerts: number;
  has_therapeutic_failure: boolean;
  has_pending_transition: boolean;
}

interface PriorityResult {
  priority_score: number;
  priority_level: string;
  main_reason: string;
  components: {
    risk: number;
    dropout: number;
    therapeutic_failure: number;
    cluster_risk: number;
    plan_efficacy: number;
    time_without_intervention: number;
  };
  recommended_action: string;
  urgency_level: string;
  expected_impact: string;
}

// ═══════════════════════════════════════════
// Priority Score Calculator
// ═══════════════════════════════════════════
function computePriority(input: PatientPriorityInput): PriorityResult {
  // Component 1: Clinical Risk (30%)
  const riskComponent = Math.min(100, input.clinical_risk_score);

  // Component 2: Dropout Risk (25%)
  const dropoutComponent = Math.min(100, input.dropout_risk_score);

  // Component 3: Therapeutic Failure (15%)
  const therapeuticComponent = input.has_therapeutic_failure ? 85 : (input.plan_efficacy_score < 40 ? 60 : 20);

  // Component 4: Critical Cluster (10%)
  const clusterRiskMap: Record<string, number> = {
    disengaging_patient: 90,
    behavioral_struggler: 70,
    resistant_profile: 55,
    metabolic_adaptive: 35,
    metabolic_responder: 15,
    unknown: 50,
  };
  const clusterComponent = clusterRiskMap[input.cluster_type] ?? 50;

  // Component 5: Plan Efficacy (10%)
  const efficacyComponent = Math.max(0, 100 - input.plan_efficacy_score);

  // Component 6: Time Without Intervention (10%)
  const timeComponent = Math.min(100, (input.days_since_contact / 14) * 100);

  const score =
    riskComponent * 0.30 +
    dropoutComponent * 0.25 +
    therapeuticComponent * 0.15 +
    clusterComponent * 0.10 +
    efficacyComponent * 0.10 +
    timeComponent * 0.10;

  const finalScore = Math.max(0, Math.min(100, score));

  // Classification
  let level: string;
  if (finalScore >= 80) level = "critical_priority";
  else if (finalScore >= 60) level = "high_priority";
  else if (finalScore >= 40) level = "medium_priority";
  else level = "low_priority";

  // Main reason
  const components = [
    { name: "risco clínico elevado", value: riskComponent * 0.30 },
    { name: "risco de abandono", value: dropoutComponent * 0.25 },
    { name: "falha terapêutica", value: therapeuticComponent * 0.15 },
    { name: "cluster de risco", value: clusterComponent * 0.10 },
    { name: "baixa eficácia do plano", value: efficacyComponent * 0.10 },
    { name: "tempo sem contato profissional", value: timeComponent * 0.10 },
  ];
  components.sort((a, b) => b.value - a.value);
  const mainReason = `Principal fator: ${components[0].name} (contribuição: ${components[0].value.toFixed(1)} pts)`;

  // Recommended action
  const { action, urgency, impact } = determineAction(input, finalScore, level);

  return {
    priority_score: finalScore,
    priority_level: level,
    main_reason: mainReason,
    components: {
      risk: riskComponent,
      dropout: dropoutComponent,
      therapeutic_failure: therapeuticComponent,
      cluster_risk: clusterComponent,
      plan_efficacy: efficacyComponent,
      time_without_intervention: timeComponent,
    },
    recommended_action: action,
    urgency_level: urgency,
    expected_impact: impact,
  };
}

function determineAction(
  input: PatientPriorityInput,
  score: number,
  level: string
): { action: string; urgency: string; impact: string } {
  if (level === "critical_priority" && input.active_critical_alerts > 0) {
    return {
      action: "contato_imediato",
      urgency: "critical",
      impact: "Evitar agravamento clínico e possível abandono",
    };
  }
  if (input.has_therapeutic_failure && input.has_pending_transition) {
    return {
      action: "ajustar_protocolo",
      urgency: "high",
      impact: "Aplicar transição terapêutica pendente para retomar evolução",
    };
  }
  if (input.dropout_risk_score >= 70) {
    return {
      action: "reforco_motivacional",
      urgency: "high",
      impact: "Reduzir risco de abandono com contato empático",
    };
  }
  if (input.plan_efficacy_score < 40 && input.adherence >= 70) {
    return {
      action: "revisar_plano",
      urgency: "high",
      impact: "Plano com baixa eficácia apesar de boa adesão — ajuste necessário",
    };
  }
  if (input.days_since_contact >= 10) {
    return {
      action: "agendar_retorno",
      urgency: "medium",
      impact: "Restabelecer contato profissional para manutenção do vínculo",
    };
  }
  if (input.cluster_type === "disengaging_patient") {
    return {
      action: "intervencao_intensiva",
      urgency: "high",
      impact: "Paciente em processo de desengajamento — intervenção urgente",
    };
  }
  if (score < 35) {
    return {
      action: "apenas_monitorar",
      urgency: "low",
      impact: "Paciente evoluindo dentro do esperado",
    };
  }
  return {
    action: "contato_imediato",
    urgency: level === "high_priority" ? "high" : "medium",
    impact: "Avaliar situação clínica e definir próximo passo",
  };
}

// ═══════════════════════════════════════════
// Portfolio Health Score
// ═══════════════════════════════════════════
function computePortfolioHealth(priorities: PriorityResult[], totalPatients: number): {
  score: number;
  classification: string;
  patientsAtRiskPercent: number;
  criticalCount: number;
  highCount: number;
} {
  if (totalPatients === 0) {
    return { score: 50, classification: "carteira_estavel", patientsAtRiskPercent: 0, criticalCount: 0, highCount: 0 };
  }

  const criticalCount = priorities.filter(p => p.priority_level === "critical_priority").length;
  const highCount = priorities.filter(p => p.priority_level === "high_priority").length;
  const atRisk = criticalCount + highCount;
  const atRiskPercent = (atRisk / totalPatients) * 100;

  const avgPriority = priorities.reduce((sum, p) => sum + p.priority_score, 0) / priorities.length;
  // Invert: low avg priority = healthy portfolio
  const score = Math.max(0, Math.min(100, 100 - avgPriority));

  let classification: string;
  if (score >= 75) classification = "carteira_saudavel";
  else if (score >= 55) classification = "carteira_estavel";
  else if (score >= 35) classification = "carteira_em_alerta";
  else classification = "carteira_critica";

  return { score, classification, patientsAtRiskPercent: atRiskPercent, criticalCount, highCount };
}

// ═══════════════════════════════════════════
// Weekly Plan Generator
// ═══════════════════════════════════════════
function generateWeeklyPlan(
  priorities: Array<{ patient_id: string; result: PriorityResult }>,
  contactedLast48h: Set<string>
): { prioritized: any[]; focusActions: any[]; balanceScore: number } {
  // Filter out recently contacted
  const eligible = priorities
    .filter(p => !contactedLast48h.has(p.patient_id))
    .sort((a, b) => b.result.priority_score - a.result.priority_score);

  // Take top 20 for weekly focus
  const topPatients = eligible.slice(0, 20);

  // Distribute across 5 weekdays
  const days = ["segunda", "terca", "quarta", "quinta", "sexta"];
  const dailySlots = 4; // max patients per day
  const prioritized: any[] = [];

  topPatients.forEach((p, i) => {
    const dayIndex = Math.min(Math.floor(i / dailySlots), days.length - 1);
    prioritized.push({
      patient_id: p.patient_id,
      priority_score: p.result.priority_score,
      priority_level: p.result.priority_level,
      recommended_action: p.result.recommended_action,
      suggested_day: days[dayIndex],
      day_slot: (i % dailySlots) + 1,
    });
  });

  // Focus actions summary
  const actionCounts: Record<string, number> = {};
  topPatients.forEach(p => {
    actionCounts[p.result.recommended_action] = (actionCounts[p.result.recommended_action] || 0) + 1;
  });
  const focusActions = Object.entries(actionCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([action, count]) => ({ action, count }));

  // Balance score: how evenly distributed are priorities across days
  const dayCounts = days.map((_, i) => prioritized.filter(p => p.suggested_day === days[i]).length);
  const avgPerDay = topPatients.length / days.length;
  const variance = dayCounts.reduce((s, c) => s + Math.pow(c - avgPerDay, 2), 0) / days.length;
  const balanceScore = Math.max(0, Math.min(100, 100 - variance * 10));

  return { prioritized, focusActions, balanceScore };
}

// ═══════════════════════════════════════════
// Main Handler
// ═══════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const targetNutritionistId = body.nutritionist_id as string | undefined;

    // 1. Load nutritionists with active patients
    let npQuery = supabase
      .from("nutritionist_patients")
      .select("nutritionist_id, patient_id")
      .eq("status", "active");

    if (targetNutritionistId) {
      npQuery = npQuery.eq("nutritionist_id", targetNutritionistId);
    }

    const { data: npLinks, error: npErr } = await npQuery;
    if (npErr) throw npErr;
    if (!npLinks?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by nutritionist
    const nutritionistPatients: Record<string, string[]> = {};
    npLinks.forEach((l: any) => {
      if (!nutritionistPatients[l.nutritionist_id]) nutritionistPatients[l.nutritionist_id] = [];
      nutritionistPatients[l.nutritionist_id].push(l.patient_id);
    });

    const allPatientIds = [...new Set(npLinks.map((l: any) => l.patient_id))];

    // 2. Load data in parallel
    const [snapshotsRes, clustersRes, alertsRes, transitionsRes, timelineRes, plansRes] = await Promise.all([
      supabase.from("patient_clinical_snapshots").select("patient_id, clinical_risk_score, adherence_momentum, weight_trend_status, plan_efficacy_score, engagement_stability_index")
        .in("patient_id", allPatientIds).order("snapshot_date", { ascending: false }),
      supabase.from("patient_metabolic_clusters").select("patient_id, cluster_type")
        .in("patient_id", allPatientIds),
      supabase.from("clinical_alerts").select("patient_id, severity")
        .in("patient_id", allPatientIds).eq("is_active", true),
      supabase.from("protocol_transition_suggestions").select("patient_id")
        .in("patient_id", allPatientIds).eq("status", "pending"),
      supabase.from("patient_timeline").select("patient_id, created_at")
        .in("patient_id", allPatientIds).in("event_type", ["patient_contacted", "consultation_completed"])
        .order("created_at", { ascending: false }),
      supabase.from("meal_plans").select("patient_id, created_at, plan_status")
        .in("patient_id", allPatientIds).eq("is_active", true),
    ]);

    // Build lookup maps (latest snapshot per patient)
    const latestSnapshot: Record<string, any> = {};
    (snapshotsRes.data || []).forEach((s: any) => {
      if (!latestSnapshot[s.patient_id]) latestSnapshot[s.patient_id] = s;
    });

    const clusterMap: Record<string, string> = {};
    (clustersRes.data || []).forEach((c: any) => { clusterMap[c.patient_id] = c.cluster_type; });

    const criticalAlerts: Record<string, number> = {};
    (alertsRes.data || []).forEach((a: any) => {
      if (a.severity === "critical") criticalAlerts[a.patient_id] = (criticalAlerts[a.patient_id] || 0) + 1;
    });

    const pendingTransitions = new Set((transitionsRes.data || []).map((t: any) => t.patient_id));

    const lastContact: Record<string, Date> = {};
    (timelineRes.data || []).forEach((t: any) => {
      if (!lastContact[t.patient_id]) lastContact[t.patient_id] = new Date(t.created_at);
    });

    const contactedLast48h = new Set<string>();
    const now = Date.now();
    Object.entries(lastContact).forEach(([pid, date]) => {
      if (now - date.getTime() < 48 * 3600 * 1000) contactedLast48h.add(pid);
    });

    // 3. Process each nutritionist
    let totalProcessed = 0;
    let totalSuggestions = 0;

    for (const [nutritionistId, patientIds] of Object.entries(nutritionistPatients)) {
      const priorityResults: Array<{ patient_id: string; result: PriorityResult }> = [];

      for (const pid of patientIds) {
        const snap = latestSnapshot[pid];
        if (!snap) continue;

        const daysSinceContact = lastContact[pid]
          ? Math.floor((now - lastContact[pid].getTime()) / 86400000)
          : 30;

        const dropoutScore = snap.engagement_stability_index != null
          ? Math.max(0, 100 - snap.engagement_stability_index)
          : 50;

        const input: PatientPriorityInput = {
          patient_id: pid,
          nutritionist_id: nutritionistId,
          clinical_risk_score: snap.clinical_risk_score ?? 30,
          dropout_risk_score: dropoutScore,
          plan_efficacy_score: snap.plan_efficacy_score ?? 50,
          cluster_type: clusterMap[pid] ?? "unknown",
          adherence: snap.adherence_momentum ?? 65,
          weight_trend: snap.weight_trend_status ?? "unknown",
          days_since_contact: daysSinceContact,
          active_critical_alerts: criticalAlerts[pid] || 0,
          has_therapeutic_failure: (snap.plan_efficacy_score ?? 50) < 40 && (snap.adherence_momentum ?? 0) >= 70,
          has_pending_transition: pendingTransitions.has(pid),
        };

        const result = computePriority(input);
        priorityResults.push({ patient_id: pid, result });
      }

      // 4. Upsert priority states
      if (priorityResults.length > 0) {
        const priorityRows = priorityResults.map(({ patient_id, result }) => ({
          patient_id,
          nutritionist_id: nutritionistId,
          priority_score: result.priority_score,
          priority_level: result.priority_level,
          main_priority_reason: result.main_reason,
          risk_score_component: result.components.risk,
          dropout_risk_component: result.components.dropout,
          therapeutic_failure_component: result.components.therapeutic_failure,
          cluster_risk_component: result.components.cluster_risk,
          plan_efficacy_component: result.components.plan_efficacy,
          time_without_intervention_component: result.components.time_without_intervention,
          last_professional_contact_at: lastContact[patient_id]?.toISOString() || null,
          last_calculated_at: new Date().toISOString(),
          engine_version: ENGINE_VERSION,
        }));

        await supabase.from("patient_clinical_priority_state").upsert(priorityRows, {
          onConflict: "patient_id,nutritionist_id",
        });

        // 5. Generate action recommendations for high/critical
        const actionable = priorityResults.filter(
          p => p.result.priority_level === "critical_priority" || p.result.priority_level === "high_priority"
        );

        if (actionable.length > 0) {
          // Delete old pending recommendations
          await supabase.from("clinical_action_recommendations")
            .delete()
            .eq("nutritionist_id", nutritionistId)
            .eq("status", "pending");

          const actionRows = actionable.map(({ patient_id, result }) => ({
            patient_id,
            nutritionist_id: nutritionistId,
            recommended_action: result.recommended_action,
            urgency_level: result.urgency_level,
            reason: result.main_reason,
            expected_clinical_impact: result.expected_impact,
            supporting_data: result.components,
            engine_version: ENGINE_VERSION,
          }));

          await supabase.from("clinical_action_recommendations").insert(actionRows);
          totalSuggestions += actionRows.length;
        }

        // 6. Generate weekly plan
        const weekStart = getMonday(new Date()).toISOString().split("T")[0];
        const { prioritized, focusActions, balanceScore } = generateWeeklyPlan(priorityResults, contactedLast48h);

        await supabase.from("weekly_clinical_orchestration_plan").upsert({
          nutritionist_id: nutritionistId,
          week_start: weekStart,
          prioritized_patients: prioritized,
          suggested_focus_actions: focusActions,
          workload_balance_score: balanceScore,
          total_critical: priorityResults.filter(p => p.result.priority_level === "critical_priority").length,
          total_high: priorityResults.filter(p => p.result.priority_level === "high_priority").length,
          total_medium: priorityResults.filter(p => p.result.priority_level === "medium_priority").length,
          engine_version: ENGINE_VERSION,
        }, { onConflict: "nutritionist_id,week_start" });

        // 7. Portfolio health
        const portfolioHealth = computePortfolioHealth(priorityResults.map(p => p.result), patientIds.length);
        const avgAdherence = priorityResults.reduce((s, p) => s + (latestSnapshot[p.patient_id]?.adherence_momentum ?? 0), 0) / (priorityResults.length || 1);
        const avgEfficacy = priorityResults.reduce((s, p) => s + (latestSnapshot[p.patient_id]?.plan_efficacy_score ?? 0), 0) / (priorityResults.length || 1);

        await supabase.from("clinic_portfolio_state").upsert({
          nutritionist_id: nutritionistId,
          portfolio_health_score: portfolioHealth.score,
          portfolio_classification: portfolioHealth.classification,
          total_patients: patientIds.length,
          patients_at_risk_percent: portfolioHealth.patientsAtRiskPercent,
          avg_plan_efficacy: avgEfficacy,
          avg_adherence: avgAdherence,
          dropout_rate: 0,
          avg_metabolic_evolution: 0,
          critical_count: portfolioHealth.criticalCount,
          high_priority_count: portfolioHealth.highCount,
          engine_version: ENGINE_VERSION,
          last_calculated_at: new Date().toISOString(),
        }, { onConflict: "nutritionist_id" });

        totalProcessed += priorityResults.length;
      }
    }

    return new Response(
      JSON.stringify({
        processed: totalProcessed,
        action_recommendations: totalSuggestions,
        nutritionists: Object.keys(nutritionistPatients).length,
        engine_version: ENGINE_VERSION,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Portfolio orchestration error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}
