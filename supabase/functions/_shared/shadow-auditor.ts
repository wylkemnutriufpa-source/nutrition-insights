import { MacroTargets, ClinicalProfile, MealItem, reconcileMeal } from "./clinical-engine-v2.ts";

export type DivergenceType = 
  | 'macro_drift' 
  | 'protein_clamp_violation' 
  | 'meal_structure_mismatch' 
  | 'substitution_mismatch' 
  | 'weekly_rotation_mismatch' 
  | 'meal_count_mismatch' 
  | 'rule_smart_mode' 
  | 'rule_marmita_freeze'
  | 'energy_reconciliation';


export interface ShadowAuditResult {
  compatible: boolean;
  divergence_count: number;
  severity: 'info' | 'warn' | 'critical';
  divergence_types: DivergenceType[];
  analysis: {
    types: Record<string, any>;
    clinical_impact: string;
    legacy_rules_detected: string[];
    readiness_status: 'READY_FOR_CUTOVER' | 'SHADOW_STABLE' | 'HIGH_DIVERGENCE' | 'BLOCKED';
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

  // 1. Macro Drift Analysis (Tolerance 3% - Reduced from 5%)
  const TOLERANCE = 0.03;
  const metrics = ['calories', 'protein', 'carbs', 'fat'] as const;

  metrics.forEach(m => {
    const val1 = v1.totals?.[m] || 0;
    const val2 = v2.totals?.[m] || 0;
    const delta = Math.abs(val1 - val2);
    const rel = val1 > 0 ? delta / val1 : 0;

    if (rel > TOLERANCE && delta > 1) {
      divergenceCount++;
      divergence_types.add('macro_drift');
      
      // Penalidade proporcional ao drift
      const penalty = Math.min(20, Math.round(rel * 100));
      readiness_score -= penalty;
      
      if (!diff.macros) diff.macros = {};
      diff.macros[m] = { v1: val1, v2: val2, delta, rel };
      
      // Protein Clamp Violation check
      // Se V1 > 180g e V2 corrigiu para <= 200g (ou 150g), é uma violação do legado detectada e corrigida
      if (m === 'protein' && val1 > 150 && val2 < val1) {
        divergence_types.add('protein_clamp_violation');
        // Not necessarily a penalty for readiness if V2 fixed it, but we track it
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
    readiness_score -= 25;
    diff.meal_count = { v1: count1, v2: count2 };
  }

  // 3. Legacy Rules Detection (Heuristics)
  if (v1.metadata?.smart_mode || JSON.stringify(v1).includes('smart_mode')) {
    legacy_rules_detected.push('rule_smart_mode');
    divergence_types.add('rule_smart_mode');
    readiness_score -= 5;
  }
  
  if (JSON.stringify(v1).toLowerCase().includes('congelado') || JSON.stringify(v1).toLowerCase().includes('marmita')) {
    legacy_rules_detected.push('rule_marmita_freeze');
    divergence_types.add('rule_marmita_freeze');
    readiness_score -= 5;
  }

  // 4. Score-based Status
  readiness_score = Math.max(0, readiness_score);
  let readiness_status: ShadowAuditResult['analysis']['readiness_status'] = 'BLOCKED';
  
  if (readiness_score >= 95) readiness_status = 'READY_FOR_CUTOVER';
  else if (readiness_score >= 85) readiness_status = 'SHADOW_STABLE';
  else if (readiness_score >= 70) readiness_status = 'HIGH_DIVERGENCE';

  // 5. Clinical Impact Assessment
  let severity: 'info' | 'warn' | 'critical' = 'info';
  let clinical_impact = "Insignificante";

  if (divergence_types.has('protein_clamp_violation')) {
    severity = 'critical';
    clinical_impact = "DIVERGÊNCIA CRÍTICA: Legado ultrapassa limites clínicos; V2 aplicando soberania.";
  } else if (readiness_score < 70) {
    severity = 'warn';
    clinical_impact = "Moderado: Desvio estrutural ou calórico elevado";
  } else if (divergenceCount > 0) {
    severity = 'info';
    clinical_impact = "Baixo: Pequenas variações de arredondamento ou estrutura";
  }

  // 4. Energy Reconciliation Tracking
  // If V2 used energy pivots, we track it as an improvement over legacy drift
  const v2Events = v2.events || [];
  const energyEvents = v2Events.filter((e: any) => e.type === 'energy_reconciliation');
  if (energyEvents.length > 0) {
    divergence_types.add('energy_reconciliation');
    diff.energy_reconciliation = {
      count: energyEvents.length,
      pivots: energyEvents.map((e: any) => e.metadata?.dominant_pivot),
      impact: energyEvents.reduce((acc: number, e: any) => acc + (e.before - e.after), 0)
    };
  }

  // 5. Score-based Status
  readiness_score = Math.max(0, readiness_score);
  let readiness_status: ShadowAuditResult['analysis']['readiness_status'] = 'BLOCKED';
  
  if (readiness_score >= 95) readiness_status = 'READY_FOR_CUTOVER';
  else if (readiness_score >= 85) readiness_status = 'SHADOW_STABLE';
  else if (readiness_score >= 70) readiness_status = 'HIGH_DIVERGENCE';

  // 6. Clinical Impact Assessment
  let severity: 'info' | 'warn' | 'critical' = 'info';
  let clinical_impact = "Insignificante";

  if (divergence_types.has('protein_clamp_violation')) {
    severity = 'critical';
    clinical_impact = "DIVERGÊNCIA CRÍTICA: Legado ultrapassa limites clínicos; V2 aplicando soberania.";
  } else if (divergence_types.has('energy_reconciliation') && Math.abs(diff.macros?.calories?.rel || 0) < 0.01) {
    severity = 'info';
    clinical_impact = "Soberania Energética: V2 reconciliou drift do legado com sucesso.";
  } else if (readiness_score < 70) {
    severity = 'warn';
    clinical_impact = "Moderado: Desvio estrutural ou calórico elevado";
  } else if (divergenceCount > 0) {
    severity = 'info';
    clinical_impact = "Baixo: Pequenas variações de arredondamento ou estrutura";
  }

  return {
    compatible: divergenceCount === 0,
    divergence_count: divergenceCount,
    severity,
    divergence_types: Array.from(divergence_types),
    analysis: {
      types: diff,
      clinical_impact,
      legacy_rules_detected,
      readiness_status
    },
    readiness_score,
    payload_diff: {
      divergences: Array.from(divergence_types),
      diff,
      v1_summary: v1.totals,
      v2_summary: v2.totals,
      events: v2Events,
      readiness_status
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

