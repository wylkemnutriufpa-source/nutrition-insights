/**
 * ═══════════════════════════════════════════════════════
 * FITJOURNEY — Security Governance Framework
 * ═══════════════════════════════════════════════════════
 *
 * This file defines the structural security rules that
 * ALL new tables, views, RPCs, and features MUST follow.
 *
 * Any violation of these rules is a security incident.
 */

// ── ACCESS ROLES ──
export const SECURITY_ROLES = {
  ADMIN_MASTER: "admin",
  PROFESSIONAL_HEAD: "nutritionist",
  EMPLOYEE_CLINICAL: "employee_clinical",
  PATIENT: "patient",
  PUBLIC: "anon",
} as const;

// ── ACCESS LEVELS ──
export type AccessLevel = "full" | "scoped" | "delegated" | "own" | "none";

// ── OFFICIAL ACCESS MATRIX ──
// Defines what each role can access. Used as the source of truth
// for RLS policy design and audit validation.
export const ACCESS_MATRIX: Record<string, Record<string, AccessLevel>> = {
  clinical_data: {
    admin: "full",
    nutritionist: "scoped",      // only linked patients via nutritionist_patients
    employee_clinical: "delegated", // based on team_member_permissions
    patient: "own",
    anon: "none",
  },
  pipeline_internal: {
    admin: "full",
    nutritionist: "none",
    employee_clinical: "none",
    patient: "none",
    anon: "none",
  },
  financial_data: {
    admin: "full",
    nutritionist: "own",
    employee_clinical: "none",
    patient: "none",
    anon: "none",
  },
  platform_config: {
    admin: "full",
    nutritionist: "none",
    employee_clinical: "none",
    patient: "none",
    anon: "none",
  },
  patient_pii: {
    admin: "full",
    nutritionist: "scoped",
    employee_clinical: "delegated",
    patient: "own",
    anon: "none",
  },
  public_content: {
    admin: "full",
    nutritionist: "own",
    employee_clinical: "none",
    patient: "own",
    anon: "scoped", // only approved, sanitized content via views
  },
};

// ── SECURITY BASELINE RULES ──
// Every new table/view/RPC MUST pass ALL of these checks
export const SECURITY_BASELINE = [
  "RLS_ENABLED: ALTER TABLE ... ENABLE ROW LEVEL SECURITY",
  "SELECT_POLICY: Defined and scoped (never USING(true) without documented approval)",
  "INSERT_POLICY: Validates user_id = auth.uid() or admin role",
  "UPDATE_POLICY: Validates ownership or admin override",
  "DELETE_POLICY: Restrictive by default (prefer soft-delete)",
  "MULTI_TENANT: Access scoped via nutritionist_patients join",
  "SENSITIVE_COLUMNS: PII, tokens, hashes never in public SELECT",
  "NO_PERMISSIVE_TRUE: No USING(true) or WITH CHECK(true)",
  "PUBLIC_PAYLOAD: Sanitized via security_invoker views",
  "SECURITY_DEFINER: Audited, search_path set, admin-gated",
] as const;

// ── FAIL-CLOSED DEFAULTS ──
export const FAIL_CLOSED_RULES = [
  "NEW_TABLE: Born with RLS enabled + zero policies = blocked",
  "NEW_VIEW: Uses WITH (security_invoker=on) to inherit RLS",
  "NEW_ROLE: Starts with zero permissions — explicitly granted",
  "NEW_COLUMN: Public exposure requires documented approval",
  "NEW_FUNCTION: SECURITY DEFINER requires audit before deploy",
  "NEW_POLICY: USING(true) requires admin sign-off in audit_logs",
] as const;

// ── SENSITIVE COLUMN PATTERNS ──
// Columns matching these patterns should NEVER appear in public queries
export const SENSITIVE_COLUMN_PATTERNS = [
  /password/i,
  /hash/i,
  /token/i,
  /secret/i,
  /api_key/i,
  /private/i,
  /ssn/i,
  /cpf/i,
  /credit_card/i,
  /bank_account/i,
] as const;

// ── AUDIT SEVERITY LEVELS ──
export const SEVERITY = {
  CRITICAL: "critical",  // Data leak, no RLS, public exposure
  HIGH: "high",          // Permissive policy, cross-tenant access
  MEDIUM: "medium",      // Missing policy for specific operation
  LOW: "low",            // Informational, best practice
} as const;
