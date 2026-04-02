/**
 * Clinical Decision Helpers — FitJourney v5.0
 *
 * Reusable helpers for prioritization, correction buckets,
 * executive summary generation, and final decision logic.
 */

// ── Types ─────────────────────────────────────────────────────

export type CorrectionBucket =
  | "bloquear_publicacao"
  | "corrigir_agora"
  | "corrigir_depois"
  | "opcional";

export type FinalDecision = "publish_now" | "suggest_corrections";
export type ConfidenceLevel = "high" | "medium" | "low";
export type IssueSeverity = "critical" | "high" | "medium" | "low";

export interface PrioritizedIssue {
  severity: IssueSeverity;
  priority_order: number;
  correction_bucket: CorrectionBucket;
  category: string;
  meal_type: string;
  day: number;
  message: string;
  suggested_fix: string;
  penalty: number;
}

export interface ClinicalDecisionResult {
  executive_summary: string;
  approval_recommendation: string;
  correction_strategy: string[];
  final_decision: FinalDecision;
  final_decision_reason: string;
  confidence_level: ConfidenceLevel;
  prioritized_issues: PrioritizedIssue[];
  buckets: {
    bloquear_publicacao: PrioritizedIssue[];
    corrigir_agora: PrioritizedIssue[];
    corrigir_depois: PrioritizedIssue[];
    opcional: PrioritizedIssue[];
  };
}

// ── Severity / Bucket mapping ─────────────────────────────────

const SEVERITY_PRIORITY: Record<IssueSeverity, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
};

function assignBucket(severity: IssueSeverity, category: string): CorrectionBucket {
  if (severity === "critical") return "bloquear_publicacao";
  if (severity === "high" && category === "critical") return "bloquear_publicacao";
  if (severity === "high") return "corrigir_agora";
  if (severity === "medium") return "corrigir_depois";
  return "opcional";
}

// ── Prioritize Issues ─────────────────────────────────────────

export function prioritizeIssues(
  simplicityIssues: Array<{
    category: string;
    severity: string;
    meal_type: string;
    day: number;
    message: string;
    suggested_fix: string;
    penalty: number;
  }>,
  clinicalErrors: Array<{ rule: string; message: string; weight: number }>,
  restrictionsViolated: Array<{ restriction: string; keyword_found: string }>
): PrioritizedIssue[] {
  const issues: PrioritizedIssue[] = [];
  let order = 0;

  // Restriction violations → critical
  for (const rv of restrictionsViolated) {
    order++;
    issues.push({
      severity: "critical",
      priority_order: order,
      correction_bucket: "bloquear_publicacao",
      category: "restriction",
      meal_type: "",
      day: 0,
      message: `Restrição alimentar violada: "${rv.restriction}" — "${rv.keyword_found}" encontrado`,
      suggested_fix: `Remover "${rv.keyword_found}" do plano`,
      penalty: 50,
    });
  }

  // Clinical macro errors → high or critical depending on weight
  for (const err of clinicalErrors) {
    if (err.rule === "restricao_alimentar") continue; // already handled
    order++;
    const sev: IssueSeverity = err.weight >= 50 ? "critical" : err.weight >= 30 ? "high" : "medium";
    issues.push({
      severity: sev,
      priority_order: order,
      correction_bucket: assignBucket(sev, "clinical"),
      category: "clinical",
      meal_type: "",
      day: 0,
      message: err.message,
      suggested_fix: err.rule === "sem_meta_calorica"
        ? "Completar Anamnese ou Avaliação Física do paciente"
        : "Ajustar quantidades para atingir as metas nutricionais",
      penalty: err.weight,
    });
  }

  // Simplicity issues
  for (const issue of simplicityIssues) {
    order++;
    const sev = issue.severity as IssueSeverity;
    issues.push({
      severity: sev,
      priority_order: order,
      correction_bucket: assignBucket(sev, issue.category),
      category: issue.category,
      meal_type: issue.meal_type,
      day: issue.day,
      message: issue.message,
      suggested_fix: issue.suggested_fix,
      penalty: issue.penalty,
    });
  }

  // Sort by severity priority then by penalty desc
  issues.sort((a, b) => {
    const sp = SEVERITY_PRIORITY[a.severity] - SEVERITY_PRIORITY[b.severity];
    if (sp !== 0) return sp;
    return b.penalty - a.penalty;
  });

  // Re-assign priority_order after sorting
  issues.forEach((issue, idx) => {
    issue.priority_order = idx + 1;
  });

  return issues;
}

// ── Final Decision Logic ──────────────────────────────────────

export function computeFinalDecision(
  overallScore: number,
  overallPassed: boolean,
  prioritizedIssues: PrioritizedIssue[]
): { decision: FinalDecision; reason: string; confidence: ConfidenceLevel } {
  const hasCritical = prioritizedIssues.some((i) => i.severity === "critical");

  if (overallPassed && !hasCritical) {
    return {
      decision: "publish_now",
      reason: "Plano aprovado em todas as dimensões (clínico, simplicidade e adesão).",
      confidence: overallScore >= 85 ? "high" : overallScore >= 75 ? "medium" : "low",
    };
  }

  const blockingCount = prioritizedIssues.filter(
    (i) => i.correction_bucket === "bloquear_publicacao"
  ).length;

  return {
    decision: "suggest_corrections",
    reason: `${blockingCount} sugestão(ões) de melhoria encontrada(s). Aplique as correções sugeridas ou publique como está.`,
    confidence: hasCritical ? "high" : "medium",
  };
}

// ── Executive Summary ─────────────────────────────────────────

export function generateExecutiveSummary(
  overallPassed: boolean,
  overallScore: number,
  clinicalScore: number,
  simplicityScore: number,
  adherenceScore: number,
  blockedFoodsCount: number,
  restrictionsViolatedCount: number,
  prioritizedIssues: PrioritizedIssue[]
): { summary: string; recommendation: string; strategy: string[] } {
  const criticalCount = prioritizedIssues.filter((i) => i.severity === "critical").length;
  const highCount = prioritizedIssues.filter((i) => i.severity === "high").length;

  if (overallPassed) {
    return {
      summary: `Plano aprovado com score ${overallScore}/100. Todas as dimensões dentro dos padrões clínicos e de adesão.`,
      recommendation: "publicar",
      strategy: [],
    };
  }

  const reasons: string[] = [];
  const strategy: string[] = [];

  if (restrictionsViolatedCount > 0) {
    reasons.push("restrições alimentares violadas");
    strategy.push("Remover alimentos que violam restrições do paciente");
  }
  if (blockedFoodsCount > 0) {
    reasons.push("alimentos de baixa aderência prática");
    strategy.push("Remover alimentos bloqueados e substituir por alternativas brasileiras populares");
  }
  if (clinicalScore < 75) {
    reasons.push("divergências nutricionais significativas");
    strategy.push("Ajustar quantidades para atingir metas de macros");
  }
  if (simplicityScore < 75) {
    reasons.push("complexidade acima do aceitável");
    strategy.push("Simplificar refeições (café da manhã, lanches)");
  }
  if (adherenceScore < 65) {
    reasons.push("previsão de adesão baixa");
    strategy.push("Reduzir complexidade geral para aumentar adesão");
  }

  const summary = `Plano reprovado (${overallScore}/100) por conter ${reasons.join(", ")}. ${criticalCount} problema(s) crítico(s) e ${highCount} problema(s) de alta prioridade encontrados.`;
  const recommendation = overallScore < 50 ? "refazer_plano" : "corrigir_e_revalidar";

  return { summary, recommendation, strategy };
}

// ── Group by bucket ───────────────────────────────────────────

export function groupByBucket(issues: PrioritizedIssue[]) {
  return {
    bloquear_publicacao: issues.filter((i) => i.correction_bucket === "bloquear_publicacao"),
    corrigir_agora: issues.filter((i) => i.correction_bucket === "corrigir_agora"),
    corrigir_depois: issues.filter((i) => i.correction_bucket === "corrigir_depois"),
    opcional: issues.filter((i) => i.correction_bucket === "opcional"),
  };
}
