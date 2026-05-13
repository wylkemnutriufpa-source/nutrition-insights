import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireCronOrAdmin } from "../_shared/cron-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_TASKS = [
  { title: "Seguir café da manhã do plano", icon: "☕", category: "nutrition", description: "Café da manhã conforme plano alimentar" },
  { title: "Seguir almoço do plano", icon: "🥗", category: "nutrition", description: "Almoço conforme plano alimentar" },
  { title: "Seguir jantar do plano", icon: "🍽️", category: "nutrition", description: "Jantar conforme plano alimentar" },
  { title: "Fazer lanches saudáveis entre refeições", icon: "🥜", category: "nutrition", description: "Escolher opções nutritivas nos intervalos" },
  { title: "Evitar ultraprocessados hoje", icon: "🚫", category: "nutrition", description: "Preferir alimentos naturais e integrais" },
  { title: "Consumir proteína suficiente", icon: "🥩", category: "nutrition", description: "Atingir meta proteica nas refeições" },
  { title: "Beber pelo menos 2L de água", icon: "💧", category: "hydration", description: "Distribuir ao longo do dia" },
  { title: "Tomar água ao acordar", icon: "🌅", category: "hydration", description: "Hidratar o corpo logo pela manhã" },
  { title: "Comer frutas hoje", icon: "🍎", category: "food_quality", description: "Ao menos 2 porções de frutas variadas" },
  { title: "Comer vegetais ou salada hoje", icon: "🥦", category: "food_quality", description: "Incluir em almoço e/ou jantar" },
  { title: "Incluir fibras nas refeições", icon: "🌾", category: "food_quality", description: "Grãos integrais, sementes ou aveia" },
  { title: "Praticar atividade física ou caminhar", icon: "🏃", category: "movement", description: "30-60 min de atividade moderada" },
  { title: "Caminhar ao menos 6.000 passos", icon: "🚶", category: "movement", description: "Use o celular para contar os passos" },
  { title: "Fazer alongamento (5-10 min)", icon: "🤸", category: "movement", description: "Acordar o corpo ou relaxar após treino" },
  { title: "Evitar beliscar fora do plano", icon: "🍪", category: "eating_behavior", description: "Respeitar intervalos entre refeições" },
  { title: "Respeitar sinais de fome e saciedade", icon: "⏳", category: "eating_behavior", description: "Comer devagar e prestar atenção ao corpo" },
  { title: "Dormir pelo menos 7 horas", icon: "😴", category: "lifestyle", description: "Priorizar qualidade do sono" },
  { title: "Evitar telas 1h antes de dormir", icon: "📵", category: "lifestyle", description: "Melhora a qualidade do sono" },
  { title: "Tomar sol por 15 minutos", icon: "☀️", category: "lifestyle", description: "Vitamina D natural — prefira manhã cedo" },
  { title: "Tomar suplementos prescritos", icon: "💊", category: "supplement", description: "No horário indicado pelo nutricionista" },
  { title: "Fazer 5 min de respiração ou meditação", icon: "🧘", category: "mindset", description: "Reduz cortisol e melhora foco" },
  { title: "Registrar as refeições no app", icon: "📝", category: "monitoring", description: "Acompanhe sua evolução diariamente" },
  { title: "Registrar nível de energia hoje", icon: "⚡", category: "monitoring", description: "Como se sentiu ao longo do dia" },
  { title: "Alcançar pelo menos 80% de aderência", icon: "🎯", category: "consistency", description: "Meta diária de consistência no plano" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  
  try { await requireCronOrAdmin(req); } catch (r) { if (r instanceof Response) return r; throw r; }
try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Use Brazil timezone (UTC-3) to match patient's local date
    const now = new Date();
    const brDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const today = `${brDate.getFullYear()}-${String(brDate.getMonth() + 1).padStart(2, '0')}-${String(brDate.getDate()).padStart(2, '0')}`;

    // Get all active patients (those linked to a nutritionist)
    const { data: activePatients, error: patientsError } = await supabase
      .from("nutritionist_patients")
      .select("patient_id, tenant_id")
      .eq("status", "active");

    if (patientsError) throw patientsError;

    // Build tenant map from nutritionist_patients
    const tenantMap = new Map<string, string | null>();
    for (const p of activePatients || []) {
      if (!tenantMap.has(p.patient_id)) tenantMap.set(p.patient_id, p.tenant_id);
    }

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
            const patientTenant = tenantMap.get(patientId) || null;
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
              tenant_id: patientTenant,
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
        const patientTenantDefault = tenantMap.get(patientId) || null;
        const inserts = DEFAULT_TASKS.map((t) => ({
          patient_id: patientId,
          title: t.title,
          icon: t.icon,
          category: t.category,
          description: t.description,
          date: today,
          completed: false,
          tenant_id: patientTenantDefault,
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
  } catch (error: any) {
    console.error("Error seeding daily checklist:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
