
-- Trigger function: notify nutritionist when patient submits a plan request
CREATE OR REPLACE FUNCTION public.fn_notify_plan_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_name text;
  v_nutri_id uuid;
BEGIN
  -- Get patient name
  SELECT full_name INTO v_patient_name
  FROM public.profiles
  WHERE user_id = NEW.patient_id;

  -- Determine nutritionist: use plan_requests.nutritionist_id first,
  -- fallback to onboarding_pipelines, then nutritionist_patients
  v_nutri_id := NEW.nutritionist_id;

  IF v_nutri_id IS NULL THEN
    SELECT nutritionist_id INTO v_nutri_id
    FROM public.onboarding_pipelines
    WHERE patient_id = NEW.patient_id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_nutri_id IS NULL THEN
    SELECT nutritionist_id INTO v_nutri_id
    FROM public.nutritionist_patients
    WHERE patient_id = NEW.patient_id
    LIMIT 1;
  END IF;

  IF v_nutri_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, action_url)
    VALUES (
      v_nutri_id,
      '📋 Solicitação de plano',
      COALESCE(v_patient_name, 'Paciente') || ' solicitou ativação ou ajuste de plano alimentar.',
      'message',
      '/patients/' || NEW.patient_id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_notify_plan_request ON public.plan_requests;
CREATE TRIGGER trg_notify_plan_request
  AFTER INSERT ON public.plan_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_plan_request();
