import { supabase } from "@v1/integrations/supabase/client";

export interface PatientClinicalFlag {
  id: string;
  patient_id: string;
  flag_key: string;
  source: string;
  confidence: number;
  is_active: boolean;
  source_answer_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface FlagWithCatalog extends PatientClinicalFlag {
  display_name: string;
  category: string;
  description: string | null;
}

/**
 * Process anamnesis answers into clinical flags via edge function
 */
export async function processAnamnesisFlags(
  patientId: string,
  anamnesisId?: string
): Promise<{ flags_generated: number; flags: Array<{ flag_key: string; confidence: number }> }> {
  const { data, error } = await supabase.functions.invoke("process-anamnesis-flags", {
    body: { patient_id: patientId, anamnesis_id: anamnesisId },
  });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Get active clinical flags for a patient, enriched with catalog info
 */
export async function getPatientFlags(patientId: string): Promise<FlagWithCatalog[]> {
  // Get active flags
  const { data: flags, error } = await supabase
    .from("patient_clinical_flags")
    .select("*")
    .eq("patient_id", patientId)
    .eq("is_active", true)
    .order("confidence", { ascending: false });

  if (error) throw new Error(error.message);
  if (!flags || flags.length === 0) return [];

  // Get catalog info for enrichment
  const flagKeys = flags.map((f: any) => f.flag_key);
  const { data: catalog } = await supabase
    .from("clinical_flags_catalog")
    .select("flag_key, display_name, category, description")
    .in("flag_key", flagKeys);

  const catalogMap = new Map(
    (catalog || []).map((c: any) => [c.flag_key, c])
  );

  return flags.map((f: any) => {
    const cat = catalogMap.get(f.flag_key);
    return {
      ...f,
      display_name: cat?.display_name || f.flag_key,
      category: cat?.category || "geral",
      description: cat?.description || null,
    };
  }) as FlagWithCatalog[];
}

/**
 * Get flags grouped by domain/category
 */
export async function getPatientFlagsByDomain(
  patientId: string
): Promise<Record<string, FlagWithCatalog[]>> {
  const flags = await getPatientFlags(patientId);
  const grouped: Record<string, FlagWithCatalog[]> = {};

  for (const flag of flags) {
    if (!grouped[flag.category]) grouped[flag.category] = [];
    grouped[flag.category].push(flag);
  }

  return grouped;
}

/**
 * Category display info
 */
export const DOMAIN_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  digestivo: { label: "Digestivo", icon: "🫁", color: "text-amber-500" },
  metabolico: { label: "Metabólico", icon: "⚡", color: "text-orange-500" },
  comportamental: { label: "Comportamento Alimentar", icon: "🧠", color: "text-purple-500" },
  micronutrientes: { label: "Micronutrientes", icon: "💊", color: "text-blue-500" },
  sono: { label: "Sono & Recuperação", icon: "💤", color: "text-indigo-500" },
  hidratacao: { label: "Hidratação", icon: "💧", color: "text-cyan-500" },
  performance: { label: "Performance", icon: "💪", color: "text-emerald-500" },
  objetivo: { label: "Objetivo", icon: "🎯", color: "text-rose-500" },
  geral: { label: "Geral", icon: "📋", color: "text-muted-foreground" },
};
