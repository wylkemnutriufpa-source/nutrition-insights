
CREATE OR REPLACE FUNCTION public.confirm_patient_payment(_patient_id uuid, _nutritionist_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _np record;
  _current_status text;
  _tenant_id uuid;
BEGIN
  SELECT np.id, np.journey_status, COALESCE(np.tenant_id, ut.tenant_id) AS tenant_id
  INTO _np
  FROM public.nutritionist_patients np
  LEFT JOIN public.user_tenants ut
    ON ut.user_id = np.nutritionist_id
  WHERE np.patient_id = _patient_id
    AND np.nutritionist_id = _nutritionist_id
    AND np.status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Active relationship not found');
  END IF;

  _current_status := _np.journey_status;
  _tenant_id := _np.tenant_id;

  UPDATE public.nutritionist_patients
  SET journey_status = 'onboarding_active'
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND status = 'active';

  IF _tenant_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (user_id, tenant_id, action, resource_type, resource_id, metadata)
    VALUES (
      _nutritionist_id,
      _tenant_id,
      'confirm_payment',
      'patient',
      _patient_id::text,
      jsonb_build_object('previous_status', _current_status, 'new_status', 'onboarding_active')
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'previous_status', _current_status, 'new_status', 'onboarding_active');
END;
$$;
