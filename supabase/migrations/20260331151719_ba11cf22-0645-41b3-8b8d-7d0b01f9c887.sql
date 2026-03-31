
-- FIX: Remove duplicate visual library trigger on meal_plan_items
DROP TRIGGER IF EXISTS trg_auto_visual_library ON meal_plan_items;

-- FIX: Harden profiles trigger
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.user_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.user_id);
  END IF;
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := (SELECT id FROM tenants WHERE is_active = true ORDER BY created_at ASC LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_tenant_profiles ON profiles;
CREATE TRIGGER trg_auto_tenant_profiles
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_tenant_profiles();

-- FIX: Harden audit_logs trigger
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_audit_logs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.user_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.user_id);
  END IF;
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_RESOLUTION_FAILED: Cannot resolve tenant_id for audit_logs - user (%) has no valid tenant.', NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- FIX: Harden notifications trigger
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.user_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.user_id);
  END IF;
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := (SELECT id FROM tenants WHERE is_active = true ORDER BY created_at ASC LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$;

-- FIX: behavioral_profile NULL tenant_id
UPDATE behavioral_profile
SET tenant_id = resolve_tenant_for_user(patient_id)
WHERE tenant_id IS NULL AND patient_id IS NOT NULL;

UPDATE behavioral_profile
SET tenant_id = (SELECT id FROM tenants WHERE is_active = true ORDER BY created_at ASC LIMIT 1)
WHERE tenant_id IS NULL;
