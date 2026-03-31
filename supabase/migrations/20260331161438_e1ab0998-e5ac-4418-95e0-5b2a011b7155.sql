
CREATE OR REPLACE FUNCTION fn_guard_plan_status_consistency()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.plan_status IN ('approved', 'published_to_patient') AND NEW.is_active = false THEN
    RAISE EXCEPTION 'PLAN_STATUS_INCONSISTENCY: Plan with status "%" cannot have is_active = false', NEW.plan_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

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
$$ LANGUAGE plpgsql SET search_path = public;
