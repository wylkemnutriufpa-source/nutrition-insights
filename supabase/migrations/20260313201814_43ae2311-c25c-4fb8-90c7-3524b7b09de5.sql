
-- 1. Create ENUM for plan_status
DO $$ BEGIN
  CREATE TYPE public.meal_plan_status AS ENUM (
    'draft',
    'draft_auto_generated',
    'under_professional_review',
    'approved',
    'published_to_patient',
    'revision_requested',
    'archived',
    'expired',
    'replaced'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create ENUM for generation_source
DO $$ BEGIN
  CREATE TYPE public.plan_generation_source AS ENUM (
    'manual',
    'protocol_fitjourney',
    'anamnesis',
    'physical_assessment',
    'mixed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Add validation trigger for plan_status transitions
CREATE OR REPLACE FUNCTION public.validate_meal_plan_status_transition()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.plan_status = NEW.plan_status THEN RETURN NEW; END IF;

  -- Cannot publish without approval (if require_approval is the norm)
  IF NEW.plan_status = 'published_to_patient' AND OLD.plan_status NOT IN ('approved') THEN
    RAISE EXCEPTION 'Cannot publish plan without approval. Current status: %', OLD.plan_status;
  END IF;

  -- Cannot go back from published to draft
  IF OLD.plan_status = 'published_to_patient' AND NEW.plan_status IN ('draft', 'draft_auto_generated') THEN
    RAISE EXCEPTION 'Cannot revert published plan to draft. Archive it instead.';
  END IF;

  -- archived/expired are terminal states
  IF OLD.plan_status IN ('archived', 'expired') AND NEW.plan_status NOT IN ('archived', 'expired') THEN
    RAISE EXCEPTION 'Cannot transition from terminal status: %', OLD.plan_status;
  END IF;

  RETURN NEW;
END;
$function$;

-- Drop if exists then create trigger
DROP TRIGGER IF EXISTS trg_validate_meal_plan_status ON public.meal_plans;
CREATE TRIGGER trg_validate_meal_plan_status
  BEFORE UPDATE ON public.meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_meal_plan_status_transition();

-- 4. Add RLS policy ensuring patients cannot see draft plans
-- First drop if exists
DROP POLICY IF EXISTS "patients_no_drafts" ON public.meal_plans;
CREATE POLICY "patients_no_drafts" ON public.meal_plans
  FOR SELECT TO authenticated
  USING (
    -- Nutritionists see everything
    nutritionist_id = auth.uid()
    OR (
      -- Patients only see non-draft plans
      patient_id = auth.uid()
      AND plan_status NOT IN ('draft', 'draft_auto_generated', 'under_professional_review', 'revision_requested')
    )
  );

-- 5. Ensure template_version defaults to 1 for auto-generated plans
ALTER TABLE public.meal_plans ALTER COLUMN template_version SET DEFAULT 1;
