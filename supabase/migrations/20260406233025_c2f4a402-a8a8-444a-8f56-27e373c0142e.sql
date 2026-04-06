-- Fix the trigger function to use correct route /my-diet instead of /meal-plan
CREATE OR REPLACE FUNCTION public.notify_meal_plan_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_user uuid;
  _patient_name text;
  _title text;
  _message text;
  _type text := 'info';
  _tenant_id uuid;
BEGIN
  IF OLD IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, 'Paciente') INTO _patient_name FROM public.profiles WHERE user_id = NEW.patient_id;

  SELECT COALESCE(np.tenant_id, ut.tenant_id) INTO _tenant_id
  FROM public.nutritionist_patients np LEFT JOIN public.user_tenants ut ON ut.user_id = np.nutritionist_id
  WHERE np.patient_id = NEW.patient_id AND np.nutritionist_id = NEW.nutritionist_id AND np.status = 'active' LIMIT 1;

  IF NEW.plan_status = 'pending_approval' AND OLD.plan_status != 'pending_approval' THEN
    _target_user := NEW.nutritionist_id; _title := 'Plano aguardando aprovação'; _message := 'Plano de ' || _patient_name || ' está pronto para revisão.'; _type := 'appointment';
  ELSIF NEW.plan_status = 'approved' AND OLD.plan_status != 'approved' THEN
    _target_user := NEW.nutritionist_id; _title := 'Plano aprovado'; _message := 'Plano de ' || _patient_name || ' foi aprovado. Pronto para publicar.'; _type := 'progress';
  ELSIF NEW.plan_status = 'published_to_patient' AND OLD.plan_status != 'published_to_patient' THEN
    IF _tenant_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, action_url, target_route, tenant_id)
      VALUES (NEW.patient_id, 'Novo plano alimentar!', 'Seu nutricionista publicou seu plano personalizado. Confira agora!', 'plan_published', '/my-diet', '/my-diet', _tenant_id);
    END IF;
    _target_user := NEW.nutritionist_id; _title := 'Plano entregue'; _message := 'Plano de ' || _patient_name || ' foi publicado com sucesso.'; _type := 'progress';
  ELSE
    RETURN NEW;
  END IF;

  IF _target_user IS NOT NULL AND _tenant_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, action_url, tenant_id)
    VALUES (_target_user, _title, _message, _type, '/patients', _tenant_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Fix existing broken notifications
UPDATE public.notifications 
SET action_url = '/my-diet', target_route = '/my-diet', type = 'plan_published'
WHERE action_url = '/meal-plan' OR target_route = '/meal-plan';