
-- ═══════════════════════════════════════════════════════════
-- FASE 1: CONSOLIDAÇÃO DO CORE CLÍNICO
-- ═══════════════════════════════════════════════════════════

-- 1. Tabela patient_clinical_snapshots (histórico longitudinal)
CREATE TABLE IF NOT EXISTS public.patient_clinical_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  weight numeric,
  adherence_score numeric,
  calorie_avg numeric,
  risk_score integer DEFAULT 0,
  active_alerts_count integer DEFAULT 0,
  clinical_risk_level text DEFAULT 'stable',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(patient_id, snapshot_date)
);

ALTER TABLE public.patient_clinical_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists read own patient snapshots"
ON public.patient_clinical_snapshots FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.patient_id = patient_clinical_snapshots.patient_id
    AND np.nutritionist_id = auth.uid()
    AND np.status = 'active'
  )
);

CREATE POLICY "Service can manage snapshots"
ON public.patient_clinical_snapshots FOR ALL
USING (true) WITH CHECK (true);

-- 2. Adicionar clinical_risk_score e clinical_risk_level na tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS clinical_risk_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clinical_risk_level text DEFAULT 'stable';

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_clinical_snapshots_patient_date 
ON public.patient_clinical_snapshots(patient_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_clinical_alerts_patient_active 
ON public.clinical_alerts(patient_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_clinical_alerts_type_cooldown
ON public.clinical_alerts(patient_id, nutritionist_id, alert_type, created_at DESC) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_profiles_risk_score
ON public.profiles(clinical_risk_score DESC) WHERE clinical_risk_score > 0;

-- 4. Funções de ações clínicas rápidas

-- resolve_alert
CREATE OR REPLACE FUNCTION public.resolve_alert(_alert_id uuid, _resolution_note text DEFAULT NULL)
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

  -- Resolve the alert
  UPDATE public.clinical_alerts
  SET is_active = false, resolved_at = now(), resolved_by = auth.uid()
  WHERE id = _alert_id;

  -- Recalculate risk score
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

  -- Update profile risk
  UPDATE public.profiles
  SET clinical_risk_score = _new_score,
      clinical_risk_level = CASE
        WHEN _new_score >= 60 THEN 'critical'
        WHEN _new_score >= 30 THEN 'attention'
        WHEN _new_score >= 10 THEN 'risk'
        ELSE 'stable'
      END
  WHERE user_id = _alert.patient_id;

  -- Log timeline
  INSERT INTO public.patient_timeline (patient_id, event_type, title, description, metadata, created_by)
  VALUES (
    _alert.patient_id,
    'alert_resolved',
    'Alerta clínico resolvido',
    COALESCE(_resolution_note, 'Alerta resolvido pelo profissional'),
    jsonb_build_object('alert_id', _alert_id, 'alert_type', _alert.alert_type, 'severity', _alert.severity),
    auth.uid()
  );

  RETURN jsonb_build_object('success', true, 'new_risk_score', _new_score);
END;
$$;

-- mark_patient_contacted
CREATE OR REPLACE FUNCTION public.mark_patient_contacted(_patient_id uuid, _contact_method text DEFAULT 'chat')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.patient_timeline (patient_id, event_type, title, description, metadata, created_by)
  VALUES (
    _patient_id,
    'patient_contacted',
    'Paciente contatado',
    'Profissional entrou em contato via ' || _contact_method,
    jsonb_build_object('contact_method', _contact_method, 'contacted_at', now()),
    auth.uid()
  );

  RETURN jsonb_build_object('success', true, 'patient_id', _patient_id);
END;
$$;

-- flag_plan_review_needed
CREATE OR REPLACE FUNCTION public.flag_plan_review_needed(_patient_id uuid, _reason text DEFAULT 'Revisão solicitada')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Flag active plans for review
  UPDATE public.meal_plans
  SET plan_status = 'under_professional_review', updated_at = now()
  WHERE patient_id = _patient_id AND is_active = true AND plan_status = 'published_to_patient';

  INSERT INTO public.patient_timeline (patient_id, event_type, title, description, metadata, created_by)
  VALUES (
    _patient_id,
    'plan_review_flagged',
    'Plano marcado para revisão',
    _reason,
    jsonb_build_object('reason', _reason, 'flagged_at', now()),
    auth.uid()
  );

  RETURN jsonb_build_object('success', true, 'patient_id', _patient_id);
END;
$$;
