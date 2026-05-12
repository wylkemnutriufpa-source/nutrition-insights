/**
 * Coach Priority Engine — Automatic athlete prioritization
 * Deterministic IFJ logic, no LLM
 */

export type PriorityLevel = "critical" | "high" | "medium" | "low";

export interface AthletePriority {
  athleteId: string;
  level: PriorityLevel;
  score: number;
  reasons: string[];
}

interface PriorityInput {
  id: string;
  current_phase: string;
  prep_score: number;
  status: string;
  alertCount: number;
  hasCriticalAlert: boolean;
  daysSinceCheckin: number;
  hasRecentPhotos: boolean;
}

export function calculatePriority(input: PriorityInput): AthletePriority {
  let score = 0;
  const reasons: string[] = [];

  // Peak week / pre contest = maximum priority
  if (input.current_phase === "peak_week") {
    score += 50;
    reasons.push("Peak Week — prioridade máxima");
  } else if (input.current_phase === "pre_contest") {
    score += 40;
    reasons.push("Pré Contest — atenção elevada");
  }

  // Critical alert
  if (input.hasCriticalAlert) {
    score += 45;
    reasons.push("Alerta crítico ativo");
  } else if (input.alertCount > 0) {
    score += 15 + Math.min(input.alertCount * 5, 20);
    reasons.push(`${input.alertCount} alerta(s) ativo(s)`);
  }

  // Low prep score
  if (input.prep_score < 30) {
    score += 35;
    reasons.push("Score muito baixo (<30)");
  } else if (input.prep_score < 50) {
    score += 20;
    reasons.push("Score baixo (<50)");
  }

  // Stale check-in
  if (input.daysSinceCheckin > 7) {
    score += 30;
    reasons.push(`Check-in atrasado ${input.daysSinceCheckin}d`);
  } else if (input.daysSinceCheckin > 3) {
    score += 15;
    reasons.push(`Check-in atrasado ${input.daysSinceCheckin}d`);
  }

  // Alert status
  if (input.status === "alert") {
    score += 15;
    reasons.push("Status em alerta");
  } else if (input.status === "stagnant") {
    score += 8;
    reasons.push("Estagnado");
  }

  // No recent photos
  if (!input.hasRecentPhotos && input.daysSinceCheckin > 5) {
    score += 5;
    reasons.push("Sem fotos recentes");
  }

  const level: PriorityLevel =
    score >= 60 ? "critical" :
    score >= 35 ? "high" :
    score >= 15 ? "medium" : "low";

  return { athleteId: input.id, level, score, reasons };
}

export const PRIORITY_CONFIG: Record<PriorityLevel, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
}> = {
  critical: {
    label: "Crítica",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    dotColor: "bg-red-500",
  },
  high: {
    label: "Alta",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    dotColor: "bg-orange-500",
  },
  medium: {
    label: "Média",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    dotColor: "bg-amber-500",
  },
  low: {
    label: "Baixa",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    dotColor: "bg-emerald-500",
  },
};
