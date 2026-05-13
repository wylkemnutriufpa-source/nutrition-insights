import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireCronOrAdmin } from "../_shared/cron-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduleCriteria {
  auto_deactivate_previous?: boolean;
  weight_enabled?: boolean;
  weight_loss_kg?: number;
  checklist_enabled?: boolean;
  checklist_min_adherence?: number;
  checklist_days?: number;
  feedback_enabled?: boolean;
  feedback_interval_days?: number;
  extension_days?: number;
  max_extensions?: number;
  current_extensions?: number;
  manual_only?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  
  try { await requireCronOrAdmin(req); } catch (r) { if (r instanceof Response) return r; throw r; }
try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    async function resolveTenantForUser(uid: string): Promise<string | null> {
      const { data } = await supabase.from("user_tenants").select("tenant_id").eq("user_id", uid).limit(1).maybeSingle();
      return data?.tenant_id || null;
    }

    const today = new Date().toISOString().split("T")[0];

    // Get all scheduled plans that should be checked today
    const { data: schedules, error: schedError } = await supabase
      .from("plan_schedules")
      .select(`
        *,
        meal_plans!inner(id, patient_id, nutritionist_id, title, is_active)
      `)
      .eq("status", "scheduled")
      .lte("activate_at", today);

    if (schedError) throw schedError;

    const results = [];

    for (const schedule of schedules || []) {
      const criteria = schedule.criteria as ScheduleCriteria;
      const patientId = schedule.meal_plans.patient_id;
      
      // Skip if manual only
      if (criteria.manual_only) {
        results.push({ schedule_id: schedule.id, status: "skipped", reason: "manual_only" });
        continue;
      }

      let allCriteriaMet = true;
      const checkResults: Record<string, boolean> = {};

      // Check weight criteria
      if (criteria.weight_enabled && criteria.weight_loss_kg) {
        const { data: assessments } = await supabase
          .from("physical_assessments")
          .select("weight, assessment_date")
          .eq("patient_id", patientId)
          .order("assessment_date", { ascending: false })
          .limit(2);

        if (assessments && assessments.length >= 2) {
          const weightLoss = Number(assessments[1].weight) - Number(assessments[0].weight);
          checkResults.weight = weightLoss >= criteria.weight_loss_kg;
        } else {
          checkResults.weight = false;
        }
        if (!checkResults.weight) allCriteriaMet = false;
      }

      // Check checklist adherence
      if (criteria.checklist_enabled && criteria.checklist_min_adherence && criteria.checklist_days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - criteria.checklist_days);
        
        const { data: tasks, count: totalTasks } = await supabase
          .from("checklist_tasks")
          .select("*", { count: "exact" })
          .eq("patient_id", patientId)
          .gte("date", startDate.toISOString().split("T")[0]);

        const { count: completedTasks } = await supabase
          .from("checklist_tasks")
          .select("*", { count: "exact" })
          .eq("patient_id", patientId)
          .eq("completed", true)
          .gte("date", startDate.toISOString().split("T")[0]);

        const adherence = totalTasks && totalTasks > 0 
          ? ((completedTasks || 0) / totalTasks) * 100 
          : 0;
        
        checkResults.checklist = adherence >= criteria.checklist_min_adherence;
        if (!checkResults.checklist) allCriteriaMet = false;
      }

      // Check feedback compliance
      if (criteria.feedback_enabled && criteria.feedback_interval_days) {
        const feedbackDeadline = new Date();
        feedbackDeadline.setDate(feedbackDeadline.getDate() - criteria.feedback_interval_days);

        const { data: feedbacks } = await supabase
          .from("feedbacks")
          .select("created_at")
          .eq("patient_id", patientId)
          .gte("created_at", feedbackDeadline.toISOString())
          .limit(1);

        checkResults.feedback = (feedbacks?.length || 0) > 0;
        if (!checkResults.feedback) allCriteriaMet = false;
      }

      // Process result
      if (allCriteriaMet) {
        // Activate the new plan
        await supabase
          .from("plan_schedules")
          .update({ status: "activated" })
          .eq("id", schedule.id);

        await supabase
          .from("meal_plans")
          .update({ is_active: true })
          .eq("id", schedule.meal_plan_id);

        // Deactivate previous plans if configured (only non-published ones)
        if (criteria.auto_deactivate_previous) {
          await supabase
            .from("meal_plans")
            .update({ is_active: false })
            .eq("patient_id", patientId)
            .eq("is_active", true)
            .neq("id", schedule.meal_plan_id)
            .neq("plan_status", "published_to_patient")
            .neq("plan_status", "approved");
        }

        const tenantId = await resolveTenantForUser(schedule.meal_plans.nutritionist_id);

        // Send notification
        await supabase.from("notifications").insert({
          user_id: patientId,
          title: "Novo Plano Alimentar Ativado! 🎉",
          message: `Parabéns! Você cumpriu todos os critérios e seu novo plano "${schedule.meal_plans.title}" foi ativado.`,
          type: "success",
          action_url: "/my-diet",
          tenant_id: tenantId,
        });

        // Also notify nutritionist
        await supabase.from("notifications").insert({
          user_id: schedule.meal_plans.nutritionist_id,
          title: "Plano Ativado Automaticamente",
          message: `O plano "${schedule.meal_plans.title}" foi ativado - paciente cumpriu todos os critérios.`,
          type: "info",
          action_url: `/meal-plan/${schedule.meal_plan_id}`,
          tenant_id: tenantId,
        });

        results.push({ 
          schedule_id: schedule.id, 
          status: "activated", 
          checks: checkResults 
        });
      } else {
        // Extend the current plan
        const currentExtensions = criteria.current_extensions || 0;
        const maxExtensions = criteria.max_extensions || 2;
        const extensionDays = criteria.extension_days || 15;

        if (currentExtensions < maxExtensions) {
          const newActivateAt = new Date(schedule.activate_at);
          newActivateAt.setDate(newActivateAt.getDate() + extensionDays);

          await supabase
            .from("plan_schedules")
            .update({
              activate_at: newActivateAt.toISOString().split("T")[0],
              status: "extended",
              criteria: {
                ...criteria,
                current_extensions: currentExtensions + 1,
              },
            })
            .eq("id", schedule.id);

          const extTenantId = await resolveTenantForUser(schedule.meal_plans.nutritionist_id);
          // Notify patient about extension
          await supabase.from("notifications").insert({
            user_id: patientId,
            title: "Plano Estendido",
            message: `Seu plano atual foi estendido por mais ${extensionDays} dias. Continue se esforçando para atingir os critérios!`,
            type: "warning",
            action_url: "/checklist",
            tenant_id: extTenantId,
          });

          results.push({ 
            schedule_id: schedule.id, 
            status: "extended", 
            extension: currentExtensions + 1,
            checks: checkResults 
          });
        } else {
          // Max extensions reached - mark as expired
          await supabase
            .from("plan_schedules")
            .update({ status: "expired" })
            .eq("id", schedule.id);

          const expTenantId = await resolveTenantForUser(schedule.meal_plans.nutritionist_id);
          // Notify nutritionist
          await supabase.from("notifications").insert({
            user_id: schedule.meal_plans.nutritionist_id,
            title: "Agendamento Expirado",
            message: `O agendamento para "${schedule.meal_plans.title}" expirou após ${maxExtensions} extensões. Considere ativar manualmente ou criar um novo agendamento.`,
            type: "warning",
            action_url: `/meal-plan/${schedule.meal_plan_id}`,
            tenant_id: expTenantId,
          });

          results.push({ 
            schedule_id: schedule.id, 
            status: "expired", 
            reason: "max_extensions_reached",
            checks: checkResults 
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error checking plan schedules:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
