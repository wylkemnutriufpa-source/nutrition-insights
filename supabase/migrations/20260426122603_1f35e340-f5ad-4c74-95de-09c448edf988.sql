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
    _release_status text;
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

    SELECT status, release_status,
           COALESCE(status, '') NOT IN ('completed', 'plan_delivered', 'finished'),
           CASE
             WHEN status IS NULL THEN 'Onboarding ainda não iniciado'
             WHEN status NOT IN ('completed', 'plan_delivered', 'finished')
                  THEN 'Onboarding em andamento'
             ELSE NULL
           END
      INTO _onboarding_status, _release_status, _is_onboarding_blocked, _onboarding_block_reason
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

    -- Honor both published plans, manual unblocks AND professional release status
    IF _has_published_plan OR COALESCE(_has_active_unblock, false) OR COALESCE(_release_status, '') = 'released' THEN
        _is_onboarding_blocked := false;
        _onboarding_block_reason := CASE
            WHEN COALESCE(_has_active_unblock, false)
              THEN 'Destravado temporariamente pelo profissional até ' || to_char(_unblock_expires_at, 'HH24:MI')
            WHEN COALESCE(_release_status, '') = 'released'
              THEN 'Acesso liberado pelo profissional (Onboarding Opcional)'
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
                           AND (COALESCE(_release_status, '') <> 'released')
                           AND (_state IN ('onboarding_started', 'onboarding_ready_for_plan')
                                OR COALESCE(_is_onboarding_blocked, false)),
        'show_plan', _has_published_plan,
        'last_updated', now()
    );
END;
$function$;