
-- Fix: The trigger fires on ALL meal_plan updates including automated system operations
-- (cron jobs, visual matching, status transitions). This generates false "manual edit" 
-- notifications for all patients. We need to only fire on genuine user edits.

CREATE OR REPLACE FUNCTION public.protect_protocol_on_plan_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _active_protocol record;
  _current_user uuid;
BEGIN
  _current_user := auth.uid();
  
  -- Skip if no authenticated user (system/cron operation)
  IF _current_user IS NULL THEN RETURN NEW; END IF;
  
  -- Skip if this is just a status change (publish, archive, etc) — not a content edit
  IF TG_OP = 'UPDATE' THEN
    -- Only trigger on genuine content edits, not metadata/status changes
    IF OLD.plan_status IS DISTINCT FROM NEW.plan_status THEN RETURN NEW; END IF;
    IF OLD.updated_at IS DISTINCT FROM NEW.updated_at AND 
       OLD.plan_title IS NOT DISTINCT FROM NEW.plan_title AND
       OLD.plan_description IS NOT DISTINCT FROM NEW.plan_description AND
       OLD.total_daily_calories IS NOT DISTINCT FROM NEW.total_daily_calories AND
       OLD.protein_target IS NOT DISTINCT FROM NEW.protein_target AND
       OLD.carbs_target IS NOT DISTINCT FROM NEW.carbs_target AND
       OLD.fat_target IS NOT DISTINCT FROM NEW.fat_target THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Find active protocol for this patient
  SELECT * INTO _active_protocol
  FROM public.patient_protocols
  WHERE patient_id = NEW.patient_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no active protocol, nothing to protect
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Mark protocol as having manual adjustments (but keep it ACTIVE)
  UPDATE public.patient_protocols
  SET manual_intervention_status = 'adjusted_within_protocol',
      last_manual_intervention_at = now(),
      last_manual_intervention_by = _current_user,
      manual_adjustments_count = manual_adjustments_count + 1,
      updated_at = now()
  WHERE id = _active_protocol.id;

  -- Log the intervention
  INSERT INTO public.protocol_intervention_log (
    patient_protocol_id, patient_id, performed_by,
    intervention_type, description, changes_applied,
    protocol_status_before, protocol_status_after, protocol_kept_active
  ) VALUES (
    _active_protocol.id, NEW.patient_id, _current_user,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'manual_plan_create'
      ELSE 'manual_plan_edit'
    END,
    'Plano alimentar editado manualmente. Protocolo mantido ativo.',
    jsonb_build_object(
      'plan_id', NEW.id,
      'plan_status', NEW.plan_status,
      'operation', TG_OP
    ),
    'active', 'active', true
  );

  RETURN NEW;
END;
$$;

-- Also clean up the false timeline entries that were generated
DELETE FROM public.patient_timeline 
WHERE event_type = 'protocol_manual_adjustment' 
  AND created_by = '00000000-0000-0000-0000-000000000000';

-- Clean up the false intervention logs
DELETE FROM public.protocol_intervention_log
WHERE performed_by = '00000000-0000-0000-0000-000000000000'
  AND intervention_type = 'manual_plan_edit';
