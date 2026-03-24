CREATE OR REPLACE FUNCTION public.complete_patient_onboarding_by_patient(_patient_id uuid, _pipeline_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link record;
BEGIN
  SELECT id, nutritionist_id
  INTO _link
  FROM public.nutritionist_patients
  WHERE patient_id = _patient_id
    AND status = 'active'
    AND journey_status = 'onboarding_active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF _link IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Paciente não está em onboarding ativo');
  END IF;

  UPDATE public.onboarding_pipelines
  SET status = 'completed', updated_at = now()
  WHERE id = _pipeline_id
    AND patient_id = _patient_id
    AND anamnesis_completed = true
    AND body_data_completed = true
    AND preferences_completed = true
    AND plan_generated = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pipeline incompleto');
  END IF;

  UPDATE public.nutritionist_patients
  SET journey_status = 'draft_ready_for_review'
  WHERE id = _link.id;

  INSERT INTO public.notifications (user_id, title, message, type, target_route)
  VALUES (
    _link.nutritionist_id,
    'Onboarding concluído ✅',
    'Paciente concluiu todas as etapas. Plano aguardando sua revisão.',
    'warning',
    '/patients/' || _patient_id::text || '?tab=onboarding'
  );

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (_patient_id, 'complete_onboarding', 'onboarding_pipeline', _pipeline_id::text, '{"new_status":"draft_ready_for_review"}'::jsonb);

  RETURN jsonb_build_object('success', true, 'new_status', 'draft_ready_for_review');
END;
$$;