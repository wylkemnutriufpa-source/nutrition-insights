-- 1) Função mais resiliente: aceita qualquer journey_status ativo
CREATE OR REPLACE FUNCTION public.complete_patient_onboarding_by_patient(
  _patient_id uuid,
  _pipeline_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link record;
  _tenant_id uuid;
  _pipeline record;
BEGIN
  SELECT np.id, np.nutritionist_id, np.journey_status,
         COALESCE(np.tenant_id, ut.tenant_id) AS resolved_tenant
  INTO _link
  FROM public.nutritionist_patients np
  LEFT JOIN public.user_tenants ut ON ut.user_id = np.nutritionist_id
  WHERE np.patient_id = _patient_id
    AND np.status = 'active'
  ORDER BY np.created_at DESC
  LIMIT 1;

  IF _link IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Paciente sem vínculo ativo com profissional');
  END IF;
  _tenant_id := _link.resolved_tenant;

  SELECT id, status, anamnesis_completed, body_data_completed, preferences_completed, plan_generated, plan_approved
  INTO _pipeline
  FROM public.onboarding_pipelines
  WHERE id = _pipeline_id AND patient_id = _patient_id;

  IF _pipeline IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pipeline não encontrado');
  END IF;

  IF NOT (_pipeline.anamnesis_completed AND _pipeline.body_data_completed AND _pipeline.preferences_completed) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pipeline incompleto - preencha anamnese, dados corporais e preferências');
  END IF;

  UPDATE public.onboarding_pipelines
  SET status = 'completed', updated_at = now()
  WHERE id = _pipeline_id AND patient_id = _patient_id
    AND status NOT IN ('completed', 'cancelled');

  UPDATE public.nutritionist_patients
  SET journey_status = 'draft_ready_for_review'
  WHERE id = _link.id
    AND journey_status IS DISTINCT FROM 'draft_ready_for_review'
    AND journey_status NOT IN ('plan_published', 'active_followup', 'clinical_followup_active');

  IF _tenant_id IS NOT NULL AND _link.journey_status IS DISTINCT FROM 'draft_ready_for_review' THEN
    INSERT INTO public.notifications (user_id, title, message, type, target_route, tenant_id)
    VALUES (
      _link.nutritionist_id,
      'Onboarding concluído ✅',
      'Paciente concluiu todas as etapas. Plano aguardando sua revisão.',
      'warning',
      '/patients/' || _patient_id::text || '?tab=onboarding',
      _tenant_id
    );

    INSERT INTO public.audit_logs (user_id, tenant_id, action, resource_type, resource_id, metadata)
    VALUES (
      _patient_id, _tenant_id, 'complete_onboarding', 'onboarding_pipeline',
      _pipeline_id::text, '{"new_status":"draft_ready_for_review"}'::jsonb
    );
  END IF;

  PERFORM public.resolve_patient_lifecycle_state(_patient_id);

  RETURN jsonb_build_object('success', true, 'new_status', 'draft_ready_for_review');
END;
$$;

-- 2) Trigger de auto-sync: pipeline → journey_status
CREATE OR REPLACE FUNCTION public.fn_sync_journey_on_pipeline_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('pending_approval', 'completed')
     AND COALESCE(NEW.plan_generated, false) = true
     AND COALESCE(NEW.plan_approved, false) = false
  THEN
    UPDATE public.nutritionist_patients
    SET journey_status = 'draft_ready_for_review'
    WHERE patient_id = NEW.patient_id
      AND status = 'active'
      AND journey_status NOT IN ('draft_ready_for_review', 'plan_published', 'active_followup', 'clinical_followup_active');

    UPDATE public.clinical_alerts
    SET is_active = false,
        resolved_at = now(),
        resolved_by = '00000000-0000-0000-0000-000000000000'::uuid,
        metadata = COALESCE(metadata, '{}'::jsonb) || '{"resolution_reason":"auto_resolved_pipeline_completed"}'::jsonb
    WHERE patient_id = NEW.patient_id
      AND is_active = true
      AND alert_type IN ('possible_behavioral_dropout', 'possible_abandonment', 'low_adherence');

    PERFORM public.resolve_patient_lifecycle_state(NEW.patient_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_journey_on_pipeline_change ON public.onboarding_pipelines;
CREATE TRIGGER trg_sync_journey_on_pipeline_change
AFTER INSERT OR UPDATE OF status, plan_generated, plan_approved
ON public.onboarding_pipelines
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_journey_on_pipeline_change();

-- 3) Backfill: corrigir pacientes existentes em limbo
UPDATE public.nutritionist_patients np
SET journey_status = 'draft_ready_for_review'
FROM public.onboarding_pipelines op
WHERE op.patient_id = np.patient_id
  AND np.status = 'active'
  AND op.status IN ('pending_approval', 'completed')
  AND COALESCE(op.plan_generated, false) = true
  AND COALESCE(op.plan_approved, false) = false
  AND np.journey_status NOT IN ('draft_ready_for_review', 'plan_published', 'active_followup', 'clinical_followup_active');

-- 4) Limpar alertas falsos
UPDATE public.clinical_alerts ca
SET is_active = false,
    resolved_at = now(),
    resolved_by = '00000000-0000-0000-0000-000000000000'::uuid,
    metadata = COALESCE(ca.metadata, '{}'::jsonb) || '{"resolution_reason":"backfill_pipeline_completion_fix"}'::jsonb
FROM public.onboarding_pipelines op
WHERE op.patient_id = ca.patient_id
  AND ca.is_active = true
  AND ca.alert_type IN ('possible_behavioral_dropout', 'possible_abandonment', 'low_adherence')
  AND op.status IN ('pending_approval', 'completed')
  AND COALESCE(op.plan_approved, false) = false;