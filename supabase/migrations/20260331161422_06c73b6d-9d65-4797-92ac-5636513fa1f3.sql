
-- ═══════════════════════════════════════════════════════
-- MIGRATION: Final Stabilization — Audit Closure
-- ═══════════════════════════════════════════════════════

-- 1. FIX: Approved plan with is_active = false
UPDATE meal_plans
SET is_active = true
WHERE id = '4776f122-a343-420f-9ba8-5fbde5a97388'
  AND plan_status = 'approved'
  AND is_active = false;

-- 2. TRIGGER: Prevent approved/published plans from having is_active = false
CREATE OR REPLACE FUNCTION fn_guard_plan_status_consistency()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.plan_status IN ('approved', 'published_to_patient') AND NEW.is_active = false THEN
    RAISE EXCEPTION 'PLAN_STATUS_INCONSISTENCY: Plan with status "%" cannot have is_active = false', NEW.plan_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_plan_status_consistency ON meal_plans;
CREATE TRIGGER trg_guard_plan_status_consistency
  BEFORE INSERT OR UPDATE ON meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION fn_guard_plan_status_consistency();

-- 3. TRIGGER: Prevent publishing plans with zero items
CREATE OR REPLACE FUNCTION fn_guard_plan_publish_requires_items()
RETURNS TRIGGER AS $$
DECLARE
  item_count INTEGER;
BEGIN
  IF NEW.plan_status IN ('approved', 'published_to_patient')
     AND (OLD.plan_status IS NULL OR OLD.plan_status NOT IN ('approved', 'published_to_patient')) THEN
    SELECT COUNT(*) INTO item_count FROM meal_plan_items WHERE plan_id = NEW.id;
    IF item_count = 0 THEN
      RAISE EXCEPTION 'PLAN_PUBLISH_BLOCKED: Cannot publish/approve plan "%" with zero items', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_plan_publish_requires_items ON meal_plans;
CREATE TRIGGER trg_guard_plan_publish_requires_items
  BEFORE UPDATE ON meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION fn_guard_plan_publish_requires_items();

-- 4. TENANT SHIELDING: meal_plan_items
CREATE OR REPLACE FUNCTION fn_auto_tenant_meal_plan_items()
RETURNS TRIGGER AS $$
DECLARE
  resolved_tenant UUID;
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT tenant_id INTO resolved_tenant
  FROM meal_plans WHERE id = NEW.plan_id;

  IF resolved_tenant IS NULL THEN
    RAISE EXCEPTION 'TENANT_RESOLUTION_FAILED: Cannot resolve tenant for meal_plan_items via plan_id=%', NEW.plan_id;
  END IF;

  NEW.tenant_id := resolved_tenant;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_auto_tenant_meal_plan_items ON meal_plan_items;
CREATE TRIGGER trg_auto_tenant_meal_plan_items
  BEFORE INSERT ON meal_plan_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_tenant_meal_plan_items();

-- 5. TENANT SHIELDING: patient_checkins
CREATE OR REPLACE FUNCTION fn_auto_tenant_patient_checkins()
RETURNS TRIGGER AS $$
DECLARE
  resolved_tenant UUID;
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT np.tenant_id INTO resolved_tenant
  FROM nutritionist_patients np
  WHERE np.patient_id = NEW.patient_id
  LIMIT 1;

  IF resolved_tenant IS NULL THEN
    RAISE EXCEPTION 'TENANT_RESOLUTION_FAILED: Cannot resolve tenant for patient_checkins via patient_id=%', NEW.patient_id;
  END IF;

  NEW.tenant_id := resolved_tenant;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_auto_tenant_patient_checkins ON patient_checkins;
CREATE TRIGGER trg_auto_tenant_patient_checkins
  BEFORE INSERT ON patient_checkins
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_tenant_patient_checkins();

-- 6. TENANT SHIELDING: patient_clinical_state
CREATE OR REPLACE FUNCTION fn_auto_tenant_patient_clinical_state()
RETURNS TRIGGER AS $$
DECLARE
  resolved_tenant UUID;
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT np.tenant_id INTO resolved_tenant
  FROM nutritionist_patients np
  WHERE np.patient_id = NEW.patient_id
  LIMIT 1;

  IF resolved_tenant IS NULL THEN
    RAISE EXCEPTION 'TENANT_RESOLUTION_FAILED: Cannot resolve tenant for patient_clinical_state via patient_id=%', NEW.patient_id;
  END IF;

  NEW.tenant_id := resolved_tenant;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_auto_tenant_patient_clinical_state ON patient_clinical_state;
CREATE TRIGGER trg_auto_tenant_patient_clinical_state
  BEFORE INSERT ON patient_clinical_state
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_tenant_patient_clinical_state();
