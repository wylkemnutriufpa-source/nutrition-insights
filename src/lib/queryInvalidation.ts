/**
 * FitJourney — Centralized Query Invalidation
 * 
 * Single source of truth for invalidating critical queries.
 * ALL lifecycle/clinical actions MUST use these helpers.
 */
import { QueryClient } from "@tanstack/react-query";

/**
 * Invalidate ALL critical patient-facing queries.
 * Use after: payment confirmation, onboarding release, plan publish, permission change.
 */
export function invalidateCriticalQueries(
  queryClient: QueryClient,
  patientId?: string
): void {
  // Always invalidate broad keys
  queryClient.invalidateQueries({ queryKey: ["patients"], refetchType: "all" });
  queryClient.invalidateQueries({ queryKey: ["dashboard"], refetchType: "all" });
  queryClient.invalidateQueries({ queryKey: ["payment-guard"], refetchType: "all" });
  queryClient.invalidateQueries({ queryKey: ["notifications"], refetchType: "all" });
  queryClient.invalidateQueries({ queryKey: ["meal-plans"], refetchType: "all" });
  queryClient.invalidateQueries({ queryKey: ["engagement"], refetchType: "all" });

  if (patientId) {
    queryClient.invalidateQueries({ queryKey: ["lifecycle", patientId], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["patient-detail", patientId], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["checklist", patientId], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["meal-completions", patientId], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["protocols", patientId], refetchType: "all" });
  }
}

/**
 * Invalidate nutritionist dashboard queries.
 */
export function invalidateNutritionistQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ["patients"], refetchType: "all" });
  queryClient.invalidateQueries({ queryKey: ["dashboard"], refetchType: "all" });
  queryClient.invalidateQueries({ queryKey: ["protocols"], refetchType: "all" });
  queryClient.invalidateQueries({ queryKey: ["meal-plans"], refetchType: "all" });
  queryClient.invalidateQueries({ queryKey: ["notifications"], refetchType: "all" });
}
