
-- Add prestige_plan_id to programs so each program can have a linked prestige plan
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS prestige_plan_id uuid REFERENCES public.prestige_plans(id) ON DELETE SET NULL;

-- Create function to auto-assign prestige to all active enrollees of a program
CREATE OR REPLACE FUNCTION public.sync_program_prestige(_program_id uuid, _assigned_by uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _prestige_plan_id uuid;
  _count integer := 0;
  _patient record;
BEGIN
  -- Get the program's prestige plan
  SELECT prestige_plan_id INTO _prestige_plan_id
  FROM public.programs
  WHERE id = _program_id;

  IF _prestige_plan_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_prestige_plan_linked');
  END IF;

  -- For each active enrollee, assign prestige
  FOR _patient IN
    SELECT patient_id FROM public.program_enrollments
    WHERE program_id = _program_id AND status NOT IN ('cancelled', 'dropped_out')
  LOOP
    -- Deactivate existing prestige
    UPDATE public.patient_prestige SET is_active = false
    WHERE patient_id = _patient.patient_id AND is_active = true;

    -- Assign new prestige (skip if already has this exact plan active)
    INSERT INTO public.patient_prestige (patient_id, plan_id, assigned_by, is_active)
    VALUES (_patient.patient_id, _prestige_plan_id, _assigned_by, true)
    ON CONFLICT DO NOTHING;

    _count := _count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'patients_updated', _count, 'prestige_plan_id', _prestige_plan_id);
END;
$$;

-- Trigger: auto-assign prestige when a patient enrolls in a program that has a prestige plan
CREATE OR REPLACE FUNCTION public.auto_assign_program_prestige()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _prestige_plan_id uuid;
  _existing_id uuid;
BEGIN
  -- Only on insert or status change to active
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status NOT IN ('cancelled', 'dropped_out') AND (OLD.status IN ('cancelled', 'dropped_out') OR OLD.status IS NULL)) THEN
    SELECT prestige_plan_id INTO _prestige_plan_id
    FROM public.programs
    WHERE id = NEW.program_id;

    IF _prestige_plan_id IS NOT NULL THEN
      -- Check if already has this prestige active
      SELECT id INTO _existing_id
      FROM public.patient_prestige
      WHERE patient_id = NEW.patient_id AND plan_id = _prestige_plan_id AND is_active = true;

      IF _existing_id IS NULL THEN
        -- Deactivate old prestige
        UPDATE public.patient_prestige SET is_active = false
        WHERE patient_id = NEW.patient_id AND is_active = true;

        -- Assign program prestige
        INSERT INTO public.patient_prestige (patient_id, plan_id, assigned_by, is_active)
        VALUES (NEW.patient_id, _prestige_plan_id, COALESCE(NEW.professional_id, auth.uid()), true);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on program_enrollments
DROP TRIGGER IF EXISTS trg_auto_assign_program_prestige ON public.program_enrollments;
CREATE TRIGGER trg_auto_assign_program_prestige
AFTER INSERT OR UPDATE ON public.program_enrollments
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_program_prestige();
