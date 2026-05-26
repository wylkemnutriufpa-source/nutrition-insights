// import { createClient } from "https://esm.sh/@supabase/supabase-js@2"; // Removed to avoid build errors in mixed environment
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
} from "./clinical-macro-engine.ts";

export interface ClinicalInput {
  patientId: string;
  nutritionistId?: string;
  generationMode?: string;
  professionalOverride?: {
    weight?: number;
    height?: number;
    age?: number;
    sex?: string;
    goal?: string;
    activityLevel?: string;
  };
  template_id?: string;
}

export class ClinicalEngine {
  /**
   * Sovereign method for meal plan generation (V3 Deterministic)
   */
  static async generateMealPlan(input: ClinicalInput, supabase: any) {
    const { 
      patientId, 
      nutritionistId, 
      professionalOverride,
      template_id
    } = input;

    console.log(`[ClinicalEngine] Starting deterministic generation for patient ${patientId}`);

    // 1. Fetch patient anamnesis (Deterministic source of truth)
    const { data: anamnesis, error: anamnesisError } = await supabase
      .from("patient_anamnesis")
      .select("*")
      .eq("user_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (anamnesisError) throw anamnesisError;

    let targetKcal: number;
    let macros: { protein: number; carbs: number; fat: number };

    // 2. Resolve Target Kcal and Macros
    if (professionalOverride) {
      console.log("[ClinicalEngine] Using professional override");
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
      console.log("[ClinicalEngine] Using anamnesis computed values");
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
        .eq("user_id", patientId)
        .single();
      
      if (!profile || !profile.current_weight_kg) {
        throw new Error("ANAMNESIS_MISSING: Anamnese incompleta ou não encontrada.");
      }

      console.log("[ClinicalEngine] Falling back to profile calculations");
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
    console.log(`[ClinicalEngine] Target: ${targetKcal} kcal. Searching template for ~${kcalRounded} kcal.`);

    let query = supabase
      .from("v3_diet_templates")
      .select("*")
      .eq("active", true);

    if (template_id) {
      query = query.eq("id", template_id);
    } else {
      query = query.filter("kcal_profiles", "cs", `[${kcalRounded}]`);
    }

    const { data: templates, error: templateError } = await query.order("nutritionist_id", { ascending: false, nullsFirst: false });

    if (templateError) throw templateError;

    let selectedTemplate = templates?.[0];

    if (!selectedTemplate && !template_id) {
      console.log("[ClinicalEngine] No exact kcal match. Trying fuzzy match.");
      const { data: allTemplates } = await supabase
        .from("v3_diet_templates")
        .select("*")
        .eq("active", true)
        .limit(20);
      
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
    const snapshots = selectedTemplate.plan_snapshot || {};
    const snapshotKeys = Object.keys(snapshots).map(Number).sort((a, b) => Math.abs(a - targetKcal) - Math.abs(b - targetKcal));
    const bestSnapshotKey = snapshotKeys[0];
    const snapshot = snapshots[bestSnapshotKey.toString()];

    if (!snapshot) {
      throw new Error(`Snapshot para ${targetKcal} kcal não encontrado no template ${selectedTemplate.title}`);
    }

    // 5. Create the Meal Plan record
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
        engine_version: "v3-sovereign",
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
            tipo_refeicao: meal.name,
            title: item.name || item.title,
            meta_calorias: Math.round(item.kcal || 0),
            meta_proteinas: item.macros?.protein_g || item.protein || 0,
            meta_carboidratos: item.macros?.carbs_g || item.carbs || 0,
            meta_gorduras: item.macros?.fat_g || item.fat || 0,
            image_url: item.imageUrl,
            is_primary: item.is_primary ?? true,
            edit_metadata: { 
              original_item_id: item.id,
              instanceId: item.instanceId,
              provenance: "clinical_engine_v3"
            }
          });

        }
      }
    }

    if (itemsToInsert.length > 0) {
      await supabase.from("meal_plan_items").insert(itemsToInsert);
    }

    // 7. Update profile state
    await supabase
      .from("profiles")
      .update({ 
        onboarding_completed: true,
        patient_state: 'active_plan',
        last_editor_version_used: 'v3'
      })
      .eq("user_id", patientId);

    return {
      success: true,
      mealPlanId: newPlan.id,
      itemsCount: itemsToInsert.length,
      templateUsed: selectedTemplate.title,
      kcal: targetKcal,
      macros: macros,
      provenance: "clinical_engine_v3"
    };
  }
}
