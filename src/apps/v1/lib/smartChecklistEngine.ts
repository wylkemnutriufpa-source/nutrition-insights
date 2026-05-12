/**
 * Smart Checklist Engine
 * Generates personalized checklist tasks from clinical flags, labs, body composition, and adherence.
 */
import { supabase } from "@v1/integrations/supabase/client";

interface SmartTask {
  task_code: string;
  task_title: string;
  task_description: string;
  task_category: string;
  clinical_domain: string;
  priority_score: number;
  generated_from: string;
  recurrence_type: string;
}

// ── Flag-based task generation ──
const FLAG_TASK_MAP: Record<string, SmartTask> = {
  dehydration_symptoms: {
    task_code: "hydration_goal",
    task_title: "Meta de hidratação",
    task_description: "Beba pelo menos 2L de água hoje para melhorar seu metabolismo e digestão.",
    task_category: "hydration",
    clinical_domain: "metabolic",
    priority_score: 85,
    generated_from: "anamnesis",
    recurrence_type: "daily",
  },
  has_constipation: {
    task_code: "fiber_intake",
    task_title: "Consumir fibras",
    task_description: "Inclua alimentos ricos em fibras hoje: frutas, verduras e grãos integrais.",
    task_category: "digestive",
    clinical_domain: "digestive",
    priority_score: 75,
    generated_from: "anamnesis",
    recurrence_type: "daily",
  },
  low_sun_exposure: {
    task_code: "sun_exposure",
    task_title: "Tomar sol por 15 minutos",
    task_description: "A exposição solar ajuda na síntese de vitamina D e melhora o humor.",
    task_category: "micronutrients",
    clinical_domain: "micronutrients",
    priority_score: 60,
    generated_from: "anamnesis",
    recurrence_type: "daily",
  },
  binge_eating_risk: {
    task_code: "register_episodes",
    task_title: "Registrar episódios alimentares",
    task_description: "Anote se sentiu compulsão alimentar hoje e o que estava sentindo antes.",
    task_category: "behavioral",
    clinical_domain: "behavioral",
    priority_score: 90,
    generated_from: "anamnesis",
    recurrence_type: "daily",
  },
  emotional_eating_pattern: {
    task_code: "protein_snack",
    task_title: "Lanche proteico estratégico",
    task_description: "Evite jejum prolongado. Faça um lanche rico em proteína entre refeições.",
    task_category: "behavioral",
    clinical_domain: "behavioral",
    priority_score: 80,
    generated_from: "anamnesis",
    recurrence_type: "daily",
  },
  strength_training_active: {
    task_code: "post_workout_meal",
    task_title: "Garantir refeição pós-treino",
    task_description: "Consumir proteína + carboidrato em até 2h após o treino para melhor recuperação.",
    task_category: "performance",
    clinical_domain: "performance",
    priority_score: 70,
    generated_from: "anamnesis",
    recurrence_type: "daily",
  },
  has_gastritis: {
    task_code: "digestive_care",
    task_title: "Cuidado digestivo",
    task_description: "Evite alimentos irritantes hoje: café em excesso, pimenta, frituras e refrigerantes.",
    task_category: "digestive",
    clinical_domain: "digestive",
    priority_score: 80,
    generated_from: "anamnesis",
    recurrence_type: "daily",
  },
  has_reflux: {
    task_code: "anti_reflux",
    task_title: "Prevenção de refluxo",
    task_description: "Evite deitar após comer. Faça refeições menores e mais frequentes.",
    task_category: "digestive",
    clinical_domain: "digestive",
    priority_score: 75,
    generated_from: "anamnesis",
    recurrence_type: "daily",
  },
  suspected_vitamin_d_deficiency: {
    task_code: "vitamin_d_sun",
    task_title: "Exposição solar + suplementação",
    task_description: "Tome sol por 15min e mantenha a suplementação de vitamina D conforme orientação.",
    task_category: "micronutrients",
    clinical_domain: "micronutrients",
    priority_score: 65,
    generated_from: "labs",
    recurrence_type: "daily",
  },
  suspected_iron_deficiency: {
    task_code: "iron_intake",
    task_title: "Consumir alimentos ricos em ferro",
    task_description: "Inclua carnes vermelhas, feijão ou lentilha. Combine com vitamina C (limão/laranja).",
    task_category: "micronutrients",
    clinical_domain: "micronutrients",
    priority_score: 70,
    generated_from: "labs",
    recurrence_type: "daily",
  },
  suspected_insulin_resistance: {
    task_code: "glucose_control",
    task_title: "Reduzir açúcar refinado",
    task_description: "Evite doces, refrigerantes e farinha branca hoje. Prefira grãos integrais.",
    task_category: "metabolic",
    clinical_domain: "metabolic",
    priority_score: 85,
    generated_from: "labs",
    recurrence_type: "daily",
  },
  high_body_fat_male: {
    task_code: "aerobic_exercise",
    task_title: "Atividade aeróbica",
    task_description: "Inclua 30min de caminhada ou exercício aeróbico para reduzir gordura corporal.",
    task_category: "performance",
    clinical_domain: "metabolic",
    priority_score: 70,
    generated_from: "body",
    recurrence_type: "daily",
  },
  high_body_fat_female: {
    task_code: "aerobic_exercise_f",
    task_title: "Atividade aeróbica",
    task_description: "Inclua 30min de caminhada ou exercício aeróbico para reduzir gordura corporal.",
    task_category: "performance",
    clinical_domain: "metabolic",
    priority_score: 70,
    generated_from: "body",
    recurrence_type: "daily",
  },
  poor_sleep_quality: {
    task_code: "sleep_hygiene",
    task_title: "Melhorar higiene do sono",
    task_description: "Evite telas 1h antes de dormir. Mantenha horário regular de sono.",
    task_category: "behavioral",
    clinical_domain: "behavioral",
    priority_score: 65,
    generated_from: "anamnesis",
    recurrence_type: "daily",
  },
  excess_caffeine: {
    task_code: "caffeine_cutoff",
    task_title: "Limitar cafeína à tarde",
    task_description: "Evite café, chá preto e energéticos após as 14h para melhorar seu sono.",
    task_category: "behavioral",
    clinical_domain: "behavioral",
    priority_score: 55,
    generated_from: "anamnesis",
    recurrence_type: "daily",
  },
};

/**
 * Generate smart checklist for a patient based on active clinical flags
 */
export async function generateSmartChecklist(patientId: string): Promise<number> {
  // 1. Get active flags
  const { data: flags } = await supabase
    .from("patient_clinical_flags")
    .select("flag_key")
    .eq("patient_id", patientId)
    .eq("is_active", true);

  if (!flags || flags.length === 0) return 0;

  // 2. Get existing active tasks to avoid duplicates
  const { data: existing } = await (supabase
    .from("patient_smart_checklist_tasks" as any)
    .select("task_code")
    .eq("patient_id", patientId)
    .eq("is_active", true)
    .eq("valid_from", new Date().toISOString().split("T")[0]) as any);

  const existingCodes = new Set(existing?.map(e => (e as any).task_code) || []);

  // 3. Map flags to tasks
  const tasksToInsert: any[] = [];
  for (const flag of flags) {
    const task = FLAG_TASK_MAP[flag.flag_key];
    if (task && !existingCodes.has(task.task_code)) {
      tasksToInsert.push({
        patient_id: patientId,
        ...task,
        valid_from: new Date().toISOString().split("T")[0],
      });
    }
  }

  if (tasksToInsert.length === 0) return 0;

  // 4. Insert tasks
  const { error } = await (supabase
    .from("patient_smart_checklist_tasks" as any)
    .insert(tasksToInsert) as any);

  if (error) {
    console.error("[smartChecklist] Insert error:", error);
    return 0;
  }

  return tasksToInsert.length;
}

/**
 * Complete a smart checklist task with optional emotional feedback
 */
export async function completeSmartTask(
  taskId: string,
  feedback?: string
): Promise<boolean> {
  const { error } = await (supabase
    .from("patient_smart_checklist_tasks" as any)
    .update({
      is_completed: true,
      completion_timestamp: new Date().toISOString(),
      emotional_feedback: feedback || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId) as any);

  return !error;
}

/**
 * Get today's smart checklist for a patient
 */
export async function getSmartChecklist(patientId: string) {
  const today = new Date().toISOString().split("T")[0];

  const { data } = await (supabase
    .from("patient_smart_checklist_tasks" as any)
    .select("*")
    .eq("patient_id", patientId)
    .eq("is_active", true)
    .lte("valid_from", today)
    .order("priority_score", { ascending: false }) as any);

  return (data || []) as any[];
}
