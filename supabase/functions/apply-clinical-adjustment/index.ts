import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";
import { validateBody } from "../_shared/validator.ts";
import { ApplyClinicalAdjustmentSchema } from "../_shared/schemas.ts";
import {
  analyzePatientProgress,
  generateClinicalSuggestions,
  applyPlanAdjustments,
  type AdjustmentRequest,
} from "../_shared/clinical-adjustment-engine.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado", code: "UNAUTHORIZED" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: body, response: errorResponse } = await validateBody(req, ApplyClinicalAdjustmentSchema);
    if (errorResponse) return errorResponse;

    const { action, patient_id, plan_id, adjustments } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida", code: "INVALID_SESSION" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify nutritionist owns this patient
    const { data: link } = await supabase
      .from("nutritionist_patients")
      .select("id")
      .eq("nutritionist_id", user.id)
      .eq("patient_id", patient_id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!link) {
      return new Response(JSON.stringify({ error: "Paciente não vinculado ao profissional", code: "FORBIDDEN" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "analyze") {
      const result = await analyzePatientProgress(supabase, patient_id);
      if ("error" in result) {
        return new Response(JSON.stringify({ error: result.error, code: "ANALYZE_ERROR" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ data: result }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "suggest") {
      const progress = await analyzePatientProgress(supabase, patient_id);
      if ("error" in progress) {
        return new Response(JSON.stringify({ error: progress.error, code: "ANALYZE_ERROR" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const suggestions = await generateClinicalSuggestions(supabase, progress);
      if ("error" in suggestions) {
        return new Response(JSON.stringify({ error: suggestions.error, code: "SUGGEST_ERROR" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ data: { progress, suggestions } }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "apply") {
      if (!plan_id) {
        return new Response(JSON.stringify({ error: "plan_id obrigatório para aplicar ajustes", code: "MISSING_PLAN_ID" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!adjustments || adjustments.length === 0) {
        return new Response(JSON.stringify({ error: "adjustments deve ser um array (1-50 itens)", code: "INVALID_ADJUSTMENTS" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const result = await applyPlanAdjustments(supabase, plan_id, patient_id, adjustments as AdjustmentRequest[], user.id);
      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error, code: "APPLY_ERROR" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ data: result }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação não implementada", code: "NOT_IMPLEMENTED" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[ClinicalAdjustmentEngine]", err);
    return new Response(JSON.stringify({ error: "Erro interno ao processar ajuste clínico", code: "INTERNAL_ERROR" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
