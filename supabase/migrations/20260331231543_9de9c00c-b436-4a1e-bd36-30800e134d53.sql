
-- FIX: Allow approve_and_publish to transition directly from draft/review states
-- The RPC already checks overall_validation_status = 'aprovado' so the guard is redundant
-- but was blocking legitimate flows where status was still 'draft' after validation
CREATE OR REPLACE FUNCTION public.validate_meal_plan_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.plan_status = NEW.plan_status THEN RETURN NEW; END IF;

  -- Allow publishing only from approved or under_professional_review (since RPC validates)
  IF NEW.plan_status = 'published_to_patient' AND OLD.plan_status NOT IN ('approved', 'published', 'draft', 'draft_auto_generated', 'under_professional_review') THEN
    RAISE EXCEPTION 'Cannot publish plan from status: %', OLD.plan_status;
  END IF;

  -- Block reverting published to draft
  IF OLD.plan_status IN ('published_to_patient', 'published') AND NEW.plan_status IN ('draft', 'draft_auto_generated') THEN
    RAISE EXCEPTION 'Cannot revert published plan to draft. Archive it instead.';
  END IF;

  -- Block transitions from terminal statuses
  IF OLD.plan_status IN ('archived', 'expired') AND NEW.plan_status NOT IN ('archived', 'expired') THEN
    RAISE EXCEPTION 'Cannot transition from terminal status: %', OLD.plan_status;
  END IF;

  RETURN NEW;
END;
$$;
