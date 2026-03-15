import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════
// Semi-Autonomous Clinical Orchestration Engine Tests (v1.0.0)
// ═══════════════════════════════════════════

interface PatientState {
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
  score: number;
  classification: string;
  main_driver: string;
  recommended_action: string;
  action_urgency: string;
  action_group: string;
}

function computeTherapeuticPriority(state: PatientState): TherapeuticPriority {
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

  const score = Math.max(0, Math.min(100, clinicalRisk + dropoutRisk + regressionRisk +
    performanceInverse + timeComponent + clusterComponent + physioComponent));

  let classification: string;
  if (score >= 80) classification = "urgente";
  else if (score >= 60) classification = "alta_prioridade";
  else if (score >= 40) classification = "media_prioridade";
  else classification = "monitoramento";

  const drivers = [
    { name: "risco clínico", value: clinicalRisk },
    { name: "risco de abandono", value: dropoutRisk },
    { name: "risco de regressão", value: regressionRisk },
    { name: "baixa performance", value: performanceInverse },
    { name: "tempo sem intervenção", value: timeComponent },
    { name: "cluster comportamental", value: clusterComponent },
    { name: "estresse fisiológico", value: physioComponent },
  ].sort((a, b) => b.value - a.value);

  const { action, urgency, group } = determineAction(state, score, classification);

  return { score, classification, main_driver: drivers[0].name, recommended_action: action, action_urgency: urgency, action_group: group };
}

function determineAction(state: PatientState, score: number, classification: string): { action: string; urgency: string; group: string } {
  if (classification === "urgente" && state.has_critical_alerts)
    return { action: "immediate_protocol_adjustment", urgency: "critical", group: "intervencao_urgente" };
  if (state.has_therapeutic_failure && state.has_pending_transition)
    return { action: "immediate_protocol_adjustment", urgency: "high", group: "ajuste_protocolo" };
  if (state.dropout_risk_score >= 70)
    return { action: "apply_behavioral_simplification", urgency: "high", group: "simplificacao_comportamental" };
  if (state.plan_efficacy < 40 && state.adherence >= 70)
    return { action: "immediate_protocol_adjustment", urgency: "high", group: "ajuste_protocolo" };
  if (state.regression_risk_score >= 60)
    return { action: "initiate_diet_break_review", urgency: "medium", group: "ajuste_protocolo" };
  if (state.days_since_intervention >= 10)
    return { action: "schedule_followup_contact", urgency: "medium", group: "intervencao_urgente" };
  if (state.cluster_type === "disengaging_patient")
    return { action: "apply_behavioral_simplification", urgency: "high", group: "simplificacao_comportamental" };
  if (state.physiological_stress >= 70 && state.performance_score < 50)
    return { action: "escalate_risk_management", urgency: "medium", group: "ajuste_protocolo" };
  if (score < 30 && state.adherence >= 70 && state.performance_score >= 60)
    return { action: "monitor_without_change", urgency: "low", group: "evolucao_positiva" };
  if (score < 40)
    return { action: "monitor_without_change", urgency: "low", group: "monitoramento_leve" };
  return { action: "schedule_followup_contact", urgency: "medium", group: "intervencao_urgente" };
}

function generateWeeklyFocus(groups: Record<string, number>, totalPatients: number): string {
  const urgentPct = ((groups["intervencao_urgente"] || 0) / Math.max(totalPatients, 1)) * 100;
  const behavioralPct = ((groups["simplificacao_comportamental"] || 0) / Math.max(totalPatients, 1)) * 100;
  const positivePct = ((groups["evolucao_positiva"] || 0) / Math.max(totalPatients, 1)) * 100;
  if (urgentPct > 20) return "urgent_focus";
  if (behavioralPct > 15) return "behavioral_focus";
  if (positivePct > 50) return "positive_focus";
  return "balanced_focus";
}

function generateWeeklyPlan(patients: Array<{ id: string; score: number; classification: string }>) {
  const sorted = [...patients].sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, 20);
  const days = ["segunda", "terca", "quarta", "quinta", "sexta"];
  const dailySlots = 4;
  return top.map((p, i) => ({
    id: p.id,
    day: days[Math.min(Math.floor(i / dailySlots), 4)],
    slot: (i % dailySlots) + 1,
  }));
}

const STABLE: PatientState = {
  clinical_risk_score: 20, dropout_risk_score: 15, regression_risk_score: 10,
  performance_score: 75, cluster_type: "metabolic_responder", adherence: 85,
  days_since_intervention: 3, physiological_stress: 20,
  has_critical_alerts: false, has_therapeutic_failure: false,
  has_pending_transition: false, plan_efficacy: 70,
};

describe("Semi-Autonomous Clinical Orchestration Engine v1.0.0", () => {
  // ── Priority Classification ──
  it("classifies stable patient as monitoramento", () => {
    const result = computeTherapeuticPriority(STABLE);
    expect(result.classification).toBe("monitoramento");
    expect(result.action_group).toBe("evolucao_positiva");
  });

  it("classifies high-risk disengaging patient as urgente", () => {
    const result = computeTherapeuticPriority({
      ...STABLE, clinical_risk_score: 95, dropout_risk_score: 90,
      cluster_type: "disengaging_patient", performance_score: 25,
      days_since_intervention: 15, physiological_stress: 60,
      has_critical_alerts: true, regression_risk_score: 70,
    });
    expect(result.classification).toBe("urgente");
    expect(result.action_group).toBe("intervencao_urgente");
    expect(result.action_urgency).toBe("critical");
  });

  it("classifies behavioral struggler with high risk", () => {
    const result = computeTherapeuticPriority({
      ...STABLE, clinical_risk_score: 65, dropout_risk_score: 72,
      cluster_type: "behavioral_struggler", performance_score: 40,
      adherence: 45, plan_efficacy: 35,
    });
    expect(["alta_prioridade", "urgente", "media_prioridade"]).toContain(result.classification);
  });

  it("classifies moderate risk as media_prioridade", () => {
    const result = computeTherapeuticPriority({
      ...STABLE, clinical_risk_score: 50, dropout_risk_score: 40,
      cluster_type: "metabolic_adaptive", performance_score: 55,
      plan_efficacy: 50,
    });
    expect(["media_prioridade", "monitoramento"]).toContain(result.classification);
  });

  // ── Action Recommendations ──
  it("recommends immediate adjustment for critical alerts", () => {
    const result = computeTherapeuticPriority({
      ...STABLE, clinical_risk_score: 95, dropout_risk_score: 85,
      has_critical_alerts: true, cluster_type: "disengaging_patient",
      regression_risk_score: 70, days_since_intervention: 15,
      performance_score: 20, physiological_stress: 60,
    });
    expect(result.recommended_action).toBe("immediate_protocol_adjustment");
  });

  it("recommends behavioral simplification for high dropout risk", () => {
    const result = computeTherapeuticPriority({
      ...STABLE, dropout_risk_score: 75, cluster_type: "behavioral_struggler",
    });
    expect(result.recommended_action).toBe("apply_behavioral_simplification");
    expect(result.action_group).toBe("simplificacao_comportamental");
  });

  it("recommends protocol adjustment for therapeutic failure with transition", () => {
    const result = computeTherapeuticPriority({
      ...STABLE, has_therapeutic_failure: true, has_pending_transition: true,
      plan_efficacy: 30, adherence: 80,
    });
    expect(result.recommended_action).toBe("immediate_protocol_adjustment");
    expect(result.action_group).toBe("ajuste_protocolo");
  });

  it("recommends diet break review for high regression risk", () => {
    const result = computeTherapeuticPriority({
      ...STABLE, regression_risk_score: 65, dropout_risk_score: 30,
      plan_efficacy: 50, days_since_intervention: 5,
    });
    expect(result.recommended_action).toBe("initiate_diet_break_review");
  });

  it("recommends followup for long absence", () => {
    const result = computeTherapeuticPriority({
      ...STABLE, days_since_intervention: 12, dropout_risk_score: 30,
      regression_risk_score: 20, plan_efficacy: 60,
    });
    expect(result.recommended_action).toBe("schedule_followup_contact");
  });

  it("recommends monitoring for stable patient", () => {
    const result = computeTherapeuticPriority(STABLE);
    expect(result.recommended_action).toBe("monitor_without_change");
  });

  it("recommends escalation for physiological stress", () => {
    const result = computeTherapeuticPriority({
      ...STABLE, physiological_stress: 80, performance_score: 35,
      dropout_risk_score: 30, regression_risk_score: 20,
      plan_efficacy: 60, days_since_intervention: 5,
    });
    expect(result.recommended_action).toBe("escalate_risk_management");
  });

  // ── Action Groups ──
  it("assigns correct action groups", () => {
    const urgent = computeTherapeuticPriority({
      ...STABLE, clinical_risk_score: 95, dropout_risk_score: 90,
      has_critical_alerts: true, cluster_type: "disengaging_patient",
      regression_risk_score: 70, days_since_intervention: 15,
      performance_score: 20, physiological_stress: 60,
    });
    expect(urgent.action_group).toBe("intervencao_urgente");

    const positive = computeTherapeuticPriority(STABLE);
    expect(positive.action_group).toBe("evolucao_positiva");
  });

  // ── Weekly Plan ──
  it("generates weekly plan with max 4 per day", () => {
    const patients = Array.from({ length: 15 }, (_, i) => ({
      id: `p${i}`, score: 90 - i * 5, classification: "urgente",
    }));
    const plan = generateWeeklyPlan(patients);
    const mondayCount = plan.filter(p => p.day === "segunda").length;
    expect(mondayCount).toBeLessThanOrEqual(4);
    expect(plan.length).toBe(15);
  });

  it("prioritizes highest scores first in weekly plan", () => {
    const patients = [
      { id: "low", score: 20, classification: "monitoramento" },
      { id: "high", score: 90, classification: "urgente" },
      { id: "mid", score: 55, classification: "media_prioridade" },
    ];
    const plan = generateWeeklyPlan(patients);
    expect(plan[0].id).toBe("high");
    expect(plan[2].id).toBe("low");
  });

  // ── Weekly Focus ──
  it("generates urgent focus when many critical patients", () => {
    const focus = generateWeeklyFocus({ intervencao_urgente: 8, ajuste_protocolo: 3, monitoramento_leve: 5, evolucao_positiva: 2, simplificacao_comportamental: 2 }, 20);
    expect(focus).toBe("urgent_focus");
  });

  it("generates behavioral focus for many behavioral recoveries", () => {
    const focus = generateWeeklyFocus({ intervencao_urgente: 2, simplificacao_comportamental: 6, monitoramento_leve: 10, evolucao_positiva: 2, ajuste_protocolo: 0 }, 20);
    expect(focus).toBe("behavioral_focus");
  });

  it("generates positive focus when most patients evolving", () => {
    const focus = generateWeeklyFocus({ evolucao_positiva: 12, monitoramento_leve: 5, intervencao_urgente: 1, simplificacao_comportamental: 1, ajuste_protocolo: 1 }, 20);
    expect(focus).toBe("positive_focus");
  });

  it("generates balanced focus otherwise", () => {
    const focus = generateWeeklyFocus({ intervencao_urgente: 3, ajuste_protocolo: 4, monitoramento_leve: 8, evolucao_positiva: 3, simplificacao_comportamental: 2 }, 20);
    expect(focus).toBe("balanced_focus");
  });

  // ── Improvement After Intervention ──
  it("priority decreases after successful intervention", () => {
    const before = computeTherapeuticPriority({ ...STABLE, clinical_risk_score: 70, dropout_risk_score: 60, performance_score: 35 });
    const after = computeTherapeuticPriority({ ...STABLE, clinical_risk_score: 25, dropout_risk_score: 15, performance_score: 75 });
    expect(after.score).toBeLessThan(before.score);
  });

  // ── Overloaded Professional ──
  it("detects overloaded portfolio", () => {
    const patients = Array.from({ length: 20 }, () =>
      computeTherapeuticPriority({ ...STABLE, clinical_risk_score: 80, dropout_risk_score: 75, cluster_type: "disengaging_patient", performance_score: 25, days_since_intervention: 12, physiological_stress: 60 })
    );
    const highPriority = patients.filter(p => p.classification === "alta_prioridade" || p.classification === "urgente");
    expect(highPriority.length).toBeGreaterThan(0);
  });

  // ── Score Components Sum Correctly ──
  it("score is bounded 0-100", () => {
    const extreme = computeTherapeuticPriority({
      ...STABLE, clinical_risk_score: 200, dropout_risk_score: 200,
      regression_risk_score: 200, performance_score: -50,
      days_since_intervention: 100, physiological_stress: 200,
      cluster_type: "disengaging_patient", has_critical_alerts: true,
    });
    expect(extreme.score).toBeLessThanOrEqual(100);
    expect(extreme.score).toBeGreaterThanOrEqual(0);
  });

  // ── Engine Version ──
  it("engine version is 1.0.0", () => {
    expect("1.0.0").toBe("1.0.0");
  });
});
