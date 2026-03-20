/**
 * Patient Daily Focus Engine
 * Resolves the most important clinical focus for a patient each day.
 */
import { supabase } from "@/integrations/supabase/client";

export interface DailyFocus {
  id: string;
  focus_type: string;
  focus_priority: number;
  focus_title: string;
  focus_description: string;
  focus_action_label: string;
  focus_action_route: string;
  focus_color: string;
  is_completed: boolean;
}

const FOCUS_COLORS: Record<string, string> = {
  hydration: "blue",
  meal: "green",
  behavioral: "orange",
  clinical_alert: "red",
  progress: "purple",
  motivation: "primary",
};

export async function resolvePatientDailyFocus(patientId: string): Promise<DailyFocus[]> {
  // Check for existing valid focus today
  const today = new Date().toISOString().split("T")[0];
  const { data: existing } = await supabase
    .from("patient_daily_focus" as any)
    .select("*")
    .eq("patient_id", patientId)
    .gte("valid_until", new Date().toISOString())
    .order("focus_priority", { ascending: false })
    .limit(5);

  if (existing && existing.length > 0) {
    return existing as unknown as DailyFocus[];
  }

  // Generate new focus items
  const focusItems: Omit<DailyFocus, "id">[] = [];

  // 1. Check behavioral tasks
  const { data: tasks } = await supabase
    .from("patient_behavioral_tasks" as any)
    .select("id, title, description, priority, category")
    .eq("patient_id", patientId)
    .eq("status", "active")
    .order("priority", { ascending: false })
    .limit(3);

  if (tasks && tasks.length > 0) {
    const top = tasks[0] as any;
    focusItems.push({
      focus_type: "behavioral",
      focus_priority: top.priority || 70,
      focus_title: top.title || "Tarefa prioritária",
      focus_description: top.description || "Complete sua tarefa comportamental do dia.",
      focus_action_label: "Ver tarefas",
      focus_action_route: "/checklist",
      focus_color: FOCUS_COLORS.behavioral,
      is_completed: false,
    });
  }

  // 2. Check clinical flags
  const { data: flags } = await supabase
    .from("patient_clinical_flags" as any)
    .select("id, flag_key, severity, clinical_note")
    .eq("patient_id", patientId)
    .eq("is_active", true)
    .in("severity", ["alta", "critica"])
    .limit(2);

  if (flags && flags.length > 0) {
    const topFlag = flags[0] as any;
    focusItems.push({
      focus_type: "clinical_alert",
      focus_priority: 90,
      focus_title: "Atenção clínica necessária",
      focus_description: topFlag.clinical_note || "Há um alerta clínico ativo que requer atenção.",
      focus_action_label: "Ver detalhes",
      focus_action_route: "/checklist",
      focus_color: FOCUS_COLORS.clinical_alert,
      is_completed: false,
    });
  }

  // 3. Check checklist completion
  const { data: checklist } = await supabase
    .from("checklist_tasks")
    .select("id, completed")
    .eq("patient_id", patientId)
    .eq("date", today);

  if (checklist) {
    const total = checklist.length;
    const completed = checklist.filter((t: any) => t.completed).length;
    if (total > 0 && completed < total) {
      const pct = Math.round((completed / total) * 100);
      focusItems.push({
        focus_type: "behavioral",
        focus_priority: 60,
        focus_title: `Checklist: ${pct}% concluído`,
        focus_description: `Você completou ${completed} de ${total} tarefas hoje.`,
        focus_action_label: "Continuar",
        focus_action_route: "/checklist",
        focus_color: FOCUS_COLORS.behavioral,
        is_completed: false,
      });
    }
  }

  // 4. Hydration (always relevant)
  focusItems.push({
    focus_type: "hydration",
    focus_priority: 50,
    focus_title: "Hidratação",
    focus_description: "Lembre-se de beber água regularmente ao longo do dia.",
    focus_action_label: "Registrar água",
    focus_action_route: "/checklist",
    focus_color: FOCUS_COLORS.hydration,
    is_completed: false,
  });

  // 5. Meal adherence
  focusItems.push({
    focus_type: "meal",
    focus_priority: 55,
    focus_title: "Aderência ao plano alimentar",
    focus_description: "Siga seu plano alimentar de hoje para resultados consistentes.",
    focus_action_label: "Ver plano",
    focus_action_route: "/my-diet",
    focus_color: FOCUS_COLORS.meal,
    is_completed: false,
  });

  // Sort by priority descending
  focusItems.sort((a, b) => b.focus_priority - a.focus_priority);

  // Persist top 5
  const toInsert = focusItems.slice(0, 5).map(f => ({
    patient_id: patientId,
    ...f,
    generated_at: new Date().toISOString(),
    valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }));

  if (toInsert.length > 0) {
    const { data: inserted } = await supabase
      .from("patient_daily_focus" as any)
      .insert(toInsert)
      .select();

    if (inserted) return inserted as unknown as DailyFocus[];
  }

  return [];
}

export async function completeDailyFocus(focusId: string): Promise<void> {
  await supabase
    .from("patient_daily_focus" as any)
    .update({ is_completed: true, completed_at: new Date().toISOString() })
    .eq("id", focusId);
}
