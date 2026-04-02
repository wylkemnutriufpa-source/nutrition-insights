
-- Guard: prevent advancing plan status when plan has 0 items
CREATE OR REPLACE FUNCTION public.fn_guard_plan_requires_items_on_advance()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  item_count integer;
BEGIN
  -- Only check when status is being advanced to a committed state
  IF NEW.plan_status IN ('approved', 'published', 'published_to_patient') 
     AND (OLD.plan_status IS DISTINCT FROM NEW.plan_status) THEN
    
    SELECT count(*) INTO item_count 
    FROM public.meal_plan_items 
    WHERE meal_plan_id = NEW.id;
    
    IF item_count = 0 THEN
      RAISE EXCEPTION 'Cannot advance plan % to status "%" with 0 items', NEW.id, NEW.plan_status;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_guard_plan_advance_requires_items ON public.meal_plans;

CREATE TRIGGER trg_guard_plan_advance_requires_items
  BEFORE UPDATE ON public.meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_plan_requires_items_on_advance();
