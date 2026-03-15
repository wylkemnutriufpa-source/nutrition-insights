
-- Fix resolve_alert to use consistent risk level mapping (risk > attention)
CREATE OR REPLACE FUNCTION public.resolve_alert(_alert_id uuid, _resolution_note text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _alert record;
  _new_score integer;
BEGIN
  SELECT * INTO _alert FROM public.clinical_alerts WHERE id = _alert_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'alert_not_found_or_resolved');
  END IF;

  UPDATE public.clinical_alerts
  SET is_active = false, resolved_at = now(), resolved_by = auth.uid()
  WHERE id = _alert_id;

  SELECT COALESCE(SUM(
    CASE severity
      WHEN 'critical' THEN 40
      WHEN 'high' THEN 25
      WHEN 'medium' THEN 10
      ELSE 5
    END
  ), 0) INTO _new_score
  FROM public.clinical_alerts
  WHERE patient_id = _alert.patient_id AND is_active = true;

  UPDATE public.profiles
  SET clinical_risk_score = _new_score,
      clinical_risk_level = CASE
        WHEN _new_score >= 60 THEN 'critical'
        WHEN _new_score >= 30 THEN 'risk'
        WHEN _new_score >= 10 THEN 'attention'
        ELSE 'stable'
      END
  WHERE user_id = _alert.patient_id;

  INSERT INTO public.patient_timeline (patient_id, event_type, title, description, metadata, created_by)
  VALUES (
    _alert.patient_id,
    'alert_resolved',
    'Alerta clínico resolvido',
    COALESCE(_resolution_note, 'Alerta resolvido pelo profissional'),
    jsonb_build_object('alert_id', _alert_id, 'alert_type', _alert.alert_type, 'severity', _alert.severity, 'previous_score', _new_score),
    auth.uid()
  );

  RETURN jsonb_build_object('success', true, 'new_risk_score', _new_score, 'new_risk_level',
    CASE
      WHEN _new_score >= 60 THEN 'critical'
      WHEN _new_score >= 30 THEN 'risk'
      WHEN _new_score >= 10 THEN 'attention'
      ELSE 'stable'
    END
  );
END;
$$;

-- Fix flag_plan_review_needed to also handle 'approved' plans
CREATE OR REPLACE FUNCTION public.flag_plan_review_needed(_patient_id uuid, _reason text DEFAULT 'Revisão solicitada'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _updated_count integer;
BEGIN
  UPDATE public.meal_plans
  SET plan_status = 'under_professional_review', updated_at = now()
  WHERE patient_id = _patient_id AND is_active = true 
    AND plan_status IN ('published_to_patient', 'approved');

  GET DIAGNOSTICS _updated_count = ROW_COUNT;

  INSERT INTO public.patient_timeline (patient_id, event_type, title, description, metadata, created_by)
  VALUES (
    _patient_id,
    'plan_review_flagged',
    'Plano marcado para revisão',
    _reason,
    jsonb_build_object('reason', _reason, 'flagged_at', now(), 'plans_affected', _updated_count),
    auth.uid()
  );

  RETURN jsonb_build_object('success', true, 'patient_id', _patient_id, 'plans_updated', _updated_count);
END;
$$;
