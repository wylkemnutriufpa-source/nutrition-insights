import { describe, it, expect } from "vitest";
import { validateMealPlanSnapshot, assertSovereignRuntime, logSovereignEvent } from "../lib/runtimeGovernance";
import { SNAPSHOT_SCHEMA_VERSION } from "../lib/snapshot/types";

describe("SOVEREIGN_FINAL_VALIDATION — Prova Real de Runtime", () => {
  
  const mockValidSnapshot = {
    schema_version: SNAPSHOT_SCHEMA_VERSION,
    engine_version: "clinical-engine@1.0.0",
    generated_at: new Date().toISOString(),
    hash: "valid-hash",
    plan: {
      plan_id: "plan-123",
      patient_id: "patient-456",
      nutritionist_id: "nutri-789",
      tenant_id: "tenant-000",
      title: "Plano Soberano V3",
      start_date: "2026-05-13",
      end_date: null,
      plan_type: "manual",
      plan_mode: "single_day",
      template_id: null,
      template_slug: null,
      template_version: null,
      generation_source: "manual",
      protocol_used: "standard",
      editor_version: "v3"
    },
    patient_context: {
      id: "patient-456",
      weight_kg: 80,
      weight_source: "profile",
      height_cm: 180,
      age: 30,
      gender: "male",
      activity_level: "active",
      goal: "performance"
    },
    targets: {
      kcal: 2500,
      protein_g: 150,
      carbs_g: 300,
      fat_g: 80,
      goal: "performance"
    },
    days: [
      {
        day_of_week: 1,
        totals: { kcal: 2500, protein_g: 150, carbs_g: 300, fat_g: 80 },
        meals: [
          {
            meal_type: "breakfast",
            totals: { kcal: 500, protein_g: 30, carbs_g: 60, fat_g: 15 },
            items: [
              {
                id: "item-1",
                title: "Ovo Cozido",
                description: "2 unidades",
                image_url: null,
                visual_library_item_id: null,
                is_primary: true,
                is_locked: false,
                substitution_group_id: "group-1",
                target_percentage: 100,
                macros: { kcal: 140, protein_g: 12, carbs_g: 1, fat_g: 10 },
                substitutions: [],
                clinical_mass_g: 100,
                display_quantity: 2,
                display_unit: "unidade"
              }
            ]
          }
        ]
      }
    ],
    weekly_totals: { kcal: 17500, protein_g: 1050, carbs_g: 2100, fat_g: 560 },
    daily_average: { kcal: 2500, protein_g: 150, carbs_g: 300, fat_g: 80 }
  };

  it("Fase 1: Valida que um snapshot soberano íntegro é aceito", () => {
    const validated = validateMealPlanSnapshot(mockValidSnapshot, "test_validation");
    expect(validated.plan.editor_version).toBe("v3");
    expect(validated.days[0].meals[0].items[0].clinical_mass_g).toBe(100);
  });

  it("Fase 1: Bloqueia snapshots com campos críticos ausentes (ex: clinical_mass_g)", () => {
    const invalidSnapshot = JSON.parse(JSON.stringify(mockValidSnapshot));
    delete invalidSnapshot.days[0].meals[0].items[0].clinical_mass_g;
    
    expect(() => validateMealPlanSnapshot(invalidSnapshot, "test_failure"))
      .toThrow("[SOVEREIGN_VIOLATION] Snapshot corrompido ou incompleto detectado");
  });

  it("Fase 2: Bloqueia runtime que tenta usar lógica legado (Função Proibida)", () => {
    // Definindo uma função com nome proibido para aparecer no stack trace
    const normalizeFood = () => {
      assertSovereignRuntime("legacy_call_test");
    };
    
    expect(() => normalizeFood()).toThrow("[SOVEREIGN_VIOLATION] Uso de motor legado detectado: normalizeFood");
  });

  it("Fase 3: Gera telemetria estruturada durante a validação", () => {
    expect(() => logSovereignEvent("INFO", "TEST_EVENT", { correlation_id: "test-id" })).not.toThrow();
  });

  it("Fase 5: Garante que Patient App recebe dados 1:1 sem drift", () => {
    const validated = validateMealPlanSnapshot(mockValidSnapshot, "patient_app_access");
    const item = validated.days[0].meals[0].items[0];
    
    expect(item.macros.kcal).toBe(mockValidSnapshot.days[0].meals[0].items[0].macros.kcal);
    expect(item.macros.protein_g).toBe(mockValidSnapshot.days[0].meals[0].items[0].macros.protein_g);
  });

});
