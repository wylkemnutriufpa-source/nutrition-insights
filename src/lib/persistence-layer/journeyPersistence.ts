import { supabase } from "@/integrations/supabase/client";
import { assertContract } from "@/lib/contractGuards";
import { JourneyStatus } from "@/hooks/usePatientJourneyStatus";

/**
 * Persistence Layer — Journey
 * 
 * Centraliza toda alteração de status da jornada do paciente para garantir 
 * que nenhum efeito cascata ocorra sem validação.
 */

export async function updatePatientJourneyStatus(
  patientId: string,
  newStatus: JourneyStatus,
  context: { anamnesisCompleted: boolean }
) {
  console.log(`[PersistenceLayer] Solicitando transição para ${newStatus} (Paciente: ${patientId})`);

  // 1. Validação Pré-Persistência
  assertContract("ui_consistency", {
    dbStatus: newStatus,
    uiStatus: null, // Novo status ainda não está na UI
    anamnesisCompleted: context.anamnesisCompleted
  });

  // 2. Execução Determinística
  const { data, error } = await supabase
    .from("nutritionist_patients")
    .update({ 
      journey_status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq("patient_id", patientId)
    .select("journey_status")
    .single();

  if (error) {
    console.error("[PersistenceLayer] Erro ao persistir status:", error);
    throw error;
  }

  // 3. Validação Pós-Persistência (Garantia de que o que foi salvo é o esperado)
  assertContract("persistence_safety", {
    local: { status: newStatus },
    remote: { status: data.journey_status as JourneyStatus },
    fields: ["status"]
  });

  return data;
}
