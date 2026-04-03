CREATE OR REPLACE FUNCTION auto_resolve_tenant_patient_protocols()
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
    RAISE EXCEPTION 'TENANT_RESOLUTION_FAILED: Cannot resolve tenant for patient_protocols';
  END IF;
  RETURN NEW;
END;
$$;