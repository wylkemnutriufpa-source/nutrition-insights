/**
 * Therapeutic Priority Engine
 * Calculates dynamic priority scores for the patient's home screen.
 * Determines what the patient should see first based on clinical urgency,
 * behavioral risk, adherence, and temporal context.
 */
import { supabase } from "@/integrations/supabase/client";

export interface TherapeuticPriority {
  category: string;
  score: number;
  label: string;
  action_label: string;
  color: string;
  icon_type: string;
}

/**
 * Calculate the therapeutic priority score for a patient
 */
export async function calculateTherapeuticPriorityScore(patientId: string): Promise<TherapeuticPriority[]> {
  const priorities: TherapeuticPriority[] = [];

  // 1. Check active critical flags
  const { data: flags } = await supabase
    .from("patient_clinical_flags")
    .select("flag_key, confidence")
    .eq("patient_id", patientId)
    .eq("is_active", true);

  const activeFlags = new Set((flags || []).map(f => f.flag_key));

  if (activeFlags.has("binge_eating_risk")) {
    priorities.push({
      category: "behavioral",
      score: 95,
      label: "Atenção ao comportamento alimentar",
      action_label: "Ver estratégias",
      color: "red",
      icon_type: "behavioral",
    });
  }

  if (activeFlags.has("dehydration_symptoms")) {
    priorities.push({
      category: "hydration",
      score: 85,
      label: "Sua hidratação precisa de atenção",
      action_label: "Registrar água",
      color: "blue",
      icon_type: "hydration",
    });
  }

  if (activeFlags.has("has_gastritis") || activeFlags.has("has_reflux")) {
    priorities.push({
      category: "digestive",
      score: 80,
      label: "Cuidado digestivo ativo",
      action_label: "Ver orientações",
      color: "green",
      icon_type: "clinical_alert",
    });
  }

  // 2. Check temporal context
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 10) {
    priorities.push({
      category: "meal",
      score: 75,
      label: "Hora do café da manhã",
      action_label: "Ver refeição",
      color: "orange",
      icon_type: "meal",
    });
  } else if (hour >= 11 && hour < 14) {
    priorities.push({
      category: "meal",
      score: 78,
      label: "Hora do almoço — siga seu plano",
      action_label: "Ver refeição",
      color: "orange",
      icon_type: "meal",
    });
  } else if (hour >= 18 && hour < 21) {
    priorities.push({
      category: "meal",
      score: 75,
      label: "Hora do jantar — mantenha a consistência",
      action_label: "Ver refeição",
      color: "orange",
      icon_type: "meal",
    });
  }

  if (hour >= 21) {
    // Evening — risk window for binge eating
    if (activeFlags.has("binge_eating_risk") || activeFlags.has("emotional_eating_pattern")) {
      priorities.push({
        category: "prevention",
        score: 92,
        label: "Momento de atenção — evite compulsão noturna",
        action_label: "Ver dicas",
        color: "red",
        icon_type: "behavioral",
      });
    }
  }

  // 3. Check adherence (last 3 days)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { count: mealCount } = await (supabase
    .from("meal_item_completions" as any)
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .gte("logged_at", threeDaysAgo.toISOString()) as any);

  if ((mealCount || 0) < 3) {
    priorities.push({
      category: "adherence",
      score: 88,
      label: "Sua adesão alimentar precisa de atenção",
      action_label: "Ver plano",
      color: "orange",
      icon_type: "meal",
    });
  }

  // 4. Check checkin recency
  const { data: lastCheckin } = await supabase
    .from("patient_checkins")
    .select("created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastCheckin) {
    const daysSince = Math.floor((Date.now() - new Date((lastCheckin as any).created_at).getTime()) / 86400000);
    if (daysSince > 2) {
      priorities.push({
        category: "checkin",
        score: 70 + Math.min(20, daysSince * 3),
        label: `Faz ${daysSince} dias sem check-in`,
        action_label: "Fazer check-in",
        color: "purple",
        icon_type: "progress",
      });
    }
  }

  // Sort by score descending
  return priorities.sort((a, b) => b.score - a.score);
}

/**
 * Get therapeutic momentum score (0-100)
 */
export async function getTherapeuticMomentum(patientId: string): Promise<{
  score: number;
  label: string;
  color: string;
}> {
  // Check recent adherence + checkins + checklist completion
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { count: meals } = await (supabase
    .from("meal_item_completions" as any)
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .eq("status", "followed")
    .gte("logged_at", sevenDaysAgo.toISOString()) as any);

  const { count: tasks } = await (supabase
    .from("patient_smart_checklist_tasks" as any)
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .eq("is_completed", true)
    .gte("completion_timestamp", sevenDaysAgo.toISOString()) as any);

  const mealScore = Math.min(40, (meals || 0) * 3);
  const taskScore = Math.min(40, (tasks || 0) * 5);
  const baseScore = 20; // minimum for being active
  const total = Math.min(100, baseScore + mealScore + taskScore);

  if (total >= 70) return { score: total, label: "Em evolução 🔥", color: "green" };
  if (total >= 40) return { score: total, label: "Atenção ⚠️", color: "orange" };
  return { score: total, label: "Risco 🚨", color: "red" };
}
