import { describe, it, expect, beforeAll } from "vitest";
import { supabase } from "@/integrations/supabase/client";

/**
 * TESTE E2E REAL (SEM MOCKS)
 * Este teste valida o "Caminho Soberano" ponta-a-ponta.
 */

describe("Fluxo Soberano E2E - Estabilidade Real", () => {
  let testPatientId: string;
  let testProfessionalId: string;
  let testTenantId: string;
  let testUserId: string;

  beforeAll(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("Aviso: Teste E2E rodando sem usuário autenticado. Algumas policies podem falhar.");
    } else {
      testUserId = user.id;
      // Pegar o tenant_id do usuário atual
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("user_id", testUserId).single();
      testTenantId = profile?.tenant_id || "";
    }
  });

  it("Deve completar o ciclo: Criar Paciente -> Gerar Plano -> Publicar", async () => {
    // 1. Criar Paciente Fake
    const { data: profile, error: createError } = await supabase
      .from("profiles")
      .insert({
        full_name: "Paciente Teste E2E " + Date.now(),
        tenant_id: testTenantId || "00000000-0000-0000-0000-000000000000",
        user_id: testUserId || "00000000-0000-0000-0000-000000000000"
      })
      .select()
      .single();

    if (createError) {
       console.error("Erro ao criar paciente:", createError);
       expect(createError).toBeNull();
    }
    testPatientId = profile.id;

    // 2. Invocar Geração de Plano (Edge Function)
    const { data: genResult, error: genError } = await supabase.functions.invoke("generate-meal-plan", {
      body: { patient_id: testPatientId }
    });

    expect(genError).toBeNull();
    expect(genResult?.success).toBe(true);
    const planId = genResult.plan_id;

    // 3. Publicar Plano (Usando a RPC Soberana)
    const testItems = [
      {
        meal_name: "Almoço",
        food_name: "Arroz Branco",
        clinical_mass_g: 100,
        calories: 130
      }
    ];

    const { data: pubResult, error: pubError } = await supabase.rpc("publish_meal_plan_v3", {
      p_plan_id: planId,
      p_patient_id: testPatientId,
      p_nutritionist_id: testUserId || "00000000-0000-0000-0000-000000000000",
      p_tenant_id: testTenantId || "00000000-0000-0000-0000-000000000000",
      p_payload: {},
      p_items: testItems
    });

    expect(pubError).toBeNull();
    expect(pubResult).toBeDefined();

    // 4. Validar Persistência e Constraints
    const { data: activePlans } = await supabase
      .from("meal_plans")
      .select("id")
      .eq("patient_id", testPatientId)
      .eq("is_active", true);

    expect(activePlans?.length).toBe(1);
  });
});

