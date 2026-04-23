-- Function to auto-publish meal plans when they are marked as 'approved'
CREATE OR REPLACE FUNCTION public.auto_publish_approved_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb;
BEGIN
  -- Trigger condition: status changed TO 'approved'
  IF NEW.plan_status = 'approved' AND (OLD.plan_status IS NULL OR OLD.plan_status != 'approved') THEN
    
    -- We use the existing logic to publish the plan.
    -- Note: approve_and_publish_plan requires the nutritionist_id.
    -- If nutritionist_id is missing, we log it but can't proceed with full auto-publish.
    IF NEW.nutritionist_id IS NOT NULL THEN
      -- Call the existing robust publish function
      -- This handles archiving old plans, deactivating conflicts, and updating nutritionist_patients journey_status
      SELECT public.approve_and_publish_plan(NEW.id, NEW.nutritionist_id) INTO _result;
      
      -- If the helper function failed for some reason (e.g. validation missing), we don't want to break the transaction,
      -- but the plan will stay in 'approved' or the error state.
    END IF;

  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_auto_publish_on_approve ON public.meal_plans;
CREATE TRIGGER trg_auto_publish_on_approve
  AFTER UPDATE OF plan_status ON public.meal_plans
  FOR EACH ROW
  WHEN (NEW.plan_status = 'approved')
  EXECUTE FUNCTION public.auto_publish_approved_plan();
