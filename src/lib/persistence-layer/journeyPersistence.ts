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
    errorVisible: false,
    hasInvisibleState: false
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
  if (data.journey_status !== newStatus) {
    throw new Error(`[PersistenceLayer] Divergência crítica: Esperado ${newStatus}, Salvo ${data.journey_status}`);
  }

  return data;
}
