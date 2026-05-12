export interface PatientReadyEvaluationInput {
  hasActivePlan: boolean;
  linkStatus?: string | null;
  journeyStatus?: string | null;
  pipelineStatus?: string | null;
  releaseStatus?: string | null;
}

export function evaluatePatientReadiness(input: PatientReadyEvaluationInput): string[] {
  if (input.hasActivePlan) return [];

  const issues: string[] = [];

  if (input.linkStatus === "inactive" && !["invited", "archived", "cancelled"].includes(input.journeyStatus ?? "")) {
    issues.push("inactive_link");
  }

  if (["onboarding_active", "onboarding_completed"].includes(input.journeyStatus ?? "") && !input.pipelineStatus) {
    issues.push("missing_pipeline");
  }

  if (["pending_anamnesis", "collecting_data"].includes(input.pipelineStatus ?? "") && (input.releaseStatus ?? "") !== "released") {
    issues.push("pipeline_locked");
  }

  return issues;
}