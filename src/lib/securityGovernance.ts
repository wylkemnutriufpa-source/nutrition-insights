/**
 * ═══════════════════════════════════════════════════════
 * FITJOURNEY — Security Governance Framework v9.0.0
 * ═══════════════════════════════════════════════════════
 *
 * Baseline oficial de segurança — Hardened em 2026-04-09
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
  "ANON_INSERT_VALIDATION: Anonymous INSERTs must validate FK references exist (e.g. nutritionist_id in user_roles)",
  "VAULT_MANDATORY: External API tokens/secrets MUST use Supabase Vault — never plaintext columns",
  "TENANT_RESOLUTION: Use get_user_active_tenant() — never get_user_tenant() without is_active filter",
] as const;

// ── FAIL-CLOSED DEFAULTS ──
export const FAIL_CLOSED_RULES = [
  "NEW_TABLE: Born with RLS enabled + zero policies = blocked",
  "NEW_VIEW: Uses WITH (security_invoker=on) to inherit RLS",
  "NEW_ROLE: Starts with zero permissions — explicitly granted",
  "NEW_COLUMN: Public exposure requires documented approval",
  "NEW_FUNCTION: SECURITY DEFINER requires audit before deploy",
  "NEW_POLICY: USING(true) requires admin sign-off in audit_logs",
  "NEW_SECRET: External API keys go to Vault via store_*_token() — never in table columns",
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

// ═══════════════════════════════════════════════════════
// VAULT INTEGRATION — Official Secret Management
// ═══════════════════════════════════════════════════════
//
// All external API tokens MUST use Supabase Vault.
// Pattern: store_<service>_token() / get_<service>_token()
//
// VAULT-DEPENDENT EDGE FUNCTIONS:
// ┌─────────────────────────┬──────────────────────────────────┐
// │ Edge Function           │ Vault Function Used              │
// ├─────────────────────────┼──────────────────────────────────┤
// │ whatsapp-send           │ get_whatsapp_token()             │
// │ whatsapp-validate       │ store_whatsapp_token()           │
// └─────────────────────────┴──────────────────────────────────┘
//
// HOW IT WORKS:
// 1. Professional submits token → whatsapp-validate stores via store_whatsapp_token()
// 2. Token is encrypted at rest in vault.secrets
// 3. whatsapp-send retrieves via get_whatsapp_token() (SECURITY DEFINER, search_path=public)
// 4. whatsapp_integrations table stores ONLY metadata (instance_id, phone, status)
// 5. Token column was permanently dropped — no plaintext exposure possible
//
// ADDING NEW INTEGRATIONS:
// 1. Create store_<service>_token(_professional_id uuid, _token text) SECURITY DEFINER
// 2. Create get_<service>_token(_professional_id uuid) SECURITY DEFINER
// 3. Edge functions use supabase.rpc("get_<service>_token", {...}) with service role
// 4. NEVER store tokens in regular table columns

// ═══════════════════════════════════════════════════════
// TENANT RESOLUTION — Official Standard
// ═══════════════════════════════════════════════════════
//
// OFFICIAL FUNCTION: get_user_active_tenant(_user_id uuid)
// - Filters user_tenants by is_active = true
// - Returns first active tenant ordered by joined_at
// - Used by: create-booking-payment, and all new features
//
// DEPRECATED: get_user_tenant() — lacks is_active filter
// Do NOT use in new code. Existing usages should be migrated.

// ═══════════════════════════════════════════════════════
// SECURITY REGRESSION CHECKLIST
// ═══════════════════════════════════════════════════════
//
// Run before EVERY deployment or feature merge:
//
// □ 1. RLS COVERAGE
//   - All tables have RLS enabled
//   - No USING(true) or WITH CHECK(true) on INSERT/UPDATE/DELETE
//   - SELECT policies scoped to owner/nutritionist_patients/admin
//
// □ 2. ANONYMOUS INSERT VALIDATION
//   - booking_payments: nutritionist_id validated against user_roles
//   - lead_requests: nutritionist_id validated against user_roles
//   - Any new anon-insertable table: FK references validated in policy
//
// □ 3. VAULT COMPLIANCE
//   - No plaintext token/secret columns in any table
//   - External API keys stored via store_*_token() vault functions
//   - Edge functions retrieve via get_*_token() RPC
//
// □ 4. TENANT ISOLATION
//   - All tenant-scoped queries use get_user_active_tenant()
//   - BEFORE INSERT triggers enforce tenant_id on critical tables
//   - No cross-tenant data leakage in SELECT policies
//
// □ 5. EDGE FUNCTION AUTH
//   - All edge functions validate JWT via auth.getUser()
//   - Ownership verified (caller = nutritionist_id or admin)
//   - Error messages sanitized (no stack traces, no PII)
//
// □ 6. STORAGE SECURITY
//   - All mutation policies (INSERT/UPDATE/DELETE) check folder ownership
//   - No bucket-only checks without path validation
//
// □ 7. PLAN IMMUTABILITY
//   - trg_guard_published_plan_items_immutable active
//   - Published plans cannot be modified — only new drafts
//
// □ 8. INPUT VALIDATION
//   - AI prompts: length limits + XML framing
//   - User inputs: validated server-side with zod or equivalent
//   - No raw SQL or user-supplied queries
//
// □ 9. SENSITIVE DATA
//   - No PII in logs (emails masked, tokens redacted)
//   - Profiles table: no role column (roles in user_roles)
//   - Views use security_invoker = on
//
// □ 10. REALTIME
//   - RLS on source tables filters broadcast rows
//   - No sensitive data in public channels

// ═══════════════════════════════════════════════════════
// HARDENING CHANGELOG
// ═══════════════════════════════════════════════════════
//
// v9.0.0 (2026-04-09) — Hardening Final
//   ✅ booking_payments INSERT: nutritionist_id validated against user_roles
//   ✅ lead_requests INSERT: nutritionist_id validated against user_roles
//   ✅ WhatsApp tokens migrated to Supabase Vault (token column dropped)
//   ✅ get_user_active_tenant() created with is_active filter
//   ✅ create-booking-payment uses get_user_active_tenant()
//   ✅ whatsapp-send reads token from Vault
//   ✅ whatsapp-validate stores token in Vault
//
// v8.0.0 (2026-04-05) — RLS Blindagem Total
//   ✅ patient_meal_feedback, timeline_events, plan_audit_results scoped
//   ✅ Storage buckets hardened with folder ownership
//   ✅ checklist_daily_summary scoped to owner/nutritionist
//   ✅ clinical_experiment_outcomes scoped to linked nutritionist
//
// v7.0.0 — Edge Function Auth Standardization
//   ✅ All edge functions use auth-guard.ts pattern
//   ✅ generate-report: JWT + ownership validation added
//   ✅ Error messages sanitized across all functions
