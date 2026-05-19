
import { supabase } from "@/integrations/supabase/client";
import { activateMealPlan } from "@/lib/serverTransitions";

export interface TemplateFood {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  substitutions: string[];
}

export interface TemplateMeal {
  tipo_refeicao: string;
  title: string;
  foods: TemplateFood[];
}

export interface DietTemplate {
  id: string;
  name: string;
  slug: string;
  base_calories: number;
  is_v3?: boolean;
  plan_snapshot?: any;
  meals?: TemplateMeal[];
  kcal_profiles?: number[];
}

export const applyOfficialV3Template = async (
  template: DietTemplate,
  patientId: string,
  nutritionistId: string,
  tenantId: string | null,
  patientName: string,
  targetKcal?: number
): Promise<string> => {
  if (!template.plan_snapshot) throw new Error("Template V3 sem snapshot de plano");

  const finalTargetKcal = targetKcal || template.kcal_profiles?.[0] || 0;
  const availableProfiles = Object.keys(template.plan_snapshot)
    .map(Number)
    .sort((a, b) => Math.abs(a - finalTargetKcal) - Math.abs(b - finalTargetKcal));
  
  const bestProfile = availableProfiles[0];
  const profile = template.plan_snapshot[String(bestProfile)];

  if (!profile) throw new Error(`Nenhum perfil de calorias encontrado para ${finalTargetKcal} kcal`);

  const { data: plan, error: planErr } = await supabase
    .from("meal_plans")
    .insert([{
      patient_id: patientId,
      nutritionist_id: nutritionistId,
      title: template.name + (patientName ? ` - ${patientName}` : ""),
      description: `Modelo Premium V3 "${template.name}". Perfil: ${bestProfile} kcal.`,
      start_date: new Date().toISOString().split("T")[0],
      is_active: false,
      plan_status: "draft_template",
      tenant_id: tenantId,
      editor_version: "v3",
      generation_source: "v3",
      total_calories: finalTargetKcal,
    }])
    .select("id")
    .single();

  if (planErr || !plan) throw new Error(planErr?.message || "Falha ao criar plano V3");

  const dayData = profile.days?.[0];
  if (!dayData) throw new Error("Template V3 sem dados de dia");

  const items: any[] = [];
  const multiplier = bestProfile > 0 ? finalTargetKcal / bestProfile : 1;

  for (const meal of dayData.meals) {
    for (const item of meal.items) {
      const groupId = crypto.randomUUID();
      
      items.push({
        meal_plan_id: plan.id,
        day_of_week: 0,
        tipo_refeicao: meal.name || meal.tipo_refeicao,
        title: item.title || item.name,
        description: item.quantity_display,
        meta_calorias: Math.round((item.kcal || 0) * multiplier),
        meta_proteinas: Math.round((item.protein || 0) * multiplier),
        meta_carboidratos: Math.round((item.carbs || 0) * multiplier),
        meta_gorduras: Math.round((item.fat || 0) * multiplier),
        substitution_group_id: groupId,
        is_primary: true,
        visual_library_item_id: item.visual_library_item_id || null,
      });

      if (Array.isArray(item.substitutions)) {
        for (const sub of item.substitutions) {
          items.push({
            meal_plan_id: plan.id,
            day_of_week: 0,
            tipo_refeicao: meal.name || meal.tipo_refeicao,
            title: sub.title || sub.name,
            description: sub.quantity_display,
            meta_calorias: Math.round((sub.kcal || 0) * multiplier),
            meta_proteinas: Math.round((sub.protein || 0) * multiplier),
            meta_carboidratos: Math.round((sub.carbs || 0) * multiplier),
            meta_gorduras: Math.round((sub.fat || 0) * multiplier),
            substitution_group_id: groupId,
            is_primary: false,
            visual_library_item_id: sub.visual_library_item_id || null,
          });
        }
      }
    }
  }

  if (items.length > 0) {
    const { error: itemsErr } = await supabase.from("meal_plan_items").insert(items);
    if (itemsErr) throw itemsErr;
  }

  await activateMealPlan(plan.id);
  return plan.id;
};

export const applyOfficialV2Template = async (
  template: DietTemplate,
  patientId: string,
  nutritionistId: string,
  tenantId: string | null,
  patientName: string,
  targetKcal?: number
): Promise<string> => {
  const meals = Array.isArray(template.meals) ? template.meals : [];
  if (meals.length === 0) throw new Error("Template sem refeições");

  const finalTargetKcal = targetKcal || template.base_calories || 0;

  const { data: plan, error: planErr } = await supabase
    .from("meal_plans")
    .insert([{
      patient_id: patientId,
      nutritionist_id: nutritionistId,
      title: template.name + (patientName ? ` - ${patientName}` : ""),
      description: `Baseado no modelo "${template.name}".`,
      start_date: new Date().toISOString().split("T")[0],
      is_active: false,
      plan_status: "draft_template",
      tenant_id: tenantId,
      total_calories: finalTargetKcal,
    }])
    .select("id")
    .single();

  if (planErr || !plan) throw new Error(planErr?.message || "Falha ao criar plano");

  const multiplier = template.base_calories > 0 ? finalTargetKcal / template.base_calories : 1;
  const items: any[] = [];

  for (const meal of meals) {
    const blocks = (meal as any).blocks || [];
    const foods = (meal as any).foods || [];

    if (blocks.length > 0) {
      for (const b of blocks) {
        const groupId = crypto.randomUUID();
        const opts = b.options || [];
        opts.forEach((opt: any, idx: number) => {
          items.push({
            meal_plan_id: plan.id,
            day_of_week: 0,
            tipo_refeicao: meal.tipo_refeicao,
            title: opt.name || b.label,
            description: opt.portion || b.base_quantity,
            meta_calorias: Math.round((opt.calories || 0) * multiplier),
            meta_proteinas: Math.round((opt.protein || 0) * multiplier),
            meta_carboidratos: Math.round((opt.carbs || 0) * multiplier),
            meta_gorduras: Math.round((opt.fat || 0) * multiplier),
            substitution_group_id: groupId,
            is_primary: idx === 0,
          });
        });
      }
    } else if (foods.length > 0) {
      for (const f of foods) {
        const groupId = f.substitutions?.length > 0 ? crypto.randomUUID() : undefined;
        items.push({
          meal_plan_id: plan.id,
          day_of_week: 0,
          tipo_refeicao: meal.tipo_refeicao,
          title: f.name,
          description: f.portion,
          meta_calorias: Math.round((f.calories || 0) * multiplier),
          meta_proteinas: Math.round((f.protein || 0) * multiplier),
          meta_carboidratos: Math.round((f.carbs || 0) * multiplier),
          meta_gorduras: Math.round((f.fat || 0) * multiplier),
          substitution_group_id: groupId,
          is_primary: true,
        });
        if (f.substitutions) {
          f.substitutions.forEach((subName: string) => {
            items.push({
              meal_plan_id: plan.id,
              day_of_week: 0,
              tipo_refeicao: meal.tipo_refeicao,
              title: subName,
              description: "Substituição",
              meta_calorias: Math.round((f.calories || 0) * multiplier),
              meta_proteinas: Math.round((f.protein || 0) * multiplier),
              meta_carboidratos: Math.round((f.carbs || 0) * multiplier),
              meta_gorduras: Math.round((f.fat || 0) * multiplier),
              substitution_group_id: groupId,
              is_primary: false,
            });
          });
        }
      }
    }
  }

  if (items.length > 0) {
    const { error: itemsErr } = await supabase.from("meal_plan_items").insert(items);
    if (itemsErr) throw itemsErr;
  }

  await activateMealPlan(plan.id);
  return plan.id;
};
