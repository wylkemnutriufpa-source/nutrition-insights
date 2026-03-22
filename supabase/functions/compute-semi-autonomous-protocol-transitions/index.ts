import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENGINE_VERSION = "1.0.0";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════
type TransitionDecision =
  | "maintain_current_protocol"
  | "adjust_calories_same_protocol"
  | "switch_template_same_strategy"
  | "switch_protocol_new_strategy"
  | "require_manual_clinical_review";

interface PatientContext {
  patient_id: string;
  nutritionist_id: string;
  current_plan_id: string | null;
  current_protocol_id: string | null;
  plan_age_days: number;
  adherence: number;
  weight_trend: string;
  weight_velocity: number;
  cluster_type: string;
  cluster_stability: number;
  risk_score: number;
  stagnation_days: number;
  active_critical_alerts: number;
  plan_efficacy_score: number;
  plan_complexity: string;
  previous_interventions: number;
  data_points: number;
  is_pregnant: boolean;
  has_critical_condition: boolean;
}

interface TransitionResult {
  decision: TransitionDecision;
  confidence_score: number;
  confidence_level: string;
  clinical_reason: string;
  calorie_adjustment_percent: number;
  suggested_protocol_id: string | null;
  suggested_template_id: string | null;
  expected_outcome: string;
  supporting_metrics: Record<string, unknown>;
}

// ═══════════════════════════════════════════
// Confidence Score Calculator
// ═══════════════════════════════════════════
function computeConfidence(ctx: PatientContext): { score: number; level: string } {
  let score = 50;

  // Data volume (0-25)
  if (ctx.data_points >= 30) score += 25;
  else if (ctx.data_points >= 20) score += 18;
  else if (ctx.data_points >= 10) score += 10;
  else score -= 10;

  // Cluster stability (0-20)
  score += Math.min(20, ctx.cluster_stability * 20);

  // Adherence consistency (0-15)
  if (ctx.adherence >= 70 && ctx.adherence <= 95) score += 15;
  else if (ctx.adherence >= 50) score += 8;
  else score -= 5;

  // Weight trend consistency (0-10)
  if (ctx.weight_trend === "expected_loss" || ctx.weight_trend === "stable") score += 10;
  else if (ctx.weight_trend === "slow_loss") score += 5;

  // Previous intervention history (0-10)
  if (ctx.previous_interventions >= 2) score += 10;
  else if (ctx.previous_interventions >= 1) score += 5;

  score = Math.max(0, Math.min(100, score));
  const level = score >= 70 ? "high_confidence" : score >= 45 ? "medium_confidence" : "low_confidence";
  return { score, level };
}

// ═══════════════════════════════════════════
// Safety Checks
// ═══════════════════════════════════════════
function shouldBlockAutomation(ctx: PatientContext): string | null {
  if (ctx.has_critical_condition) return "Paciente com condição crítica ativa";
  if (ctx.is_pregnant) return "Paciente gestante — revisão manual obrigatória";
  if (ctx.plan_age_days < 7) return "Plano atual com menos de 7 dias";
  if (ctx.adherence < 40) return "Adesão abaixo de 40% — dados insuficientes para decisão";
  if (ctx.data_points < 5) return "Dados insuficientes para análise";
  if (ctx.active_critical_alerts > 0) return "Alerta crítico ativo sem resolução";
  return null;
}

// ═══════════════════════════════════════════
// Decision Engine
// ═══════════════════════════════════════════
function computeTransitionDecision(ctx: PatientContext): TransitionResult {
  const blockReason = shouldBlockAutomation(ctx);
  if (blockReason) {
    const conf = computeConfidence(ctx);
    return {
      decision: "require_manual_clinical_review",
      confidence_score: Math.min(conf.score, 30),
      confidence_level: "low_confidence",
      clinical_reason: blockReason,
      calorie_adjustment_percent: 0,
      suggested_protocol_id: null,
      suggested_template_id: null,
      expected_outcome: "Revisão clínica manual necessária antes de qualquer alteração.",
      supporting_metrics: buildMetrics(ctx),
    };
  }

  const conf = computeConfidence(ctx);

  // Scenario 1: Good response — maintain
  if (
    ctx.adherence >= 75 &&
    (ctx.weight_trend === "expected_loss" || ctx.weight_trend === "stable") &&
    ctx.risk_score < 60 &&
    ctx.plan_efficacy_score >= 60
  ) {
    return {
      decision: "maintain_current_protocol",
      confidence_score: conf.score,
      confidence_level: conf.level,
      clinical_reason: `Protocolo atual com boa resposta: adesão ${ctx.adherence.toFixed(0)}%, tendência de peso adequada, score de eficácia ${ctx.plan_efficacy_score.toFixed(0)}.`,
      calorie_adjustment_percent: 0,
      suggested_protocol_id: null,
      suggested_template_id: null,
      expected_outcome: "Manter protocolo atual — resposta clínica dentro do esperado.",
      supporting_metrics: buildMetrics(ctx),
    };
  }

  // Scenario 2: Partial response — adjust calories
  if (
    ctx.adherence >= 70 &&
    (ctx.weight_trend === "slow_loss" || ctx.weight_trend === "stagnated") &&
    ctx.stagnation_days <= 21 &&
    (ctx.cluster_type === "metabolic_adaptive" || ctx.cluster_type === "resistant_profile")
  ) {
    const adjustment = ctx.weight_trend === "stagnated" ? -8 : -5;
    return {
      decision: "adjust_calories_same_protocol",
      confidence_score: conf.score,
      confidence_level: conf.level,
      clinical_reason: `Resposta parcial: adesão ${ctx.adherence.toFixed(0)}%, tendência ${ctx.weight_trend}, cluster ${ctx.cluster_type}. Ajuste calórico de ${adjustment}% recomendado dentro do mesmo protocolo.`,
      calorie_adjustment_percent: adjustment,
      suggested_protocol_id: ctx.current_protocol_id,
      suggested_template_id: null,
      expected_outcome: "Ajuste calórico moderado para acelerar resposta sem alterar estratégia.",
      supporting_metrics: buildMetrics(ctx),
    };
  }

  // Scenario 3: Low adherence due to complexity — switch template
  if (
    ctx.adherence < 65 &&
    (ctx.cluster_type === "behavioral_struggler" || ctx.cluster_type === "disengaging_patient") &&
    (ctx.plan_complexity === "high" || ctx.plan_complexity === "medium")
  ) {
    return {
      decision: "switch_template_same_strategy",
      confidence_score: conf.score,
      confidence_level: conf.level,
      clinical_reason: `Baixa adesão (${ctx.adherence.toFixed(0)}%) associada a alta complexidade do plano e cluster ${ctx.cluster_type}. Recomenda-se template mais simples mantendo mesmo objetivo calórico.`,
      calorie_adjustment_percent: 0,
      suggested_protocol_id: ctx.current_protocol_id,
      suggested_template_id: null, // Will be resolved by the dashboard
      expected_outcome: "Reduzir complexidade do plano para melhorar adesão sem alterar objetivo.",
      supporting_metrics: buildMetrics(ctx),
    };
  }

  // Scenario 4: Therapeutic failure — switch protocol
  if (
    ctx.plan_age_days >= 21 &&
    ctx.adherence >= 70 &&
    (ctx.weight_trend === "stagnated" || ctx.weight_trend === "gaining") &&
    ctx.plan_efficacy_score < 45 &&
    ctx.stagnation_days >= 14
  ) {
    return {
      decision: "switch_protocol_new_strategy",
      confidence_score: conf.score,
      confidence_level: conf.level,
      clinical_reason: `Falha terapêutica real: plano com ${ctx.plan_age_days} dias, adesão ${ctx.adherence.toFixed(0)}%, mas sem resposta adequada (eficácia ${ctx.plan_efficacy_score.toFixed(0)}). Estagnação há ${ctx.stagnation_days} dias. Cluster: ${ctx.cluster_type}. Migração de protocolo recomendada.`,
      calorie_adjustment_percent: 0,
      suggested_protocol_id: null, // Will be resolved by best match
      suggested_template_id: null,
      expected_outcome: "Migrar para protocolo com melhor histórico de eficácia para este perfil metabólico.",
      supporting_metrics: buildMetrics(ctx),
    };
  }

  // Scenario 5: Ambiguous / conflicting signals
  return {
    decision: "require_manual_clinical_review",
    confidence_score: Math.min(conf.score, 45),
    confidence_level: "low_confidence",
    clinical_reason: `Sinais conflitantes: adesão ${ctx.adherence.toFixed(0)}%, tendência ${ctx.weight_trend}, cluster ${ctx.cluster_type}, eficácia ${ctx.plan_efficacy_score.toFixed(0)}. Revisão clínica manual recomendada.`,
    calorie_adjustment_percent: 0,
    suggested_protocol_id: null,
    suggested_template_id: null,
    expected_outcome: "Avaliação manual necessária para definir melhor estratégia.",
    supporting_metrics: buildMetrics(ctx),
  };
}

function buildMetrics(ctx: PatientContext): Record<string, unknown> {
  return {
    adherence: ctx.adherence,
    weight_trend: ctx.weight_trend,
    weight_velocity: ctx.weight_velocity,
    cluster_type: ctx.cluster_type,
    cluster_stability: ctx.cluster_stability,
    risk_score: ctx.risk_score,
    stagnation_days: ctx.stagnation_days,
    plan_age_days: ctx.plan_age_days,
    plan_efficacy_score: ctx.plan_efficacy_score,
    plan_complexity: ctx.plan_complexity,
    active_critical_alerts: ctx.active_critical_alerts,
    data_points: ctx.data_points,
    previous_interventions: ctx.previous_interventions,
  };
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
    const singlePatientId = body.patient_id as string | undefined;

    // 1. Load eligible patients with active plans
    let patientsQuery = supabase
      .from("nutritionist_patients")
      .select("patient_id, nutritionist_id")
      .eq("status", "active");

    if (singlePatientId) {
      patientsQuery = patientsQuery.eq("patient_id", singlePatientId);
    }

    const { data: patients, error: pErr } = await patientsQuery;
    if (pErr) throw pErr;
    if (!patients?.length) {
      return new Response(JSON.stringify({ processed: 0, message: "No eligible patients" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const patientIds = patients.map((p: any) => p.patient_id);
    const nutritionistMap: Record<string, string> = {};
    patients.forEach((p: any) => { nutritionistMap[p.patient_id] = p.nutritionist_id; });

    // 2. Load data in parallel
    const [
      plansRes, snapshotsRes, clustersRes, alertsRes, interventionsRes, profilesRes
    ] = await Promise.all([
      supabase.from("meal_plans").select("id, patient_id, created_at, is_active, plan_status, generation_metadata, template_slug")
        .in("patient_id", patientIds).eq("is_active", true).eq("plan_status", "published_to_patient"),
      supabase.from("patient_clinical_snapshots").select("*")
        .in("patient_id", patientIds).order("snapshot_date", { ascending: false }),
      supabase.from("patient_metabolic_clusters").select("patient_id, cluster_type, cluster_confidence, updated_at")
        .in("patient_id", patientIds),
      supabase.from("clinical_alerts").select("patient_id, severity")
        .in("patient_id", patientIds).eq("is_active", true),
      supabase.from("protocol_transition_suggestions").select("patient_id")
        .in("patient_id", patientIds).eq("status", "pending"),
      supabase.from("profiles").select("user_id, pregnancy_status")
        .in("user_id", patientIds),
    ]);

    // Build lookup maps
    const plansByPatient: Record<string, any> = {};
    (plansRes.data || []).forEach((p: any) => { plansByPatient[p.patient_id] = p; });

    const snapshotsByPatient: Record<string, any[]> = {};
    (snapshotsRes.data || []).forEach((s: any) => {
      if (!snapshotsByPatient[s.patient_id]) snapshotsByPatient[s.patient_id] = [];
      snapshotsByPatient[s.patient_id].push(s);
    });

    const clusterByPatient: Record<string, any> = {};
    (clustersRes.data || []).forEach((c: any) => { clusterByPatient[c.patient_id] = c; });

    const criticalAlertsByPatient: Record<string, number> = {};
    (alertsRes.data || []).forEach((a: any) => {
      if (a.severity === "critical") {
        criticalAlertsByPatient[a.patient_id] = (criticalAlertsByPatient[a.patient_id] || 0) + 1;
      }
    });

    const pendingByPatient = new Set((interventionsRes.data || []).map((i: any) => i.patient_id));

    const pregnancyByPatient: Record<string, boolean> = {};
    (profilesRes.data || []).forEach((p: any) => {
      pregnancyByPatient[p.user_id] = p.pregnancy_status === "pregnant";
    });

    // 3. Process each patient
    const suggestions: any[] = [];
    let skipped = 0;

    for (const pid of patientIds) {
      // Skip if already has pending suggestion
      if (pendingByPatient.has(pid)) { skipped++; continue; }

      const plan = plansByPatient[pid];
      if (!plan) { skipped++; continue; }

      const snapshots = snapshotsByPatient[pid] || [];
      if (snapshots.length < 3) { skipped++; continue; }

      const latest = snapshots[0];
      const cluster = clusterByPatient[pid];
      const planCreated = new Date(plan.created_at);
      const planAgeDays = Math.floor((Date.now() - planCreated.getTime()) / 86400000);

      // Determine plan complexity from template metadata
      const meta = plan.generation_metadata as any;
      let complexity = "medium";
      if (meta?.complexity_level) complexity = meta.complexity_level;
      else if (meta?.meals_per_day && meta.meals_per_day >= 6) complexity = "high";

      // Calculate stagnation days
      let stagnationDays = 0;
      for (let i = 0; i < snapshots.length - 1; i++) {
        const s = snapshots[i];
        if (s.weight_trend_status === "stagnated" || s.weight_trend_status === "plateau") {
          stagnationDays += 1; // each snapshot ~6h, approximate
        } else break;
      }
      stagnationDays = Math.min(stagnationDays * 0.25, planAgeDays); // rough days estimate

      const toNum = (v: unknown, fallback: number): number => {
        if (v == null) return fallback;
        const n = Number(v);
        return isNaN(n) ? fallback : n;
      };

      const ctx: PatientContext = {
        patient_id: pid,
        nutritionist_id: nutritionistMap[pid],
        current_plan_id: plan.id,
        current_protocol_id: meta?.protocol_id || null,
        plan_age_days: planAgeDays,
        adherence: toNum(latest.adherence_momentum, 65),
        weight_trend: latest.weight_trend_status ?? "unknown",
        weight_velocity: toNum(latest.weight_velocity_per_week, 0),
        cluster_type: cluster?.cluster_type ?? "unknown",
        cluster_stability: toNum(cluster?.cluster_confidence, 0.5),
        risk_score: toNum(latest.clinical_risk_score, 50),
        stagnation_days: stagnationDays,
        active_critical_alerts: criticalAlertsByPatient[pid] || 0,
        plan_efficacy_score: toNum(latest.plan_efficacy_score, 50),
        plan_complexity: complexity,
        previous_interventions: 0, // counted below
        data_points: snapshots.length,
        is_pregnant: pregnancyByPatient[pid] || false,
        has_critical_condition: (criticalAlertsByPatient[pid] || 0) > 2,
      };

      const result = computeTransitionDecision(ctx);

      // Don't create suggestions for "maintain" unless forced
      if (result.decision === "maintain_current_protocol") continue;

      suggestions.push({
        patient_id: pid,
        nutritionist_id: nutritionistMap[pid],
        current_plan_id: plan.id,
        current_protocol_id: ctx.current_protocol_id,
        suggested_protocol_id: result.suggested_protocol_id,
        suggested_template_id: result.suggested_template_id,
        transition_type: result.decision,
        calorie_adjustment_percent: result.calorie_adjustment_percent,
        expected_strategy_outcome: result.expected_outcome,
        clinical_reason: result.clinical_reason,
        supporting_metrics: result.supporting_metrics,
        confidence_score: result.confidence_score,
        confidence_level: result.confidence_level,
        engine_version: ENGINE_VERSION,
        status: "pending",
      });
    }

    // 4. Batch insert suggestions
    if (suggestions.length > 0) {
      const { error: insertErr } = await supabase
        .from("protocol_transition_suggestions")
        .insert(suggestions);
      if (insertErr) throw insertErr;

      // Register timeline events
      const timelineEvents = suggestions.map((s: any) => ({
        patient_id: s.patient_id,
        event_type: "protocol_transition_suggested",
        title: "Transição de protocolo sugerida",
        description: s.clinical_reason.substring(0, 200),
        metadata: {
          transition_type: s.transition_type,
          confidence_score: s.confidence_score,
          engine_version: ENGINE_VERSION,
        },
        created_by: s.nutritionist_id,
      }));
      await supabase.from("patient_timeline").insert(timelineEvents);
    }

    return new Response(
      JSON.stringify({
        processed: patientIds.length,
        suggestions_created: suggestions.length,
        skipped,
        engine_version: ENGINE_VERSION,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Protocol transition engine error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
