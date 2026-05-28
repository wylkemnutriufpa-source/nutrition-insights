import { describe, it, expect, beforeAll } from "vitest";
import { supabase } from "@/integrations/supabase/client";

/**
 * TESTE E2E REAL (SEM MOCKS)
 * Este teste valida o "Caminho Soberano" ponta-a-ponta.
 * Requisito: O ambiente de teste deve ter acesso ao Supabase real (ou container de teste).
 */

describe("Fluxo Soberano E2E - Estabilidade Real", () => {
  let testPatientId: string;
  let testProfessionalId: string;

  beforeAll(async () => {
    // Verificar se estamos em ambiente de teste seguro
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("Aviso: Teste E2E rodando sem usuário autenticado. Algumas policies podem falhar.");
    }
  });

  it("Deve completar o ciclo: Criar Paciente -> Gerar Plano -> Publicar", async () => {
    // 1. Criar Paciente Fake (Usando RPC ou Insert se permitido)
    const { data: profile, error: createError } = await supabase
      .from("profiles")
      .insert({
        full_name: "Paciente Teste E2E " + Date.now(),
        role: "patient"
      })
      .select()
      .single();

    if (createError) {
       console.error("Erro ao criar paciente:", createError);
       // Se falhar por RLS, tentamos usar um paciente existente ou falhamos o teste
       expect(createError).toBeNull();
    }
    testPatientId = profile.id;

    // 2. Invocar Geração de Plano (Edge Function)
    const { data: genResult, error: genError } = await supabase.functions.invoke("generate-meal-plan", {
      body: { patient_id: testPatientId, template_id: "default" }
    });

    expect(genError).toBeNull();
    expect(genResult?.success).toBe(true);
    const planId = genResult.plan_id;

    // 3. Publicar Plano (Usando a RPC Soberana)
    // Simulando itens para publicação
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
      p_items: testItems
    });

    expect(pubError).toBeNull();
    expect(pubResult).toBe(true);

    // 4. Validar Persistência e Constraints
    const { data: activePlans } = await supabase
      .from("meal_plans")
      .select("id")
      .eq("patient_id", testPatientId)
      .eq("is_active", true);

    expect(activePlans?.length).toBe(1);

    // 5. Cleanup (Opcional - em prod melhor não deletar, em dev sim)
    // await supabase.from("profiles").delete().eq("id", testPatientId);
  });
});
