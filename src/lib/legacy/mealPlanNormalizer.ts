// Sovereign passthrough — snapshot V3 is immutable; no runtime normalization.
export function normalizeMealPlan<T>(plan: T): T {
  return plan;
}
