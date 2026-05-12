/**
 * Tenant Query Helpers — Phase 4 Multi-Tenant Migration
 * 
 * Utilities to add tenant_id filtering to existing queries
 * without breaking current behavior. tenant_id is applied as an
 * ADDITIONAL filter alongside existing ones (nutritionist_id, patient_id, etc.).
 * 
 * Usage:
 *   import { withTenantFilter, getTenantIdForInsert } from "@v1/lib/tenantQueryHelpers";
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
 * Returns { tenant_id: tenantId } for insert/update payloads.
 * Now that tenant_id is NOT NULL on critical tables, this helper
 * returns a strongly-typed required field when tenantId is present,
 * or an empty object during legacy/migration fallback.
 *
 * Overloaded signatures ensure callers with a known string get
 * `{ tenant_id: string }` (no optional), eliminating `as any` casts.
 */
export function getTenantIdForInsert(tenantId: string): { tenant_id: string };
export function getTenantIdForInsert(tenantId: null): Record<string, never>;
export function getTenantIdForInsert(tenantId: string | null): { tenant_id: string } | Record<string, never>;
export function getTenantIdForInsert(tenantId: string | null): { tenant_id: string } | Record<string, never> {
  if (!tenantId) return {};
  return { tenant_id: tenantId };
}

/**
 * Requires a non-null tenant_id. Throws if tenantId is missing.
 * Use in critical write paths where tenant isolation is mandatory.
 */
export function requireTenantId(tenantId: string | null): string {
  if (!tenantId) throw new Error("tenant_id is required for this operation");
  return tenantId;
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
  // Batch 2 — Meal Plans, Anamnesis, Checklist
  "MealPlans": { batch: 2, date: "2026-03-28", tables: ["meal_plans", "nutritionist_patients"] },
  "useChecklistTasks": { batch: 2, date: "2026-03-28", tables: ["checklist_tasks"] },
  "MealPlanEditorV2Entry": { batch: 2, date: "2026-03-28", tables: ["meal_plans"] },
  "ShoppingList": { batch: 2, date: "2026-03-28", tables: ["meal_plans"] },
  "NextMealWidget": { batch: 2, date: "2026-03-28", tables: ["meal_plans"] },
  "SystemUsageCard": { batch: 2, date: "2026-03-28", tables: ["meal_plans", "automation_rules"] },
  "DietTemplates": { batch: 2, date: "2026-03-28", tables: ["patient_anamnesis"] },
  "ClinicalDecisionSupport": { batch: 2, date: "2026-03-28", tables: ["patient_anamnesis", "checklist_tasks"] },
  "ClinicalIntelligence": { batch: 2, date: "2026-03-28", tables: ["patient_anamnesis", "checklist_tasks"] },
  "assistedPlanGenerator": { batch: 2, date: "2026-03-28", tables: ["patient_anamnesis"] },
  // Batch 3 — Clinical Intelligence & Automation
  "WorkspaceAlerts": { batch: 3, date: "2026-03-28", tables: ["clinical_alerts"] },
  "ClinicalAlertsPanel": { batch: 3, date: "2026-03-28", tables: ["clinical_alerts"] },
  "ClinicalRiskDashboardContent": { batch: 3, date: "2026-03-28", tables: ["clinical_alerts", "checklist_tasks", "meal_plans"] },
  "ClinicalOrchestration": { batch: 3, date: "2026-03-28", tables: ["clinical_action_recommendations"] },
  "AutomationTransparencyPanel": { batch: 3, date: "2026-03-28", tables: ["automation_runs"] },
  "AICommandFeed": { batch: 3, date: "2026-03-28", tables: ["clinical_alerts", "automation_runs", "behavioral_recovery_actions"] },
  "GlobalClinicalStatusBar": { batch: 3, date: "2026-03-28", tables: ["clinical_alerts", "automation_runs"] },
  "ClinicalFocusQueue": { batch: 3, date: "2026-03-28", tables: ["clinical_action_recommendations"] },
  "ClinicalAIEntity": { batch: 3, date: "2026-03-28", tables: ["clinical_alerts", "automation_runs"] },
  "useSmartResume": { batch: 3, date: "2026-03-28", tables: ["clinical_alerts"] },
  "IntelligenceModal": { batch: 3, date: "2026-03-28", tables: ["clinical_alerts"] },
  "IFJNarrativeReport": { batch: 3, date: "2026-03-28", tables: ["clinical_alerts", "patient_anamnesis", "meal_plans"] },
  "BehavioralDropoutPanel": { batch: 3, date: "2026-03-28", tables: ["behavioral_recovery_actions"] },
  // Batch 4 — Billing, Payments, Campaigns, Secondary Modules
  "AdminAffiliates": { batch: 4, date: "2026-03-28", tables: ["affiliates", "affiliate_commissions", "affiliate_risk_flags", "affiliate_referrals", "affiliate_payouts", "affiliate_metrics_cache"] },
  "AmbassadorDashboard": { batch: 4, date: "2026-03-28", tables: ["affiliates", "affiliate_referrals", "affiliate_commissions", "affiliate_metrics_cache"] },
  "CampaignCenter": { batch: 4, date: "2026-03-28", tables: ["campaigns"] },
  "Branding": { batch: 4, date: "2026-03-28", tables: ["branding_settings"] },
  "AdminResourceCenter/BrandingTab": { batch: 4, date: "2026-03-28", tables: ["branding_settings"] },
  "BodyAnalysis": { batch: 4, date: "2026-03-28", tables: ["body_analyses"] },
  "WorkoutEditor": { batch: 4, date: "2026-03-28", tables: ["workout_plans"] },
  "CardioPrescription": { batch: 4, date: "2026-03-28", tables: ["cardio_prescriptions"] },
  "PersonalDashboardStats": { batch: 4, date: "2026-03-28", tables: ["workout_plans"] },
  "PersonalWorkouts": { batch: 4, date: "2026-03-28", tables: ["workout_plans"] },
};
