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
      strategy = "ifj_standard",
      bb_phase
    } = body;

    const resolvedPatientId = patientId || body.patient_id;
    const resolvedNutritionistId = nutritionistId || body.nutritionist_id;

    if (!resolvedPatientId) {
      throw new Error("patientId is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[generate-meal-plan] Starting generation for patient ${resolvedPatientId} (Mode: ${generationMode}, Strategy: ${strategy})`);

    // 1. Fetch patient profile
    const { data: patient, error: patientError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", resolvedPatientId)
      .maybeSingle();

    if (patientError) throw patientError;
    
    // If patient not found and no override, we can't proceed
    if (!patient && !professionalOverride) {
      return new Response(
        JSON.stringify({ success: false, code: "ANAMNESIS_MISSING", professional_override_supported: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Calculate clinical metrics
    // We use the ClinicalEngine which is the source of truth for metabolic math
    const clinicalInput = {
      patientId,
      weight: professionalOverride?.weight || patient?.current_weight_kg || 70,
      height: professionalOverride?.height || patient?.current_height_cm || 170,
      age: professionalOverride?.age || (patient?.birth_date ? calculateAge(patient.birth_date) : 30),
      sex: professionalOverride?.sex || patient?.sex || "female",
      goal: professionalOverride?.goal || patient?.goal || "maintain",
      activityLevel: professionalOverride?.activityLevel || patient?.activity_level || "moderate",
      restrictions: patient?.restrictions || [],
      dislikedFoods: patient?.disliked_foods || [],
      strategyId: strategy as any,
      bbPhase: bb_phase || body.bb_phase
    };

    console.log("[generate-meal-plan] Clinical Input:", JSON.stringify(clinicalInput));

    const clinicalPlan = await ClinicalEngine.generateMealPlan(clinicalInput, supabase);
    const { target_kcal: targetKcal } = clinicalPlan.metrics;

    // 3. Find suitable template from v3_diet_templates
    // We look for a template that matches the strategy and has a profile for the target kcal
    const kcalRounded = Math.round(targetKcal / 100) * 100;
    
    console.log(`[generate-meal-plan] Target Kcal: ${targetKcal}, Rounded: ${kcalRounded}`);

    // Query for templates. We prioritize nutritionist-specific ones, then global ones.
    const { data: templates, error: templateError } = await supabase
      .from("v3_diet_templates")
      .select("*")
      .eq("active", true)
      .filter("kcal_profiles", "cs", `[${kcalRounded}]`)
      .order("nutritionist_id", { ascending: false, nullsFirst: false });

    if (templateError) throw templateError;

    let selectedTemplate = templates?.find(t => t.objective === clinicalInput.goal) || templates?.[0];

    if (!selectedTemplate) {
      // Fallback: search for ANY active template that has this kcal profile
      const { data: fallbackTemplates } = await supabase
        .from("v3_diet_templates")
        .select("*")
        .eq("active", true)
        .filter("kcal_profiles", "cs", `[${kcalRounded}]`)
        .limit(1);
      
      selectedTemplate = fallbackTemplates?.[0];
    }

    if (!selectedTemplate) {
      console.error(`[generate-meal-plan] No template found for ${kcalRounded} kcal`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Não encontramos um template adequado para sua meta de ${kcalRounded} kcal. Tente ajustar o objetivo ou nível de atividade.`,
          code: "TEMPLATE_NOT_FOUND"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Extract snapshot (The Sovereign Truth)
    const snapshot = selectedTemplate.plan_snapshot?.[kcalRounded.toString()];

    if (!snapshot) {
      throw new Error(`Snapshot for ${kcalRounded} kcal missing in template ${selectedTemplate.id}`);
    }

    // 5. Create the Meal Plan record
    // We use a transaction-like approach: Create plan, then items.
    
    // Archive old active plans first to maintain idempotency if requested or standard
    await supabase
      .from("meal_plans")
      .update({ is_active: false })
      .eq("patient_id", patientId)
      .eq("is_active", true);

    const { data: newPlan, error: newPlanError } = await supabase
      .from("meal_plans")
      .insert({
        patient_id: patientId,
        nutritionist_id: nutritionistId,
        title: `Plano ${selectedTemplate.title} (${kcalRounded} kcal)`,
        description: selectedTemplate.description,
        template_id: selectedTemplate.id,
        target_kcal: targetKcal,
        target_protein: clinicalPlan.metrics.macros.protein,
        target_carbs: clinicalPlan.metrics.macros.carbs,
        target_fat: clinicalPlan.metrics.macros.fat,
        plan_status: "published_to_patient", // Auto-publish for speed in this mode
        is_active: true,
        snapshot: snapshot,
        engine_version: clinicalPlan.engine_version,
        protocol_used: strategy
      })
      .select()
      .single();

    if (newPlanError) throw newPlanError;

    // 6. Insert items into meal_plan_items for legacy/mobile compatibility
    const itemsToInsert: any[] = [];
    
    // Snapshot structure: { days: [ { day_of_week: N, meals: [ { name: "", time: "", items: [] } ] } ] }
    const days = snapshot.days || [];
    
    for (const day of days) {
      const dayOfWeek = day.day_of_week;
      for (const meal of day.meals || []) {
        for (const item of meal.items || []) {
          itemsToInsert.push({
            meal_plan_id: newPlan.id,
            day_of_week: dayOfWeek,
            meal_name: meal.name,
            meal_time: meal.time,
            food_name: item.name || item.title,
            quantity_display: item.quantity_display,
            kcal: item.kcal,
            protein_g: item.macros?.protein_g || item.protein || 0,
            carbs_g: item.macros?.carbs_g || item.carbs || 0,
            fat_g: item.macros?.fat_g || item.fat || 0,
            image_url: item.imageUrl,
            is_primary: item.is_primary ?? true,
            metadata: { 
              original_item_id: item.id,
              instanceId: item.instanceId
            }
          });
        }
      }
    }

    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await supabase
        .from("meal_plan_items")
        .insert(itemsToInsert);
      
      if (itemsError) {
        console.error("[generate-meal-plan] Error inserting items:", itemsError);
        // We don't fail the whole process if items fail, as we have the snapshot
      }
    }

    // 7. Update profile state
    await supabase
      .from("profiles")
      .update({ 
        onboarding_completed: true,
        patient_state: 'active',
        last_editor_version_used: 'v3'
      })
      .eq("user_id", patientId);

    // 8. Return success
    return new Response(
      JSON.stringify({
        success: true,
        mealPlanId: newPlan.id,
        items_count: itemsToInsert.length,
        template_used: selectedTemplate.title,
        metrics: clinicalPlan.metrics,
        explainability: {
          bb_phase: bb_phase,
          calculation: clinicalPlan.metrics,
          macros: clinicalPlan.metrics.macros,
          selected_template: {
            name: selectedTemplate.title,
            id: selectedTemplate.id
          }
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("[generate-meal-plan] Critical Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Erro interno no motor de planos" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function calculateAge(birthDate: string): number {
  try {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  } catch {
    return 30;
  }
}
