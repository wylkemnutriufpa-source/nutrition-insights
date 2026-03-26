import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Exercise substitution knowledge base
const SUBSTITUTION_MAP: Record<string, { name: string; reason: string }[]> = {
  // Knee-safe substitutions
  "knee": [
    { name: "Leg Press 45° (amplitude reduzida)", reason: "Menos estresse articular no joelho" },
    { name: "Cadeira Extensora (isométrica)", reason: "Fortalece quadríceps sem impacto" },
    { name: "Ponte de Glúteos", reason: "Trabalha posterior sem carga nos joelhos" },
    { name: "Step-up (baixo)", reason: "Controle total da amplitude" },
    { name: "Afundo reverso", reason: "Menos estresse patelar que o afundo frontal" },
  ],
  // Shoulder-safe substitutions
  "shoulder": [
    { name: "Elevação Lateral com Cabos", reason: "Resistência constante sem pico de estresse" },
    { name: "Crucifixo Inclinado (leve)", reason: "Ativação peitoral sem sobrecarga do ombro" },
    { name: "Face Pull", reason: "Fortalece manguito rotador" },
    { name: "Press Arnold (parcial)", reason: "Amplitude controlada para ombro" },
    { name: "Remada Alta com Corda", reason: "Menos impacto no deltoide" },
  ],
  // Lower back safe substitutions
  "lower_back": [
    { name: "Prancha Abdominal", reason: "Estabilização sem flexão lombar" },
    { name: "Bird Dog", reason: "Fortalece core sem compressão espinhal" },
    { name: "Hiperextensão (peso corporal)", reason: "Extensão controlada" },
    { name: "Remada Unilateral com Apoio", reason: "Suporte para coluna" },
    { name: "Leg Press (em vez de Agachamento)", reason: "Encosto para costas" },
  ],
  // Elbow safe substitutions
  "elbow": [
    { name: "Rosca Martelo", reason: "Menos estresse no cotovelo que rosca direta" },
    { name: "Tríceps Corda (leve)", reason: "Amplitude natural do cotovelo" },
    { name: "Rosca Scott (máquina)", reason: "Apoio reduz tensão articular" },
    { name: "Tríceps Francês (unilateral)", reason: "Controle individual" },
  ],
  // Wrist safe substitutions
  "wrist": [
    { name: "Exercícios com Straps", reason: "Reduz grip demand" },
    { name: "Máquinas guiadas", reason: "Sem necessidade de pegada forte" },
    { name: "Push-up em punho", reason: "Punho neutro" },
  ],
  // Hip safe substitutions
  "hip": [
    { name: "Abdução de Quadril (deitado)", reason: "Sem carga axial" },
    { name: "Ponte de Glúteos (unilateral)", reason: "Isola sem impacto" },
    { name: "Leg Press (pés altos)", reason: "Reduz flexão do quadril" },
    { name: "Caminhada Lateral com Miniband", reason: "Ativação leve e controlada" },
  ],
  // Neck safe substitutions
  "neck": [
    { name: "Exercícios sentado com apoio", reason: "Menos tensão cervical" },
    { name: "Isométricos de pescoço", reason: "Fortalecimento sem amplitude" },
  ],
  // Default/general
  "default": [
    { name: "Versão unilateral do exercício", reason: "Controle individual de carga e amplitude" },
    { name: "Versão na máquina", reason: "Maior suporte e estabilidade" },
    { name: "Versão isométrica", reason: "Fortalecimento sem movimento articular" },
  ],
};

// Map body areas to muscle group categories for exercise matching
const AREA_TO_MUSCLES: Record<string, string[]> = {
  shoulder_left: ["Ombros", "Peito", "shoulders", "chest"],
  shoulder_right: ["Ombros", "Peito", "shoulders", "chest"],
  chest: ["Peito", "chest"],
  upper_back: ["Costas", "back"],
  lower_back: ["Costas", "Lombar", "back", "lower_back"],
  bicep_left: ["Bíceps", "Braços", "biceps", "arms"],
  bicep_right: ["Bíceps", "Braços", "biceps", "arms"],
  elbow_left: ["Bíceps", "Tríceps", "Braços", "arms"],
  elbow_right: ["Bíceps", "Tríceps", "Braços", "arms"],
  wrist_left: ["Antebraço", "Braços", "forearms"],
  wrist_right: ["Antebraço", "Braços", "forearms"],
  hip_left: ["Glúteos", "Quadril", "glutes", "hips"],
  hip_right: ["Glúteos", "Quadril", "glutes", "hips"],
  knee_left: ["Quadríceps", "Pernas", "legs", "quads"],
  knee_right: ["Quadríceps", "Pernas", "legs", "quads"],
  ankle_left: ["Panturrilha", "Pernas", "calves"],
  ankle_right: ["Panturrilha", "Pernas", "calves"],
  neck: ["Pescoço", "Trapézio", "neck", "traps"],
  abs: ["Abdômen", "Core", "abs"],
};

function getSubstitutionCategory(area: string): string {
  if (area.includes("knee")) return "knee";
  if (area.includes("shoulder")) return "shoulder";
  if (area.includes("lower_back") || area === "lower_back") return "lower_back";
  if (area.includes("elbow")) return "elbow";
  if (area.includes("wrist")) return "wrist";
  if (area.includes("hip")) return "hip";
  if (area.includes("neck")) return "neck";
  return "default";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { student_id, completion_id, pain_areas, exercises } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find the PT for this student
    const { data: plans } = await supabase
      .from("workout_plans")
      .select("personal_id")
      .eq("student_id", student_id)
      .eq("is_active", true)
      .limit(1);

    const personalId = plans?.[0]?.personal_id;
    if (!personalId) {
      return new Response(JSON.stringify({ ok: false, reason: "No active PT found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if student is also a nutrition patient
    const { data: patientLinks } = await supabase
      .from("patient_professional_links")
      .select("id")
      .eq("patient_id", student_id)
      .eq("professional_role", "nutritionist")
      .eq("link_status", "active")
      .limit(1);
    const isAlsoPatient = (patientLinks?.length || 0) > 0;

    // Process each pain area and find affected exercises
    const substitutionInserts: any[] = [];

    for (const pain of pain_areas) {
      const area = pain.area;
      const relatedMuscles = AREA_TO_MUSCLES[area] || [];
      const category = getSubstitutionCategory(area);
      const possibleSubs = SUBSTITUTION_MAP[category] || SUBSTITUTION_MAP["default"];

      // Find exercises that work the affected area
      const affectedExercises = (exercises || []).filter((ex: any) => {
        if (pain.exerciseRelated && ex.name === pain.exerciseRelated) return true;
        if (!ex.muscle_group) return false;
        return relatedMuscles.some(m =>
          ex.muscle_group.toLowerCase().includes(m.toLowerCase()) ||
          m.toLowerCase().includes(ex.muscle_group.toLowerCase())
        );
      });

      for (const ex of affectedExercises) {
        // Pick 2-3 relevant substitutions
        const suggestions = possibleSubs.slice(0, 3).map(s => ({
          name: s.name,
          reason: s.reason,
          muscle_group: ex.muscle_group,
        }));

        substitutionInserts.push({
          student_id,
          personal_id: personalId,
          feedback_id: null, // will link after feedback is created
          original_exercise: ex.name,
          original_muscle_group: ex.muscle_group || null,
          suggested_exercises: suggestions,
          reason: `Aluno reportou dor ${pain.intensity} em ${area.replace("_", " ")} durante/após o treino`,
          pain_area: area,
          severity: pain.intensity || "moderate",
        });
      }

      // If no specific exercise matched, create a general alert
      if (affectedExercises.length === 0) {
        const suggestions = possibleSubs.slice(0, 3).map(s => ({
          name: s.name,
          reason: s.reason,
        }));
        substitutionInserts.push({
          student_id,
          personal_id: personalId,
          original_exercise: `Exercícios de ${relatedMuscles[0] || area}`,
          original_muscle_group: relatedMuscles[0] || null,
          suggested_exercises: suggestions,
          reason: `Aluno reportou dor ${pain.intensity} em ${area.replace("_", " ")}`,
          pain_area: area,
          severity: pain.intensity || "moderate",
        });
      }
    }

    // Insert substitution suggestions
    if (substitutionInserts.length > 0) {
      await supabase.from("workout_exercise_substitutions").insert(substitutionInserts);
    }

    // Update or create student learning profile
    const { data: existingProfile } = await supabase
      .from("workout_student_learning_profile")
      .select("*")
      .eq("student_id", student_id)
      .maybeSingle();

    // Get completion stats
    const { data: completions } = await supabase
      .from("workout_completions")
      .select("perceived_effort, pain_report, discomfort_flag")
      .eq("student_id", student_id)
      .order("completed_at", { ascending: false })
      .limit(30);

    const totalSessions = completions?.length || 0;
    const avgEffort = totalSessions > 0
      ? completions!.reduce((a, c) => a + (c.perceived_effort || 5), 0) / totalSessions
      : 5;
    const painCount = completions?.filter(c => c.discomfort_flag)?.length || 0;

    // Build pain history summary
    const painHistoryMap: Record<string, number> = {};
    for (const pain of pain_areas) {
      painHistoryMap[pain.area] = (painHistoryMap[pain.area] || 0) + 1;
    }
    const painHistory = Object.entries(painHistoryMap).map(([area, count]) => ({ area, count }));

    // Determine motivation trend
    let motivationTrend = "stable";
    if (completions && completions.length >= 5) {
      const recent = completions.slice(0, 5);
      const older = completions.slice(5, 10);
      if (older.length > 0) {
        const recentAvg = recent.reduce((a, c) => a + (c.perceived_effort || 5), 0) / recent.length;
        const olderAvg = older.reduce((a, c) => a + (c.perceived_effort || 5), 0) / older.length;
        if (recentAvg < olderAvg - 1.5) motivationTrend = "declining";
        else if (recentAvg > olderAvg + 1) motivationTrend = "rising";
      }
    }

    // Determine risk level
    let riskLevel = "low";
    if (painCount >= 3 || motivationTrend === "declining") riskLevel = "moderate";
    if (painCount >= 5 && motivationTrend === "declining") riskLevel = "high";

    const ifjNote = {
      text: `Feedback processado: ${pain_areas.length} área(s) de dor. ${substitutionInserts.length} substituição(ões) sugeridas.`,
      date: new Date().toISOString(),
    };

    if (existingProfile) {
      const updatedPainHistory = [...(existingProfile.pain_history || [])];
      for (const p of painHistory) {
        const existing = updatedPainHistory.find((h: any) => h.area === p.area);
        if (existing) (existing as any).count += p.count;
        else updatedPainHistory.push(p);
      }

      await supabase
        .from("workout_student_learning_profile")
        .update({
          total_sessions: totalSessions,
          avg_effort: avgEffort,
          is_also_patient: isAlsoPatient,
          pain_history: updatedPainHistory,
          motivation_trend: motivationTrend,
          risk_level: riskLevel,
          last_feedback_at: new Date().toISOString(),
          ifj_notes: [...(existingProfile.ifj_notes || []).slice(-8), ifjNote],
          updated_at: new Date().toISOString(),
        })
        .eq("student_id", student_id);
    } else {
      await supabase
        .from("workout_student_learning_profile")
        .insert({
          student_id,
          personal_id: personalId,
          is_also_patient: isAlsoPatient,
          total_sessions: totalSessions,
          avg_effort: avgEffort,
          pain_history: painHistory,
          motivation_trend: motivationTrend,
          risk_level: riskLevel,
          last_feedback_at: new Date().toISOString(),
          ifj_notes: [ifjNote],
        });
    }

    // If student is also a patient, create cross-professional alert
    if (isAlsoPatient && pain_areas.some((p: any) => p.intensity === "severe")) {
      await supabase.from("cross_professional_alerts").insert({
        alert_type: "pain_report",
        severity: "warning",
        title: "Dor severa reportada no treino",
        description: `Aluno reportou dor intensa em: ${pain_areas.filter((p: any) => p.intensity === "severe").map((p: any) => p.area).join(", ")}`,
        source_professional_id: personalId,
        source_role: "trainer",
        patient_id: student_id,
        metadata: { pain_areas, completion_id },
      });
    }

    // Create notification for PT
    try {
      await supabase.from("notifications").insert({
        user_id: personalId,
        type: "workout_feedback",
        title: "Feedback de treino recebido",
        message: `Aluno reportou ${pain_areas.length > 0 ? `dor em ${pain_areas.length} área(s)` : "feedback positivo"}. ${substitutionInserts.length} sugestões geradas.`,
        metadata: { student_id, completion_id, substitution_count: substitutionInserts.length },
      });
    } catch (e) {
      console.error("Notification insert failed:", e);
    }

    return new Response(JSON.stringify({
      ok: true,
      substitutions_created: substitutionInserts.length,
      profile_updated: true,
      is_also_patient: isAlsoPatient,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("workout-ifj-analyze error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
