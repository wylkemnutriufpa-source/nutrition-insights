-- ============================================================
-- 1) Tabela de overrides temporários de destravar paciente
-- ============================================================
CREATE TABLE IF NOT EXISTS public.professional_unblock_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  professional_id UUID NOT NULL,
  reason TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_unblock_overrides_patient_active
  ON public.professional_unblock_overrides (patient_id, expires_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_unblock_overrides_professional
  ON public.professional_unblock_overrides (professional_id, created_at DESC);

ALTER TABLE public.professional_unblock_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professionals manage their own unblock overrides" ON public.professional_unblock_overrides;
CREATE POLICY "Professionals manage their own unblock overrides"
  ON public.professional_unblock_overrides
  FOR ALL
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

DROP POLICY IF EXISTS "Patients can view their own unblock overrides" ON public.professional_unblock_overrides;
CREATE POLICY "Patients can view their own unblock overrides"
  ON public.professional_unblock_overrides
  FOR SELECT
  USING (patient_id = auth.uid());

-- ============================================================
-- 2) Audit trail para reset de senha
-- ============================================================
CREATE TABLE IF NOT EXISTS public.patient_password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  professional_id UUID NOT NULL,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  reset_method TEXT NOT NULL DEFAULT 'manual_set_by_professional',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pwd_resets_patient
  ON public.patient_password_resets (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pwd_resets_professional
  ON public.patient_password_resets (professional_id, created_at DESC);

ALTER TABLE public.patient_password_resets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professionals view their own password reset audit" ON public.patient_password_resets;
CREATE POLICY "Professionals view their own password reset audit"
  ON public.patient_password_resets
  FOR SELECT
  USING (professional_id = auth.uid());

DROP POLICY IF EXISTS "Professionals insert their own password reset audit" ON public.patient_password_resets;
CREATE POLICY "Professionals insert their own password reset audit"
  ON public.patient_password_resets
  FOR INSERT
  WITH CHECK (professional_id = auth.uid());

-- ============================================================
-- 3) RPC: register_unblock_override (validates linkage via nutritionist_patients)
-- ============================================================
CREATE OR REPLACE FUNCTION public.register_unblock_override(
  _patient_id UUID,
  _reason TEXT DEFAULT NULL,
  _duration_minutes INT DEFAULT 60
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _professional_id UUID := auth.uid();
  _is_linked BOOLEAN := false;
  _new_id UUID;
BEGIN
  IF _professional_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.nutritionist_patients
     WHERE patient_id = _patient_id
       AND nutritionist_id = _professional_id
  ) INTO _is_linked;

  IF NOT _is_linked THEN
    RAISE EXCEPTION 'professional_not_linked_to_patient';
  END IF;

  UPDATE public.professional_unblock_overrides
     SET revoked_at = now()
   WHERE patient_id = _patient_id
     AND professional_id = _professional_id
     AND revoked_at IS NULL
     AND expires_at > now();

  INSERT INTO public.professional_unblock_overrides
    (patient_id, professional_id, reason, expires_at)
  VALUES
    (_patient_id, _professional_id, _reason,
     now() + make_interval(mins => GREATEST(5, LEAST(_duration_minutes, 240))))
  RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_unblock_override(UUID, TEXT, INT) TO authenticated;

-- ============================================================
-- 4) Update resolve_patient_lifecycle_state to honor unblock override
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_patient_lifecycle_state(_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    _state text;
    _state_override text;
    _has_anamnesis boolean := false;
    _has_published_plan boolean := false;
    _has_approved_plan boolean := false;
    _has_draft_plan boolean := false;
    _has_pending_onboarding boolean := false;
    _onboarding_status text;
    _is_onboarding_blocked boolean := false;
    _onboarding_block_reason text;
    _active_plan record;
    _last_checkin_at timestamptz;
    _last_plan_delivery_at timestamptz;
    _adherence_score numeric := 0;
    _risk_score numeric := 0;
    _days_inactive int := 0;
    _has_clinical_alert boolean := false;
    _has_retention_risk boolean := false;
    _has_active_unblock boolean := false;
    _unblock_expires_at timestamptz;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.patient_anamnesis WHERE user_id = _patient_id
    ) INTO _has_anamnesis;

    SELECT id, title, start_date, created_at
      INTO _active_plan
      FROM public.meal_plans
     WHERE patient_id = _patient_id
       AND is_active = true
       AND plan_status = 'published_to_patient'
     ORDER BY created_at DESC
     LIMIT 1;

    _has_published_plan := _active_plan.id IS NOT NULL;
    _last_plan_delivery_at := _active_plan.created_at;

    SELECT EXISTS (
        SELECT 1 FROM public.meal_plans
         WHERE patient_id = _patient_id
           AND plan_status = 'approved'
    ) INTO _has_approved_plan;

    SELECT EXISTS (
        SELECT 1 FROM public.meal_plans
         WHERE patient_id = _patient_id
           AND plan_status IN ('draft', 'draft_auto_generated', 'draft_auto_corrected', 'under_professional_review')
    ) INTO _has_draft_plan;

    SELECT status,
           COALESCE(status, '') NOT IN ('completed', 'plan_delivered', 'finished'),
           CASE
             WHEN status IS NULL THEN 'Onboarding ainda não iniciado'
             WHEN status NOT IN ('completed', 'plan_delivered', 'finished')
                  THEN 'Onboarding em andamento'
             ELSE NULL
           END
      INTO _onboarding_status, _is_onboarding_blocked, _onboarding_block_reason
      FROM public.onboarding_pipelines
     WHERE patient_id = _patient_id
     ORDER BY created_at DESC
     LIMIT 1;

    SELECT true, MAX(expires_at)
      INTO _has_active_unblock, _unblock_expires_at
      FROM public.professional_unblock_overrides
     WHERE patient_id = _patient_id
       AND revoked_at IS NULL
       AND expires_at > now();

    IF _has_published_plan OR COALESCE(_has_active_unblock, false) THEN
        _is_onboarding_blocked := false;
        _onboarding_block_reason := CASE
            WHEN COALESCE(_has_active_unblock, false)
              THEN 'Destravado temporariamente pelo profissional até ' || to_char(_unblock_expires_at, 'HH24:MI')
            ELSE NULL
        END;
    END IF;

    _has_pending_onboarding := COALESCE(_is_onboarding_blocked, false)
                               OR (_onboarding_status IS NOT NULL
                                   AND _onboarding_status NOT IN ('completed', 'plan_delivered', 'finished'));

    SELECT MAX(created_at) INTO _last_checkin_at
      FROM public.patient_checkins
     WHERE patient_id = _patient_id;

    _days_inactive := COALESCE(EXTRACT(DAY FROM (now() - _last_checkin_at))::int, 999);

    SELECT EXISTS (
        SELECT 1 FROM public.clinical_alerts
         WHERE patient_id = _patient_id
           AND is_active = true
           AND severity IN ('high', 'critical')
    ) INTO _has_clinical_alert;

    BEGIN
        SELECT COALESCE(adherence_score_7d, 0) INTO _adherence_score
          FROM public.profiles WHERE user_id = _patient_id;
    EXCEPTION WHEN others THEN
        _adherence_score := 0;
    END;

    BEGIN
        SELECT COALESCE(clinical_risk_score, 0) INTO _risk_score
          FROM public.profiles WHERE user_id = _patient_id;
    EXCEPTION WHEN others THEN
        _risk_score := 0;
    END;

    _has_retention_risk := _days_inactive > 14 OR _adherence_score < 30;

    SELECT lifecycle_state INTO _state_override
      FROM public.patient_lifecycle_states
     WHERE patient_id = _patient_id;

    IF _state_override IS NOT NULL THEN
        _state := _state_override;
    ELSIF _has_published_plan THEN
        _state := 'plan_delivered';
    ELSIF _has_approved_plan THEN
        _state := 'plan_pending_production';
    ELSIF _has_draft_plan THEN
        _state := 'plan_pending_production';
    ELSIF _has_anamnesis THEN
        _state := 'onboarding_ready_for_plan';
    ELSE
        _state := 'onboarding_started';
    END IF;

    RETURN jsonb_build_object(
        'lifecycle_state', _state,
        'state', _state,
        'has_active_plan', _has_published_plan,
        'has_pending_onboarding', _has_pending_onboarding,
        'has_clinical_alert', _has_clinical_alert,
        'has_retention_risk', _has_retention_risk,
        'plan_id', _active_plan.id,
        'plan_title', _active_plan.title,
        'plan', CASE WHEN _active_plan.id IS NOT NULL
                     THEN jsonb_build_object(
                            'id', _active_plan.id,
                            'title', _active_plan.title,
                            'start_date', _active_plan.start_date)
                     ELSE NULL END,
        'last_checkin_at', _last_checkin_at,
        'last_plan_delivery_at', _last_plan_delivery_at,
        'adherence_score', _adherence_score,
        'risk_score', _risk_score,
        'days_inactive', _days_inactive,
        'next_recommended_action', NULL,
        'onboarding_status', _onboarding_status,
        'is_onboarding_blocked', COALESCE(_is_onboarding_blocked, false),
        'onboarding_block_reason', _onboarding_block_reason,
        'has_active_unblock', COALESCE(_has_active_unblock, false),
        'unblock_expires_at', _unblock_expires_at,
        'show_onboarding', (NOT _has_published_plan)
                           AND (NOT COALESCE(_has_active_unblock, false))
                           AND (_state IN ('onboarding_started', 'onboarding_ready_for_plan')
                                OR COALESCE(_is_onboarding_blocked, false)),
        'show_plan', _has_published_plan,
        'last_updated', now()
    );
END;
$function$;

-- ============================================================
-- 5) Diagnostic view (uses nutritionist_patients linkage; email from auth.users)
-- ============================================================
DROP VIEW IF EXISTS public.v_plan_visibility_diagnostics;
CREATE VIEW public.v_plan_visibility_diagnostics
WITH (security_invoker = on) AS
SELECT
  np.patient_id,
  p.full_name,
  au.email,
  np.nutritionist_id,
  mp.id AS plan_id,
  mp.title AS plan_title,
  mp.plan_status,
  mp.is_active,
  mp.created_at AS plan_created_at,
  op.status AS onboarding_status,
  CASE
    WHEN mp.id IS NOT NULL
     AND mp.plan_status = 'published_to_patient'
     AND mp.is_active = true
     AND op.status IS NOT NULL
     AND op.status NOT IN ('completed', 'plan_delivered', 'finished')
    THEN true
    ELSE false
  END AS has_divergence,
  CASE
    WHEN mp.id IS NULL THEN 'no_plan'
    WHEN mp.plan_status <> 'published_to_patient' THEN 'plan_not_published'
    WHEN mp.is_active = false THEN 'plan_inactive'
    WHEN op.status IS NOT NULL AND op.status NOT IN ('completed','plan_delivered','finished')
      THEN 'onboarding_blocking_view'
    ELSE 'ok'
  END AS divergence_reason
FROM public.nutritionist_patients np
LEFT JOIN public.profiles p ON p.user_id = np.patient_id
LEFT JOIN auth.users au ON au.id = np.patient_id
LEFT JOIN LATERAL (
  SELECT id, title, plan_status, is_active, created_at
    FROM public.meal_plans
   WHERE patient_id = np.patient_id
     AND plan_status = 'published_to_patient'
     AND is_active = true
   ORDER BY created_at DESC
   LIMIT 1
) mp ON true
LEFT JOIN LATERAL (
  SELECT status FROM public.onboarding_pipelines
   WHERE patient_id = np.patient_id
   ORDER BY created_at DESC LIMIT 1
) op ON true;