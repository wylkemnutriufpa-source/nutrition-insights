
-- Create dedicated trigger function for nutritionist_patients
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_nutritionist_patients()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;

  IF NEW.nutritionist_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.nutritionist_id);
  END IF;

  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_RESOLUTION_FAILED: Cannot resolve tenant_id for nutritionist_patients - nutritionist (%) has no valid tenant.', NEW.nutritionist_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create dedicated trigger function for patient_anamnesis
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_patient_anamnesis()
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
    RAISE EXCEPTION 'TENANT_RESOLUTION_FAILED: Cannot resolve tenant_id for patient_anamnesis - user (%) has no valid tenant.', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create dedicated trigger function for meal_plans
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_meal_plans()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;

  IF NEW.nutritionist_id IS NOT NULL THEN
    NEW.tenant_id := resolve_tenant_for_user(NEW.nutritionist_id);
  END IF;

  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_RESOLUTION_FAILED: Cannot resolve tenant_id for meal_plans - nutritionist (%) has no valid tenant.', NEW.nutritionist_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Replace triggers with dedicated functions
DROP TRIGGER IF EXISTS trg_auto_tenant_nutritionist_patients ON nutritionist_patients;
CREATE TRIGGER trg_auto_tenant_nutritionist_patients
  BEFORE INSERT ON nutritionist_patients
  FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_tenant_nutritionist_patients();

DROP TRIGGER IF EXISTS trg_auto_tenant_patient_anamnesis ON patient_anamnesis;
CREATE TRIGGER trg_auto_tenant_patient_anamnesis
  BEFORE INSERT ON patient_anamnesis
  FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_tenant_patient_anamnesis();

DROP TRIGGER IF EXISTS trg_auto_tenant_meal_plans ON meal_plans;
CREATE TRIGGER trg_auto_tenant_meal_plans
  BEFORE INSERT ON meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_tenant_meal_plans();

-- Also fix auto_resolve_tenant_generic to only handle non-critical tables safely
-- Remove the critical table branches that cause cross-table column reference errors
CREATE OR REPLACE FUNCTION public.auto_resolve_tenant_generic()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;

  -- For non-critical tables: safe fallback to first active tenant
  NEW.tenant_id := (SELECT id FROM tenants WHERE is_active = true ORDER BY created_at ASC LIMIT 1);

  RETURN NEW;
END;
$$;
