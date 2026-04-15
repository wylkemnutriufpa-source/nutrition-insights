import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.4/cors";
import {
  analyzePatientProgress,
  generateClinicalSuggestions,
  applyPlanAdjustments,
  type AdjustmentRequest,
} from "../_shared/clinical-adjustment-engine.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action, patient_id, plan_id, adjustments } = body;

    // Validate action
    if (!action || !["analyze", "suggest", "apply"].includes(action)) {
      return new Response(JSON.stringify({ error: "Ação inválida. Use: analyze, suggest, apply" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!patient_id || typeof patient_id !== "string" || patient_id.length > 100) {
      return new Response(JSON.stringify({ error: "patient_id inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
      return new Response(JSON.stringify({ error: "Paciente não vinculado ao profissional" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Action: ANALYZE ──
    if (action === "analyze") {
      const result = await analyzePatientProgress(supabase, patient_id);
      if ("error" in result) {
        return new Response(JSON.stringify({ error: result.error }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ data: result }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Action: SUGGEST ──
    if (action === "suggest") {
      const progress = await analyzePatientProgress(supabase, patient_id);
      if ("error" in progress) {
        return new Response(JSON.stringify({ error: progress.error }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const suggestions = await generateClinicalSuggestions(supabase, progress);
      if ("error" in suggestions) {
        return new Response(JSON.stringify({ error: suggestions.error }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ data: { progress, suggestions } }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Action: APPLY ──
    if (action === "apply") {
      if (!plan_id || typeof plan_id !== "string") {
        return new Response(JSON.stringify({ error: "plan_id obrigatório para aplicar ajustes" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!Array.isArray(adjustments) || adjustments.length === 0 || adjustments.length > 50) {
        return new Response(JSON.stringify({ error: "adjustments deve ser um array (1-50 itens)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Validate each adjustment
      const validActions = ["increase_protein", "decrease_protein", "increase_carbs", "decrease_carbs", "increase_fat", "decrease_fat", "increase_vegetables", "substitute_food", "reduce_calories", "increase_calories"];
      for (const adj of adjustments) {
        if (!adj.mealItemId || !adj.action || !validActions.includes(adj.action)) {
          return new Response(JSON.stringify({ error: `Ajuste inválido: ${JSON.stringify(adj)}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      const result = await applyPlanAdjustments(supabase, plan_id, patient_id, adjustments as AdjustmentRequest[], user.id);
      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ data: result }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação não implementada" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[ClinicalAdjustmentEngine]", err);
    return new Response(JSON.stringify({ error: "Erro interno ao processar ajuste clínico" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
