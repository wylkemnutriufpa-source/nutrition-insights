
CREATE OR REPLACE FUNCTION public.fn_guard_plan_publish_requires_items()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  item_count INTEGER;
BEGIN
  IF NEW.plan_status IN ('approved', 'published_to_patient')
     AND (OLD.plan_status IS NULL OR OLD.plan_status NOT IN ('approved', 'published_to_patient')) THEN
    SELECT COUNT(*) INTO item_count FROM meal_plan_items WHERE meal_plan_id = NEW.id;
    IF item_count = 0 THEN
      RAISE EXCEPTION 'PLAN_PUBLISH_BLOCKED: Cannot publish/approve plan "%" with zero items', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
