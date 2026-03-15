import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENGINE_VERSION = "1.0.0";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════
interface PatientState {
  patient_id: string;
  clinical_risk_score: number;
  dropout_risk_score: number;
  regression_risk_score: number;
  performance_score: number;
  cluster_type: string;
  adherence: number;
  days_since_intervention: number;
  physiological_stress: number;
  has_critical_alerts: boolean;
  has_therapeutic_failure: boolean;
  has_pending_transition: boolean;
  plan_efficacy: number;
}

interface TherapeuticPriority {
  therapeutic_priority_score: number;
  priority_classification: string;
  components: {
    clinical_risk: number;
    dropout_risk: number;
    regression_risk: number;
    performance: number;
    time_since_intervention: number;
    cluster_behavior: number;
    physiological: number;
  };
  main_driver: string;
  recommended_action: string;
  action_urgency: string;
  action_expected_impact: string;
  action_clinical_driver: string;
  action_group: string;
}

// ═══════════════════════════════════════════
// Therapeutic Priority Calculator
// ═══════════════════════════════════════════
function computeTherapeuticPriority(state: PatientState): TherapeuticPriority {
  // Component weights (total = 1.0)
  const clinicalRisk = Math.min(100, state.clinical_risk_score) * 0.22;
  const dropoutRisk = Math.min(100, state.dropout_risk_score) * 0.20;
  const regressionRisk = Math.min(100, state.regression_risk_score) * 0.12;
  const performanceInverse = Math.max(0, 100 - state.performance_score) * 0.10;
  const timeComponent = Math.min(100, (state.days_since_intervention / 14) * 100) * 0.12;
  const clusterRiskMap: Record<string, number> = {
    disengaging_patient: 95, behavioral_struggler: 75, resistant_profile: 60,
    metabolic_adaptive: 40, metabolic_responder: 15, unknown: 50,
  };
  const clusterComponent = (clusterRiskMap[state.cluster_type] ?? 50) * 0.14;
  const physioComponent = Math.min(100, state.physiological_stress) * 0.10;

  const rawScore = clinicalRisk + dropoutRisk + regressionRisk + performanceInverse +
    timeComponent + clusterComponent + physioComponent;
  const score = Math.max(0, Math.min(100, rawScore));

  // Classification
  let classification: string;
  if (score >= 80) classification = "urgente";
  else if (score >= 60) classification = "alta_prioridade";
  else if (score >= 40) classification = "media_prioridade";
  else classification = "monitoramento";

  // Main driver
  const drivers = [
    { name: "risco clínico", value: clinicalRisk },
    { name: "risco de abandono", value: dropoutRisk },
    { name: "risco de regressão", value: regressionRisk },
    { name: "baixa performance", value: performanceInverse },
    { name: "tempo sem intervenção", value: timeComponent },
    { name: "cluster comportamental", value: clusterComponent },
    { name: "estresse fisiológico", value: physioComponent },
  ].sort((a, b) => b.value - a.value);

  // Recommended action
  const { action, urgency, impact, driver, group } = determineTherapeuticAction(state, score, classification);

  return {
    therapeutic_priority_score: score,
    priority_classification: classification,
    components: {
      clinical_risk: clinicalRisk,
      dropout_risk: dropoutRisk,
      regression_risk: regressionRisk,
      performance: performanceInverse,
      time_since_intervention: timeComponent,
      cluster_behavior: clusterComponent,
      physiological: physioComponent,
    },
    main_driver: drivers[0].name,
    recommended_action: action,
    action_urgency: urgency,
    action_expected_impact: impact,
    action_clinical_driver: driver,
    action_group: group,
  };
}

function determineTherapeuticAction(
  state: PatientState, score: number, classification: string
): { action: string; urgency: string; impact: string; driver: string; group: string } {
  if (classification === "urgente" && state.has_critical_alerts) {
    return {
      action: "immediate_protocol_adjustment",
      urgency: "critical",
      impact: "Evitar agravamento clínico e abandono terapêutico",
      driver: "Alertas críticos ativos com risco elevado",
      group: "intervencao_urgente",
    };
  }
  if (state.has_therapeutic_failure && state.has_pending_transition) {
    return {
      action: "immediate_protocol_adjustment",
      urgency: "high",
      impact: "Transição terapêutica pendente para retomar evolução",
      driver: "Falha terapêutica com transição pronta",
      group: "ajuste_protocolo",
    };
  }
  if (state.dropout_risk_score >= 70) {
    return {
      action: "apply_behavioral_simplification",
      urgency: "high",
      impact: "Simplificar plano para reduzir risco de abandono",
      driver: "Risco de abandono elevado",
      group: "simplificacao_comportamental",
    };
  }
  if (state.plan_efficacy < 40 && state.adherence >= 70) {
    return {
      action: "immediate_protocol_adjustment",
      urgency: "high",
      impact: "Plano com baixa eficácia apesar de boa adesão",
      driver: "Descompasso entre adesão e resultado",
      group: "ajuste_protocolo",
    };
  }
  if (state.regression_risk_score >= 60) {
    return {
      action: "initiate_diet_break_review",
      urgency: "medium",
      impact: "Avaliar diet break para evitar regressão metabólica",
      driver: "Risco de regressão elevado",
      group: "ajuste_protocolo",
    };
  }
  if (state.days_since_intervention >= 10) {
    return {
      action: "schedule_followup_contact",
      urgency: "medium",
      impact: "Restabelecer vínculo profissional e monitorar evolução",
      driver: "Tempo prolongado sem contato",
      group: "intervencao_urgente",
    };
  }
  if (state.cluster_type === "disengaging_patient") {
    return {
      action: "apply_behavioral_simplification",
      urgency: "high",
      impact: "Paciente em processo de desengajamento",
      driver: "Cluster comportamental crítico",
      group: "simplificacao_comportamental",
    };
  }
  if (state.physiological_stress >= 70 && state.performance_score < 50) {
    return {
      action: "escalate_risk_management",
      urgency: "medium",
      impact: "Estresse fisiológico comprometendo performance",
      driver: "Sobrecarga fisiológica detectada",
      group: "ajuste_protocolo",
    };
  }
  if (score < 30 && state.adherence >= 70 && state.performance_score >= 60) {
    return {
      action: "monitor_without_change",
      urgency: "low",
      impact: "Paciente evoluindo dentro do esperado",
      driver: "Evolução positiva com baixo risco",
      group: "evolucao_positiva",
    };
  }
  if (score < 40) {
    return {
      action: "monitor_without_change",
      urgency: "low",
      impact: "Manter monitoramento preventivo",
      driver: "Risco moderado controlado",
      group: "monitoramento_leve",
    };
  }
  return {
    action: "schedule_followup_contact",
    urgency: "medium",
    impact: "Avaliar situação clínica e definir próximo passo",
    driver: "Múltiplos fatores de risco moderados",
    group: "intervencao_urgente",
  };
}

// ═══════════════════════════════════════════
// Weekly Focus Message Generator
// ═══════════════════════════════════════════
function generateWeeklyFocus(groups: Record<string, number>, totalPatients: number): string {
  const messages: string[] = [];
  const urgentPct = ((groups["intervencao_urgente"] || 0) / Math.max(totalPatients, 1)) * 100;
  const behavioralPct = ((groups["simplificacao_comportamental"] || 0) / Math.max(totalPatients, 1)) * 100;
  const positivePct = ((groups["evolucao_positiva"] || 0) / Math.max(totalPatients, 1)) * 100;

  if (urgentPct > 20) {
    messages.push("⚠️ Priorizar intervenções urgentes — carteira com alta concentração de risco");
  } else if (behavioralPct > 15) {
    messages.push("🧠 Foco em recuperação comportamental — simplificar planos e reengajar pacientes");
  } else if (positivePct > 50) {
    messages.push("✅ Semana positiva — carteira estável, focar em otimização e manutenção");
  } else {
    messages.push("📋 Semana equilibrada — distribuir atenção entre ajustes e monitoramento");
  }

  return messages[0];
}

// ═══════════════════════════════════════════
// Weekly Plan Generator
// ═══════════════════════════════════════════
function generateWeeklyPlan(
  priorities: Array<{ patient_id: string; result: TherapeuticPriority }>,
  contactedLast48h: Set<string>
) {
  const eligible = priorities
    .filter(p => !contactedLast48h.has(p.patient_id))
    .sort((a, b) => b.result.therapeutic_priority_score - a.result.therapeutic_priority_score);

  const topPatients = eligible.slice(0, 20);
  const days = ["segunda", "terca", "quarta", "quinta", "sexta"];
  const dailySlots = 4;
  const prioritized: any[] = [];

  topPatients.forEach((p, i) => {
    const dayIndex = Math.min(Math.floor(i / dailySlots), days.length - 1);
    prioritized.push({
      patient_id: p.patient_id,
      priority_score: p.result.therapeutic_priority_score,
      priority_classification: p.result.priority_classification,
      recommended_action: p.result.recommended_action,
      action_group: p.result.action_group,
      main_driver: p.result.main_driver,
      suggested_day: days[dayIndex],
      day_slot: (i % dailySlots) + 1,
    });
  });

  const focusActions: Record<string, number> = {};
  topPatients.forEach(p => {
    focusActions[p.result.recommended_action] = (focusActions[p.result.recommended_action] || 0) + 1;
  });

  const dayCounts = days.map((_, i) => prioritized.filter(p => p.suggested_day === days[i]).length);
  const avgPerDay = topPatients.length / days.length;
  const variance = dayCounts.reduce((s, c) => s + Math.pow(c - avgPerDay, 2), 0) / days.length;
  const balanceScore = Math.max(0, Math.min(100, 100 - variance * 10));

  return {
    prioritized,
    focusActions: Object.entries(focusActions).sort(([, a], [, b]) => b - a).map(([action, count]) => ({ action, count })),
    balanceScore,
  };
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(new Date(d).setDate(diff));
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

    const nutritionistPatients: Record<string, string[]> = {};
    npLinks.forEach((l: any) => {
      if (!nutritionistPatients[l.nutritionist_id]) nutritionistPatients[l.nutritionist_id] = [];
      nutritionistPatients[l.nutritionist_id].push(l.patient_id);
    });

    const allPatientIds = [...new Set(npLinks.map((l: any) => l.patient_id))];

    // 2. Load data in parallel
    const [snapshotsRes, clustersRes, alertsRes, transitionsRes, timelineRes, performanceRes, dropoutRes] = await Promise.all([
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
      supabase.from("patient_performance_state").select("patient_id, overall_performance_score, stress_score")
        .in("patient_id", allPatientIds),
      supabase.from("behavioral_recovery_actions").select("patient_id, dropout_risk_score")
        .in("patient_id", allPatientIds).eq("status", "pending"),
    ]);

    // Build lookup maps
    const latestSnapshot: Record<string, any> = {};
    (snapshotsRes.data || []).forEach((s: any) => {
      if (!latestSnapshot[s.patient_id]) latestSnapshot[s.patient_id] = s;
    });

    const clusterMap: Record<string, string> = {};
    (clustersRes.data || []).forEach((c: any) => { clusterMap[c.patient_id] = c.cluster_type; });

    const criticalAlerts: Record<string, boolean> = {};
    (alertsRes.data || []).forEach((a: any) => {
      if (a.severity === "critical") criticalAlerts[a.patient_id] = true;
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

    const performanceMap: Record<string, any> = {};
    (performanceRes.data || []).forEach((p: any) => { performanceMap[p.patient_id] = p; });

    const dropoutMap: Record<string, number> = {};
    (dropoutRes.data || []).forEach((d: any) => {
      dropoutMap[d.patient_id] = Math.max(dropoutMap[d.patient_id] || 0, d.dropout_risk_score);
    });

    // 3. Process each nutritionist
    let totalProcessed = 0;
    let totalActions = 0;

    for (const [nutritionistId, patientIds] of Object.entries(nutritionistPatients)) {
      const priorityResults: Array<{ patient_id: string; result: TherapeuticPriority }> = [];

      for (const pid of patientIds) {
        const snap = latestSnapshot[pid];
        if (!snap) continue;

        const daysSinceIntervention = lastContact[pid]
          ? Math.floor((now - lastContact[pid].getTime()) / 86400000)
          : 30;

        const dropoutScore = dropoutMap[pid] ??
          (snap.engagement_stability_index != null ? Math.max(0, 100 - snap.engagement_stability_index) : 50);

        const perf = performanceMap[pid];

        const state: PatientState = {
          patient_id: pid,
          clinical_risk_score: snap.clinical_risk_score ?? 30,
          dropout_risk_score: dropoutScore,
          regression_risk_score: snap.weight_trend_status === "gaining" ? 70 : (snap.weight_trend_status === "stagnated" ? 50 : 20),
          performance_score: perf?.overall_performance_score ?? 50,
          cluster_type: clusterMap[pid] ?? "unknown",
          adherence: snap.adherence_momentum ?? 65,
          days_since_intervention: daysSinceIntervention,
          physiological_stress: perf?.stress_score ?? 30,
          has_critical_alerts: !!criticalAlerts[pid],
          has_therapeutic_failure: (snap.plan_efficacy_score ?? 50) < 40 && (snap.adherence_momentum ?? 0) >= 70,
          has_pending_transition: pendingTransitions.has(pid),
          plan_efficacy: snap.plan_efficacy_score ?? 50,
        };

        const result = computeTherapeuticPriority(state);
        priorityResults.push({ patient_id: pid, result });
      }

      if (priorityResults.length === 0) continue;

      // 4. Persist therapeutic priority states
      const priorityRows = priorityResults.map(({ patient_id, result }) => ({
        patient_id,
        nutritionist_id: nutritionistId,
        therapeutic_priority_score: result.therapeutic_priority_score,
        priority_classification: result.priority_classification,
        clinical_risk_component: result.components.clinical_risk,
        dropout_risk_component: result.components.dropout_risk,
        regression_risk_component: result.components.regression_risk,
        performance_component: result.components.performance,
        time_since_intervention_component: result.components.time_since_intervention,
        cluster_behavior_component: result.components.cluster_behavior,
        physiological_component: result.components.physiological,
        main_driver: result.main_driver,
        recommended_clinical_action: result.recommended_action,
        action_urgency: result.action_urgency,
        action_expected_impact: result.action_expected_impact,
        action_clinical_driver: result.action_clinical_driver,
        action_group: result.action_group,
        engine_version: ENGINE_VERSION,
        last_calculated_at: new Date().toISOString(),
      }));

      await supabase.from("patient_therapeutic_priority_state").upsert(priorityRows, {
        onConflict: "patient_id,nutritionist_id",
      });

      // 5. Generate action groups snapshot
      const groupCounts: Record<string, { count: number; totalRisk: number; totalPriority: number; patientIds: string[] }> = {};
      const groupTypes = ["intervencao_urgente", "ajuste_protocolo", "simplificacao_comportamental", "monitoramento_leve", "evolucao_positiva"];
      groupTypes.forEach(g => { groupCounts[g] = { count: 0, totalRisk: 0, totalPriority: 0, patientIds: [] }; });

      priorityResults.forEach(({ patient_id, result }) => {
        const group = groupCounts[result.action_group] || groupCounts["monitoramento_leve"];
        group.count++;
        group.totalRisk += latestSnapshot[patient_id]?.clinical_risk_score ?? 0;
        group.totalPriority += result.therapeutic_priority_score;
        group.patientIds.push(patient_id);
      });

      const groupRows = groupTypes.map(g => ({
        nutritionist_id: nutritionistId,
        snapshot_date: new Date().toISOString().split("T")[0],
        group_type: g,
        patients_count: groupCounts[g].count,
        avg_risk: groupCounts[g].count > 0 ? groupCounts[g].totalRisk / groupCounts[g].count : 0,
        avg_priority: groupCounts[g].count > 0 ? groupCounts[g].totalPriority / groupCounts[g].count : 0,
        patient_ids: groupCounts[g].patientIds,
        engine_version: ENGINE_VERSION,
      }));

      await supabase.from("organization_action_groups_snapshot").upsert(groupRows, {
        onConflict: "nutritionist_id,snapshot_date,group_type",
      });

      // 6. Generate weekly plan
      const weekStart = getMonday(new Date()).toISOString().split("T")[0];
      const { prioritized, focusActions, balanceScore } = generateWeeklyPlan(priorityResults, contactedLast48h);
      const focusMessage = generateWeeklyFocus(
        Object.fromEntries(groupTypes.map(g => [g, groupCounts[g].count])),
        patientIds.length
      );

      await supabase.from("weekly_clinical_orchestration_plan").upsert({
        nutritionist_id: nutritionistId,
        week_start: weekStart,
        prioritized_patients: prioritized,
        suggested_focus_actions: focusActions,
        workload_balance_score: balanceScore,
        total_critical: priorityResults.filter(p => p.result.priority_classification === "urgente").length,
        total_high: priorityResults.filter(p => p.result.priority_classification === "alta_prioridade").length,
        total_medium: priorityResults.filter(p => p.result.priority_classification === "media_prioridade").length,
        engine_version: ENGINE_VERSION,
      }, { onConflict: "nutritionist_id,week_start" });

      // 7. Generate action recommendations for urgent/high
      const actionable = priorityResults.filter(
        p => p.result.priority_classification === "urgente" || p.result.priority_classification === "alta_prioridade"
      );

      if (actionable.length > 0) {
        await supabase.from("clinical_action_recommendations")
          .delete()
          .eq("nutritionist_id", nutritionistId)
          .eq("status", "pending");

        const actionRows = actionable.map(({ patient_id, result }) => ({
          patient_id,
          nutritionist_id: nutritionistId,
          recommended_action: result.recommended_action,
          urgency_level: result.action_urgency,
          reason: result.action_clinical_driver,
          expected_clinical_impact: result.action_expected_impact,
          supporting_data: result.components,
          engine_version: ENGINE_VERSION,
        }));

        await supabase.from("clinical_action_recommendations").insert(actionRows);
        totalActions += actionRows.length;
      }

      totalProcessed += priorityResults.length;
    }

    return new Response(JSON.stringify({
      processed: totalProcessed,
      action_recommendations: totalActions,
      engine_version: ENGINE_VERSION,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
