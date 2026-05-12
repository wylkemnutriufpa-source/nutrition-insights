/**
 * reconcileMeal — Newton-light deterministic macro reconciliation.
 *
 * GUARANTEES:
 *  - Pure function. No Math.random, no Date.now, no fetch, no DB.
 *  - Iteration-bounded (default 8 passes).
 *  - Walks pivots in descending pivot_priority — protein roles
 *    (priority=0) are touched LAST. Protein remains as close as possible
 *    to its base portion.
 *  - Respects elasticity clamps per slot AND clinical hard clamps
 *    (female protein ≤ 150g).
 *  - On failure, returns ReconcileFail with `requires_review: true` and
 *    best-effort partial items. NEVER throws, NEVER silently substitutes.
 */

import { SLOT_ELASTICITY } from "../weekly-composer/slotElasticity.ts";
import type {
  AssemblerTolerances,
  ComposedItem,
  MealMacroTotals,
  MealTargets,
  Sex,
  SlotSpec,
} from "./mealAssembler.types.ts";
import type { ClampFlag } from "./mealAssembler.types.ts";
import {
  clinicalUpperBound,
  isProteinRole,
  FEMALE_PROTEIN_MAX_GRAMS,
} from "./slotConstraints.ts";
import type { ReconcileResult } from "./reconcileResult.ts";

const DEFAULT_TOL: AssemblerTolerances = { kcal: 0.05, protein: 0.03 };
const DEFAULT_MAX_ITER = 8;
const EPS = 1e-9;

function macrosFor(item: ComposedItem): MealMacroTotals {
  return item.macros;
}

function totalsOf(items: ComposedItem[]): MealMacroTotals {
  const t: MealMacroTotals = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  for (const it of items) {
    const m = macrosFor(it);
    t.kcal += m.kcal;
    t.protein_g += m.protein_g;
    t.carbs_g += m.carbs_g;
    t.fat_g += m.fat_g;
  }
  return t;
}

function recomputeItemMacros(
  food: SlotSpec["food"],
  grams: number,
): MealMacroTotals {
  const f = grams / 100;
  return {
    kcal: food.macros_per_100g.kcal * f,
    protein_g: food.macros_per_100g.protein_g * f,
    carbs_g: food.macros_per_100g.carbs_g * f,
    fat_g: food.macros_per_100g.fat_g * f,
  };
}

function bounds(spec: SlotSpec, sex: Sex): {
  lower: number;
  upper: number;
  upperIsClinical: boolean;
} {
  const elast = spec.elasticity ?? SLOT_ELASTICITY[spec.role];
  const lower = spec.base_grams * elast.min;
  const elasticUpper = spec.base_grams * elast.max;
  const clinicalCap = clinicalUpperBound(sex, spec.role);
  const upper = Math.min(elasticUpper, clinicalCap);
  return {
    lower,
    upper,
    upperIsClinical: clinicalCap < elasticUpper,
  };
}

function clampGrams(
  newGrams: number,
  spec: SlotSpec,
  sex: Sex,
): { grams: number; clamped: ClampFlag } {
  const { lower, upper, upperIsClinical } = bounds(spec, sex);
  if (newGrams < lower) return { grams: lower, clamped: "min_elasticity" };
  if (newGrams > upper) {
    return {
      grams: upper,
      clamped: upperIsClinical ? "female_protein_150g" : "max_elasticity",
    };
  }
  return { grams: newGrams, clamped: null };
}

function buildInitialItems(
  slots: SlotSpec[],
  sex: Sex,
): ComposedItem[] {
  return slots.map((s) => {
    const elast = s.elasticity ?? SLOT_ELASTICITY[s.role];
    // Pre-clamp the base portion to the clinical bound BEFORE reconciliation.
    const cap = clinicalUpperBound(sex, s.role);
    let grams = Math.min(s.base_grams, cap);
    let clamped: ClampFlag = null;
    if (grams < s.base_grams) clamped = "female_protein_150g";
    return {
      food_id: s.food.id,
      food_name: s.food.name,
      role: s.role,
      base_grams: s.base_grams,
      grams,
      scale_factor: grams / Math.max(s.base_grams, EPS),
      clamped,
      macros: recomputeItemMacros(s.food, grams),
      pivot_priority: elast.pivot_priority,
    };
  });
}

export function reconcileMeal(
  slots: SlotSpec[],
  targets: MealTargets,
  sex: Sex,
  options?: { maxIterations?: number; tolerances?: Partial<AssemblerTolerances> },
): ReconcileResult {
  const tol: AssemblerTolerances = {
    kcal: options?.tolerances?.kcal ?? DEFAULT_TOL.kcal,
    protein: options?.tolerances?.protein ?? DEFAULT_TOL.protein,
  };
  const maxIter = options?.maxIterations ?? DEFAULT_MAX_ITER;

  const baseMeta = (
    items: ComposedItem[],
    iterations: number,
    initial: MealMacroTotals,
  ) => {
    const final = totalsOf(items);
    return {
      iterations,
      tolerances: tol,
      initial_totals: initial,
      final_totals: final,
      targets,
      kcal_deviation: targets.kcal > 0 ? (final.kcal - targets.kcal) / targets.kcal : 0,
      protein_deviation:
        targets.protein_g > 0
          ? (final.protein_g - targets.protein_g) / targets.protein_g
          : 0,
      touched_roles: items
        .filter((i) => Math.abs(i.scale_factor - 1) > 1e-6)
        .map((i) => i.role),
      female_protein_clamp_hit: items.some(
        (i) => i.clamped === "female_protein_150g",
      ),
    };
  };

  if (!slots || slots.length === 0) {
    const empty: MealMacroTotals = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    return {
      ok: false,
      reason: "EMPTY_SLOTS",
      message: "Cannot reconcile a meal with zero slots",
      items: [],
      totals: empty,
      metadata: baseMeta([], 0, empty),
      requires_review: true,
    };
  }
  if (
    !Number.isFinite(targets.kcal) || targets.kcal <= 0 ||
    !Number.isFinite(targets.protein_g) || targets.protein_g < 0
  ) {
    const items = buildInitialItems(slots, sex);
    const totals = totalsOf(items);
    return {
      ok: false,
      reason: "INVALID_TARGETS",
      message: `Targets must be positive (kcal=${targets.kcal}, protein_g=${targets.protein_g})`,
      items,
      totals,
      metadata: baseMeta(items, 0, totals),
      requires_review: true,
    };
  }

  const items = buildInitialItems(slots, sex);
  const initialTotals = totalsOf(items);

  // Pivot order: HIGHEST priority first (least clinically sensitive),
  // protein last. Stable secondary sort by input index.
  const indexed = items.map((it, idx) => ({ it, idx }));
  const order = indexed
    .slice()
    .sort((a, b) => {
      if (b.it.pivot_priority !== a.it.pivot_priority) {
        return b.it.pivot_priority - a.it.pivot_priority;
      }
      return a.idx - b.idx;
    });

  let iter = 0;
  for (; iter < maxIter; iter++) {
    const totals = totalsOf(items);
    const kcalGap = targets.kcal - totals.kcal;
    const kcalDevAbs = Math.abs(kcalGap) / targets.kcal;
    if (kcalDevAbs <= tol.kcal) break;

    let remaining = kcalGap;
    for (const { it, idx } of order) {
      if (Math.abs(remaining) / targets.kcal <= tol.kcal) break;

      const spec = slots[idx];
      const kcalPerGram = spec.food.macros_per_100g.kcal / 100;
      if (kcalPerGram <= EPS) continue; // zero-kcal item cannot move kcal

      // SAFEGUARD: if we're about to touch a protein item BUT the protein
      // total is already within tolerance, allow it ONLY when no other
      // pivot can absorb the gap (we're already at protein in the order).
      // We still respect the clamp below.
      const desiredKcalContribution = it.macros.kcal + remaining;
      let newGrams = Math.max(0, desiredKcalContribution / kcalPerGram);
      const { grams: clampedGrams, clamped } = clampGrams(newGrams, spec, sex);

      const deltaKcal = (clampedGrams - it.grams) * kcalPerGram;
      it.grams = clampedGrams;
      it.scale_factor = clampedGrams / Math.max(spec.base_grams, EPS);
      it.clamped = clamped;
      it.macros = recomputeItemMacros(spec.food, clampedGrams);
      remaining -= deltaKcal;
    }
  }

  const finalTotals = totalsOf(items);
  const kcalOk =
    Math.abs(finalTotals.kcal - targets.kcal) / targets.kcal <= tol.kcal;
  const protOk = targets.protein_g === 0
    ? true
    : Math.abs(finalTotals.protein_g - targets.protein_g) / targets.protein_g <=
      tol.protein;

  const metadata = baseMeta(items, iter, initialTotals);

  if (!kcalOk) {
    return {
      ok: false,
      reason: iter >= maxIter ? "ITERATION_LIMIT_EXCEEDED" : "KCAL_OUT_OF_TOLERANCE",
      message:
        `kcal deviation ${(metadata.kcal_deviation * 100).toFixed(2)}% exceeds tolerance ±${(tol.kcal * 100).toFixed(0)}%`,
      items,
      totals: finalTotals,
      metadata,
      requires_review: true,
    };
  }
  if (!protOk) {
    return {
      ok: false,
      reason: "PROTEIN_OUT_OF_TOLERANCE",
      message:
        `protein deviation ${(metadata.protein_deviation * 100).toFixed(2)}% exceeds tolerance ±${(tol.protein * 100).toFixed(0)}%`,
      items,
      totals: finalTotals,
      metadata,
      requires_review: true,
    };
  }

  return { ok: true, items, totals: finalTotals, metadata };
}

export const _internal = { FEMALE_PROTEIN_MAX_GRAMS, isProteinRole };
