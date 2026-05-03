import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Inngest, serve as serveInngest } from "https://esm.sh/inngest@3.22.12/deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const inngest = new Inngest({ 
  id: "fitjourney-app",
  eventKey: Deno.env.get("INNGEST_EVENT_KEY"),
});

const processMealPlanJob = inngest.createFunction(
  { id: "process-meal-plan-job" },
  { event: "app/meal-plan.requested" },
  async ({ event, step }) => {
    const { jobId, patientId, payload } = event.data;
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await step.run("mark-processing", async () => {
      await supabaseAdmin
        .from("meal_plan_jobs")
        .update({ status: "processing", current_step: "processando" })
        .eq("id", jobId);
    });

    const result = await step.run("generate-plan", async () => {
      const { data, error } = await supabaseAdmin.functions.invoke("generate-meal-plan", {
        body: {
          ...payload,
          patientId,
          isPipeline: true,
        },
      });
      if (error) throw error;
      return data;
    });

    await step.run("finalize-job", async () => {
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

        await supabaseAdmin.rpc("accept_patient_consent" as any, { _patient_id: patientId });
      }

      await supabaseAdmin
        .from("meal_plan_jobs")
        .update({ status: "completed", current_step: "finalizando", result })
        .eq("id", jobId);
    });

    return { success: true };
  }
);

const handler = serveInngest({
  client: inngest,
  functions: [processMealPlanJob],
});

serve(handler);
