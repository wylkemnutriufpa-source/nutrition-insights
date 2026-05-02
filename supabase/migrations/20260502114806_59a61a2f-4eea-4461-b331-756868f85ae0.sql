-- Update the RPC to include profile synchronization
CREATE OR REPLACE FUNCTION public.accept_patient_consent(_patient_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _link record;
  _pipeline_id uuid;
  _tenant_id uuid;
BEGIN
  -- 1. Sync profile consent status immediately
  UPDATE public.profiles 
  SET 
    consent_given = true, 
    consent_date = now() 
  WHERE user_id = _patient_id;

  SELECT np.*, COALESCE(np.tenant_id, ut.tenant_id) AS resolved_tenant
  INTO _link
  FROM public.nutritionist_patients np
  LEFT JOIN public.user_tenants ut ON ut.user_id = np.nutritionist_id
  WHERE np.patient_id = _patient_id AND np.status = 'active'
  ORDER BY np.created_at DESC LIMIT 1;

  IF _link IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vínculo profissional não encontrado');
  END IF;
  _tenant_id := _link.resolved_tenant;

  IF _link.journey_status NOT IN ('awaiting_consent', 'awaiting_payment') THEN
    RETURN jsonb_build_object('success', true, 'new_status', _link.journey_status);
  END IF;

  UPDATE public.nutritionist_patients SET journey_status = 'onboarding_active' WHERE id = _link.id;

  SELECT id INTO _pipeline_id
  FROM public.onboarding_pipelines
  WHERE patient_id = _patient_id AND nutritionist_id = _link.nutritionist_id
    AND status NOT IN ('completed', 'archived', 'superseded_by_active_plan', 'superseded_by_published_plan', 'rejected')
  ORDER BY created_at DESC LIMIT 1;

  IF _pipeline_id IS NULL THEN
    INSERT INTO public.onboarding_pipelines (patient_id, nutritionist_id, status, release_status, released_by, released_at, release_config)
    VALUES (_patient_id, _link.nutritionist_id, 'pending_anamnesis', 'released', _link.nutritionist_id, now(), '{}'::jsonb)
    RETURNING id INTO _pipeline_id;
  END IF;

  IF _tenant_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, entity_type, target_route, tenant_id)
    VALUES (_link.nutritionist_id, 'Paciente iniciou onboarding', 'O paciente aceitou o consentimento e já pode preencher o onboarding.', 'patient_registered', 'onboarding', '/patients/' || _patient_id::text, _tenant_id);

    INSERT INTO public.audit_logs (user_id, tenant_id, action, resource_type, resource_id, metadata)
    VALUES (_patient_id, _tenant_id, 'accept_consent', 'clinical_consents', _patient_id::text, jsonb_build_object('new_status', 'onboarding_active', 'pipeline_id', _pipeline_id));
  END IF;

  RETURN jsonb_build_object('success', true, 'new_status', 'onboarding_active', 'pipeline_id', _pipeline_id);
END;
$function$;

-- Create trigger function to keep profiles in sync with clinical_consents
CREATE OR REPLACE FUNCTION public.sync_profile_consent()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.revoked_at IS NULL THEN
    UPDATE public.profiles 
    SET 
      consent_given = true, 
      consent_date = NEW.accepted_at
    WHERE user_id = NEW.patient_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.revoked_at IS NOT NULL THEN
    UPDATE public.profiles 
    SET 
      consent_given = false, 
      consent_date = NULL
    WHERE user_id = NEW.patient_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS tr_sync_profile_consent ON public.clinical_consents;
CREATE TRIGGER tr_sync_profile_consent
AFTER INSERT OR UPDATE ON public.clinical_consents
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_consent();
