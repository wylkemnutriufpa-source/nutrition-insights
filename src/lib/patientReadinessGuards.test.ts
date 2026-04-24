import { describe, expect, it } from "vitest";
import { evaluatePatientReadiness } from "@/lib/patientReadinessGuards";

describe("evaluatePatientReadiness", () => {
  it("não bloqueia paciente com plano ativo mesmo com pipeline superseded_by_published_plan", () => {
    expect(
      evaluatePatientReadiness({
        hasActivePlan: true,
        linkStatus: "active",
        journeyStatus: "onboarding_completed",
        pipelineStatus: "superseded_by_published_plan",
        releaseStatus: null,
      }),
    ).toEqual([]);
  });

  it("mantém bloqueio quando onboarding está realmente travado e não há plano ativo", () => {
    expect(
      evaluatePatientReadiness({
        hasActivePlan: false,
        linkStatus: "active",
        journeyStatus: "onboarding_active",
        pipelineStatus: "pending_anamnesis",
        releaseStatus: null,
      }),
    ).toEqual(["pipeline_locked"]);
  });

  it("detecta vínculo inativo sem mascarar o problema quando não há plano ativo", () => {
    expect(
      evaluatePatientReadiness({
        hasActivePlan: false,
        linkStatus: "inactive",
        journeyStatus: "active",
        pipelineStatus: null,
        releaseStatus: null,
      }),
    ).toEqual(["inactive_link"]);
  });
});