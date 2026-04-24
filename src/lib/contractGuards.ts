/**
 * FitJourney — Contract Guards
 *
 * Wrappers que executam um contrato ANTES e DEPOIS de uma operação.
 * Se o contrato for violado, a operação é BLOQUEADA (throw) e a regressão
 * é registrada via regressionGuard.
 *
 * Uso:
 *   await guardedOperation("patient_access", snapshot, async () => {
 *     return await fetchPatientPlans(...);
 *   });
 */

import { CRITICAL_CONTRACTS, CriticalContractId } from "@/lib/criticalContracts";
import { logCriticalRegression } from "@/lib/regressionGuard";

export class ContractViolationError extends Error {
  constructor(
    public contractId: string,
    public violations: string[],
  ) {
    super(`[CONTRACT VIOLATION] ${contractId}: ${violations.join("; ")}`);
    this.name = "ContractViolationError";
  }
}

/** Valida snapshot contra um contrato. Lança erro se violado. */
export function assertContract<C extends CriticalContractId>(
  contractId: C,
  snapshot: Parameters<(typeof CRITICAL_CONTRACTS)[C]>[0],
): void {
  const fn = CRITICAL_CONTRACTS[contractId] as (s: any) => { ok: boolean; violations: string[] };
  const result = fn(snapshot);
  if (!result.ok) {
    logCriticalRegression(
      contractId,
      result.violations.join(" | "),
      "frontend",
    );
    throw new ContractViolationError(contractId, result.violations);
  }
}

/** Valida sem lançar — retorna o resultado. */
export function checkContract<C extends CriticalContractId>(
  contractId: C,
  snapshot: Parameters<(typeof CRITICAL_CONTRACTS)[C]>[0],
) {
  const fn = CRITICAL_CONTRACTS[contractId] as (s: any) => { ok: boolean; violations: string[] };
  return fn(snapshot);
}

/**
 * Executa uma operação dentro de um guard. Se o snapshot do RESULTADO violar
 * o contrato, a operação é considerada falha e o erro é lançado.
 */
export async function guardedOperation<C extends CriticalContractId, T>(
  contractId: C,
  operation: () => Promise<T>,
  buildSnapshot: (result: T) => Parameters<(typeof CRITICAL_CONTRACTS)[C]>[0],
): Promise<T> {
  const result = await operation();
  const snapshot = buildSnapshot(result);
  assertContract(contractId, snapshot);
  return result;
}
