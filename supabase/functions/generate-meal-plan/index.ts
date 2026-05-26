import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  calculateTMB, 
  calculateTDEE, 
  calculateTargetKcal, 
  calculateMacros,
  normalizeWeightKg,
  normalizeHeightCm,
  normalizeAge,
  normalizeGoal,
  normalizeActivityLevel
} from "../_shared/clinical-macro-engine.ts";

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

    console.log(`[generate-meal-plan] Starting deterministic generation for patient ${resolvedPatientId}`);

    // 1. Fetch patient anamnesis (Deterministic source of truth)
    const { data: anamnesis, error: anamnesisError } = await supabase
      .from("patient_anamnesis")
      .select("*")
      .eq("user_id", resolvedPatientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (anamnesisError) throw anamnesisError;

    let targetKcal: number;
    let macros: { protein: number; carbs: number; fat: number };

    // 2. Resolve Target Kcal and Macros
    if (professionalOverride) {
      console.log("[generate-meal-plan] Using professional override");
      const weight = normalizeWeightKg(professionalOverride.weight) || 70;
      const height = normalizeHeightCm(professionalOverride.height) || 170;
      const age = normalizeAge(professionalOverride.age);
      const sex = professionalOverride.sex || "female";
      const goal = normalizeGoal(professionalOverride.goal) || "maintain";
      const activityLevel = normalizeActivityLevel(professionalOverride.activityLevel);

      const tmb = calculateTMB(weight, height, age, sex);
      const tdee = calculateTDEE(tmb, activityLevel);
      targetKcal = calculateTargetKcal(tdee, goal, sex);
      macros = calculateMacros(targetKcal, goal, weight);
    } else if (anamnesis?.computed_kcal_target) {
      console.log("[generate-meal-plan] Using anamnesis computed values");
      targetKcal = Number(anamnesis.computed_kcal_target);
      macros = {
        protein: Number(anamnesis.computed_protein),
        carbs: Number(anamnesis.computed_carbs),
        fat: Number(anamnesis.computed_fat)
      };
    } else {
      // Fallback: If no anamnesis, check profile but warn
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", resolvedPatientId)
        .single();
      
      if (!profile || !profile.current_weight_kg) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            code: "ANAMNESIS_MISSING", 
            professional_override_supported: true,
            error: "Anamnese incompleta ou não encontrada. Preencha os dados clínicos para gerar o plano."
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[generate-meal-plan] Falling back to profile calculations");
      const weight = Number(profile.current_weight_kg);
      const height = Number(profile.current_height_cm) || 170;
      const age = 30; // Default
      const sex = profile.sex || "female";
      const goal = profile.goal || "maintain";
      const activityLevel = profile.activity_level || "moderate";

      const tmb = calculateTMB(weight, height, age, sex);
      const tdee = calculateTDEE(tmb, activityLevel);
      targetKcal = calculateTargetKcal(tdee, goal, sex);
      macros = calculateMacros(targetKcal, goal, weight);
    }

    // 3. Find suitable template from v3_diet_templates
    const kcalRounded = Math.round(targetKcal / 100) * 100;
    console.log(`[generate-meal-plan] Target: ${targetKcal} kcal. Searching template for ~${kcalRounded} kcal.`);

    let query = supabase
      .from("v3_diet_templates")
      .select("*")
      .eq("active", true);

    if (template_id) {
      query = query.eq("id", template_id);
    } else {
      // If no explicit template, filter by kcal profile
      query = query.filter("kcal_profiles", "cs", `[${kcalRounded}]`);
    }

    const { data: templates, error: templateError } = await query.order("nutritionist_id", { ascending: false, nullsFirst: false });

    if (templateError) throw templateError;

    let selectedTemplate = templates?.[0];

    // Fuzzy match if exact kcal profile not found and no specific template was requested
    if (!selectedTemplate && !template_id) {
      console.log("[generate-meal-plan] No exact kcal match. Trying fuzzy match.");
      const { data: allTemplates } = await supabase
        .from("v3_diet_templates")
        .select("*")
        .eq("active", true)
        .limit(20);
      
      // Find template with closest kcal profile
      selectedTemplate = allTemplates?.sort((a, b) => {
        const aProfiles = a.kcal_profiles || [];
        const bProfiles = b.kcal_profiles || [];
        const aDiff = Math.min(...aProfiles.map((k: number) => Math.abs(k - targetKcal)));
        const bDiff = Math.min(...bProfiles.map((k: number) => Math.abs(k - targetKcal)));
        return aDiff - bDiff;
      })[0];
    }

    if (!selectedTemplate) {
      throw new Error(`Não encontramos nenhum template compatível para ${targetKcal} kcal.`);
    }

    // 4. Extract snapshot for the target Kcal
    // Find the key in plan_snapshot that is closest to our targetKcal
    const snapshots = selectedTemplate.plan_snapshot || {};
    const snapshotKeys = Object.keys(snapshots).map(Number).sort((a, b) => Math.abs(a - targetKcal) - Math.abs(b - targetKcal));
    const bestSnapshotKey = snapshotKeys[0];
    const snapshot = snapshots[bestSnapshotKey.toString()];

    if (!snapshot) {
      throw new Error(`Snapshot para ${targetKcal} kcal não encontrado no template ${selectedTemplate.title}`);
    }

    // 5. Create the Meal Plan record
    // Deactivate previous plans
    await supabase
      .from("meal_plans")
      .update({ is_active: false })
      .eq("patient_id", resolvedPatientId)
      .eq("is_active", true);

    const { data: newPlan, error: newPlanError } = await supabase
      .from("meal_plans")
      .insert({
        patient_id: resolvedPatientId,
        nutritionist_id: resolvedNutritionistId,
        title: `Plano ${selectedTemplate.title} (${bestSnapshotKey} kcal)`,
        description: selectedTemplate.description,
        template_id: selectedTemplate.id,
        start_date: new Date().toISOString(),
        total_calories: targetKcal,
        total_protein: macros.protein,
        total_carbs: macros.carbs,
        total_fat: macros.fat,
        total_meta_calorias: targetKcal,
        total_meta_proteinas: macros.protein,
        total_meta_carboidratos: macros.carbs,
        total_meta_gorduras: macros.fat,
        plan_status: "published_to_patient", 
        is_active: true,
        snapshot: snapshot,
        engine_version: "v3-deterministic-direct",
        protocol_used: selectedTemplate.objective || "custom"
      })
      .select()
      .single();

    if (newPlanError) throw newPlanError;

    // 6. Insert items into meal_plan_items
    const itemsToInsert: any[] = [];
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
      }
    }

    // 7. Update profile state
    await supabase
      .from("profiles")
      .update({ 
        onboarding_completed: true,
        patient_state: 'active_plan',
        last_editor_version_used: 'v3'
      })
      .eq("user_id", resolvedPatientId);

    return new Response(
      JSON.stringify({
        success: true,
        mealPlanId: newPlan.id,
        items_count: itemsToInsert.length,
        template_used: selectedTemplate.title,
        target_kcal: targetKcal,
        macros: macros
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("[generate-meal-plan] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Erro interno no motor de planos" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});