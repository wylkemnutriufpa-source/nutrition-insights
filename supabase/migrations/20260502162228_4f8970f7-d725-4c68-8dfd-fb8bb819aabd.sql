CREATE OR REPLACE FUNCTION public.resolve_patient_lifecycle_state(_patient_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    _state text := 'new';
    _is_onboarding_blocked boolean := false;
    _has_published_plan boolean := false;
    _journey_status text;
    _release_status text;
    _pipeline_status text;
    _anamnesis_completed boolean;
    _has_active_unblock boolean := false;
    _has_pending_onboarding boolean := false;
BEGIN
    -- 1. Verifica plano ativo
    SELECT EXISTS (
        SELECT 1 FROM public.meal_plans
        WHERE patient_id = _patient_id
          AND is_active = true
          AND plan_status = 'published_to_patient'
    ) INTO _has_published_plan;

    -- 2. Busca vínculo e pipeline
    SELECT np.journey_status, op.release_status, op.status as pipeline_status, op.anamnesis_completed
      INTO _journey_status, _release_status, _pipeline_status, _anamnesis_completed
      FROM public.nutritionist_patients np
      LEFT JOIN public.onboarding_pipelines op ON op.patient_id = np.patient_id
     WHERE np.patient_id = _patient_id
     ORDER BY np.created_at DESC
     LIMIT 1;

    -- 3. Verifica se tem onboarding pendente (pipeline ativo)
    _has_pending_onboarding := (_pipeline_status IS NOT NULL AND _pipeline_status NOT IN ('completed', 'superseded_by_published_plan'));

    -- 4. Verifica override de desbloqueio manual
    SELECT EXISTS (
        SELECT 1 FROM public.professional_unblock_overrides
        WHERE patient_id = _patient_id AND revoked_at IS NULL AND expires_at > now()
    ) INTO _has_active_unblock;

    -- 5. DECISÃO DE BLOQUEIO (Onboarding Gate)
    _is_onboarding_blocked := true;

    IF _has_published_plan OR _has_active_unblock OR _release_status = 'released' THEN
        _is_onboarding_blocked := false;
    END IF;

    -- Estados fluidos: permitimos o acesso para que o OnboardingProgressModal lide com a UI
    IF _journey_status IN ('onboarding_active', 'awaiting_consent', 'onboarding_completed') THEN
        _is_onboarding_blocked := false;
    END IF;

    -- 6. RESOLUÇÃO DO ESTADO (Para o Dashboard)
    IF _has_published_plan THEN
        _state := 'active';
    ELSIF _journey_status = 'onboarding_active' THEN
        _state := 'onboarding';
    ELSIF _journey_status = 'awaiting_payment' THEN
        _state := 'awaiting_payment';
    ELSIF _journey_status = 'awaiting_onboarding_release' THEN
        _state := 'awaiting_release';
    ELSE
        _state := COALESCE(_journey_status, 'new');
    END IF;

    RETURN jsonb_build_object(
        'state', _state,
        'is_onboarding_blocked', _is_onboarding_blocked,
        'has_published_plan', _has_published_plan,
        'journey_status', _journey_status,
        'release_status', _release_status,
        'has_pending_onboarding', _has_pending_onboarding,
        'anamnesis_completed', COALESCE(_anamnesis_completed, false),
        'show_onboarding', (_journey_status IN ('onboarding_active', 'awaiting_consent') AND NOT COALESCE(_anamnesis_completed, false)),
        'show_plan', _has_published_plan
    );
END;
$function$;