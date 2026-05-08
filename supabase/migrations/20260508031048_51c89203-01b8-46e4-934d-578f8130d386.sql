CREATE OR REPLACE FUNCTION public.handle_weight_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    current_weight_kg = NEW.weight,
    current_height_cm = NEW.height,
    updated_at = now()
  WHERE user_id = NEW.patient_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists to avoid errors on retry
DROP TRIGGER IF EXISTS on_physical_assessment_weight_update ON public.physical_assessments;

CREATE TRIGGER on_physical_assessment_weight_update
AFTER INSERT OR UPDATE OF weight, height ON public.physical_assessments
FOR EACH ROW
EXECUTE FUNCTION public.handle_weight_update();