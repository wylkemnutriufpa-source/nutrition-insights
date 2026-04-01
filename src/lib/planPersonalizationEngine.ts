/**
 * Motor de Personalização de Planos — FitJourney Engine v1.0
 * 
 * Independente do template ou plano escolhido pelo profissional,
 * este motor SEMPRE adapta o plano para o paciente com base em:
 * - Restrições alimentares (alergias, intolerâncias)
 * - TMB / TED calculados
 * - Alimentos rejeitados
 * - Horários do paciente
 * - Objetivo (emagrecimento, hipertrofia, etc)
 * 
 * O plano oficial nunca é alterado — o motor cria uma versão personalizada.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { resolvePatientSchedule } from "./patientScheduleResolver";
import { BLOCKED_FOODS } from "./mealPlanFoodRules";

type MealPlanItem = Tables<"meal_plan_items">;

// ── Types ────────────────────────────────────────────────────
export interface PersonalizationContext {
  patientId: string;
  goal: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  restrictions: string[];
  rejectedFoods: string[];
  schedule: Record<string, string>;
  scheduleSource: string;
}

export interface PersonalizationChange {
  type: "restriction_removed" | "rejected_removed" | "calorie_adjusted" | "schedule_applied";
  detail: string;
  mealType?: string;
  dayOfWeek?: number;
}

export interface PersonalizationResult {
  items: Partial<MealPlanItem>[];
  changes: PersonalizationChange[];
  context: PersonalizationContext;
  warnings: string[];
}

// ── Restriction database ─────────────────────────────────────
const RESTRICTION_FOODS: Record<string, string[]> = {
  lactose: ["leite", "queijo", "iogurte", "requeijão", "cream cheese", "manteiga", "nata", "creme de leite", "whey", "ricota", "mussarela", "parmesão", "cottage", "coalhada"],
  gluten: ["pão", "macarrão", "espaguete", "bolo", "biscoito", "bolacha", "torrada", "farinha de trigo", "cuscuz de trigo", "massa", "pizza", "lasanha", "miojo", "aveia"],
  ovo: ["ovo", "ovos", "omelete", "ovo cozido", "ovo mexido", "clara", "gema", "fritada"],
  frutos_do_mar: ["camarão", "siri", "caranguejo", "lagosta", "lula", "polvo", "mexilhão", "ostra"],
  amendoim: ["amendoim", "pasta de amendoim", "paçoca"],
  soja: ["soja", "tofu", "edamame", "molho de soja", "shoyu", "proteina de soja"],
  vegetariano: ["frango", "carne", "bife", "peito de frango", "coxa", "sobrecoxa", "peixe", "tilápia", "sardinha", "atum", "porco", "lombo", "linguiça", "bacon", "presunto", "salsicha", "camarão"],
  vegano: ["frango", "carne", "bife", "peixe", "ovo", "leite", "queijo", "iogurte", "mel", "whey", "manteiga", "presunto", "bacon", "requeijão", "atum", "sardinha"],
};

// Simple replacements for restricted foods
// IMPORTANT: replacements must ONLY use foods from ALLOWED lists (never blocked foods)
const RESTRICTION_REPLACEMENTS: Record<string, Record<string, string>> = {
  lactose: {
    leite: "suco natural",
    queijo: "ovo cozido",
    iogurte: "banana amassada",
    "requeijão": "pasta de amendoim",
    manteiga: "azeite de oliva",
    whey: "ovo cozido",
    ricota: "ovo mexido",
    mussarela: "ovo cozido",
    cottage: "ovo mexido",
  },
  gluten: {
    "pão": "tapioca",
    "macarrão": "batata cozida",
    espaguete: "batata doce",
    torrada: "tapioca",
    aveia: "cuscuz de milho",
    cuscuz: "cuscuz de milho",
  },
  ovo: {
    ovo: "queijo minas",
    ovos: "queijo minas",
    omelete: "tapioca com queijo",
    "ovo cozido": "queijo coalho",
  },
};

// ── Normalize ────────────────────────────────────────────────
function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// ── Load personalization context ─────────────────────────────
export async function loadPersonalizationContext(patientId: string): Promise<PersonalizationContext | null> {
  try {
    const [anamnesisRes, scheduleResult] = await Promise.all([
      supabase
        .from("patient_anamnesis")
        .select("answers, computed_kcal_target, computed_protein, computed_carbs, computed_fat")
        .eq("user_id", patientId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      resolvePatientSchedule(patientId),
    ]);

    const anamnesis = anamnesisRes.data;
    if (!anamnesis) return null;

    const answers = (anamnesis.answers || {}) as Record<string, any>;

    const goalMap: Record<string, string> = {
      "Perder peso": "weight_loss",
      "Ganhar massa": "hypertrophy",
      "Manter peso": "maintenance",
      "Saúde geral": "functional",
      "Definição": "weight_loss",
      "Performance": "hypertrophy",
    };
    const rawGoal = answers.objective || answers.goal || answers.objetivo || "";
    const goal = goalMap[rawGoal] || rawGoal || "maintenance";

    const rawRestrictions = answers.restrictions || answers.restricoes || answers.intolerances || [];
    const restrictions = Array.isArray(rawRestrictions) ? rawRestrictions : [rawRestrictions].filter(Boolean);

    const rawRejected = answers.rejected_foods || answers.alimentos_rejeitados || [];
    const rejectedFoods = Array.isArray(rawRejected)
      ? rawRejected
      : typeof rawRejected === "string"
        ? rawRejected.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

    return {
      patientId,
      goal,
      targetCalories: Number(anamnesis.computed_kcal_target) || 2000,
      targetProtein: Number(anamnesis.computed_protein) || 120,
      targetCarbs: Number(anamnesis.computed_carbs) || 250,
      targetFat: Number(anamnesis.computed_fat) || 60,
      restrictions: restrictions.map((r: string) => normalize(r)),
      rejectedFoods: rejectedFoods.map((f: string) => normalize(f)),
      schedule: scheduleResult.schedule,
      scheduleSource: scheduleResult.source,
    };
  } catch (e) {
    console.error("[Personalization] Failed to load context:", e);
    return null;
  }
}

// ── Main personalization engine ──────────────────────────────
export function personalizePlanItems(
  items: Partial<MealPlanItem>[],
  context: PersonalizationContext,
): PersonalizationResult {
  const changes: PersonalizationChange[] = [];
  const warnings: string[] = [];

  let personalizedItems = items.map(item => ({ ...item }));

  // Skip items that are manually edited or locked
  const isProtected = (item: Partial<MealPlanItem>) => 
    Boolean((item as any).is_locked || (item as any).is_manually_edited);

  // 1. Remove restricted foods
  for (const restriction of context.restrictions) {
    const restrictedFoods = RESTRICTION_FOODS[restriction] || [];
    const replacements = RESTRICTION_REPLACEMENTS[restriction] || {};

    if (restrictedFoods.length === 0) continue;

    personalizedItems = personalizedItems.map(item => {
      if (isProtected(item)) return item;
      let title = item.title || "";
      let description = item.description || "";
      let changed = false;

      for (const food of restrictedFoods) {
        const regex = new RegExp(food.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");

        if (regex.test(title) || regex.test(description)) {
          const replacement = replacements[food] || null;

          if (replacement) {
            title = title.replace(regex, replacement);
            description = description.replace(regex, replacement);
            changes.push({
              type: "restriction_removed",
              detail: `${food} → ${replacement} (restrição: ${restriction})`,
              mealType: item.meal_type || undefined,
              dayOfWeek: item.day_of_week ?? undefined,
            });
          } else {
            // Remove the food entirely
            title = title.replace(regex, "").replace(/,\s*,/g, ",").replace(/^\s*,|,\s*$/g, "").trim();
            description = description.replace(regex, "").replace(/,\s*,/g, ",").replace(/^\s*,|,\s*$/g, "").trim();
            changes.push({
              type: "restriction_removed",
              detail: `${food} removido (restrição: ${restriction})`,
              mealType: item.meal_type || undefined,
              dayOfWeek: item.day_of_week ?? undefined,
            });
          }
          changed = true;
        }
      }

      return changed ? { ...item, title: title || item.title, description } : item;
    });
  }

  // 2. Remove explicitly rejected foods
  for (const rejected of context.rejectedFoods) {
    if (!rejected) continue;
    const regex = new RegExp(rejected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");

    personalizedItems = personalizedItems.map(item => {
      if (isProtected(item)) return item;
      const title = item.title || "";
      const description = item.description || "";

      if (regex.test(title) || regex.test(description)) {
        changes.push({
          type: "rejected_removed",
          detail: `${rejected} removido (alimento rejeitado pelo paciente)`,
          mealType: item.meal_type || undefined,
          dayOfWeek: item.day_of_week ?? undefined,
        });
        return {
          ...item,
          title: title.replace(regex, "").replace(/,\s*,/g, ",").replace(/^\s*,|,\s*$/g, "").trim() || title,
          description: description.replace(regex, "").replace(/,\s*,/g, ",").replace(/^\s*,|,\s*$/g, "").trim(),
        };
      }
      return item;
    });
  }

  // 3. Adjust calories to match patient TMB/TED
  const currentTotalCal = personalizedItems.reduce((s, i) => s + (i.calories_target || 0), 0);
  // Calculate per-day calories (items are for 7 days)
  const days = new Set(personalizedItems.map(i => i.day_of_week ?? 0));
  const numDays = Math.max(days.size, 1);
  const currentDailyCal = currentTotalCal / numDays;

  if (context.targetCalories > 0 && currentDailyCal > 0) {
    const deviation = Math.abs(currentDailyCal - context.targetCalories) / context.targetCalories;
    // Only adjust if deviation > 10%
    if (deviation > 0.10) {
      const factor = context.targetCalories / currentDailyCal;
      personalizedItems = personalizedItems.map(item => ({
        ...item,
        calories_target: item.calories_target ? Math.round(item.calories_target * factor) : item.calories_target,
        protein_target: item.protein_target ? Math.round(item.protein_target * factor) : item.protein_target,
        carbs_target: item.carbs_target ? Math.round(item.carbs_target * factor) : item.carbs_target,
        fat_target: item.fat_target ? Math.round(item.fat_target * factor) : item.fat_target,
      }));

      const newDailyCal = Math.round(context.targetCalories);
      changes.push({
        type: "calorie_adjusted",
        detail: `Calorias ajustadas: ${Math.round(currentDailyCal)}kcal/dia → ${newDailyCal}kcal/dia (TMB/TED do paciente)`,
      });
    }
  }

  // 4. Log schedule source
  if (context.scheduleSource === "default") {
    warnings.push("Paciente não preencheu horários — horário padrão aplicado");
  }
  changes.push({
    type: "schedule_applied",
    detail: `Horários: ${context.scheduleSource} (café ${context.schedule.breakfast}, almoço ${context.schedule.lunch}, jantar ${context.schedule.dinner})`,
  });

  return {
    items: personalizedItems,
    changes,
    context,
    warnings,
  };
}
