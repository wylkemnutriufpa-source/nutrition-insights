/**
 * Tenant Query Helpers — Phase 4 Multi-Tenant Migration
 * 
 * Utilities to add tenant_id filtering to existing queries
 * without breaking current behavior. tenant_id is applied as an
 * ADDITIONAL filter alongside existing ones (nutritionist_id, patient_id, etc.).
 * 
 * Usage:
 *   import { withTenantFilter, getTenantIdForInsert } from "@/lib/tenantQueryHelpers";
 *   
 *   // Reads: add .eq("tenant_id", tenantId) when available
 *   let query = supabase.from("profiles").select("*").eq("user_id", userId);
 *   query = withTenantFilter(query, tenantId);
 *   
 *   // Writes: merge tenant_id into insert payload
 *   const payload = { ...data, ...getTenantIdForInsert(tenantId) };
 */

/**
 * Adds .eq("tenant_id", tenantId) to a Supabase query builder
 * ONLY if tenantId is available. This ensures backward compatibility:
 * - If tenant is resolved → filters by tenant (additional isolation)
 * - If tenant is null (legacy/migration) → query runs without tenant filter
 */
export function withTenantFilter<T>(query: T, tenantId: string | null): T {
  if (!tenantId) return query;
  return (query as any).eq("tenant_id", tenantId) as T;
}

/**
 * Returns { tenant_id: tenantId } for insert/update payloads
 * when tenantId is available, or empty object when not.
 * Spread into your payload:
 *   const payload = { name, email, ...getTenantIdForInsert(tenantId) };
 */
export function getTenantIdForInsert(tenantId: string | null): { tenant_id?: string } {
  if (!tenantId) return {};
  return { tenant_id: tenantId };
}

/**
 * Registry of migrated queries for Phase 4 tracking.
 * Add entries as queries are migrated in each batch.
 */
export const MIGRATED_QUERIES: Record<string, { batch: number; date: string; tables: string[] }> = {
  // Batch 1 — Core
  "usePatientsList": { batch: 1, date: "2026-03-28", tables: ["nutritionist_patients", "profiles", "checklist_tasks"] },
  "useNutritionistDashboard": { batch: 1, date: "2026-03-28", tables: ["nutritionist_patients", "patient_appointments", "profiles"] },
  "usePatientDetail": { batch: 1, date: "2026-03-28", tables: ["profiles", "nutritionist_patients", "checklist_tasks", "meal_plans", "patient_protocols"] },
  "usePatientDashboard": { batch: 1, date: "2026-03-28", tables: ["patient_appointments"] },
  "Appointments": { batch: 1, date: "2026-03-28", tables: ["patient_appointments"] },
  "auth/fetchProfile": { batch: 1, date: "2026-03-28", tables: ["profiles"] },
};
