/**
 * Phase 3 — Weekly Planner (V3, ISOLATED)
 *
 * Replicates a 1-day template into a 7-day plan with consistent gram amounts.
 * Optionally applies controlled variation across days using equivalence groups.
 *
 * IMPORTANT: This module is independent of V2 and any pre-existing engine.
 */

export interface Macronutrients {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface PlannedItem {
  nome: string;
  gramas: number;
  /** Equivalence group key (e.g., 'protein_main', 'carb_main'). */
  group?: string;
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}

export interface PlannedMeal {
  type: string;
  time?: string;
  items: PlannedItem[];
}

export interface DayPlan {
  date: Date;
  day_of_week: string;
  meals: PlannedMeal[];
  daily_totals: Macronutrients;
}

export interface SubstitutionGroup {
  /** Equivalence group key matched against PlannedItem.group */
  group: string;
  /** Equivalent foods in this group. Order defines rotation order. */
  alternatives: Array<{
    nome: string;
    /** Multiplier to convert original grams into equivalent grams of this food. */
    equivalence_factor: number;
  }>;
}

export interface VariationRules {
  max_repeat_protein: number;
  max_consecutive_days: number;
  allowed_substitutions: SubstitutionGroup[];
}

export interface WeeklyOptions {
  enable_variation: boolean;
  variation_rules?: VariationRules;
}

export interface WeeklyInput {
  daily_template: DayPlan;
  start_date: Date;
  patient_id?: string;
  options: WeeklyOptions;
}

export interface WeeklyPlan {
  patient_id: string;
  start_date: Date;
  end_date: Date;
  days: DayPlan[];
  metadata: {
    total_calories_per_day: number;
    variation_enabled: boolean;
    generated_from_template: string;
  };
}

const DAYS_PT = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

const DEFAULT_VARIATION_RULES: VariationRules = {
  max_repeat_protein: 2,
  max_consecutive_days: 1,
  allowed_substitutions: [],
};

const MAIN_MEAL_TYPES = new Set(["almoco", "almoço", "jantar", "lunch", "dinner"]);

function cloneItem(item: PlannedItem): PlannedItem {
  return { ...item };
}

function cloneMeal(meal: PlannedMeal): PlannedMeal {
  return { ...meal, items: meal.items.map(cloneItem) };
}

function cloneDay(day: DayPlan, newDate: Date): DayPlan {
  return {
    date: new Date(newDate.getTime()),
    day_of_week: DAYS_PT[newDate.getDay()],
    meals: day.meals.map(cloneMeal),
    daily_totals: { ...day.daily_totals },
  };
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Replicates daily_template across 7 days starting at start_date.
 * Gram amounts are identical across days unless variation is later applied.
 */
export function generateWeeklyPlan(input: WeeklyInput): WeeklyPlan {
  if (!input.daily_template) {
    throw new Error("daily_template is required");
  }
  if (!(input.start_date instanceof Date) || isNaN(input.start_date.getTime())) {
    throw new Error("start_date must be a valid Date");
  }

  const days: DayPlan[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(input.start_date, i);
    days.push(cloneDay(input.daily_template, date));
  }

  let weekly: WeeklyPlan = {
    patient_id: input.patient_id ?? "",
    start_date: new Date(input.start_date.getTime()),
    end_date: addDays(input.start_date, 6),
    days,
    metadata: {
      total_calories_per_day: input.daily_template.daily_totals.calories,
      variation_enabled: !!input.options.enable_variation,
      generated_from_template: "daily_template",
    },
  };

  if (input.options.enable_variation) {
    weekly = applyVariation(
      weekly,
      input.options.variation_rules ?? DEFAULT_VARIATION_RULES,
    );
  }

  return weekly;
}

function rotateItem(
  item: PlannedItem,
  group: SubstitutionGroup,
  rotationIndex: number,
): PlannedItem {
  if (!group.alternatives.length) return item;
  const alt = group.alternatives[rotationIndex % group.alternatives.length];
  if (!alt || alt.nome === item.nome) return item;
  const factor = alt.equivalence_factor || 1;
  const grams = Math.round(item.gramas * factor);
  return {
    ...item,
    nome: alt.nome,
    gramas: grams,
    kcal: item.kcal != null ? Math.round(item.kcal * factor) : item.kcal,
    protein_g:
      item.protein_g != null
        ? Math.round(item.protein_g * factor * 10) / 10
        : item.protein_g,
    carbs_g:
      item.carbs_g != null
        ? Math.round(item.carbs_g * factor * 10) / 10
        : item.carbs_g,
    fat_g:
      item.fat_g != null
        ? Math.round(item.fat_g * factor * 10) / 10
        : item.fat_g,
  };
}

/**
 * Applies controlled variation to main meals across the week, rotating items
 * that belong to a substitution group while respecting repetition rules.
 */
export function applyVariation(
  weeklyPlan: WeeklyPlan,
  rules: VariationRules,
): WeeklyPlan {
  const groupsByKey = new Map<string, SubstitutionGroup>();
  for (const g of rules.allowed_substitutions || []) {
    groupsByKey.set(g.group, g);
  }
  if (groupsByKey.size === 0) return weeklyPlan;

  // Track usage per group: name -> count, and last day name was used per group.
  const usageByGroup = new Map<string, Map<string, number>>();
  const lastNameByGroup = new Map<string, { name: string; streak: number }>();

  for (let dayIdx = 0; dayIdx < weeklyPlan.days.length; dayIdx++) {
    const day = weeklyPlan.days[dayIdx];
    for (const meal of day.meals) {
      const isMain = MAIN_MEAL_TYPES.has(meal.type.toLowerCase());
      if (!isMain) continue;

      meal.items = meal.items.map((item) => {
        if (!item.group) return item;
        const group = groupsByKey.get(item.group);
        if (!group || !group.alternatives.length) return item;

        const usage =
          usageByGroup.get(item.group) ?? new Map<string, number>();
        const last = lastNameByGroup.get(item.group);

        // Try every rotation offset to find a valid candidate.
        let chosen = item;
        for (let offset = 0; offset < group.alternatives.length; offset++) {
          const candidate = rotateItem(item, group, dayIdx + offset);
          const used = usage.get(candidate.nome) ?? 0;
          const wouldStreak =
            last && last.name === candidate.nome ? last.streak + 1 : 1;

          if (
            used < rules.max_repeat_protein &&
            wouldStreak <= rules.max_consecutive_days
          ) {
            chosen = candidate;
            break;
          }
        }

        usage.set(chosen.nome, (usage.get(chosen.nome) ?? 0) + 1);
        usageByGroup.set(item.group, usage);
        if (last && last.name === chosen.nome) {
          lastNameByGroup.set(item.group, {
            name: chosen.nome,
            streak: last.streak + 1,
          });
        } else {
          lastNameByGroup.set(item.group, { name: chosen.nome, streak: 1 });
        }

        return chosen;
      });
    }
  }

  return weeklyPlan;
}

/**
 * Returns the plan for a specific date.
 * Fallback: if exact date is not in the plan, returns the closest day.
 * Never returns null when the plan has at least one day.
 */
export function getCurrentDayPlan(
  weeklyPlan: WeeklyPlan,
  date: Date,
): DayPlan | null {
  if (!weeklyPlan.days.length) return null;

  const target = new Date(date.getTime());
  target.setHours(0, 0, 0, 0);

  let closest = weeklyPlan.days[0];
  let closestDiff = Number.POSITIVE_INFINITY;

  for (const day of weeklyPlan.days) {
    const d = new Date(day.date.getTime());
    d.setHours(0, 0, 0, 0);
    const diff = Math.abs(d.getTime() - target.getTime());
    if (diff === 0) return day;
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = day;
    }
  }

  return closest;
}
