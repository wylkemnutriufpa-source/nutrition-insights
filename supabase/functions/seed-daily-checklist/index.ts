import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_TASKS = [
  { title: "Ingerir frutas do dia", icon: "🍎", category: "nutrition", description: "Consuma ao menos 2 porções de frutas variadas" },
  { title: "Praticar exercício físico", icon: "🏃", category: "exercise", description: "30-60 min de atividade física moderada" },
  { title: "Seguir o plano alimentar", icon: "🥗", category: "nutrition", description: "Faça todas as refeições conforme o plano" },
  { title: "Ingerir água na quantidade certa", icon: "💧", category: "hydration", description: "Beba pelo menos 2L de água ao longo do dia" },
  { title: "Dormir 1h mais cedo que o habitual", icon: "😴", category: "habit", description: "Melhore sua higiene do sono gradualmente" },
  { title: "Tomar sol por 15 minutos", icon: "☀️", category: "habit", description: "Vitamina D natural — prefira manhã cedo" },
  { title: "Tomar os suplementos prescritos", icon: "💊", category: "supplement", description: "No horário indicado pelo nutricionista" },
  { title: "Registrar as refeições no app", icon: "📝", category: "habit", description: "Acompanhe sua evolução diariamente" },
  { title: "Evitar açúcar e ultraprocessados", icon: "🚫", category: "nutrition", description: "Prefira alimentos naturais e integrais" },
  { title: "Fazer 5 min de respiração ou meditação", icon: "🧘", category: "mindset", description: "Reduz cortisol e melhora foco" },
  { title: "Incluir vegetais no almoço e jantar", icon: "🥦", category: "nutrition", description: "Mínimo 1 porção em cada refeição principal" },
  { title: "Caminhar ao menos 6.000 passos", icon: "🚶", category: "exercise", description: "Use o celular para contar os passos" },
  { title: "Evitar telas 1h antes de dormir", icon: "📵", category: "habit", description: "Melhora a qualidade do sono" },
  { title: "Fazer alongamento matinal (5 min)", icon: "🤸", category: "exercise", description: "Acordar o corpo com gentileza" },
  { title: "Comer devagar e sem pressa", icon: "⏳", category: "habit", description: "Mastigue bem e preste atenção na comida" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().split("T")[0];

    // Get all active patients (those linked to a nutritionist)
    const { data: activePatients, error: patientsError } = await supabase
      .from("nutritionist_patients")
      .select("patient_id")
      .eq("status", "active");

    if (patientsError) throw patientsError;

    if (!activePatients || activePatients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active patients", seeded: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uniquePatientIds = [...new Set(activePatients.map((p) => p.patient_id))];

    let totalSeeded = 0;
    const results: { patient_id: string; tasks_created: number; skipped: boolean }[] = [];

    for (const patientId of uniquePatientIds) {
      // Check if tasks already exist for today
      const { count } = await supabase
        .from("checklist_tasks")
        .select("id", { count: "exact", head: true })
        .eq("patient_id", patientId)
        .eq("date", today);

      if (count && count > 0) {
        results.push({ patient_id: patientId, tasks_created: 0, skipped: true });
        continue;
      }

      // Check if patient has active protocol tasks to sync instead
      const { data: activeProtocols } = await supabase
        .from("patient_protocols")
        .select("id, protocol_id")
        .eq("patient_id", patientId)
        .eq("status", "active");

      let tasksCreated = 0;

      if (activeProtocols && activeProtocols.length > 0) {
        // Sync protocol tasks for each active protocol
        for (const pp of activeProtocols) {
          const { data: protocolTasks } = await supabase
            .from("protocol_tasks")
            .select("*")
            .eq("protocol_id", pp.protocol_id);

          if (protocolTasks && protocolTasks.length > 0) {
            const inserts = protocolTasks.map((task) => ({
              patient_id: patientId,
              protocol_task_id: task.id,
              patient_protocol_id: pp.id,
              title: task.title,
              description: task.description,
              icon: task.icon,
              category: task.category,
              date: today,
              completed: false,
            }));

            const { error: insertError } = await supabase
              .from("checklist_tasks")
              .upsert(inserts, { onConflict: "patient_id,protocol_task_id,date", ignoreDuplicates: true });

            if (!insertError) tasksCreated += protocolTasks.length;
          }
        }
      }

      // If no protocol tasks were created, seed default tasks
      if (tasksCreated === 0) {
        const inserts = DEFAULT_TASKS.map((t) => ({
          patient_id: patientId,
          title: t.title,
          icon: t.icon,
          category: t.category,
          description: t.description,
          date: today,
          completed: false,
        }));

        const { error: insertError } = await supabase
          .from("checklist_tasks")
          .insert(inserts);

        if (!insertError) tasksCreated = DEFAULT_TASKS.length;
      }

      totalSeeded += tasksCreated;
      results.push({ patient_id: patientId, tasks_created: tasksCreated, skipped: false });
    }

    console.log(`Daily checklist seeded: ${totalSeeded} tasks for ${results.filter(r => !r.skipped).length} patients`);

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
        total_patients: uniquePatientIds.length,
        patients_seeded: results.filter((r) => !r.skipped).length,
        patients_skipped: results.filter((r) => r.skipped).length,
        total_tasks_created: totalSeeded,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error seeding daily checklist:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
