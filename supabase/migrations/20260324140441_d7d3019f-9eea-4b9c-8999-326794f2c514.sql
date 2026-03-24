
-- RPC: Confirm payment for a patient (professional action)
CREATE OR REPLACE FUNCTION public.confirm_patient_payment(
  _patient_id uuid,
  _nutritionist_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link_id uuid;
  _current_status text;
BEGIN
  -- Verify link exists
  SELECT id, journey_status INTO _link_id, _current_status
  FROM nutritionist_patients
  WHERE patient_id = _patient_id
    AND nutritionist_id = _nutritionist_id
    AND status = 'active'
  LIMIT 1;

  IF _link_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vínculo não encontrado');
  END IF;

  -- Only allow confirmation from awaiting states
  IF _current_status NOT IN ('awaiting_payment', 'lead_created', 'awaiting_onboarding_release') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Paciente não está aguardando pagamento. Status atual: ' || _current_status);
  END IF;

  -- Transition to onboarding_active (payment confirmed → start onboarding)
  UPDATE nutritionist_patients
  SET journey_status = 'onboarding_active',
      updated_at = now()
  WHERE id = _link_id;

  -- Insert a payment record for audit trail
  INSERT INTO payments (user_id, amount, status, payment_method, description)
  VALUES (_patient_id, 0, 'paid', 'manual_confirmation', 'Pagamento confirmado manualmente pelo profissional');

  -- Create notification for patient
  INSERT INTO notifications (user_id, title, message, type, target_route)
  VALUES (
    _patient_id,
    'Pagamento confirmado! 🎉',
    'Seu acesso foi liberado. Complete seu onboarding para começar.',
    'system',
    '/onboarding'
  );

  -- Audit log
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    _nutritionist_id,
    'confirm_payment',
    'patient',
    _patient_id::text,
    jsonb_build_object('previous_status', _current_status, 'new_status', 'onboarding_active')
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: Bulk archive stale onboarding pipelines
CREATE OR REPLACE FUNCTION public.cleanup_stale_onboarding_pipelines(
  _nutritionist_id uuid,
  _stale_days int DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _archived_count int;
BEGIN
  WITH stale AS (
    SELECT op.id
    FROM onboarding_pipelines op
    JOIN nutritionist_patients np ON np.patient_id = op.patient_id
    WHERE np.nutritionist_id = _nutritionist_id
      AND op.status IN ('pending', 'in_progress')
      AND op.updated_at < now() - (_stale_days || ' days')::interval
  )
  UPDATE onboarding_pipelines
  SET status = 'archived', updated_at = now()
  WHERE id IN (SELECT id FROM stale);

  GET DIAGNOSTICS _archived_count = ROW_COUNT;

  INSERT INTO audit_logs (user_id, action, resource_type, metadata)
  VALUES (_nutritionist_id, 'bulk_archive_stale_pipelines', 'onboarding_pipeline',
    jsonb_build_object('archived_count', _archived_count, 'stale_days', _stale_days));

  RETURN jsonb_build_object('success', true, 'archived_count', _archived_count);
END;
$$;

-- RPC: Detect orphan pipelines (no active nutritionist link)
CREATE OR REPLACE FUNCTION public.detect_orphan_pipelines(_nutritionist_id uuid)
RETURNS TABLE(pipeline_id uuid, patient_id uuid, patient_name text, status text, updated_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT op.id, op.patient_id, p.full_name, op.status, op.updated_at
  FROM onboarding_pipelines op
  JOIN profiles p ON p.user_id = op.patient_id
  LEFT JOIN nutritionist_patients np ON np.patient_id = op.patient_id AND np.nutritionist_id = _nutritionist_id AND np.status = 'active'
  WHERE np.id IS NULL
    AND op.patient_id IN (
      SELECT patient_id FROM nutritionist_patients WHERE nutritionist_id = _nutritionist_id
    )
  ORDER BY op.updated_at DESC;
$$;
