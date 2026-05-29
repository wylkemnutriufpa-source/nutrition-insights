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
      // CRITICAL: No fallback to profiles. Anamnesis is the ONLY source of truth.
      // If anamnesis is missing, the patient must complete onboarding.
      throw new Error("ANAMNESIS_MISSING: Anamnese incompleta ou não encontrada. Paciente deve completar o onboarding antes de gerar plano.");
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
      // CRITICAL: No fuzzy match. Template selection must be deterministic and explicit.
      // If no exact match, the nutritionist must select a template explicitly.
      throw new Error(`Nenhum template exato encontrado para ${targetKcal} kcal. Solicite ao nutricionista um template específico ou use template_id.`);
    }

    if (!selectedTemplate) {
      throw new Error(`Não encontramos nenhum template compatível para ${targetKcal} kcal.`);
    }

    // 4. Extract snapshot for the target Kcal (DETERMINISTIC: exact match only)
    const snapshotKey = targetKcal.toString();
    const snapshot = (selectedTemplate.plan_snapshot || {})[snapshotKey];

    if (!snapshot) {
      throw new Error(`Snapshot exato para ${targetKcal} kcal não encontrado no template "${selectedTemplate.title}". Template não suporta essa caloria.`);
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
        title: `Plano ${selectedTemplate.title} (${targetKcal} kcal)`,
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
          // 🛡️ CONTRATO V3: quantity_display é fonte canônica de quantidade humana.
          // Bloqueia persistência se snapshot vier sem essa informação.
          const qd = item.quantity_display ?? item.display_quantity ?? null;
          if (!qd || String(qd).trim() === "") {
            throw new Error(
              `MISSING_QUANTITY_DISPLAY: item "${item.name || item.title || item.id}" (dia ${dayOfWeek}, refeição ${meal.name}) sem quantity_display`
            );
          }

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
            quantity_display: String(qd),
            clinical_mass_g: item.clinical_mass_g,
            description: item.description,
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
      const { error: itemsError } = await supabase.from("meal_plan_items").insert(itemsToInsert);
      if (itemsError) {
        console.error("[ClinicalEngine] Error inserting items:", itemsError);
        throw itemsError;
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
