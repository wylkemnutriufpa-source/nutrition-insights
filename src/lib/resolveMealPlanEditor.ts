/**
 * Central resolver for meal plan editor routing.
 * V2 is the only operational editor — V1 no longer exists.
 */

export type PlanEditorClassification =
  | "v2_active"
  | "legacy_preserved_published"
  | "legacy_unpublished_requires_regeneration";

export interface PlanEditorResolution {
  classification: PlanEditorClassification;
  route: string;
  readOnly: boolean;
  requiresRegeneration: boolean;
  message?: string;
}

interface MealPlanMeta {
  id: string;
  plan_status?: string;
  is_active?: boolean;
  editor_version?: string | null;
  requires_regeneration?: boolean | null;
  generation_source?: string | null;
}

/**
 * Determines how to open a meal plan — always routes to V2.
 * Legacy plans are classified for read-only or regeneration.
 */
export function resolveMealPlanEditor(plan: MealPlanMeta): PlanEditorResolution {
  const isLegacy = plan.editor_version === "v1" || plan.editor_version === null;
  const isPublished = plan.plan_status === "published" || plan.plan_status === "published_to_patient";
  const isActive = plan.is_active === true;
  const markedForRegen = plan.requires_regeneration === true;

  // Active plans or V2 plans → open V2 normally
  if (!isLegacy || isActive) {
    return {
      classification: "v2_active",
      route: `/meal-plans/${plan.id}`,
      readOnly: false,
      requiresRegeneration: false,
    };
  }

  // Legacy published/approved → read-only in V2
  if (isLegacy && isPublished) {
    return {
      classification: "legacy_preserved_published",
      route: `/meal-plans/${plan.id}`,
      readOnly: true,
      requiresRegeneration: false,
      message: "Este plano foi publicado em uma versão anterior e está em modo de visualização protegida.",
    };
  }

  // Legacy unpublished (drafts, onboarding remnants) → require regeneration
  return {
    classification: "legacy_unpublished_requires_regeneration",
    route: `/meal-plans/${plan.id}`,
    readOnly: true,
    requiresRegeneration: true,
    message: "Este plano foi gerado em uma versão anterior do editor e precisa ser regenerado no V2 para continuar com segurança e consistência.",
  };
}
