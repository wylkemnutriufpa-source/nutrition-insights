/**
 * Plan Status Rules — Single Source of Truth
 * 
 * ALL components MUST use these helpers instead of inline status checks.
 * 
 * Rules:
 * - published / published_to_patient → immutable to automation, editable by owner nutritionist
 * - approved → editable
 * - draft_* → editable
 * - archived → read-only
 */

/** Statuses where automated engines (autofix, pipeline) must NOT modify in-place */
const AUTOMATION_IMMUTABLE: ReadonlySet<string> = new Set(["published", "published_to_patient"]);

/** Statuses where UI blocks editing entirely (archived plans) */
const UI_READ_ONLY: ReadonlySet<string> = new Set(["archived"]);

/** Statuses considered "effective" (patient can see the plan) */
const EFFECTIVE_STATUSES: ReadonlySet<string> = new Set(["approved", "published", "published_to_patient"]);

/**
 * Can the nutritionist edit this plan in the UI?
 * Returns true for everything except archived.
 */
export function canNutritionistEdit(planStatus: string): boolean {
  return !UI_READ_ONLY.has(planStatus);
}

/**
 * Should automated engines (autofix, pipeline) create a new draft
 * instead of modifying this plan in-place?
 */
export function isAutomationImmutable(planStatus: string): boolean {
  return AUTOMATION_IMMUTABLE.has(planStatus);
}

/**
 * Is this plan in an effective (visible to patient) state?
 */
export function isEffectivePlan(planStatus: string): boolean {
  return EFFECTIVE_STATUSES.has(planStatus);
}

/**
 * Can this plan be published (transition to published_to_patient)?
 */
export function canPublish(planStatus: string): boolean {
  return ["approved", "draft", "draft_auto_generated", "draft_auto_corrected", "draft_revision", "draft_template"].includes(planStatus);
}
