-- Drop confirm_patient_payment with old signature, then recreate
DROP FUNCTION IF EXISTS public.confirm_patient_payment(uuid, uuid);

CREATE FUNCTION public.confirm_patient_payment(
  _patient_id uuid,
  _nutritionist_id uuid
)
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
  SELECT np.id, np.journey_status, np.tenant_id
  INTO _np
  FROM public.nutritionist_patients np
  WHERE np.patient_id = _patient_id
    AND np.nutritionist_id = _nutritionist_id
    AND np.status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Active relationship not found');
  END IF;

  _current_status := _np.journey_status;
  _tenant_id := COALESCE(_np.tenant_id, public.get_user_tenant());

  UPDATE public.nutritionist_patients
  SET journey_status = 'awaiting_consent', updated_at = now()
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND status = 'active';

  INSERT INTO public.audit_logs (user_id, tenant_id, action, resource_type, resource_id, metadata)
  VALUES (
    _nutritionist_id,
    _tenant_id,
    'confirm_payment',
    'patient',
    _patient_id::text,
    jsonb_build_object('previous_status', _current_status, 'new_status', 'awaiting_consent')
  );

  RETURN jsonb_build_object('success', true, 'previous_status', _current_status);
END;
$$;