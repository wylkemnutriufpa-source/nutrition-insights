import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jobId } = await req.json();
    if (!jobId) throw new Error("jobId is required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get job details
    const { data: job, error: jobError } = await supabaseAdmin
      .from("meal_plan_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) throw new Error("Job not found");
    if (job.status !== "pending") return new Response(JSON.stringify({ success: true, message: "Job already processed or processing" }));

    // Respond immediately to avoid timeout
    // START ASYNC PROCESS
    (async () => {
      try {
        // 1. Mark as processing
        await supabaseAdmin
          .from("meal_plan_jobs")
          .update({ 
            status: "processing", 
            current_step: "processando",
            started_at: new Date().toISOString()
          })
          .eq("id", jobId);

        const { patient_id, payload } = job;

        // 2. Run Generation Engine
        const { data, error } = await supabaseAdmin.functions.invoke("generate-meal-plan", {
          body: {
            ...payload,
            patientId: patient_id,
            isPipeline: true,
          },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Generation failed");

        // 3. Update Pipeline
        const resolvedPlanId = data.multiPlan && data.plans?.length > 0
          ? data.plans[0].mealPlanId
          : data.mealPlanId || null;

        const { data: pipeline } = await supabaseAdmin
          .from("onboarding_pipelines" as any)
          .select("id, nutritionist_id")
          .eq("patient_id", patient_id)
          .not("status", "in", '("completed","superseded_by_active_plan","superseded_by_published_plan","superseded_by_reset")')
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pipeline) {
          await supabaseAdmin
            .from("onboarding_pipelines" as any)
            .update({
              plan_generated: true,
              generated_plan_id: resolvedPlanId,
              generated_plan_data: data,
              status: "pending_approval",
            } as any)
            .eq("id", pipeline.id);

          // Notify nutritionist
          const patientName = (await supabaseAdmin.from("profiles").select("full_name").eq("user_id", patient_id).maybeSingle()).data?.full_name || "Paciente";
          await supabaseAdmin.from("notifications").insert({
            user_id: pipeline.nutritionist_id,
            title: "🔔 Plano Aguardando Aprovação",
            message: `${patientName} completou o onboarding. Pré-plano gerado via Processamento Assíncrono.`,
            type: "warning",
            action_url: `/patients/${patient_id}?tab=onboarding`,
          } as any);

          // Force lifecycle refresh via RPC
          await supabaseAdmin.rpc("accept_patient_consent" as any, { _patient_id: patient_id });
        }

        // 4. Mark job as completed
        await supabaseAdmin
          .from("meal_plan_jobs")
          .update({ 
            status: "completed", 
            current_step: "finalizando",
            completed_at: new Date().toISOString(),
            result: data 
          })
          .eq("id", jobId);

      } catch (err: any) {
        console.error(`Error processing job ${jobId}:`, err);
        
        // Increment retries if possible (simplified here, in a real scenario we might re-enqueue)
        const { data: currentJob } = await supabaseAdmin.from("meal_plan_jobs").select("retries").eq("id", jobId).single();
        const newRetries = (currentJob?.retries || 0) + 1;

        await supabaseAdmin
          .from("meal_plan_jobs")
          .update({ 
            status: "failed", 
            error: err.message || "Unknown error",
            retries: newRetries,
            completed_at: new Date().toISOString()
          })
          .eq("id", jobId);
      }
    })();

    return new Response(JSON.stringify({ success: true, message: "Processing started" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
