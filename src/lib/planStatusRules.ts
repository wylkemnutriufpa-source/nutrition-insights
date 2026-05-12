/**
 * Plan Status Rules — Single Source of Truth
 * 
 * ALL components MUST use these helpers instead of inline status checks.
 * 
 * Rules:
 * - published / published_to_patient / approved → immutable to automation (trigger-enforced)
 * - approved → editable by owner nutritionist in UI, but automation creates new draft
 * - draft_* → editable (in-place)
 * - archived → read-only
 * 
 * IMPORTANT: This file MUST stay aligned with the SQL trigger
 * `fn_guard_published_plan_items_immutable` which blocks DELETE/UPDATE
 * on items belonging to plans with status IN ('approved', 'published', 'published_to_patient').
 */

/** Statuses where automated engines (autofix, pipeline) must NOT modify in-place.
 *  Aligned with SQL trigger trg_guard_published_plan_items_immutable. */
const AUTOMATION_IMMUTABLE: ReadonlySet<string> = new Set(["approved", "published", "published_to_patient"]);

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
 * Aligned with SQL trigger trg_guard_published_plan_items_immutable.
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
 * ALIGNED with SQL trigger validate_meal_plan_status_transition:
 * allows from: approved, draft, draft_auto_generated, under_professional_review
 * blocks from: archived, expired, published_to_patient (must archive first)
 * 
 * Note: draft_auto_corrected and draft_revision are allowed because the trigger
 * only blocks specific transitions, not these source statuses.
 */
export function canPublish(planStatus: string): boolean {
  return [
    "approved",
    "draft",
    "draft_auto_generated",
    "draft_auto_corrected",
    "draft_revision",
    "draft_template",
    "under_professional_review",
  ].includes(planStatus);
}
