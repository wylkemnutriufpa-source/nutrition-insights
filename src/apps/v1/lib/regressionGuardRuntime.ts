/**
 * FitJourney — Regression Guard Runtime
 *
 * Detecta regressões EM RUNTIME e CANCELA a operação automaticamente.
 *
 * Sintomas detectados:
 *   - plano que estava publicado sumiu
 *   - plano ficou invisível para o paciente
 *   - geração falhou (vazio/sem macros)
 *   - macros zeraram após edição
 *
 * Fluxo:
 *   1. takeSnapshot() ANTES da operação
 *   2. executar operação
 *   3. takeSnapshot() DEPOIS
 *   4. detectRegression() compara — se quebrou, throw + log
 */

import { logCriticalRegression } from "@/lib/regressionGuard";

export interface PlanSnapshot {
  planId: string;
  status: string;
  itemCount: number;
  totalKcal: number;
  totalProtein: number;
  visibleToPatient: boolean;
}

export interface RegressionDetection {
  detected: boolean;
  reasons: string[];
}

const PUBLISHED = new Set(["published", "published_to_patient"]);

export function detectRegression(
  before: PlanSnapshot,
  after: PlanSnapshot,
): RegressionDetection {
  const reasons: string[] = [];

  // Plano sumiu
  if (PUBLISHED.has(before.status) && after.itemCount === 0) {
    reasons.push("Plano publicado perdeu todos os itens");
  }

  // Plano ficou invisível
  if (PUBLISHED.has(before.status) && before.visibleToPatient && !after.visibleToPatient) {
    reasons.push("Plano publicado ficou invisível para o paciente");
  }

  // Macros zeraram
  if (before.totalKcal > 0 && after.totalKcal <= 0) {
    reasons.push(`Calorias zeraram (${before.totalKcal} → ${after.totalKcal})`);
  }
  if (before.totalProtein > 0 && after.totalProtein <= 0) {
    reasons.push(`Proteína zerou (${before.totalProtein} → ${after.totalProtein})`);
  }

  // Despublicação inesperada
  if (PUBLISHED.has(before.status) && !PUBLISHED.has(after.status) && after.status !== "archived") {
    reasons.push(`Despublicação inesperada (${before.status} → ${after.status})`);
  }

  return { detected: reasons.length > 0, reasons };
}

export class RegressionDetectedError extends Error {
  constructor(public planId: string, public reasons: string[]) {
    super(`[REGRESSION DETECTED] Plano ${planId}: ${reasons.join("; ")}`);
    this.name = "RegressionDetectedError";
  }
}

/**
 * Wrapper: executa uma operação que altera um plano e cancela se detectar regressão.
 *
 * @param flow nome do fluxo (ex: "meal_plan_publish")
 * @param takeSnapshot função que retorna o snapshot atual do plano
 * @param operation operação a executar
 */
export async function withRegressionGuard<T>(
  flow: string,
  takeSnapshot: () => Promise<PlanSnapshot>,
  operation: () => Promise<T>,
): Promise<T> {
  const before = await takeSnapshot();
  const result = await operation();

  let after: PlanSnapshot;
  try {
    after = await takeSnapshot();
  } catch (err) {
    // Se nem conseguimos snapshot depois, é regressão grave
    logCriticalRegression(flow, `Snapshot pós-operação falhou: ${(err as Error).message}`);
    throw new RegressionDetectedError(before.planId, ["Snapshot pós-operação falhou"]);
  }

  const detection = detectRegression(before, after);
  if (detection.detected) {
    logCriticalRegression(flow, detection.reasons.join(" | "));
    throw new RegressionDetectedError(before.planId, detection.reasons);
  }

  return result;
}
