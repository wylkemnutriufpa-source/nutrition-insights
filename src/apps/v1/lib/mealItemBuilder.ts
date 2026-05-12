/**
 * Centralized Meal Plan Item Builder
 * 
 * SINGLE SOURCE OF TRUTH for creating meal_plan_items.
 * Ensures every item has the minimum required fields for:
 *   - visual resolution (description with real food names)
 *   - clinical display (title, macros)
 *   - observability (warnings for incomplete items)
 * 
 * All flows that create meal_plan_items MUST use this builder.
 * Description logic delegated to mealDescriptionEngine.ts (canonical source).
 */

import type { TablesInsert } from "@v1/integrations/supabase/types";
import { isGenericDescription } from "./mealDescriptionEngine";

export interface MealItemInput {
  meal_plan_id: string;
  title: string;
  description?: string | null;
  meal_type: string;
  day_of_week: number;
  calories_target?: number | null;
  protein_target?: number | null;
  carbs_target?: number | null;
  fat_target?: number | null;
  tenant_id?: string | null;
  visual_library_item_id?: string | null;
  item_origin?: string;
  is_manually_edited?: boolean;
  is_locked?: boolean;
  was_auto_corrected?: boolean;
  is_primary?: boolean;
  substitution_group_id?: string | null;
  /** Foods used to compose this item — used to auto-build description if missing */
  foods?: string[];
}

export interface BuildResult {
  items: TablesInsert<"meal_plan_items">[];
  warnings: string[];
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Café da Manhã",
  morning_snack: "Lanche da Manhã",
  lunch: "Almoço",
  afternoon_snack: "Lanche da Tarde",
  dinner: "Jantar",
  evening_snack: "Ceia",
};

/**
 * Build a validated meal_plan_item insert.
 * If description is missing but foods[] is provided, auto-generates description.
 * Logs warnings for items that lack sufficient visual resolution data.
 */
export function buildMealItems(inputs: MealItemInput[]): BuildResult {
  const warnings: string[] = [];
  const items: TablesInsert<"meal_plan_items">[] = [];

  for (const input of inputs) {
    let description = input.description || null;

    // Auto-build description from foods array if description is empty/generic
    if ((!description || isGenericDescription(description)) && input.foods && input.foods.length > 0) {
      description = input.foods.map(f => `• ${f}`).join("\n");
    }

    // Ensure title is human-readable
    const title = input.title || MEAL_TYPE_LABELS[input.meal_type] || "Refeição";

    // Warn if item has no useful description for visual resolution
    if (!description || description.trim().length < 3) {
      warnings.push(
        `[MealItemBuilder] Dia ${input.day_of_week}, ${title}: item criado SEM descrição — resolução visual impossível`
      );
    }

    items.push({
      meal_plan_id: input.meal_plan_id,
      title,
      description,
      meal_type: input.meal_type as TablesInsert<"meal_plan_items">["meal_type"],
      day_of_week: input.day_of_week,
      calories_target: input.calories_target ?? null,
      protein_target: input.protein_target ?? null,
      carbs_target: input.carbs_target ?? null,
      fat_target: input.fat_target ?? null,
      tenant_id: input.tenant_id ?? null,
      visual_library_item_id: input.visual_library_item_id ?? null,
      item_origin: (input.item_origin || "template") as any,
      is_manually_edited: input.is_manually_edited || false,
      is_locked: input.is_locked || false,
      was_auto_corrected: input.was_auto_corrected || false,
      is_primary: input.is_primary ?? true,
      substitution_group_id: input.substitution_group_id ?? null,
    } as any);
  }

  return { items, warnings };
}

/**
 * Build a description from food names and their portions.
 * Delegates to canonical format from mealDescriptionEngine.
 * Used by CalorieTemplates and TemplateQuickInsertPanel.
 */
export function buildFoodDescription(
  foods: Array<{ name: string; portion_grams?: number; portion?: string }>,
): string {
  return foods
    .map(f => {
      const portion = f.portion || (f.portion_grams ? `${f.portion_grams}g` : "");
      return portion ? `• ${f.name} — ${portion}` : `• ${f.name}`;
    })
    .join("\n");
}
