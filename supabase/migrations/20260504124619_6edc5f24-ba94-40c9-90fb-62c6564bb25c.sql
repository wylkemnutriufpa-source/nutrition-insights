CREATE OR REPLACE FUNCTION public.reconcile_patient_state(_patient_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_onboarding_completed boolean;
  v_has_active_plan boolean;
  v_new_state patient_state_type;
  v_current_state patient_state_type;
BEGIN
  -- 1. Get current reality
  SELECT anamnesis_completed INTO v_onboarding_completed 
  FROM public.onboarding_pipelines 
  WHERE patient_id = _patient_id 
  ORDER BY created_at DESC LIMIT 1;

  SELECT EXISTS (
    SELECT 1 FROM public.meal_plans 
    WHERE patient_id = _patient_id AND is_active = true AND plan_status = 'published_to_patient'
  ) INTO v_has_active_plan;

  SELECT patient_state INTO v_current_state FROM public.profiles WHERE user_id = _patient_id;

  -- 2. Determine target state
  IF v_has_active_plan THEN
    v_new_state := 'active_plan';
  ELSIF v_onboarding_completed THEN
    v_new_state := 'ready_for_plan';
  ELSE
    v_new_state := COALESCE(v_current_state, 'onboarding_slides');
  END IF;

  -- 3. Apply if different
  IF v_new_state <> v_current_state OR v_current_state IS NULL THEN
    UPDATE public.profiles SET patient_state = v_new_state, updated_at = now() WHERE user_id = _patient_id;
    
    INSERT INTO public.access_logs (user_id, patient_id, action, resource)
    VALUES (COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), _patient_id, 'reconcile_state', 'profile');
  END IF;

  RETURN jsonb_build_object('success', true, 'new_state', v_new_state, 'reconciled', v_new_state <> v_current_state);
END;
$function$;