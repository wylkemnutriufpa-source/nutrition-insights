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
  // 🛡️ SOBERANIA: Invalidação Direcionada (Anti-Storm)
  // Nunca use invalidateQueries sem chaves específicas se puder evitar.
  
  if (patientId) {
    // Invalida apenas o que é estritamente necessário para este paciente
    queryClient.invalidateQueries({ queryKey: ["lifecycle", patientId] });
    queryClient.invalidateQueries({ queryKey: ["patient-detail", patientId] });
    queryClient.invalidateQueries({ queryKey: ["meal-plans", patientId] });
    queryClient.invalidateQueries({ queryKey: ["meal-completions", patientId] });
  } else {
    // Se não há ID, invalida apenas o essencial do dashboard
    queryClient.invalidateQueries({ queryKey: ["patients"], exact: false });
    queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
  }
  
  // Notificações são leves e globais
  queryClient.invalidateQueries({ queryKey: ["notifications"] });
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
