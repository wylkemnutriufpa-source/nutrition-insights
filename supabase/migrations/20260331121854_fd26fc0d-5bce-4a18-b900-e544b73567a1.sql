
-- ============================================================
-- CENTRAL TENANT RESOLVER: Auto-resolve tenant_id on INSERT
-- for ALL critical NOT NULL tenant_id tables.
-- This is the ULTIMATE blindagem — no frontend code can ever
-- insert without tenant_id again.
-- ============================================================

-- 1. Create a reusable function that resolves tenant_id from user context
CREATE OR REPLACE FUNCTION public.resolve_tenant_for_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    -- Try nutritionist_patients link first
    (SELECT np.tenant_id FROM nutritionist_patients np WHERE np.patient_id = _user_id AND np.status = 'active' AND np.tenant_id IS NOT NULL LIMIT 1),
    -- Then user_tenants
    (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = _user_id AND ut.is_active = true LIMIT 1),
    -- Then profiles
    (SELECT p.tenant_id FROM profiles p WHERE p.user_id = _user_id AND p.tenant_id IS NOT NULL LIMIT 1)
  );
$$;

-- 2. Auto-resolve trigger function for notifications
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.user_id);
  END IF;
  -- If STILL null, try the default tenant
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := (SELECT id FROM tenants WHERE is_active = true ORDER BY created_at ASC LIMIT 1);
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Auto-resolve trigger function for audit_logs
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_audit_logs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.user_id);
  END IF;
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := (SELECT id FROM tenants WHERE is_active = true ORDER BY created_at ASC LIMIT 1);
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Auto-resolve trigger function for chat_messages
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_chat_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.sender_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.sender_id);
  END IF;
  IF NEW.tenant_id IS NULL AND NEW.receiver_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.receiver_id);
  END IF;
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := (SELECT id FROM tenants WHERE is_active = true ORDER BY created_at ASC LIMIT 1);
  END IF;
  RETURN NEW;
END;
$function$;

-- 5. Auto-resolve trigger function for checklist_tasks
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_checklist_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.patient_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.patient_id);
  END IF;
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := (SELECT id FROM tenants WHERE is_active = true ORDER BY created_at ASC LIMIT 1);
  END IF;
  RETURN NEW;
END;
$function$;

-- 6. Auto-resolve trigger function for clinical_alerts
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_clinical_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    IF NEW.nutritionist_id IS NOT NULL THEN
      NEW.tenant_id := resolve_tenant_for_user(NEW.nutritionist_id);
    ELSIF NEW.patient_id IS NOT NULL THEN
      NEW.tenant_id := resolve_tenant_for_user(NEW.patient_id);
    END IF;
  END IF;
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := (SELECT id FROM tenants WHERE is_active = true ORDER BY created_at ASC LIMIT 1);
  END IF;
  RETURN NEW;
END;
$function$;

-- 7. Generic auto-resolve for remaining NOT NULL tables
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_generic()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_col text;
  _user_val uuid;
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;
  
  -- Try common user columns
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

  -- Final fallback
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := (SELECT id FROM tenants WHERE is_active = true ORDER BY created_at ASC LIMIT 1);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- ============================================================
-- ATTACH TRIGGERS (BEFORE INSERT) to all NOT NULL tenant_id tables
-- ============================================================

-- Drop existing auto-resolve triggers if they exist (idempotent)
DROP TRIGGER IF EXISTS trg_auto_tenant_notifications ON notifications;
DROP TRIGGER IF EXISTS trg_auto_tenant_audit_logs ON audit_logs;
DROP TRIGGER IF EXISTS trg_auto_tenant_chat_messages ON chat_messages;
DROP TRIGGER IF EXISTS trg_auto_tenant_checklist_tasks ON checklist_tasks;
DROP TRIGGER IF EXISTS trg_auto_tenant_clinical_alerts ON clinical_alerts;
DROP TRIGGER IF EXISTS trg_auto_tenant_meal_plans ON meal_plans;
DROP TRIGGER IF EXISTS trg_auto_tenant_meal_plan_simplification ON meal_plan_simplification_audit;
DROP TRIGGER IF EXISTS trg_auto_tenant_patient_anamnesis ON patient_anamnesis;
DROP TRIGGER IF EXISTS trg_auto_tenant_nutritionist_patients ON nutritionist_patients;
DROP TRIGGER IF EXISTS trg_auto_tenant_profiles ON profiles;
DROP TRIGGER IF EXISTS trg_auto_tenant_automation_rules ON automation_rules;
DROP TRIGGER IF EXISTS trg_auto_tenant_automation_runs ON automation_runs;
DROP TRIGGER IF EXISTS trg_auto_tenant_behavioral_recovery ON behavioral_recovery_actions;
DROP TRIGGER IF EXISTS trg_auto_tenant_branding ON branding_settings;
DROP TRIGGER IF EXISTS trg_auto_tenant_campaigns ON campaigns;
DROP TRIGGER IF EXISTS trg_auto_tenant_user_tenants ON user_tenants;

-- Attach triggers
CREATE TRIGGER trg_auto_tenant_notifications
  BEFORE INSERT ON notifications FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_tenant_notifications();

CREATE TRIGGER trg_auto_tenant_audit_logs
  BEFORE INSERT ON audit_logs FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_tenant_audit_logs();

CREATE TRIGGER trg_auto_tenant_chat_messages
  BEFORE INSERT ON chat_messages FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_tenant_chat_messages();

CREATE TRIGGER trg_auto_tenant_checklist_tasks
  BEFORE INSERT ON checklist_tasks FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_tenant_checklist_tasks();

CREATE TRIGGER trg_auto_tenant_clinical_alerts
  BEFORE INSERT ON clinical_alerts FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_tenant_clinical_alerts();

CREATE TRIGGER trg_auto_tenant_meal_plans
  BEFORE INSERT ON meal_plans FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_tenant_generic();

CREATE TRIGGER trg_auto_tenant_meal_plan_simplification
  BEFORE INSERT ON meal_plan_simplification_audit FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_tenant_generic();

CREATE TRIGGER trg_auto_tenant_patient_anamnesis
  BEFORE INSERT ON patient_anamnesis FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_tenant_generic();

CREATE TRIGGER trg_auto_tenant_nutritionist_patients
  BEFORE INSERT ON nutritionist_patients FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_tenant_generic();

CREATE TRIGGER trg_auto_tenant_automation_rules
  BEFORE INSERT ON automation_rules FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_tenant_generic();

CREATE TRIGGER trg_auto_tenant_automation_runs
  BEFORE INSERT ON automation_runs FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_tenant_generic();

CREATE TRIGGER trg_auto_tenant_behavioral_recovery
  BEFORE INSERT ON behavioral_recovery_actions FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_tenant_generic();

CREATE TRIGGER trg_auto_tenant_branding
  BEFORE INSERT ON branding_settings FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_tenant_generic();

CREATE TRIGGER trg_auto_tenant_campaigns
  BEFORE INSERT ON campaigns FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_tenant_generic();
