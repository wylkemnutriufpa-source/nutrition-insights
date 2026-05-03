import { inngest } from "./client.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const processMealPlanJob = inngest.createFunction(
  { id: "process-meal-plan-job" },
  { event: "app/meal-plan.requested" },
  async ({ event, step }) => {
    const { jobId, patientId, payload } = event.data;
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Mark as processing
    await step.run("mark-processing", async () => {
      await supabaseAdmin
        .from("meal_plan_jobs")
        .update({ status: "processing", current_step: "processando" })
        .eq("id", jobId);
    });

    // 2. Run Generation Engine (Engine V3/Unified)
    const result = await step.run("generate-plan", async () => {
      const { data, error } = await supabaseAdmin.functions.invoke("generate-meal-plan", {
        body: {
          ...payload,
          patientId,
          isPipeline: true,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Generation failed");
      
      return data;
    });

    // 3. Update Pipeline and Job
    await step.run("finalize-job", async () => {
      // Update Pipeline
      const resolvedPlanId = result.multiPlan && result.plans?.length > 0
        ? result.plans[0].mealPlanId
        : result.mealPlanId || null;

      const { data: pipeline } = await supabaseAdmin
        .from("onboarding_pipelines" as any)
        .select("id, nutritionist_id")
        .eq("patient_id", patientId)
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
            generated_plan_data: result,
            status: "pending_approval",
          } as any)
          .eq("id", pipeline.id);

        // Notify nutritionist
        const patientName = (await supabaseAdmin.from("profiles").select("full_name").eq("user_id", patientId).maybeSingle()).data?.full_name || "Paciente";
        await supabaseAdmin.from("notifications").insert({
          user_id: pipeline.nutritionist_id,
          title: "🔔 Plano Aguardando Aprovação",
          message: `${patientName} completou o onboarding. Pré-plano gerado via Processamento Assíncrono.`,
          type: "warning",
          action_url: `/patients/${patientId}?tab=onboarding`,
        } as any);
        
        // Final sync if needed (calling the RPC)
        await supabaseAdmin.rpc("accept_patient_consent" as any, { _patient_id: patientId });
      }

      // Mark job as completed
      await supabaseAdmin
        .from("meal_plan_jobs")
        .update({ 
          status: "completed", 
          current_step: "finalizando",
          result 
        })
        .eq("id", jobId);
    });

    return { success: true };
  }
);
