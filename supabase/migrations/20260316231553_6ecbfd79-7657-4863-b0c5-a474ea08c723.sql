-- Function to auto-assign BB prestige when enrolling in the BB program
CREATE OR REPLACE FUNCTION public.auto_assign_bb_prestige()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _bb_program_id uuid := 'f0aa6a4f-b032-4a62-82ae-49674a455e27';
  _bb_prestige_plan_id uuid := '51f28167-73e5-4f91-a92d-250d12129d80';
  _existing_id uuid;
BEGIN
  IF NEW.program_id != _bb_program_id THEN
    RETURN NEW;
  END IF;

  SELECT id INTO _existing_id
  FROM public.patient_prestige
  WHERE patient_id = NEW.patient_id AND plan_id = _bb_prestige_plan_id AND is_active = true;

  IF _existing_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.patient_prestige
  SET is_active = false
  WHERE patient_id = NEW.patient_id AND is_active = true;

  INSERT INTO public.patient_prestige (patient_id, plan_id, is_active, assigned_by)
  VALUES (NEW.patient_id, _bb_prestige_plan_id, true, NEW.professional_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_bb_prestige
  AFTER INSERT ON public.program_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_bb_prestige();

CREATE TRIGGER trg_auto_bb_prestige_update
  AFTER UPDATE OF status ON public.program_enrollments
  FOR EACH ROW
  WHEN (NEW.status NOT IN ('completed', 'cancelled', 'blocked'))
  EXECUTE FUNCTION public.auto_assign_bb_prestige();