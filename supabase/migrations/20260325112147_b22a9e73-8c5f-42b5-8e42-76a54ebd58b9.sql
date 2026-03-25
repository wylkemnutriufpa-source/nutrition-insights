
DROP FUNCTION IF EXISTS public.confirm_patient_payment(uuid, uuid);

CREATE OR REPLACE FUNCTION public.confirm_patient_payment(_nutritionist_id uuid, _patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link_id uuid;
  _current_status text;
BEGIN
  SELECT id, journey_status
  INTO _link_id, _current_status
  FROM public.nutritionist_patients
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND status = 'active'
  LIMIT 1;

  IF _link_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vínculo não encontrado');
  END IF;

  IF COALESCE(_current_status, 'invited') NOT IN ('invited', 'lead_created', 'awaiting_payment', 'awaiting_onboarding_release') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Paciente não está aguardando pagamento. Status atual: ' || COALESCE(_current_status, 'null'));
  END IF;

  UPDATE public.nutritionist_patients
  SET journey_status = 'awaiting_consent'
  WHERE id = _link_id;

  INSERT INTO public.payments (user_id, amount, status, payment_method, gateway, metadata)
  VALUES (_patient_id, 0, 'paid', 'manual_confirmation', 'manual', '{"description": "Pagamento confirmado manualmente pelo profissional"}'::jsonb)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.notifications (user_id, title, message, type, target_route)
  VALUES (
    _patient_id,
    'Pagamento confirmado',
    'Seu pagamento foi confirmado. Antes de iniciar, aceite o consentimento clínico para liberar seu acesso.',
    'system',
    '/consent-required'
  );

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    _nutritionist_id,
    'confirm_payment',
    'patient',
    _patient_id::text,
    jsonb_build_object('previous_status', _current_status, 'new_status', 'awaiting_consent')
  );

  RETURN jsonb_build_object('success', true, 'new_status', 'awaiting_consent');
END;
$$;
