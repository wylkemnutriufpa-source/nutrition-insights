import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ClinicalEngine } from "../_shared/clinical-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      patientId, 
      nutritionistId, 
      generationMode = "smart", 
      professionalOverride,
      template_id
    } = body;

    const resolvedPatientId = patientId || body.patient_id;
    const resolvedNutritionistId = nutritionistId || body.nutritionist_id;

    if (!resolvedPatientId) {
      throw new Error("patientId is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[generate-meal-plan] Orchestrating via ClinicalEngine for patient ${resolvedPatientId}`);

    const result = await ClinicalEngine.generateMealPlan({
      patientId: resolvedPatientId,
      nutritionistId: resolvedNutritionistId,
      generationMode,
      professionalOverride,
      template_id
    }, supabase);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-meal-plan] Error:", error.message);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        code: error.message.includes("ANAMNESIS_MISSING") ? "ANAMNESIS_MISSING" : "INTERNAL_ERROR"
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
