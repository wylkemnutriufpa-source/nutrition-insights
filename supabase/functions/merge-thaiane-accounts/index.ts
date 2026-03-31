import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const dupId = "964f6625-25af-4d78-8c81-9d249703a5c7";
    const realAccountId = "38b17a2b-2ac0-4df0-8d12-ec602e3ab704";
    const correctEmail = "thaiane.quelci@hotmail.com";
    const results: any[] = [];

    // Tables that may reference this user as patient_id
    const patientTables = [
      "checklist_tasks", "checklist_daily_summary", "onboarding_pipelines",
      "meal_plans", "meal_plan_items", "meal_item_completions", "meal_feedback",
      "meal_plan_adjustment_suggestions", "patient_checkins", "patient_anamnesis",
      "patient_appointments", "patient_body_assessments", "patient_clinical_flags",
      "patient_clinical_snapshots", "patient_clinical_priority_state",
      "patient_clinical_milestones", "patient_clinical_messages",
      "patient_behavior_memory", "patient_behavioral_tasks",
      "patient_automation_state", "patient_protocols",
      "clinical_daily_snapshots", "clinical_alerts", "clinical_decisions",
      "clinical_action_recommendations", "behavioral_profile",
      "behavioral_recovery_actions", "body_analyses", "body_assessment_photos",
      "body_projection_snapshots", "calendar_milestones",
      "engagement_signals", "feedbacks", "fit_intelligence_interactions",
      "fit_intelligence_tasks", "fit_intelligence_hydration",
      "fit_intelligence_frequency", "enrollment_photos",
      "cross_professional_alerts", "coach_athletes",
      "anamnesis_ai_insights", "body_assessment_extraction_logs",
      "clinical_communication_events", "clinical_consents",
      "clinical_auto_adjustment_logs", "clinical_experiment_assignments",
      "ifj_patient_permissions", "metabolic_classification_history",
      "metabolic_phase_history", "nutrition_protocol_changed",
      "nutritional_intervention_suggestions",
      "patient_body_projection_states", "patient_clinical_learning_memory",
      "patient_clinical_learning_profile",
    ];

    // User-id tables
    const userIdTables = [
      "notifications", "meals", "ai_usage_tracking",
      "ifj_intent_logs", "ifj_session_context",
    ];

    for (const table of patientTables) {
      try {
        const { error } = await adminClient.from(table).delete().eq("patient_id", dupId);
        if (error) results.push({ table, col: "patient_id", error: error.message });
      } catch (_) { /* table may not exist */ }
    }

    for (const table of userIdTables) {
      try {
        const { error } = await adminClient.from(table).delete().eq("user_id", dupId);
        if (error) results.push({ table, col: "user_id", error: error.message });
      } catch (_) { /* table may not exist */ }
    }

    // Also delete from user_tenants and user_roles just in case
    await adminClient.from("user_tenants").delete().eq("user_id", dupId);
    await adminClient.from("user_roles").delete().eq("user_id", dupId);
    await adminClient.from("nutritionist_patients").delete().eq("patient_id", dupId);
    await adminClient.from("profiles").delete().eq("user_id", dupId);

    // Now delete auth user
    const { error: delErr } = await adminClient.auth.admin.deleteUser(dupId);
    results.push({ step: "delete_auth_964f", error: delErr?.message || null });

    // Update real account email
    const { error: emailErr } = await adminClient.auth.admin.updateUserById(realAccountId, {
      email: correctEmail,
      email_confirm: true,
    });
    results.push({ step: "update_email", error: emailErr?.message || null });

    // Verify
    const { data: verify } = await adminClient.auth.admin.getUserById(realAccountId);
    results.push({ step: "verify", email: verify?.user?.email });

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
