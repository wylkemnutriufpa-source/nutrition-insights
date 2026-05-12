/**
 * FitJourney — Impact Check (BLOCO 5)
 * 
 * Checklist automático de impacto antes de mudanças.
 * Usado internamente para avaliar risco de regressão.
 */

import { analyzeImpact, CriticalFlow, CRITICAL_FLOWS } from "@v1/lib/criticalFlows";

export interface ImpactReport {
  riskLevel: "low" | "moderate" | "high" | "critical";
  affectedFlows: { flow: CriticalFlow; impactReason: string }[];
  criticalFlowsAffected: number;
  highFlowsAffected: number;
  requiresFallback: boolean;
  smokeTestsNeeded: string[];
  summary: string;
}

/** Analyze the impact of a proposed change */
export function checkImpact(changes: {
  tables?: string[];
  pages?: string[];
  edgeFunctions?: string[];
}): ImpactReport {
  const affected = analyzeImpact(changes);

  const criticalCount = affected.filter((a) => a.flow.severity === "critical").length;
  const highCount = affected.filter((a) => a.flow.severity === "high").length;

  let riskLevel: ImpactReport["riskLevel"] = "low";
  if (criticalCount > 0) riskLevel = "critical";
  else if (highCount > 2) riskLevel = "high";
  else if (highCount > 0 || affected.length > 3) riskLevel = "moderate";

  const smokeTestsNeeded = affected.map((a) => a.flow.id);

  const summary = affected.length === 0
    ? "Nenhum fluxo crítico afetado. Mudança segura."
    : `${affected.length} fluxo(s) afetado(s): ${criticalCount} crítico(s), ${highCount} alto(s). ${riskLevel === "critical" || riskLevel === "high" ? "⚠️ REQUER FALLBACK E TESTES." : "Verificar testes."}`;

  return {
    riskLevel,
    affectedFlows: affected,
    criticalFlowsAffected: criticalCount,
    highFlowsAffected: highCount,
    requiresFallback: riskLevel === "critical" || riskLevel === "high",
    smokeTestsNeeded,
    summary,
  };
}

/** Pretty print an impact report */
export function formatImpactReport(report: ImpactReport): string {
  const lines: string[] = [
    `═══ RELATÓRIO DE IMPACTO ═══`,
    `Risco: ${report.riskLevel.toUpperCase()}`,
    `Fluxos afetados: ${report.affectedFlows.length}`,
    `  Críticos: ${report.criticalFlowsAffected}`,
    `  Altos: ${report.highFlowsAffected}`,
    `Requer fallback: ${report.requiresFallback ? "SIM" : "Não"}`,
    ``,
  ];

  if (report.affectedFlows.length > 0) {
    lines.push(`Fluxos impactados:`);
    for (const { flow, impactReason } of report.affectedFlows) {
      lines.push(`  [${flow.severity}] ${flow.name}: ${impactReason}`);
    }
    lines.push(``);
  }

  if (report.smokeTestsNeeded.length > 0) {
    lines.push(`Smoke tests necessários:`);
    for (const id of report.smokeTestsNeeded) {
      lines.push(`  - ${id}`);
    }
  }

  lines.push(``, report.summary);
  return lines.join("\n");
}
