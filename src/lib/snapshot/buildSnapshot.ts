/**
 * MealPlanSnapshot v1 — Builder
 * ──────────────────────────────
 * Lê o estado canônico do plano publicado e produz o snapshot imutável.
 * Onda 1: APENAS geração. Nenhuma camada lê o resultado.
 *
 * Design notes:
 * - Nenhum recálculo de macros aqui. Apenas projeção do que o motor
 *   gravou em meal_plan_items + meal_plans.
 * - Hash canônico via SHA-256 (Web Crypto) sobre JSON com chaves ordenadas.
 * - Falhas são propagadas; o caller decide se loga e segue (não-bloqueante).
 */

import { supabase } from "@/integrations/supabase/client";
import {
  MealPlanSnapshotV1,
  SNAPSHOT_SCHEMA_VERSION,
  SnapshotDay,
  SnapshotItem,
  SnapshotMacros,
  SnapshotMeal,
  SnapshotSubstitution,
} from "./types";

const DEFAULT_ENGINE_VERSION = "clinical-macro-engine@unknown";

function emptyMacros(): SnapshotMacros {
  return { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
}

function addMacros(a: SnapshotMacros, b: SnapshotMacros): SnapshotMacros {
  return {
    kcal: a.kcal + b.kcal,
    protein_g: a.protein_g + b.protein_g,
    carbs_g: a.carbs_g + b.carbs_g,
    fat_g: a.fat_g + b.fat_g,
  };
}

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

/** Ordena as chaves recursivamente para hash canônico estável. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) {
      out[k] = canonicalize(obj[k]);
    }
    return out;
  }
  return value;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function extractSubstitutions(editMetadata: unknown): SnapshotSubstitution[] {
  if (!editMetadata || typeof editMetadata !== "object") return [];
  const meta = editMetadata as Record<string, unknown>;
  const raw = meta.substitutions ?? meta.equivalents ?? null;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((s): SnapshotSubstitution | null => {
      if (!s || typeof s !== "object") return null;
      const o = s as Record<string, unknown>;
      const name =
        (o.name as string) ??
        (o.alimento as string) ??
        (o.food_name as string) ??
        null;
      if (!name) return null;

      const macrosObj = (o.macros as Record<string, unknown>) ?? {};
      const hasMacros =
        macrosObj.kcal !== undefined ||
        macrosObj.calorias_equivalentes !== undefined ||
        macrosObj.proteina_g !== undefined;

      return {
        food_id:
          (o.food_id as string) ??
          (o.alimento_id as string) ??
          (o.id as string) ??
          null,
        name,
        grams: o.grams !== undefined ? num(o.grams) : o.gramas !== undefined ? num(o.gramas) : null,
        unit_label:
          (o.unit_label as string) ??
          (o.unidade as string) ??
          (o.portion_label as string) ??
          null,
        macros: hasMacros
          ? {
              kcal: num(macrosObj.kcal ?? macrosObj.calorias_equivalentes),
              protein_g: num(macrosObj.protein_g ?? macrosObj.proteina_g),
              carbs_g: num(macrosObj.carbs_g ?? macrosObj.carboidrato_g),
              fat_g: num(macrosObj.fat_g ?? macrosObj.gordura_g),
            }
          : null,
        equivalence_pct:
          o.equivalence_pct !== undefined
            ? num(o.equivalence_pct)
            : o.equivalencia_calorica !== undefined
            ? num(o.equivalencia_calorica)
            : null,
        image_url: (o.image_url as string) ?? (o.imagem_url as string) ?? null,
      };
    })
    .filter((s): s is SnapshotSubstitution => s !== null);
}

export interface BuildSnapshotOptions {
  /** Sobrescreve engine_version se o motor souber a sua versão real */
  engineVersionOverride?: string;
}

/**
 * Gera o snapshot v1 a partir do estado persistido do plano.
 * NÃO grava — apenas constrói.
 */
export async function buildMealPlanSnapshot(
  planId: string,
  options: BuildSnapshotOptions = {}
): Promise<MealPlanSnapshotV1> {
  // 1. Plano principal
  const { data: planRow, error: planErr } = await supabase
    .from("meal_plans")
    .select(
      "id, patient_id, nutritionist_id, tenant_id, title, start_date, end_date, plan_type, plan_mode, template_id, template_slug, template_version, generation_source, protocol_used, engine_version, total_target_calories, total_target_protein, total_target_carbs, total_target_fat, generation_metadata"
    )
    .eq("id", planId)
    .maybeSingle();

  if (planErr) throw planErr;
  if (!planRow) throw new Error(`[snapshot] plan ${planId} not found`);

  // 2. Itens do plano
  const { data: items, error: itemsErr } = await supabase
    .from("meal_plan_items")
    .select(
      "id, meal_type, day_of_week, title, description, image_url, visual_library_item_id, is_primary, is_locked, substitution_group_id, target_percentage, calories_target, protein_target, carbs_target, fat_target, edit_metadata"
    )
    .eq("meal_plan_id", planId)
    .order("day_of_week", { ascending: true })
    .order("meal_type", { ascending: true });

  if (itemsErr) throw itemsErr;

  // 3. Contexto do paciente (best-effort, sem recalcular nada)
  const { data: patientProfile } = await supabase
    .from("profiles")
    .select(
      "id, current_weight, height, birth_date, gender, activity_level, goal, weight_source"
    )
    .eq("id", planRow.patient_id)
    .maybeSingle();

  const ageFromBirth = (() => {
    const bd = (patientProfile as Record<string, unknown> | null)?.birth_date as string | undefined;
    if (!bd) return null;
    const d = new Date(bd);
    if (Number.isNaN(d.getTime())) return null;
    const diff = Date.now() - d.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  })();

  // 4. Agrupar itens por dia → refeição
  const dayMap = new Map<number, Map<string, SnapshotItem[]>>();
  for (const it of items ?? []) {
    const day = it.day_of_week ?? 0;
    const meal = (it.meal_type as string) ?? "unknown";
    if (!dayMap.has(day)) dayMap.set(day, new Map());
    const meals = dayMap.get(day)!;
    if (!meals.has(meal)) meals.set(meal, []);

    const macros: SnapshotMacros = {
      kcal: num(it.calories_target),
      protein_g: num(it.protein_target),
      carbs_g: num(it.carbs_target),
      fat_g: num(it.fat_target),
    };

    meals.get(meal)!.push({
      id: it.id,
      title: it.title,
      description: (it.description as string) ?? null,
      image_url: (it.image_url as string) ?? null,
      visual_library_item_id: (it.visual_library_item_id as string) ?? null,
      is_primary: Boolean(it.is_primary ?? true),
      is_locked: Boolean(it.is_locked ?? false),
      substitution_group_id: (it.substitution_group_id as string) ?? null,
      target_percentage:
        it.target_percentage != null ? num(it.target_percentage) : null,
      macros,
      substitutions: extractSubstitutions(it.edit_metadata),
    });
  }

  // 5. Construir dias com totais
  const days: SnapshotDay[] = [];
  let weekly = emptyMacros();
  let daysWithItems = 0;

  for (const dow of Array.from(dayMap.keys()).sort((a, b) => a - b)) {
    const mealsMap = dayMap.get(dow)!;
    const meals: SnapshotMeal[] = [];
    let dayTotals = emptyMacros();

    for (const mealType of Array.from(mealsMap.keys()).sort()) {
      const itemsArr = mealsMap.get(mealType)!;
      const mealTotals = itemsArr.reduce(
        (acc, i) => addMacros(acc, i.macros),
        emptyMacros()
      );
      meals.push({ meal_type: mealType, totals: mealTotals, items: itemsArr });
      dayTotals = addMacros(dayTotals, mealTotals);
    }

    days.push({ day_of_week: dow, totals: dayTotals, meals });
    weekly = addMacros(weekly, dayTotals);
    if (meals.some((m) => m.items.length > 0)) daysWithItems += 1;
  }

  const dailyAvg: SnapshotMacros = daysWithItems
    ? {
        kcal: weekly.kcal / daysWithItems,
        protein_g: weekly.protein_g / daysWithItems,
        carbs_g: weekly.carbs_g / daysWithItems,
        fat_g: weekly.fat_g / daysWithItems,
      }
    : emptyMacros();

  // 6. Montar payload SEM hash, calcular hash, depois injetar.
  const profile = patientProfile as Record<string, unknown> | null;
  const generatedAt = new Date().toISOString();
  const engineVersion =
    options.engineVersionOverride ??
    (planRow.engine_version as string | null) ??
    DEFAULT_ENGINE_VERSION;

  const payloadWithoutHash: Omit<MealPlanSnapshotV1, "hash"> = {
    schema_version: SNAPSHOT_SCHEMA_VERSION,
    engine_version: engineVersion,
    generated_at: generatedAt,
    plan: {
      plan_id: planRow.id,
      patient_id: planRow.patient_id,
      nutritionist_id: planRow.nutritionist_id,
      tenant_id: (planRow.tenant_id as string) ?? null,
      title: planRow.title,
      start_date: (planRow.start_date as string) ?? null,
      end_date: (planRow.end_date as string) ?? null,
      plan_type: (planRow.plan_type as string) ?? null,
      plan_mode: (planRow.plan_mode as string) ?? null,
      template_id: (planRow.template_id as string) ?? null,
      template_slug: (planRow.template_slug as string) ?? null,
      template_version:
        planRow.template_version != null ? Number(planRow.template_version) : null,
      generation_source: (planRow.generation_source as string) ?? null,
      protocol_used: (planRow.protocol_used as string) ?? null,
    },
    patient_context: {
      id: planRow.patient_id,
      weight_kg: profile?.current_weight != null ? num(profile.current_weight) : null,
      weight_source: (profile?.weight_source as string) ?? null,
      height_cm: profile?.height != null ? num(profile.height) : null,
      age: ageFromBirth,
      gender: (profile?.gender as string) ?? null,
      activity_level: (profile?.activity_level as string) ?? null,
      goal: (profile?.goal as string) ?? null,
    },
    targets: {
      kcal: num(planRow.total_target_calories),
      protein_g: num(planRow.total_target_protein),
      carbs_g: num(planRow.total_target_carbs),
      fat_g: num(planRow.total_target_fat),
      goal: (profile?.goal as string) ?? null,
    },
    days,
    weekly_totals: weekly,
    daily_average: dailyAvg,
  };

  const canonical = JSON.stringify(canonicalize(payloadWithoutHash));
  const hash = await sha256Hex(canonical);

  return { ...payloadWithoutHash, hash };
}
