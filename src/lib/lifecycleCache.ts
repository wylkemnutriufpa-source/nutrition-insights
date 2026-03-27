/**
 * FitJourney — Lifecycle Cache Helpers
 * 
 * Centralized optimistic UI mutations for patient lifecycle transitions.
 * ALL lifecycle actions MUST use these helpers for instant UI response.
 */

import { QueryClient } from "@tanstack/react-query";

/**
 * Optimistically update a patient's journey_status in ALL cached queries.
 * Returns the previous status for rollback.
 */
export function updatePatientJourneyInCache(
  queryClient: QueryClient,
  patientId: string,
  newJourneyStatus: string
): void {
  // Update ["patients", ...] queries (list views)
  queryClient.setQueriesData<any>({ queryKey: ["patients"] }, (oldData: any) => {
    if (!oldData) return oldData;
    if (oldData?.patients && Array.isArray(oldData.patients)) {
      return {
        ...oldData,
        patients: oldData.patients.map((p: any) =>
          p.patient_id === patientId ? { ...p, journey_status: newJourneyStatus } : p
        ),
      };
    }
    if (Array.isArray(oldData)) {
      return oldData.map((p: any) =>
        p.patient_id === patientId ? { ...p, journey_status: newJourneyStatus } : p
      );
    }
    return oldData;
  });

  // Update patient detail query
  queryClient.setQueriesData<any>(
    { queryKey: ["patient-detail"] },
    (oldData: any) => {
      if (!oldData) return oldData;
      if (oldData.patient_id === patientId || oldData.id === patientId) {
        return { ...oldData, journey_status: newJourneyStatus };
      }
      return oldData;
    }
  );
}

/**
 * Force-invalidate ALL lifecycle-related queries.
 * Use after successful server confirmation.
 */
export function invalidateLifecycleQueries(
  queryClient: QueryClient,
  patientId?: string
): void {
  queryClient.invalidateQueries({ queryKey: ["patients"], refetchType: "all" });
  queryClient.invalidateQueries({ queryKey: ["dashboard"], refetchType: "all" });
  queryClient.invalidateQueries({ queryKey: ["payment-guard"], refetchType: "all" });
  
  if (patientId) {
    queryClient.invalidateQueries({ queryKey: ["lifecycle", patientId], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["patient-detail", patientId], refetchType: "all" });
  }
}
