
-- =====================================================
-- TENANT HARDENING: Replace dangerous global fallback
-- with RAISE EXCEPTION on critical tables
-- =====================================================

-- 1. Harden auto_resolve_tenant_generic (covers: meal_plans, nutritionist_patients, patient_anamnesis, profiles)
CREATE OR REPLACE FUNCTION auto_resolve_tenant_generic()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _resolved_tenant uuid;
  _is_critical boolean;
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;

  -- Try common user columns based on table
  IF TG_TABLE_NAME = 'meal_plans' AND NEW.nutritionist_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.nutritionist_id);
  ELSIF TG_TABLE_NAME = 'meal_plan_simplification_audit' THEN
    NEW.tenant_id := (SELECT mp.tenant_id FROM meal_plans mp WHERE mp.id = NEW.meal_plan_id LIMIT 1);
  ELSIF TG_TABLE_NAME = 'patient_anamnesis' AND NEW.user_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.user_id);
  ELSIF TG_TABLE_NAME = 'nutritionist_patients' AND NEW.nutritionist_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.nutritionist_id);
  ELSIF TG_TABLE_NAME = 'profiles' AND NEW.user_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.user_id);
  END IF;

  -- Determine if table is critical
  _is_critical := TG_TABLE_NAME IN (
    'meal_plans', 'nutritionist_patients', 'patient_anamnesis'
  );

  -- For critical tables: RAISE EXCEPTION instead of silent fallback
  IF NEW.tenant_id IS NULL AND _is_critical THEN
    RAISE EXCEPTION 'TENANT_RESOLUTION_FAILED: Cannot resolve tenant_id for critical table "%" - no valid context found. Aborting insert to prevent data misattribution.', TG_TABLE_NAME;
  END IF;

  -- For non-critical tables: keep safe fallback (with logging intent)
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := (SELECT id FROM tenants WHERE is_active = true ORDER BY created_at ASC LIMIT 1);
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Harden chat_messages trigger (CRITICAL)
CREATE OR REPLACE FUNCTION auto_resolve_tenant_chat_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;

  IF NEW.sender_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.sender_id);
  END IF;
  IF NEW.tenant_id IS NULL AND NEW.receiver_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.receiver_id);
  END IF;

  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_RESOLUTION_FAILED: Cannot resolve tenant_id for chat_messages - neither sender (%) nor receiver (%) has a valid tenant.', NEW.sender_id, NEW.receiver_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Harden clinical_alerts trigger (CRITICAL)
CREATE OR REPLACE FUNCTION auto_resolve_tenant_clinical_alerts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;

  IF NEW.nutritionist_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.nutritionist_id);
  END IF;
  IF NEW.tenant_id IS NULL AND NEW.patient_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.patient_id);
  END IF;

  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_RESOLUTION_FAILED: Cannot resolve tenant_id for clinical_alerts - neither nutritionist (%) nor patient (%) has a valid tenant.', NEW.nutritionist_id, NEW.patient_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Harden checklist_tasks trigger (CRITICAL)
CREATE OR REPLACE FUNCTION auto_resolve_tenant_checklist_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;

  IF NEW.patient_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.patient_id);
  END IF;

  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_RESOLUTION_FAILED: Cannot resolve tenant_id for checklist_tasks - patient (%) has no valid tenant.', NEW.patient_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Keep notifications and audit_logs with safe fallback (NON-CRITICAL)
-- auto_resolve_tenant_notifications: unchanged (fallback acceptable)
-- auto_resolve_tenant_audit_logs: unchanged (fallback acceptable)
-- These are documented as acceptable because:
-- - notifications: informational, not clinical data
-- - audit_logs: operational logging, better to log with fallback than lose the record
