-- Audit trigger for PAR-Q / medical review changes on trainer_assessments
CREATE OR REPLACE FUNCTION public.fn_audit_parq_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_tenant uuid;
  v_changed_fields jsonb := '{}'::jsonb;
  v_action text;
BEGIN
  -- Resolve actor: prefer the authenticated user, fallback to trainer_id
  v_actor := COALESCE(auth.uid(), NEW.trainer_id);
  IF v_actor IS NULL THEN
    -- Cannot attribute the change; skip auditing rather than fail the write
    RETURN NEW;
  END IF;

  -- Resolve tenant from the actor (best-effort)
  SELECT tenant_id INTO v_tenant FROM public.profiles WHERE user_id = v_actor LIMIT 1;
  IF v_tenant IS NULL THEN
    v_tenant := COALESCE(NEW.tenant_id, gen_random_uuid());
    -- audit_logs.tenant_id is NOT NULL; if we still can't resolve, skip
    IF NEW.tenant_id IS NULL THEN
      RETURN NEW;
    END IF;
    v_tenant := NEW.tenant_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'parq_assessment_created';
    v_changed_fields := jsonb_build_object(
      'requires_medical_review', NEW.requires_medical_review,
      'readiness_screening', NEW.readiness_screening,
      'medical_clearance', NEW.medical_clearance
    );

    INSERT INTO public.audit_logs (user_id, tenant_id, action, resource_type, resource_id, metadata)
    VALUES (
      v_actor,
      v_tenant,
      v_action,
      'trainer_assessment',
      NEW.id::text,
      jsonb_build_object(
        'patient_id', NEW.patient_id,
        'changes', v_changed_fields,
        'occurred_at', now()
      )
    );
    RETURN NEW;
  END IF;

  -- UPDATE: only audit if PAR-Q-relevant fields changed
  IF NEW.requires_medical_review IS DISTINCT FROM OLD.requires_medical_review THEN
    v_changed_fields := v_changed_fields || jsonb_build_object(
      'requires_medical_review', jsonb_build_object('from', OLD.requires_medical_review, 'to', NEW.requires_medical_review)
    );
  END IF;

  IF NEW.readiness_screening IS DISTINCT FROM OLD.readiness_screening THEN
    v_changed_fields := v_changed_fields || jsonb_build_object(
      'readiness_screening', jsonb_build_object('from', OLD.readiness_screening, 'to', NEW.readiness_screening)
    );
  END IF;

  IF NEW.medical_clearance IS DISTINCT FROM OLD.medical_clearance THEN
    v_changed_fields := v_changed_fields || jsonb_build_object(
      'medical_clearance', jsonb_build_object('from', OLD.medical_clearance, 'to', NEW.medical_clearance)
    );
  END IF;

  IF v_changed_fields = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  -- Action label highlights the most clinically relevant change
  v_action := CASE
    WHEN NEW.requires_medical_review IS DISTINCT FROM OLD.requires_medical_review
      THEN CASE WHEN NEW.requires_medical_review THEN 'medical_review_flagged' ELSE 'medical_review_cleared' END
    ELSE 'parq_screening_updated'
  END;

  INSERT INTO public.audit_logs (user_id, tenant_id, action, resource_type, resource_id, metadata)
  VALUES (
    v_actor,
    v_tenant,
    v_action,
    'trainer_assessment',
    NEW.id::text,
    jsonb_build_object(
      'patient_id', NEW.patient_id,
      'changes', v_changed_fields,
      'occurred_at', now()
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_parq_changes ON public.trainer_assessments;
CREATE TRIGGER trg_audit_parq_changes
AFTER INSERT OR UPDATE ON public.trainer_assessments
FOR EACH ROW
EXECUTE FUNCTION public.fn_audit_parq_changes();