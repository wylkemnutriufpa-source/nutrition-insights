-- Guard: prevent deleting patient-professional binding if patient has active plans
CREATE OR REPLACE FUNCTION public.fn_guard_patient_binding_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.meal_plans
    WHERE patient_id = OLD.patient_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Não é possível desvincular paciente com planos ativos. Desative os planos primeiro.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_guard_patient_binding_delete
  BEFORE DELETE ON public.nutritionist_patients
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_patient_binding_delete();

-- Guard: prevent nullifying nutritionist_id on active meal plans
CREATE OR REPLACE FUNCTION public.fn_guard_plan_nutritionist_binding()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true AND NEW.nutritionist_id IS NULL THEN
    RAISE EXCEPTION 'Plano ativo não pode existir sem nutricionista vinculado.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_plan_nutritionist_binding
  BEFORE INSERT OR UPDATE ON public.meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_plan_nutritionist_binding();
