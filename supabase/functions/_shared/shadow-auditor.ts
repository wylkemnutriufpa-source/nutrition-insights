import { MacroTargets, ClinicalProfile, MealItem, reconcileMeal } from "./clinical-engine-v2.ts";

export type DivergenceType = 
  | 'macro_drift' 
  | 'protein_clamp_violation' 
  | 'meal_structure_mismatch' 
  | 'substitution_mismatch' 
  | 'weekly_rotation_mismatch' 
  | 'meal_count_mismatch' 
  | 'rule_smart_mode' 
  | 'rule_marmita_freeze';

export interface ShadowAuditResult {
  compatible: boolean;
  divergence_count: number;
  severity: 'info' | 'warn' | 'critical';
  divergence_types: DivergenceType[];
  analysis: {
    types: Record<string, any>;
    clinical_impact: string;
    legacy_rules_detected: string[];
  };
  readiness_score: number;
  payload_diff: any;
}

export function compareClinicalOutputs(v1: any, v2: any): ShadowAuditResult {
  const divergence_types = new Set<DivergenceType>();
  const diff: any = {};
  let divergenceCount = 0;
  let readiness_score = 100;
  const legacy_rules_detected: string[] = [];

  // 1. Macro Drift Analysis (Tolerance 5%)
  const TOLERANCE = 0.05;
  const metrics = ['calories', 'protein', 'carbs', 'fat'] as const;

  metrics.forEach(m => {
    const val1 = v1.totals?.[m] || 0;
    const val2 = v2.totals?.[m] || 0;
    const delta = Math.abs(val1 - val2);
    const rel = val1 > 0 ? delta / val1 : 0;

    if (rel > TOLERANCE && delta > 1) {
      divergenceCount++;
      divergence_types.add('macro_drift');
      readiness_score -= 15;
      if (!diff.macros) diff.macros = {};
      diff.macros[m] = { v1: val1, v2: val2, delta, rel };
      
      // Protein Clamp Violation check
      if (m === 'protein' && val2 > 200 && val1 < val2) {
        divergence_types.add('protein_clamp_violation');
        readiness_score -= 20;
      }
    }
  });

  // 2. Meal Structure & Count
  const count1 = v1.items?.length || 0;
  const count2 = v2.items?.length || 0;
  if (count1 !== count2) {
    divergenceCount++;
    divergence_types.add('meal_count_mismatch');
    divergence_types.add('meal_structure_mismatch');
    readiness_score -= 20;
    diff.meal_count = { v1: count1, v2: count2 };
  }

  // 3. Legacy Rules Detection (Heuristics)
  // Smart Mode Check
  if (v1.metadata?.smart_mode || JSON.stringify(v1).includes('smart_mode')) {
    legacy_rules_detected.push('rule_smart_mode');
    divergence_types.add('rule_smart_mode');
  }
  
  // Marmita/Freeze Check
  if (JSON.stringify(v1).toLowerCase().includes('congelado') || JSON.stringify(v1).toLowerCase().includes('marmita')) {
    legacy_rules_detected.push('rule_marmita_freeze');
    divergence_types.add('rule_marmita_freeze');
  }

  // 4. Clinical Impact Assessment
  let severity: 'info' | 'warn' | 'critical' = 'info';
  let clinical_impact = "Insignificante";

  if (divergence_types.has('protein_clamp_violation')) {
    severity = 'critical';
    clinical_impact = "ALTO RISCO: Proteína V2 excede limites ou diverge agressivamente do legado";
  } else if (divergence_types.has('macro_drift') && readiness_score < 70) {
    severity = 'warn';
    clinical_impact = "Moderado: Desvio calórico fora da margem de segurança";
  } else if (divergenceCount > 0) {
    severity = 'info';
    clinical_impact = "Baixo: Divergências estruturais sem risco clínico imediato";
  }

  readiness_score = Math.max(0, readiness_score);

  return {
    compatible: divergenceCount === 0,
    divergence_count: divergenceCount,
    severity,
    divergence_types: Array.from(divergence_types),
    analysis: {
      types: diff,
      clinical_impact,
      legacy_rules_detected
    },
    readiness_score,
    payload_diff: {
      divergences: Array.from(divergence_types),
      diff,
      v1_summary: v1.totals,
      v2_summary: v2.totals
    }
  };
}

export async function runShadowAudit(
  client: any,
  planId: string,
  patientId: string,
  v1Data: any,
  v2Data: any
) {
  try {
    const audit = compareClinicalOutputs(v1Data, v2Data);
    
    const { error } = await client
      .from("clinical_shadow_audit")
      .insert({
        plan_id: planId,
        patient_id: patientId,
        v1_hash: JSON.stringify(v1Data.totals || {}),
        v2_hash: JSON.stringify(v2Data.totals || {}),
        divergence_count: audit.divergence_count,
        compatible: audit.compatible,
        severity: audit.severity,
        divergence_types: audit.divergence_types,
        analysis: audit.analysis,
        readiness_score: audit.readiness_score,
        payload_diff: audit.payload_diff
      });

    if (error) console.error("[SHADOW-AUDIT] Error persisting audit:", error);
    
    return audit;
  } catch (err) {
    console.error("[SHADOW-AUDIT] Critical error in shadow audit:", err);
    return null;
  }
}

