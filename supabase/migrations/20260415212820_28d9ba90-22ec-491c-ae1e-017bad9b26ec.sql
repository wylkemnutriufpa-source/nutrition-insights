CREATE OR REPLACE FUNCTION public.protect_protocol_on_plan_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _active_protocol record;
  _current_user uuid;
BEGIN
  _current_user := auth.uid();

  IF _current_user IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.plan_status IS DISTINCT FROM NEW.plan_status THEN
      RETURN NEW;
    END IF;

    IF OLD.title IS NOT DISTINCT FROM NEW.title
       AND OLD.description IS NOT DISTINCT FROM NEW.description
       AND OLD.start_date IS NOT DISTINCT FROM NEW.start_date
       AND OLD.end_date IS NOT DISTINCT FROM NEW.end_date
       AND OLD.is_active IS NOT DISTINCT FROM NEW.is_active
       AND OLD.template_id IS NOT DISTINCT FROM NEW.template_id
       AND OLD.template_slug IS NOT DISTINCT FROM NEW.template_slug
       AND OLD.template_version IS NOT DISTINCT FROM NEW.template_version
       AND OLD.previous_plan_id IS NOT DISTINCT FROM NEW.previous_plan_id
       AND OLD.transition_origin_id IS NOT DISTINCT FROM NEW.transition_origin_id
       AND OLD.editor_version IS NOT DISTINCT FROM NEW.editor_version
       AND OLD.requires_regeneration IS NOT DISTINCT FROM NEW.requires_regeneration THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT *
    INTO _active_protocol
    FROM public.patient_protocols
   WHERE patient_id = NEW.patient_id
     AND status = 'active'
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  UPDATE public.patient_protocols
     SET manual_intervention_status = 'adjusted_within_protocol',
         last_manual_intervention_at = now(),
         last_manual_intervention_by = _current_user,
         manual_adjustments_count = COALESCE(manual_adjustments_count, 0) + 1,
         updated_at = now()
   WHERE id = _active_protocol.id;

  INSERT INTO public.protocol_intervention_log (
    patient_protocol_id,
    patient_id,
    performed_by,
    intervention_type,
    description,
    changes_applied,
    protocol_status_before,
    protocol_status_after,
    protocol_kept_active
  ) VALUES (
    _active_protocol.id,
    NEW.patient_id,
    _current_user,
    CASE WHEN TG_OP = 'INSERT' THEN 'manual_plan_create' ELSE 'manual_plan_edit' END,
    'Plano alimentar editado manualmente. Protocolo mantido ativo.',
    jsonb_build_object(
      'plan_id', NEW.id,
      'plan_status', NEW.plan_status,
      'operation', TG_OP
    ),
    'active',
    'active',
    true
  );

  RETURN NEW;
END;
$function$;