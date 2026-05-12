/**
 * Clinical Learning Engine (AI-Less Learning)
 * Detects patterns from patient behavior, body response, and adherence.
 * Stores learned patterns for personalization without generative AI.
 */
import { supabase } from "@/integrations/supabase/client";

interface LearningPattern {
  learning_type: string;
  learned_pattern_code: string;
  learned_pattern_description: string;
  confidence_score: number;
  outcome_impact_score: number;
}

/**
 * Detect adherence patterns for a patient
 */
export async function detectAdherencePatterns(patientId: string): Promise<LearningPattern[]> {
  const patterns: LearningPattern[] = [];

  // Check meal completions by meal type
  const { data: completions } = await (supabase
    .from("meal_item_completions" as any)
    .select("meal_type, status, logged_at")
    .eq("patient_id", patientId)
    .order("logged_at", { ascending: false })
    .limit(100) as any);

  if (!completions || completions.length < 7) return patterns;

  // Analyze per meal_type adherence
  const mealTypeStats: Record<string, { total: number; followed: number }> = {};
  for (const c of completions) {
    const mt = (c as any).meal_type || "unknown";
    if (!mealTypeStats[mt]) mealTypeStats[mt] = { total: 0, followed: 0 };
    mealTypeStats[mt].total++;
    if ((c as any).status === "followed") mealTypeStats[mt].followed++;
  }

  for (const [type, stats] of Object.entries(mealTypeStats)) {
    const rate = stats.followed / stats.total;
    if (rate < 0.4 && stats.total >= 5) {
      const mealLabel = type === "dinner" ? "jantar" : type === "lunch" ? "almoço" : type === "breakfast" ? "café da manhã" : type;
      patterns.push({
        learning_type: "nutrition",
        learned_pattern_code: `low_${type}_adherence`,
        learned_pattern_description: `Paciente tem baixa adesão ao ${mealLabel} (${Math.round(rate * 100)}%)`,
        confidence_score: Math.min(90, stats.total * 3),
        outcome_impact_score: 80,
      });
    }
  }

  // Check overall adherence trend
  const totalFollowed = completions.filter((c: any) => c.status === "followed").length;
  const overallRate = totalFollowed / completions.length;
  if (overallRate > 0.8) {
    patterns.push({
      learning_type: "behavior",
      learned_pattern_code: "high_overall_adherence",
      learned_pattern_description: `Paciente mantém excelente adesão geral (${Math.round(overallRate * 100)}%)`,
      confidence_score: 85,
      outcome_impact_score: 90,
    });
  }

  return patterns;
}

/**
 * Detect body response patterns
 */
export async function detectBodyResponsePatterns(patientId: string): Promise<LearningPattern[]> {
  const patterns: LearningPattern[] = [];

  // Check weight trajectory
  const { data: checkins } = await supabase
    .from("patient_checkins")
    .select("weight, created_at")
    .eq("patient_id", patientId)
    .not("weight", "is", null)
    .order("created_at", { ascending: true })
    .limit(20);

  if (!checkins || checkins.length < 3) return patterns;

  const weights = checkins.map((c: any) => c.weight as number);
  const first3Avg = weights.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const last3Avg = weights.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const delta = last3Avg - first3Avg;

  if (delta < -1.5) {
    patterns.push({
      learning_type: "metabolic",
      learned_pattern_code: "good_weight_responder",
      learned_pattern_description: `Paciente responde bem ao plano atual (${delta.toFixed(1)}kg)`,
      confidence_score: 75,
      outcome_impact_score: 85,
    });
  } else if (Math.abs(delta) < 0.3 && weights.length >= 8) {
    patterns.push({
      learning_type: "metabolic",
      learned_pattern_code: "weight_plateau_detected",
      learned_pattern_description: "Possível platô de peso detectado — considerar ajuste calórico",
      confidence_score: 70,
      outcome_impact_score: 75,
    });
  }

  return patterns;
}

/**
 * Persist detected patterns, updating existing ones or inserting new
 */
export async function persistLearningPatterns(
  patientId: string,
  patterns: LearningPattern[]
): Promise<number> {
  let persisted = 0;

  for (const p of patterns) {
    // Check if pattern already exists
    const { data: existing } = await (supabase
      .from("patient_clinical_learning_memory" as any)
      .select("id, reinforcement_count, confidence_score")
      .eq("patient_id", patientId)
      .eq("learned_pattern_code", p.learned_pattern_code)
      .eq("active", true)
      .maybeSingle() as any);

    if (existing) {
      // Reinforce
      await (supabase
        .from("patient_clinical_learning_memory" as any)
        .update({
          reinforcement_count: ((existing as any).reinforcement_count || 1) + 1,
          confidence_score: Math.min(99, ((existing as any).confidence_score || 50) + 2),
          last_reinforced_at: new Date().toISOString(),
          outcome_impact_score: p.outcome_impact_score,
        })
        .eq("id", (existing as any).id) as any);
    } else {
      // Insert new
      await (supabase
        .from("patient_clinical_learning_memory" as any)
        .insert({
          patient_id: patientId,
          ...p,
        }) as any);
    }
    persisted++;
  }

  return persisted;
}

/**
 * Get learned patterns for a patient
 */
export async function getLearnedPatterns(patientId: string) {
  const { data } = await (supabase
    .from("patient_clinical_learning_memory" as any)
    .select("*")
    .eq("patient_id", patientId)
    .eq("active", true)
    .order("confidence_score", { ascending: false }) as any);

  return data || [];
}

/**
 * Run full learning cycle for a patient
 */
export async function runLearningCycle(patientId: string): Promise<number> {
  const adherencePatterns = await detectAdherencePatterns(patientId);
  const bodyPatterns = await detectBodyResponsePatterns(patientId);
  const allPatterns = [...adherencePatterns, ...bodyPatterns];

  if (allPatterns.length === 0) return 0;
  return persistLearningPatterns(patientId, allPatterns);
}
