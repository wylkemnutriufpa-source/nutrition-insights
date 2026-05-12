/**
 * lifecycleStateValidator
 * --------------------------------
 * Runtime validation for the JSON envelope returned by the
 * `resolve_patient_lifecycle_state` RPC.
 *
 * Goal: when `has_active_plan === true` (i.e. there IS a published plan
 * in the database), the RPC MUST also return a coherent `plan_id`,
 * `plan_title` and a non-null `plan` object. If any of those fields are
 * missing, we surface a structured error so the front shows a clear
 * message instead of silently rendering "no plan".
 */

export type LifecycleEnvelope = Record<string, unknown> | null | undefined;

export interface LifecycleCoherenceIssue {
  field: string;
  expected: string;
  actual: unknown;
}

export interface LifecycleValidationResult {
  ok: boolean;
  issues: LifecycleCoherenceIssue[];
  /** Human-readable summary (PT-BR) safe to surface in toasts/banners. */
  message: string | null;
}

/** Pure validator — no side effects, easy to unit-test. */
export function validateLifecycleEnvelope(
  data: LifecycleEnvelope,
): LifecycleValidationResult {
  if (!data || typeof data !== "object") {
    return {
      ok: false,
      issues: [{ field: "<root>", expected: "object", actual: data }],
      message: "Resposta vazia da RPC de lifecycle.",
    };
  }

  const issues: LifecycleCoherenceIssue[] = [];
  const hasActivePlan = (data as Record<string, unknown>).has_active_plan === true;

  if (hasActivePlan) {
    const planId = (data as Record<string, unknown>).plan_id;
    const planTitle = (data as Record<string, unknown>).plan_title;
    const planObj = (data as Record<string, unknown>).plan;

    if (!planId || typeof planId !== "string") {
      issues.push({
        field: "plan_id",
        expected: "non-empty string when has_active_plan=true",
        actual: planId,
      });
    }
    if (!planTitle || typeof planTitle !== "string") {
      issues.push({
        field: "plan_title",
        expected: "non-empty string when has_active_plan=true",
        actual: planTitle,
      });
    }
    if (!planObj || typeof planObj !== "object") {
      issues.push({
        field: "plan",
        expected: "object when has_active_plan=true",
        actual: planObj,
      });
    }
  }

  if (issues.length === 0) {
    return { ok: true, issues: [], message: null };
  }

  const fields = issues.map((i) => i.field).join(", ");
  return {
    ok: false,
    issues,
    message:
      `Inconsistência detectada na RPC de lifecycle: campo(s) ${fields} ` +
      `vieram nulos apesar de existir plano publicado ativo.`,
  };
}

/**
 * Throws a clear error if the envelope is incoherent. Use in code-paths
 * where you want to fail loudly (e.g. development, tests, diagnostic page).
 */
export function assertLifecycleEnvelope(data: LifecycleEnvelope): void {
  const result = validateLifecycleEnvelope(data);
  if (!result.ok) {
    const err = new Error(result.message ?? "Lifecycle envelope invalid");
    (err as Error & { issues?: LifecycleCoherenceIssue[] }).issues =
      result.issues;
    throw err;
  }
}
