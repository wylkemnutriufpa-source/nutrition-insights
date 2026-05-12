import { MacroTargets, ClinicalProfile, MealItem, reconcileMeal } from "./clinical-engine-v2.ts";

export interface ShadowAuditResult {
  compatible: boolean;
  divergence_count: number;
  severity: 'info' | 'warn' | 'critical';
  divergences: string[];
  payload_diff: any;
}

export function compareClinicalOutputs(v1: any, v2: any): ShadowAuditResult {
  const divergences: string[] = [];
  const diff: any = {};
  let divergenceCount = 0;

  // 1. Basic Macros Comparison (Tolerance 5%)
  const TOLERANCE = 0.05;
  const metrics = ['calories', 'protein', 'carbs', 'fat'] as const;

  metrics.forEach(m => {
    const val1 = v1.totals?.[m] || 0;
    const val2 = v2.totals?.[m] || 0;
    const delta = Math.abs(val1 - val2);
    const rel = val1 > 0 ? delta / val1 : 0;

    if (rel > TOLERANCE && delta > 1) {
      divergenceCount++;
      divergences.push(`Divergência em ${m}: V1=${val1.toFixed(1)}, V2=${val2.toFixed(1)} (Δ=${delta.toFixed(1)})`);
      diff[m] = { v1: val1, v2: val2, delta, rel };
    }
  });

  // 2. Meal Count Comparison
  if (v1.items?.length !== v2.items?.length) {
    divergenceCount++;
    divergences.push(`Divergência no nº de refeições: V1=${v1.items?.length}, V2=${v2.items?.length}`);
    diff.meal_count = { v1: v1.items?.length, v2: v2.items?.length };
  }

  // 3. Protein Grammage Comparison (Individual Items)
  // We try to match items by name/index if possible
  v1.items?.forEach((item1: any, idx: number) => {
    const item2 = v2.items?.[idx];
    if (item2) {
      const g1 = item1.grams || 0;
      const g2 = item2.grams || 0;
      const dG = Math.abs(g1 - g2);
      if (dG > 10) { // More than 10g difference
        divergenceCount++;
        divergences.push(`Divergência na gramagem de ${item1.name || 'item'}: V1=${g1}g, V2=${g2}g`);
        if (!diff.items) diff.items = [];
        diff.items.push({ name: item1.name, idx, v1_grams: g1, v2_grams: g2 });
      }
    }
  });

  const compatible = divergenceCount === 0;
  let severity: 'info' | 'warn' | 'critical' = 'info';
  if (divergenceCount > 5) severity = 'critical';
  else if (divergenceCount > 0) severity = 'warn';

  return {
    compatible,
    divergence_count: divergenceCount,
    severity,
    divergences,
    payload_diff: diff
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
    
    // We don't want to block the main generation flow
    // Fire and forget or handle error silently
    const { error } = await client
      .from("clinical_shadow_audit")
      .insert({
        plan_id: planId,
        patient_id: patientId,
        v1_hash: JSON.stringify(v1Data.totals || {}),
        v2_hash: JSON.stringify(v2Data.totals || {}),
        divergence_count: audit.divergence_count,
        compatible: audit.compatible,
        payload_diff: {
          divergences: audit.divergences,
          diff: audit.payload_diff,
          v1_full: v1Data,
          v2_full: v2Data
        },
        severity: audit.severity
      });

    if (error) console.error("[SHADOW-AUDIT] Error persisting audit:", error);
    
    return audit;
  } catch (err) {
    console.error("[SHADOW-AUDIT] Critical error in shadow audit:", err);
    return null;
  }
}
